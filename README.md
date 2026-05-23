# Mapbox Field for Craft CMS 5

A premium, interactive, and high-performance custom field type for **Craft CMS 5** that embeds fully-featured Mapbox maps inside entry editing layouts and the frontend. 

It provides geocoding address autocomplete, drag-and-drop marker relocation, customizable multi-marker point panels, and simple but highly extensible template integration methods.

---

## ✨ Features

* **Control Panel Autocomplete Search**: Modern glassmorphic search input that queries the Mapbox Places Geocoding API and flies the camera seamlessly to the coordinates.
* **Interactive Drag-and-Drop Marker**: Smooth draggable primary marker that reverse-geocodes coordinates back to real addresses automatically.
* **Multi-Marker Sidebar Panels**: Add multiple custom points of interest. Each marker is fully customizable with:
  * Title/Label
  * Description
  * Coordinated offsets (can also be dragged manually on the map)
  * **Beautiful preset palettes**: Red, Blue, Green, Orange, Purple, Pink, Yellow, Dark Grey.
  * **Pre-packaged vector SVG icons**: Home, Star, Heart, Info, Store, Restaurant, Coffee, Standard Pin.
* **Plug & Play Frontend Helper**: Render custom interactive maps in Twig using a single helper method: `{{ entry.myField.render() | raw }}`.
* **Granular Options Overrides**: Directly override Mapbox GL JS settings like projection (`globe` vs. standard flat maps), bearing, pitch, zoom, cooperative gestures, and styles directly from Twig.
* **Advanced JS API & Event Handling**: Easily bind inline custom event listeners inside Twig or capture map objects externally via DOM event triggers.

---

## 🛠️ Requirements

* **Craft CMS**: `^5.10.0`
* **PHP**: `>=8.3`
* **Mapbox Account**: A public access token is required (configured under plugin settings).

---

## 📦 Installation

To install the plugin, open your terminal in your project directory and run Composer:

```bash
# Tell composer to load the package
composer require thekitchen-agency/craft-mapbox-field

# Install the plugin through Craft
./craft plugin/install mapbox-field
```

---

## ⚙️ Configuration

1. Go to **Settings > Plugins > Mapbox Field** in your Craft CMS Control Panel.
2. Enter your **Mapbox Access Token**.
3. Choose a default style (Streets, Outdoors, Light, Dark, Satellite, etc.).
4. Set default coordinates (e.g. Center of Switzerland: `46.8182` Latitude, `8.2275` Longitude) and starting zoom level.

### Adding the Field
1. Go to **Fields > New Field**.
2. Select the **Mapbox Map** field type.
3. Configure instance options (e.g. enable address searches, toggle marker dragging, or activate multiple supplementary markers).
4. Assign the field to your entry section layout.

---

## 🎨 Twig Frontend Integration

### Method A: Out-of-the-Box Render (Recommended)
Outputs a fully loaded, styled HTML container and JavaScript block that auto-fetches the CDN scripts and mounts the map.

```twig
{# Renders the map with standard 400px height and default settings #}
{{ entry.mapboxLocation.render() | raw }}

{# Renders with customized styling & dimensions #}
{{ entry.mapboxLocation.render({
    width: '100%',
    height: '550px',
    style: 'mapbox://styles/mapbox/outdoors-v12',
    zoom: 12
}) | raw }}
```

#### Customizing Mapbox Options
Pass native Mapbox GL JS configuration overrides under the `mapOptions` key:

```twig
{{ entry.mapboxLocation.render({
    height: '500px',
    mapOptions: {
        pitch: 60,
        bearing: -45,
        projection: 'globe',
        cooperativeGestures: true,
        maxZoom: 16,
        minZoom: 2
    }
}) | raw }}
```

---

## ⚡ Developer Event API & JS Triggers

You can subscribe to events or manipulate map behaviors using three powerful options:

### 1. Inline Twig Events
You can pass custom event listener callbacks directly in Twig. Standard parameters available are `event` (the Mapbox callback event) and `map` (the Mapbox GL JS Map instance):

```twig
{{ entry.mapboxLocation.render({
    height: '550px',
    events: {
        click: "map.flyTo({ center: event.lngLat, zoom: 14 });",
        zoomend: "console.log('User zoomed map to level:', map.getZoom());"
    }
}) | raw }}
```

### 2. Custom DOM Initialization Event (`mapbox-field-init`)
When a map has finished rendering all markers, it dispatches a custom `mapbox-field-init` event on `document`. This contains the `id` of the DOM container and the `map` instance:

```javascript
document.addEventListener('mapbox-field-init', function(e) {
    const mapId = e.detail.id;
    const map = e.detail.map;
    console.log('Mapbox is ready:', mapId, map);

    // E.g., fetch custom data or add customized source layers
    map.on('style.load', () => {
        // Your code...
    });
});
```

### 3. Global Registry & Element Properties
Retrieve the map instance from anywhere in your codebase using the container ID or DOM reference:

```javascript
// A. Global Registry
const map = window.mapboxFields['mapbox-map-607f23c4a1'];
if (map) {
    map.setPitch(45);
}

// B. Element Property
const containerEl = document.getElementById('mapbox-map-607f23c4a1');
if (containerEl && containerEl._mapboxMap) {
    containerEl._mapboxMap.flyTo({ center: [8.22, 46.81] });
}
```

---

## 🛠️ Loop Markers for Custom Layouts
If you prefer to render your own custom grids (e.g. POI cards next to the map) or use other layout engines (e.g. Leaflet), you can access all structured coordinates and marker properties directly:

```twig
{# Access primary coordinates #}
<p>Address: {{ entry.mapboxLocation.address }}</p>
<p>Coordinates: {{ entry.mapboxLocation.lat }}, {{ entry.mapboxLocation.lng }}</p>

{# Loop supplementary markers #}
{% if entry.mapboxLocation.markers | length > 0 %}
    <div class="poi-grid">
        {% for marker in entry.mapboxLocation.markers %}
            <div class="poi-card" style="border-left: 4px solid {{ marker.color }};">
                <h4>{{ marker.label ?: 'Point' }}</h4>
                <p>{{ marker.description }}</p>
                <span>Icon: {{ marker.icon }} ({{ marker.lat }}, {{ marker.lng }})</span>
            </div>
        {% endfor %}
    </div>
{% endif %}
```

---

## 📄 License

This plugin is licensed under the [MIT License](LICENSE.md).

---

*Developed with ❤️ by [thekitchen.agency](https://thekitchen.agency).*
