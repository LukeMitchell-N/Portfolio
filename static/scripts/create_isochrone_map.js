import { search_area_style, walking_style, area_style, transit_style } from './layer_styles.js'
var nw = L.latLng(45.702675, -123.284982),
    se = L.latLng(45.137760, -122.143595),
    bounds = L.latLngBounds(se, nw);

var map = L.map('map', {
    center: [45.519177, -122.677],
    zoom: 10,
    zoomControl: false,
    maxZoom: 28,
    minZoom: 9,
    //maxBounds: bounds,
    animate: true
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

var baseMaps = {};
const layerControl = L.control.layers(baseMaps, {}).addTo(map);

// - Work within a pane for the bg layer
map.createPane('base');
map.getPane('base').style.zIndex = 400;

//new basemap
var stadia_basemap = L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.{ext}', {
    minZoom: 0,
    maxZoom: 20,
    attribution: '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    ext: 'png'
});

map.addLayer(stadia_basemap);
layerControl.addOverlay(stadia_basemap, "Base map")


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
        return await response.json();
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
            return lyr;
        }
    });
}

// Adds either block, transit, or walking network output to the map
async function add_output_layer(path, type) {
    let name = "", z_index = 1, style = "";
    switch (type) {
        case "Blocks":
            name = "Reachable Blocks";
            z_index = 402;
            style = area_style;
            break;
        case "Walking":
            name = "Reachable Walking Network";
            z_index = 403;
            style = walking_style;
            break;
        case "Transit":
            name = "Reachable Transit Network";
            z_index = 404;
            style = transit_style
            break;
    }
    await addGeoJsonToMap(path, name, name+"_Pane", z_index, style);
    //console.log("Added " + type + " layer to map.");

}

let search_layer;
addGeoJsonToMap(
    '/static/leaflet/data/search_area.geojson',
    "Search Area",
    "Search_pane",
    401,
    search_area_style
).then(layer => {
    if (layer) {
        console.log(layer)
        console.log(typeof layer)
        layer.on('click', function (e) {
            if (marker) {
                map.removeLayer(marker)
            }
            onMapClick(e)
        });
        map.fitBounds(layer.getBounds())
    }
    else {
        console.log("Search layer not added")
    }
});

let marker = null

function onMapClick(e) {
    var coords = e.latlng;
    var projcoords = map.options.crs.project(coords);
    marker = L.marker(e.latlng,
        {interactive: true}).addTo(map);

    // Load the html for the form
    fetch('/static/html/isochrone_form.html')
        .then(response => response.text())
        .then(html => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            const form = tempDiv.querySelector('form');

            form.querySelector('#lat').value = coords.lat.toFixed(6);
            form.querySelector('#lon').value = coords.lng.toFixed(6);
            form.querySelector('#x').value = projcoords.x.toFixed(6);
            form.querySelector('#y').value = projcoords.y.toFixed(6);
            form.querySelector('#crs').value = map.options.crs.code;

            // Add the form as popup content
            marker.bindPopup(tempDiv, {
                keepInView: true,
                closeButton: true
            }).openPopup();
        });


    marker.on('popupopen', function(e){
        const form = document.getElementById('iso_form');

        form.addEventListener('submit', async e => {
            e.preventDefault();                                             // Stop page from refreshing
            map.removeLayer(marker);                                        // Remove marker from map
            marker = null;
            bounds_group.eachLayer(function (layer) {                       // If present, remove previous search output from map
                const layerName = layer.options.name;
                if (layerName !== "Search Area") {
                    map.removeLayer(layer);
                    bounds_group.removeLayer(layer);
                    layerControl.removeLayer(layer);
                }
            });

            // If not present from previous search, create the boxes for console output and status
            if (document.getElementById('console_box') == null)
                document.getElementById('main_box').appendChild(consoleBox)
            if (document.getElementById('status_box') == null)
                document.getElementById('main_box').appendChild(statusBox)
            

            // Submit the form content to the /run_isochrone_tool handler
            consoleBox.textContent = "Submitting..";
            try {
                //console.log("Form data: ??" + JSON.stringify(form));
                const resp = await fetch('/run_isochrone_tool', {
                    method: 'POST',
                    body: new FormData(form)
                });
                
                if (!resp.ok) {
                    throw new Error(`HTTP ${resp.status}`);
                }

                const data = await resp.json();
                const pid = data.pid
                console.log("data.pid = " + data.pid)
                consoleBox.textContent = `Process started (ID: ${pid})`;
                statusBox.textContent = `Progress: 0%`;


                // Open SSE stream for live updates
                const es = new EventSource(`/stream/${pid}`);
                es.onmessage = event => {
                    //console.log("new message: " + event.data)
                    if (event.data.startsWith("Layer Update")) {
                        const chunks = event.data.split(" - ");
                        add_output_layer(chunks[2], chunks[1]);
                    }
                    else if (event.data.startsWith("$$ ")) {
                        const statusUpdate = event.data.split("$$ ")[1];
                        statusBox.textContent = statusUpdate;
                    }
                    else if (event.data.startsWith("DONE")) {
                        es.close();
                    }
                    else{
                        //console.log(event.data);
                        consoleBox.textContent = event.data;
                    }
                };
                es.onerror = () => {
                    consoleBox.textContent += ' (Error detected - stream closed)';
                    es.close();
                };

            } catch (err) {
                consoleBox.textContent = `Error: ${err.message}`;
            }

        })
    });


    marker.on('popupclose', function(e){
        map.removeLayer(marker);
        marker = null;
    });

}

