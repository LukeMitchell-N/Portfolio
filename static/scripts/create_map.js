var map = L.map('map', {
    center: [-122.66, 45.519177],
    zoom: 12,
    zoomControl: true,
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

var bounds_group = new L.featureGroup([]);

function setBounds() {
    if (bounds_group.getLayers().length) {
        map.fitBounds(bounds_group.getBounds());
    }
    map.setMaxBounds(map.getBounds().pad(.25));
}

// --- OSM background map layer

// - Work within a pane for the bg layer
map.createPane('pane_OpenStreetMap');
map.getPane('pane_OpenStreetMap').style.zIndex = 400;

// - Set up the OSM layer and add it to the map
var layer_OpenStreetMap = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    pane: 'pane_OpenStreetMap',
    opacity: 1.0,
    attribution: ''
});
layer_OpenStreetMap;
map.addLayer(layer_OpenStreetMap);


var baseMaps = { "OpenStreetMap": layer_OpenStreetMap };
const layerControl = L.control.layers(baseMaps, {}).addTo(map);


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

function addGeoJsonToMap(file_path, name, pane_name, z_index) {
    var lyr
    loadGeoJsonData(file_path).then(geojsonData => {
        if (geojsonData) {
            map.createPane(pane_name);
            map.getPane(pane_name).style.zIndex = z_index;

            lyr = L.geoJSON(geojsonData, {
                pane: pane_name,
                name: name
            });

            lyr.addTo(map);
            bounds_group.addLayer(lyr)
            layerControl.addOverlay(lyr, name)
        }
    });
}

// If the tool has not yet been run, display the search bounds
if (typeof filenames === 'undefined' || filenames == "Null") {
    addGeoJsonToMap('/static/leaflet/data/search_area.geojson', "Search Area", "Search_pane", 401)
}
else {
    console.log("filenames: " + filenames)
    console.log("filenames[Area]: " + filenames["Area"])
    if (filenames["Area"] && filenames["Area"] != "None") {
        addGeoJsonToMap(filenames["Area"], "Area", "Area_Pane", 402);
        console.log("Added area polygon to map at path " + filenames["Area"]);
    }
    if (filenames["Walking"] && filenames["Walking"] != "None") {
        addGeoJsonToMap(filenames["Walking"], "Walking", "Walking_Pane", 402);
        console.log("Added Walking polyline to map at path " + filenames["Walking"]);
    }
    if (filenames["Transit"] && filenames["Transit"] != "None") {
        addGeoJsonToMap(filenames["Transit"], "Transit", "Transit_Pane", 402);
        console.log("Added Transit polyline to map at path " + filenames["Transit"]);
    }
}

//setBounds();

var featureGroup = L.featureGroup().addTo(map);

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
                '<input id="velocity" name="velocity" type="number" min="0" max ="60" step="0.01" value="4.5" class="form-control"><br>' +
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