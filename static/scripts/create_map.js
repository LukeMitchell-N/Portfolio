import { search_area_style, walking_style, area_style, transit_style } from './styles.js'

var map = L.map('map', {
    center: [45.519177, -122.677],
    zoom: 10,
    zoomControl: false,
    maxZoom: 28,
    minZoom: 9
})

var hash = new L.Hash(map);
map.attributionControl.setPrefix('<a href="https://github.com/tomchadwin/qgis2web" target="_blank">qgis2web</a> &middot; <a href="https://leafletjs.com" title="A JS library for interactive maps">Leaflet</a> &middot; <a href="https://qgis.org">QGIS</a>');
var autolinker = new Autolinker({truncate: {length: 30, location: 'smart'}});

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
    console.log(bounds_group.getLayers())
    if (bounds_group.getLayers().length) {
        map.fitBounds(bounds_group.getBounds());
        map.setMaxBounds(bounds_group.getBounds().pad(.25));
    }
}
var baseMaps = {};
const layerControl = L.control.layers(baseMaps, {}).addTo(map);



// --- OSM background map layer

// - Work within a pane for the bg layer
map.createPane('pane_OpenStreetMap');
map.getPane('pane_OpenStreetMap').style.zIndex = 400;

// - Set up the OSM layer and add it to the map
var osm_layer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 28,
    opacity: 1.0,
    attribution: ''
});
map.addLayer(osm_layer);
layerControl.addOverlay(osm_layer, "OpenStreetMaps")





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
            map.createPane(pane_name);
            map.getPane(pane_name).style.zIndex = z_index;

            const lyr = L.geoJSON(geojsonData, {
                pane: pane_name,
                name: name,
                style: style_func
            });

            lyr.addTo(map);
            lyr.addTo(bounds_group)
            layerControl.addOverlay(lyr, name)
        }
    });
}


async function add_layers() {
    if (typeof filenames === 'undefined' || filenames == "Null") {      // If the tool has not yet been run, display the search bounds
        await addGeoJsonToMap(
            '/static/leaflet/data/search_area.geojson',
            "Search Area",
            "Search_pane",
            401,
            search_area_style
        )
    }
    else {                                                              // otherwise, load the layers passed in through 'filenames'
        if (filenames["Area"] && filenames["Area"] != "None") {
            await addGeoJsonToMap(filenames["Area"], "Reachable Blocks", "Area_Pane", 401, area_style);
            console.log("Added area polygon to map at path " + filenames["Area"]);
        }
        if (filenames["Walking"] && filenames["Walking"] != "None") {
            await addGeoJsonToMap(filenames["Walking"], "Reachable Walking Network", "Walking_Pane", 402, walking_style);
            console.log("Added Walking polyline to map at path " + filenames["Walking"]);
        }
        if (filenames["Transit"] && filenames["Transit"] != "None") {
            await addGeoJsonToMap(filenames["Transit"], "Reachable Transit Network", "Transit_Pane", 403, transit_style);
            console.log("Added Transit polyline to map at path " + filenames["Transit"]);
        }
    }
    setBounds();
}
add_layers()



function onMapClick(e) {
    var coords = e.latlng;
    var projcoords = map.options.crs.project(coords);
    var marker = new L.marker(e.latlng).addTo(map);
    var popupContent =
        '<form method="POST" role="form" id="form" enctype="multipart/form-data" class="form" >' +
            '<div class="form-group" style:"float:left;">' +
                '<h4>Generate transit isochrone from this location</h4>' +
                '<label for="lat">Lat: </label>' +
                '<input id="lat" name="lat" type="text" readonly class="form-control" value="' + projcoords.x.toFixed(6) + '"><br>' +
                '<label for="lon">Lon: </label>' +
                '<input id="lon" name="lon" type="text" readonly class="form-control" value="' + projcoords.y.toFixed(6) + '"><br>' +
                '<input id="crs" name="crs" type="hidden" value="' + map.options.crs.code + '">' +
                '<label for="time">Time limit (minutes): </label>' +
                '<input id="time" name="time" type="number" min="1" max ="60" class="form-control"><br>' +
                '<label for="velocity">Walking speed (kph): </label>' +
                '<input id="velocity" name="velocity" type="number" min="0" max ="20" step="0.01" value="5.2" class="form-control"><br>' +
                '<div class="form-group">' +
                    '<div style="text-align:center;" class="btn btn-primary"><button type="submit" value="submit" class="btn btn-primary trigger-submit">Submit</button></div>' +
                '</div>' +
            '</div>' +
        '</form>';

    marker.bindPopup(popupContent,{
        keepInView: true,
        closeButton: true
    }).openPopup();

    marker.on('popupclose', function(e){
        map.removeLayer(marker);
    });

}

map.on('popupopen', function(e){
    map.setMaxBounds(null)});
map.on('popupclose', function(e){
    map.setMaxBounds(bounds_group.getBounds())});
map.on('click', onMapClick);

