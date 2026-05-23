/**
 * Mapbox Field Control Panel Input controller
 */
class MapboxFieldInput {
    constructor(options) {
        this.options = options;
        this.wrapper = document.getElementById(options.id);
        if (!this.wrapper) return;

        // Colors preset palette
        this.colors = [
            { name: 'Red', hex: '#ef4444' },
            { name: 'Blue', hex: '#3b82f6' },
            { name: 'Green', hex: '#10b981' },
            { name: 'Orange', hex: '#f97316' },
            { name: 'Purple', hex: '#8b5cf6' },
            { name: 'Pink', hex: '#ec4899' },
            { name: 'Yellow', hex: '#eab308' },
            { name: 'Dark Grey', hex: '#475569' }
        ];

        // Icons list
        this.icons = [
            { id: 'pin', name: 'Standard Pin' },
            { id: 'home', name: 'Home' },
            { id: 'star', name: 'Star' },
            { id: 'heart', name: 'Heart' },
            { id: 'info', name: 'Info' },
            { id: 'store', name: 'Store' },
            { id: 'restaurant', name: 'Restaurant' },
            { id: 'coffee', name: 'Coffee' }
        ];

        // Select DOM Elements
        this.valueInput = this.wrapper.querySelector('.mapbox-field-value-input');
        this.mapContainer = this.wrapper.querySelector('.mapbox-field-map');
        this.searchInput = this.wrapper.querySelector('.mapbox-field-search-input');
        this.searchResults = this.wrapper.querySelector('.mapbox-field-search-results');
        this.clearSearchBtn = this.wrapper.querySelector('.mapbox-field-clear-search');
        this.spinner = this.wrapper.querySelector('.spinner');
        this.latVal = this.wrapper.querySelector('.lat-val');
        this.lngVal = this.wrapper.querySelector('.lng-val');
        this.addressVal = this.wrapper.querySelector('.address-val');
        this.addMarkerBtn = this.wrapper.querySelector('.add-marker-btn');
        this.markersList = this.wrapper.querySelector('.mapbox-field-markers-list');
        this.emptyState = this.wrapper.querySelector('.mapbox-field-markers-empty-state');

        // Parse State
        this.state = {
            lat: options.defaultLatitude,
            lng: options.defaultLongitude,
            zoom: options.defaultZoom,
            address: '',
            markers: []
        };

        try {
            if (this.valueInput && this.valueInput.value) {
                const parsed = JSON.parse(this.valueInput.value);
                this.state = Object.assign({}, this.state, parsed);
                if (!Array.isArray(this.state.markers)) {
                    this.state.markers = [];
                }
            }
        } catch (e) {
            console.error('Mapbox Field: Error parsing state JSON', e);
        }

        // Initialize elements & features
        this.map = null;
        this.mainMarker = null;
        this.subMarkers = []; // Array of { id, markerObject }

        this.initMap();
        this.initSearch();
        this.initSidebar();
    }

    /**
     * Initialize Mapbox Map
     */
    initMap() {
        if (!this.options.token) {
            this.mapContainer.innerHTML = '<div style="padding:20px; color:#ef4444; text-align:center;">' +
                '<strong>Mapbox Field Error:</strong> Access Token is missing. Configure it in plugin settings.</div>';
            return;
        }

        mapboxgl.accessToken = this.options.token;
 
        // Build map with default and custom developer config overrides
        const mapConfig = Object.assign({
            container: this.mapContainer,
            style: this.options.defaultStyle,
            center: [this.state.lng, this.state.lat],
            zoom: this.state.zoom
        }, this.options.mapOptions || {});
 
        this.map = new mapboxgl.Map(mapConfig);

        // Add Navigation controls
        this.map.addControl(new mapboxgl.NavigationControl(), 'top-right');

        // Create main marker
        this.mainMarker = new mapboxgl.Marker({
            color: '#ef4444',
            draggable: this.options.allowMarkerDrag
        })
        .setLngLat([this.state.lng, this.state.lat])
        .addTo(this.map);

        // Map Listeners
        this.map.on('zoomend', () => {
            this.state.zoom = Math.round(this.map.getZoom() * 10) / 10;
            this.serialize();
        });

        // Main Marker Listeners
        if (this.options.allowMarkerDrag) {
            this.mainMarker.on('dragend', () => {
                const lngLat = this.mainMarker.getLngLat();
                this.updatePrimaryCoords(lngLat.lat, lngLat.lng);
                this.reverseGeocode(lngLat.lat, lngLat.lng);
            });
        }
    }

    /**
     * Update primary coordinates in UI & State
     */
    updatePrimaryCoords(lat, lng) {
        // Round to 6 decimals
        const rLat = Math.round(lat * 1000000) / 1000000;
        const rLng = Math.round(lng * 1000000) / 1000000;

        this.state.lat = rLat;
        this.state.lng = rLng;

        if (this.latVal) this.latVal.textContent = rLat;
        if (this.lngVal) this.lngVal.textContent = rLng;

        this.serialize();
    }

    /**
     * Update primary address in UI & State
     */
    updatePrimaryAddress(address) {
        this.state.address = address;
        if (this.addressVal) {
            this.addressVal.textContent = address || 'No address selected';
        }
        this.serialize();
    }

    /**
     * Reverse Geocode coordinates to address
     */
    reverseGeocode(lat, lng) {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${this.options.token}&limit=1`;
        
        fetch(url)
            .then(res => res.json())
            .then(data => {
                if (data.features && data.features.length > 0) {
                    this.updatePrimaryAddress(data.features[0].place_name);
                } else {
                    this.updatePrimaryAddress('');
                }
            })
            .catch(err => {
                console.error('Mapbox Geocoder error:', err);
            });
    }

    /**
     * Initialize geocoding address search autocomplete
     */
    initSearch() {
        if (!this.searchInput) return;

        let debounceTimeout = null;

        // Search Input listeners
        this.searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimeout);
            const query = e.target.value.trim();

            if (this.clearSearchBtn) {
                if (query.length > 0) {
                    this.clearSearchBtn.classList.remove('hidden');
                } else {
                    this.clearSearchBtn.classList.add('hidden');
                }
            }

            if (query.length < 3) {
                this.hideSearchResults();
                return;
            }

            debounceTimeout = setTimeout(() => {
                this.performSearch(query);
            }, 300);
        });

        // Clear Search Button
        if (this.clearSearchBtn) {
            this.clearSearchBtn.addEventListener('click', () => {
                this.searchInput.value = '';
                this.clearSearchBtn.classList.add('hidden');
                this.hideSearchResults();
            });
        }

        // Close search results clicking outside
        document.addEventListener('click', (e) => {
            if (!this.searchInput.contains(e.target) && !this.searchResults.contains(e.target)) {
                this.hideSearchResults();
            }
        });
    }

    performSearch(query) {
        if (this.spinner) this.spinner.classList.remove('hidden');

        // Call Mapbox Places geocoding API
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${this.options.token}&autocomplete=true&limit=5`;

        fetch(url)
            .then(res => res.json())
            .then(data => {
                if (this.spinner) this.spinner.classList.add('hidden');
                this.showSearchResults(data.features);
            })
            .catch(err => {
                if (this.spinner) this.spinner.classList.add('hidden');
                console.error('Search Geocoding error:', err);
            });
    }

    showSearchResults(features) {
        if (!this.searchResults) return;

        this.searchResults.innerHTML = '';
        
        if (!features || features.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'mapbox-field-search-result-item';
            empty.style.color = '#94a3b8';
            empty.textContent = 'No places found';
            this.searchResults.appendChild(empty);
        } else {
            features.forEach(feature => {
                const item = document.createElement('div');
                item.className = 'mapbox-field-search-result-item';
                item.textContent = feature.place_name;
                item.addEventListener('click', () => {
                    const coords = feature.center; // [lng, lat]
                    
                    // Fly camera to coords
                    this.map.flyTo({
                        center: coords,
                        zoom: 14,
                        essential: true
                    });

                    // Update main marker and coords
                    this.mainMarker.setLngLat(coords);
                    this.updatePrimaryCoords(coords[1], coords[0]);
                    this.updatePrimaryAddress(feature.place_name);

                    // Update input value & clean search list
                    this.searchInput.value = feature.place_name;
                    this.hideSearchResults();
                });
                this.searchResults.appendChild(item);
            });
        }

        this.searchResults.classList.remove('hidden');
    }

    hideSearchResults() {
        if (this.searchResults) {
            this.searchResults.classList.add('hidden');
        }
    }

    /**
     * Sidebar and multi-marker management logic
     */
    initSidebar() {
        if (!this.options.allowMultipleMarkers) return;

        // Render existing supplementary markers
        if (this.state.markers.length > 0) {
            this.state.markers.forEach(markerData => {
                this.renderMarkerOnMap(markerData);
            });
            this.renderMarkersList();
        }

        // Add Marker button listener
        if (this.addMarkerBtn) {
            this.addMarkerBtn.addEventListener('click', () => {
                this.addSupplementaryMarker();
            });
        }
    }

    /**
     * Add a new supplementary marker at the map's current center
     */
    addSupplementaryMarker() {
        const center = this.map.getCenter();
        const markerData = {
            id: 'm-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            lat: Math.round(center.lat * 1000000) / 1000000,
            lng: Math.round(center.lng * 1000000) / 1000000,
            label: 'Marker ' + (this.state.markers.length + 1),
            description: '',
            color: '#3b82f6', // Default blue
            icon: 'pin' // Default pin
        };

        this.state.markers.push(markerData);
        this.renderMarkerOnMap(markerData);
        this.renderMarkersList();
        this.serialize();

        // Highlight marker card after spawn
        setTimeout(() => {
            const card = this.markersList.querySelector(`[data-id="${markerData.id}"]`);
            if (card) {
                card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                card.style.transform = 'scale(1.02)';
                setTimeout(() => card.style.transform = 'none', 300);
            }
        }, 100);
    }

    /**
     * Render a custom colored/icon marker on the Mapbox map
     */
    renderMarkerOnMap(markerData) {
        // Destroy existing marker with this ID if it exists
        this.removeMarkerFromMap(markerData.id);

        const el = this.createCustomMarkerDOM(markerData.color, markerData.icon);

        // Create draggable marker
        const mapMarker = new mapboxgl.Marker({
            element: el,
            draggable: true
        })
        .setLngLat([markerData.lng, markerData.lat])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`<strong>${markerData.label || 'Marker'}</strong>` + (markerData.description ? `<p>${markerData.description}</p>` : '')))
        .addTo(this.map);

        // Marker drag listener
        mapMarker.on('dragend', () => {
            const lngLat = mapMarker.getLngLat();
            this.updateSupplementaryCoords(markerData.id, lngLat.lat, lngLat.lng);
        });

        // Store reference
        this.subMarkers.push({
            id: markerData.id,
            markerObject: mapMarker
        });
    }

    /**
     * Remove custom marker from Map
     */
    removeMarkerFromMap(id) {
        const index = this.subMarkers.findIndex(item => item.id === id);
        if (index !== -1) {
            this.subMarkers[index].markerObject.remove();
            this.subMarkers.splice(index, 1);
        }
    }

    /**
     * Update supplementary coords when dragged on Map
     */
    updateSupplementaryCoords(id, lat, lng) {
        const marker = this.state.markers.find(m => m.id === id);
        if (marker) {
            marker.lat = Math.round(lat * 1000000) / 1000000;
            marker.lng = Math.round(lng * 1000000) / 1000000;

            // Update DOM Card inputs
            const card = this.markersList.querySelector(`[data-id="${id}"]`);
            if (card) {
                const latInput = card.querySelector('.marker-lat-input');
                const lngInput = card.querySelector('.marker-lng-input');
                if (latInput) latInput.value = marker.lat;
                if (lngInput) lngInput.value = marker.lng;
            }

            this.serialize();
        }
    }

    /**
     * Create Custom HTML element for Mapbox pin
     */
    createCustomMarkerDOM(color, icon) {
        const el = document.createElement('div');
        el.className = 'mapbox-custom-marker';
        el.style.width = '28px';
        el.style.height = '28px';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.cursor = 'pointer';

        // Pin base SVG with dynamic color
        let pinSvg = `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.3));">` +
            `<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" fill="${color || '#3b82f6'}"/>`;
        
        let innerIcon = '';
        if (icon === 'home') {
            innerIcon = '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="none" stroke="white" stroke-width="1.5"/>';
        } else if (icon === 'star') {
            innerIcon = '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="none" stroke="white" stroke-width="1"/>';
        } else if (icon === 'heart') {
            innerIcon = '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" fill="none" stroke="white" stroke-width="1.2"/>';
        } else if (icon === 'info') {
            innerIcon = '<circle cx="12" cy="12" r="10" fill="none" stroke="white" stroke-width="1.5"/><line x1="12" x2="12" y1="16" y2="12" stroke="white" stroke-width="1.5"/><circle cx="12" cy="8" r="1" fill="white"/>';
        } else if (icon === 'store') {
            innerIcon = '<path d="M3 9h18M3 9l1-4h16l1 4M3 9v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9" fill="none" stroke="white" stroke-width="1.2"/>';
        } else if (icon === 'restaurant') {
            innerIcon = '<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" fill="none" stroke="white" stroke-width="1.5"/>';
        } else if (icon === 'coffee') {
            innerIcon = '<path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4Z" fill="none" stroke="white" stroke-width="1.2"/>';
        } else {
            innerIcon = '<circle cx="12" cy="10" r="3.5" fill="white"/>';
        }
        
        pinSvg += innerIcon + '</svg>';
        el.innerHTML = pinSvg;

        return el;
    }

    /**
     * Render the cards list in the sidebar panel
     */
    renderMarkersList() {
        if (!this.markersList) return;

        this.markersList.innerHTML = '';

        if (this.state.markers.length === 0) {
            if (this.emptyState) this.emptyState.classList.remove('hidden');
            return;
        }

        if (this.emptyState) this.emptyState.classList.add('hidden');

        this.state.markers.forEach(marker => {
            const card = document.createElement('div');
            card.className = 'mapbox-field-marker-card';
            card.style.borderLeftColor = marker.color;
            card.setAttribute('data-id', marker.id);

            // Card Header
            const header = document.createElement('div');
            header.className = 'mapbox-field-marker-card-header';
            
            const title = document.createElement('span');
            title.className = 'mapbox-field-marker-card-title';
            title.textContent = marker.label || 'Supplementary Pin';

            const actions = document.createElement('div');
            actions.className = 'mapbox-field-marker-card-actions';

            // Locate Button
            const locateBtn = document.createElement('button');
            locateBtn.type = 'button';
            locateBtn.className = 'mapbox-field-marker-card-btn locate-btn';
            locateBtn.title = 'Fly map to this location';
            locateBtn.innerHTML = '&#8982;'; // House icon or locate symbol
            locateBtn.addEventListener('click', () => {
                this.map.flyTo({
                    center: [marker.lng, marker.lat],
                    zoom: 14,
                    essential: true
                });
            });

            // Delete Button
            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'mapbox-field-marker-card-btn delete-btn';
            deleteBtn.title = 'Delete Marker';
            deleteBtn.innerHTML = '&times;';
            deleteBtn.addEventListener('click', () => {
                this.deleteSupplementaryMarker(marker.id);
            });

            actions.appendChild(locateBtn);
            actions.appendChild(deleteBtn);
            header.appendChild(title);
            header.appendChild(actions);

            // Card Body
            const body = document.createElement('div');
            body.className = 'mapbox-field-marker-card-body';

            // Inputs Row: Label
            const row1 = document.createElement('div');
            row1.className = 'mapbox-field-marker-input-row';
            
            const labelInput = document.createElement('input');
            labelInput.type = 'text';
            labelInput.className = 'text fullwidth marker-label-input';
            labelInput.placeholder = 'Label / Title';
            labelInput.value = marker.label || '';
            labelInput.addEventListener('input', (e) => {
                marker.label = e.target.value;
                title.textContent = marker.label || 'Supplementary Pin';
                this.renderMarkerOnMap(marker);
                this.serialize();
            });
            row1.appendChild(labelInput);

            // Inputs Row: Description
            const row2 = document.createElement('div');
            row2.className = 'mapbox-field-marker-input-row';
            
            const descInput = document.createElement('input');
            descInput.type = 'text';
            descInput.className = 'text fullwidth marker-desc-input';
            descInput.placeholder = 'Description (optional)';
            descInput.value = marker.description || '';
            descInput.addEventListener('input', (e) => {
                marker.description = e.target.value;
                this.renderMarkerOnMap(marker);
                this.serialize();
            });
            row2.appendChild(descInput);

            // Inputs Row: Lat / Lng inputs
            const rowCoords = document.createElement('div');
            rowCoords.className = 'mapbox-field-marker-input-row';

            const latCol = document.createElement('div');
            latCol.className = 'col-half';
            const latInput = document.createElement('input');
            latInput.type = 'number';
            latInput.step = 'any';
            latInput.className = 'text fullwidth marker-lat-input';
            latInput.placeholder = 'Latitude';
            latInput.value = marker.lat;
            latInput.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) {
                    marker.lat = val;
                    this.renderMarkerOnMap(marker);
                    this.serialize();
                }
            });
            latCol.appendChild(latInput);

            const lngCol = document.createElement('div');
            lngCol.className = 'col-half';
            const lngInput = document.createElement('input');
            lngInput.type = 'number';
            lngInput.step = 'any';
            lngInput.className = 'text fullwidth marker-lng-input';
            lngInput.placeholder = 'Longitude';
            lngInput.value = marker.lng;
            lngInput.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) {
                    marker.lng = val;
                    this.renderMarkerOnMap(marker);
                    this.serialize();
                }
            });
            lngCol.appendChild(lngInput);

            rowCoords.appendChild(latCol);
            rowCoords.appendChild(lngCol);

            // Icon Picker Row
            const rowIcon = document.createElement('div');
            rowIcon.className = 'mapbox-field-marker-input-row';
            
            const iconSelect = document.createElement('select');
            iconSelect.className = 'fullwidth';
            this.icons.forEach(ico => {
                const opt = document.createElement('option');
                opt.value = ico.id;
                opt.textContent = ico.name;
                if (marker.icon === ico.id) opt.selected = true;
                iconSelect.appendChild(opt);
            });
            iconSelect.addEventListener('change', (e) => {
                marker.icon = e.target.value;
                this.renderMarkerOnMap(marker);
                this.serialize();
            });
            rowIcon.appendChild(iconSelect);

            // Color Swatches Row
            const rowColor = document.createElement('div');
            rowColor.className = 'mapbox-field-color-picker';

            const colorLabel = document.createElement('span');
            colorLabel.className = 'mapbox-field-color-label';
            colorLabel.textContent = 'Color:';
            rowColor.appendChild(colorLabel);

            this.colors.forEach(col => {
                const swatch = document.createElement('div');
                swatch.className = 'mapbox-field-color-swatch';
                swatch.style.backgroundColor = col.hex;
                swatch.title = col.name;
                if (marker.color === col.hex) {
                    swatch.classList.add('active');
                }

                swatch.addEventListener('click', () => {
                    // Update Active Swatches
                    rowColor.querySelectorAll('.mapbox-field-color-swatch').forEach(s => s.classList.remove('active'));
                    swatch.classList.add('active');
                    
                    // Update Marker and Card
                    marker.color = col.hex;
                    card.style.borderLeftColor = col.hex;
                    this.renderMarkerOnMap(marker);
                    this.serialize();
                });

                rowColor.appendChild(swatch);
            });

            // Assemble Card
            body.appendChild(row1);
            body.appendChild(row2);
            body.appendChild(rowCoords);
            body.appendChild(rowIcon);
            body.appendChild(rowColor);

            card.appendChild(header);
            card.appendChild(body);
            this.markersList.appendChild(card);
        });
    }

    /**
     * Delete supplementary marker by ID
     */
    deleteSupplementaryMarker(id) {
        this.removeMarkerFromMap(id);
        
        const index = this.state.markers.findIndex(m => m.id === id);
        if (index !== -1) {
            this.state.markers.splice(index, 1);
            this.renderMarkersList();
            this.serialize();
        }
    }

    /**
     * Serialize state to JSON and write to hidden input
     */
    serialize() {
        if (!this.valueInput) return;

        const val = {
            lat: this.state.lat,
            lng: this.state.lng,
            zoom: this.state.zoom,
            address: this.state.address,
            markers: this.state.markers
        };

        this.valueInput.value = JSON.stringify(val);
        
        // Trigger generic change event to tell Craft CMS that the entry has changes
        const event = new Event('change', { bubbles: true });
        this.valueInput.dispatchEvent(event);
    }
}

// Register class globally
window.MapboxFieldInput = MapboxFieldInput;
