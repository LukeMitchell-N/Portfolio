import { search_area_style, walking_style, area_style, transit_style } from './layer_styles.js'

var map = L.map('map', {
    center: [45.519177, -122.677],
    zoom: 10,
    zoomControl: false,
    maxZoom: 28,
    minZoom: 9
})

const consoleBox = document.createElement("div");
consoleBox.id = "console_box";
const statusBox = document.createElement("div");
statusBox.id = "status_box";


var hash = new L.Hash(map);
map.attributionControl.setPrefix('<a href="https://github.com/tomchadwin/qgis2web" target="_blank">qgis2web</a> &middot; <a href="https://leafletjs.com" title="A JS library for interactive maps">Leaflet</a> &middot; <a href="https://qgis.org">QGIS</a>');
var autolinker = new Autolinker({ truncate: { length: 30, location: 'smart' } });


// Set up map controls
L.control.locate({locateOptions: {maxZoom: 19}}).addTo(map);
var measureControl = new L.Control.Measure({
    position: 'topleft',
    primaryLengthUnit: 'feet',
    secondaryLengthUnit: 'miles',
    primaryAreaUnit: 'sqfeet',
    secondaryAreaUnit: 'sqmiles'
});

measureControl.addTo(map);
document.getElementsByClassName('leaflet-control-measure-toggle')[0].innerHTML = '';
document.getElementsByClassName('leaflet-control-measure-toggle')[0].className += ' fas fa-ruler';

var bounds_group = new L.featureGroup();

function setBounds() {
    //console.log(bounds_group.getLayers())
    if (bounds_group.getLayers().length) {
        map.fitBounds(bounds_group.getBounds());
        map.setMaxBounds(bounds_group.getBounds().pad(1.25));
    }
}

function isBoundsVisible(bounds, threshold = 0.25) {
    const mapBounds = map.getBounds();
    const intersection = bounds.intersection(mapBounds);

    if (!intersection) return false;

    const visibleArea = intersection.getNorthEast().distanceTo(intersection.getSouthWest());
    const totalArea = bounds.getNorthEast().distanceTo(bounds.getSouthWest());

    return (visibleArea / totalArea) >= threshold;
}
/*
function enforceBoundsVisibility() {
    const bounds = bounds_group.getBounds();
    if (!map.getBounds().overlaps(bounds_group.getBounds())) {
        map.fitBounds(bounds, { maxZoom: map.getZoom() - 1 }); // Zoom out slightly
    }
}

map.on('moveend zoomend', enforceBoundsVisibility);
*/


var baseMaps = {};
const layerControl = L.control.layers(baseMaps, {}).addTo(map);




// - Work within a pane for the bg layer
map.createPane('pane_OpenStreetMap');
map.getPane('pane_OpenStreetMap').style.zIndex = 400;

//stadia basemap
var stadia_basemap = L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.{ext}', {
    minZoom: 0,
    maxZoom: 20,
    attribution: '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    ext: 'png'
});

map.addLayer(stadia_basemap);
layerControl.addOverlay(stadia_basemap, "OpenStreetMaps")



// Function to load a geojson layer from a file
// Noted - leaflet seems to disagree with any geojson file
// that uses a projected coordinate system.
// All files should be projected to a GCS like WGS84
async function loadGeoJsonData(file_path) {
    try {
        const response = await fetch(file_path);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error loading GeoJSON:', error);
        return null;
    }
}

function addGeoJsonToMap(file_path, name, pane_name, z_index, style_func = {}) {
    return loadGeoJsonData(file_path).then(geojsonData => {
        if (geojsonData) {
            if (!map.getPane(pane_name)){
                map.createPane(pane_name);
            }
            map.getPane(pane_name).style.zIndex = z_index;

            
            const lyr = L.geoJSON(geojsonData, {
                pane: pane_name,
                name: name,
                style: style_func
            });

            // If a layer already exists with this name (i.e. update), remove it
            bounds_group.eachLayer(function (l) {
                if (l.options.name == name) {
                    bounds_group.removeLayer(l);
                    map.removeLayer(l);
                    layerControl.removeLayer(l)
                }
            });
            
            lyr.addTo(map);
            lyr.addTo(bounds_group)
            layerControl.addOverlay(lyr, name)
        }
    });
}



await addGeoJsonToMap(
    '/static/leaflet/data/Trimet_Routes_Connectivity_4326.geojson',
    "Search Area",
    "Search_pane",
    401,
    transit_style
);

