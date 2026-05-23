<?php

namespace thekitchenagency\craftmapboxfield\models;

use craft\base\Model;
use craft\helpers\Json;

/**
 * Represents the normalized value of a Mapbox Map field.
 */
class MapboxFieldValue extends Model
{
    public ?float $lat = null;
    public ?float $lng = null;
    public ?float $zoom = null;
    public ?string $address = '';
    public array $markers = [];

    /**
     * @inheritdoc
     */
    public function rules(): array
    {
        return [
            [['lat', 'lng', 'zoom'], 'number'],
            [['address'], 'string'],
            [['markers'], 'safe'],
        ];
    }

    /**
     * Return coordinates as a comma-separated string (e.g. for simple templates or URLs)
     */
    public function __toString(): string
    {
        if ($this->lat !== null && $this->lng !== null) {
            return "{$this->lat},{$this->lng}";
        }
        return $this->address ?: '';
    }

    /**
     * Returns a coordinates string
     */
    public function getCoords(): string
    {
        return $this->__toString();
    }

    /**
     * Renders a fully functioning Mapbox map on the frontend.
     *
     * Usage in Twig:
     * {{ entry.myMapField.render({ height: '500px' }) | raw }}
     *
     * @param array $options Configuration overrides
     * @return string HTML and Javascript snippet
     */
    public function render(array $options = []): string
    {
        $id = 'mapbox-map-' . uniqid();
        $height = $options['height'] ?? '400px';
        $width = $options['width'] ?? '100%';
        $style = $options['style'] ?? null;
        $zoom = $options['zoom'] ?? $this->zoom ?? 8.0;

        $pluginSettings = \thekitchenagency\craftmapboxfield\MapboxField::getInstance()->getSettings();
        $token = $pluginSettings->mapboxAccessToken;
        $mapStyle = $style ?? $pluginSettings->defaultStyle ?? 'mapbox://styles/mapbox/streets-v12';

        if (empty($token)) {
            return '<div style="padding: 20px; background: #fee2e2; border: 1px solid #fca5a5; color: #b91c1c; font-family: sans-serif; border-radius: 6px;">' .
                '<strong>Mapbox Field Error:</strong> Access Token is missing. Please configure it in the control panel settings.' .
                '</div>';
        }

        $lat = $this->lat ?? $pluginSettings->defaultLatitude ?? 46.8182;
        $lng = $this->lng ?? $pluginSettings->defaultLongitude ?? 8.2275;

        // Safely serialize markers
        $markersJson = Json::encode($this->markers);

        // Safely serialize custom Mapbox GL configuration overrides
        $mapOptions = $options['mapOptions'] ?? new \stdClass();
        $mapOptionsJson = Json::encode($mapOptions);

        // Safely serialize custom inline map events
        $events = $options['events'] ?? new \stdClass();
        $eventsJson = Json::encode($events);

        // HTML container and Javascript initialization
        $html = <<<HTML
<style>
@keyframes mapbox-pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.25) translateY(-2px); filter: drop-shadow(0 4px 10px var(--pulse-color, #3b82f6)); }
    100% { transform: scale(1); }
}
.mapbox-custom-marker.hovered {
    z-index: 9999 !important;
}
.mapbox-custom-marker.hovered svg {
    animation: mapbox-pulse 1s infinite ease-in-out !important;
}
</style>
<div id="{$id}" style="width: {$width}; height: {$height}; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1); overflow: hidden; position: relative;"></div>

<script>
(function() {
    var checkMapbox = function() {
        if (!document.getElementById('mapbox-gl-css')) {
            var link = document.createElement('link');
            link.id = 'mapbox-gl-css';
            link.rel = 'stylesheet';
            link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css';
            document.head.appendChild(link);
        }

        if (!window.mapboxgl) {
            var script = document.createElement('script');
            script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js';
            script.onload = function() {
                initMap();
            };
            document.head.appendChild(script);
        } else {
            initMap();
        }
    };

    var initMap = function() {
        mapboxgl.accessToken = '{$token}';
        
        var userOptions = {$mapOptionsJson};
        var mapConfig = Object.assign({
            container: '{$id}',
            style: '{$mapStyle}',
            center: [{$lng}, {$lat}],
            zoom: {$zoom}
        }, userOptions);

        var map = new mapboxgl.Map(mapConfig);

        map.addControl(new mapboxgl.NavigationControl(), 'top-right');

        // Bind inline event listeners
        var inlineEvents = {$eventsJson};
        for (var eventName in inlineEvents) {
            (function(name, callbackStr) {
                try {
                    var callbackFn;
                    if (callbackStr.trim().startsWith('function')) {
                        callbackFn = new Function('return ' + callbackStr)();
                    } else {
                        callbackFn = new Function('event', 'map', callbackStr);
                    }
                    map.on(name, function(e) {
                        callbackFn(e, map);
                    });
                } catch (err) {
                    console.error('Error binding Mapbox event "' + name + '":', err);
                }
            })(eventName, inlineEvents[eventName]);
        }

        // Store map instance on DOM element for direct developer access
        var containerEl = document.getElementById('{$id}');
        if (containerEl) {
            containerEl._mapboxMap = map;
        }

        // Save map to global registry
        window.mapboxFields = window.mapboxFields || {};
        window.mapboxFields['{$id}'] = map;

        // Dispatch custom init event for frontend developers to bind events/call methods
        var initEvent = new CustomEvent('mapbox-field-init', {
            detail: { id: '{$id}', map: map }
        });
        document.dispatchEvent(initEvent);

        // Add primary marker
        if ({$lat} !== null && {$lng} !== null) {
            new mapboxgl.Marker({ color: '#ef4444' })
                .setLngLat([{$lng}, {$lat}])
                .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML('<h3>Primary Location</h3><p>{$this->address}</p>'))
                .addTo(map);
        }

        // Add multiple supplementary markers
        var markers = {$markersJson};
        if (Array.isArray(markers)) {
            markers.forEach(function(marker, index) {
                if (marker.lat && marker.lng) {
                    var color = marker.color || '#3b82f6';
                    
                    var el = document.createElement('div');
                    el.className = 'mapbox-custom-marker marker-index-' + index;
                    el.style.width = '28px';
                    el.style.height = '28px';
                    el.style.display = 'flex';
                    el.style.alignItems = 'center';
                    el.style.justifyContent = 'center';
                    el.style.cursor = 'pointer';

                    // Simple pin shape SVG with customized inner icon
                    var pinSvg = '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.3));">' +
                        '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" fill="' + color + '"/>';
                    
                    var innerIcon = '';
                    if (marker.icon === 'home') {
                        innerIcon = '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="none" stroke="white" stroke-width="1.5"/>';
                    } else if (marker.icon === 'star') {
                        innerIcon = '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="none" stroke="white" stroke-width="1"/>';
                    } else if (marker.icon === 'heart') {
                        innerIcon = '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" fill="none" stroke="white" stroke-width="1.2"/>';
                    } else if (marker.icon === 'info') {
                        innerIcon = '<circle cx="12" cy="12" r="10" fill="none" stroke="white" stroke-width="1.5"/><line x1="12" x2="12" y1="16" y2="12" stroke="white" stroke-width="1.5"/><circle cx="12" cy="8" r="1" fill="white"/>';
                    } else if (marker.icon === 'store') {
                        innerIcon = '<path d="M3 9h18M3 9l1-4h16l1 4M3 9v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9" fill="none" stroke="white" stroke-width="1.2"/>';
                    } else if (marker.icon === 'restaurant') {
                        innerIcon = '<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" fill="none" stroke="white" stroke-width="1.5"/>';
                    } else if (marker.icon === 'coffee') {
                        innerIcon = '<path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4Z" fill="none" stroke="white" stroke-width="1.2"/>';
                    } else {
                        innerIcon = '<circle cx="12" cy="10" r="3.5" fill="white"/>';
                    }
                    
                    pinSvg += innerIcon + '</svg>';
                    el.innerHTML = pinSvg;

                    var popupHtml = '<strong>' + (marker.label || 'Marker') + '</strong>';
                    if (marker.description) {
                        popupHtml += '<div style="margin-top:4px; font-size:12px; color:#555;">' + marker.description + '</div>';
                    }

                    new mapboxgl.Marker(el)
                        .setLngLat([marker.lng, marker.lat])
                        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(popupHtml))
                        .addTo(map);
                }
            });
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkMapbox);
    } else {
        checkMapbox();
    }
})();
</script>
HTML;

        return $html;
    }
}
