var map = L.map('map', { zoomControl:true, maxZoom:28, minZoom:10})


var hash = new L.Hash(map);
map.attributionControl.setPrefix('<a href="https://github.com/tomchadwin/qgis2web" target="_blank">qgis2web</a> &middot; <a href="https://leafletjs.com" title="A JS library for interactive maps">Leaflet</a> &middot; <a href="https://qgis.org">QGIS</a>');
var autolinker = new Autolinker({truncate: {length: 30, location: 'smart'}});

function removeEmptyRowsFromPopupContent(content, feature) {
    var tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    var rows = tempDiv.querySelectorAll('tr');
    for (var i = 0; i < rows.length; i++) {
        var td = rows[i].querySelector('td.visible-with-data');
        var key = td ? td.id : '';
        if (td && td.classList.contains('visible-with-data') && feature.properties[key] == null) {
            rows[i].parentNode.removeChild(rows[i]);
             }
    }
    return tempDiv.innerHTML;
}
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
    map.setMaxBounds(map.getBounds());
}

//OSM background map layer
map.createPane('pane_OpenStreetMap_0');
map.getPane('pane_OpenStreetMap_0').style.zIndex = 400;
var layer_OpenStreetMap_0 = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    pane: 'pane_OpenStreetMap_0',
    opacity: 1.0,
    attribution: '',
    minZoom: 10,
    maxZoom: 28,
    minNativeZoom: 0,
    maxNativeZoom: 19
});
layer_OpenStreetMap_0;
map.addLayer(layer_OpenStreetMap_0);

function pop_blocks_1(feature, layer) {
    var popupContent = '<table>\
            <tr>\
                <td colspan="2">' + (feature.properties['fid'] !== null ? autolinker.link(feature.properties['fid'].toLocaleString()) : '') + '</td>\
            </tr>\
        </table>';
    layer.bindPopup(popupContent, {maxHeight: 400});
    var popup = layer.getPopup();
    var content = popup.getContent();
    var updatedContent = removeEmptyRowsFromPopupContent(content, feature);
    popup.setContent(updatedContent);
}


//Isochrone - Accessible blocks layer
function style_blocks_1_0() {
    return {
        pane: 'pane_blocks_1',
        stroke: false,
        fill: true,
        fillOpacity: 1,
        fillColor: 'rgba(255,0,4,.40)',
        interactive: true,
    }
}

map.createPane('pane_blocks_1');
map.getPane('pane_blocks_1').style.zIndex = 401;
map.getPane('pane_blocks_1').style['mix-blend-mode'] = 'normal';
var layer_blocks_1 = new L.geoJson(json_blocks_1, {
    attribution: '',
    interactive: true,
    dataVar: 'json_blocks_1',
    layerName: 'layer_blocks_1',
    pane: 'pane_blocks_1',
    //onEachFeature: pop_blocks_1,
    style: style_blocks_1_0,
});
bounds_group.addLayer(layer_blocks_1);
map.addLayer(layer_blocks_1);


//Isochrone - Accessible streets layer
map.createPane('pane_street_network_3');
map.getPane('pane_street_network_3').style.zIndex = 402;
map.getPane('pane_street_network_3').style['mix-blend-mode'] = 'normal';
var layer_street_network_3 = new L.geoJson(json_street_network_3, {
    attribution: '',
    interactive: true,
    dataVar: 'json_street_network_3',
    layerName: 'layer_street_network_3',
    pane: 'pane_street_network_3',
    style: style_street_network_3_0,
});
function style_street_network_3_0() {
    return {
        pane: 'pane_street_network_3',
        opacity: 1,
        color: 'rgba(100,200,100,1.0)',
        dashArray: '',
        lineCap: 'square',
        lineJoin: 'bevel',
        weight: .80,
        fillOpacity: 0,
        interactive: true,
    }
}

bounds_group.addLayer(layer_street_network_3);
map.addLayer(layer_street_network_3);


//Isochrone - Accessible transit layer
map.createPane('pane_transit_network_2');
map.getPane('pane_transit_network_2').style.zIndex = 403;
map.getPane('pane_transit_network_2').style['mix-blend-mode'] = 'normal';
var layer_transit_network_2 = new L.geoJson(json_transit_network_2, {
    attribution: '',
    interactive: true,
    dataVar: 'json_transit_network_2',
    layerName: 'layer_transit_network_2',
    pane: 'pane_transit_network_2',
    onEachFeature: pop_transit_network_2,
    style: style_transit_network_2_0,
});

function pop_transit_network_2(feature, layer) {
    var popupContent = '<table>\
            <tr>\
                <th scope="row">fid</th>\
                <td>' + (feature.properties['fid'] !== null ? autolinker.link(feature.properties['fid'].toLocaleString()) : '') + '</td>\
            </tr>\
            <tr>\
                <td colspan="2">' + (feature.properties['rte'] !== null ? autolinker.link(feature.properties['rte'].toLocaleString()) : '') + '</td>\
            </tr>\
            <tr>\
                <td colspan="2">' + (feature.properties['dir'] !== null ? autolinker.link(feature.properties['dir'].toLocaleString()) : '') + '</td>\
            </tr>\
            <tr>\
                <td colspan="2">' + (feature.properties['rte_desc'] !== null ? autolinker.link(feature.properties['rte_desc'].toLocaleString()) : '') + '</td>\
            </tr>\
            <tr>\
                <td colspan="2">' + (feature.properties['dir_desc'] !== null ? autolinker.link(feature.properties['dir_desc'].toLocaleString()) : '') + '</td>\
            </tr>\
            <tr>\
                <td colspan="2">' + (feature.properties['type'] !== null ? autolinker.link(feature.properties['type'].toLocaleString()) : '') + '</td>\
            </tr>\
            <tr>\
                <td colspan="2">' + (feature.properties['stop_seq'] !== null ? autolinker.link(feature.properties['stop_seq'].toLocaleString()) : '') + '</td>\
            </tr>\
            <tr>\
                <td colspan="2">' + (feature.properties['stop_id'] !== null ? autolinker.link(feature.properties['stop_id'].toLocaleString()) : '') + '</td>\
            </tr>\
            <tr>\
                <td colspan="2">' + (feature.properties['stop_name'] !== null ? autolinker.link(feature.properties['stop_name'].toLocaleString()) : '') + '</td>\
            </tr>\
            <tr>\
                <td colspan="2">' + (feature.properties['jurisdic'] !== null ? autolinker.link(feature.properties['jurisdic'].toLocaleString()) : '') + '</td>\
            </tr>\
            <tr>\
                <td colspan="2">' + (feature.properties['zipcode'] !== null ? autolinker.link(feature.properties['zipcode'].toLocaleString()) : '') + '</td>\
            </tr>\
            <tr>\
                <td colspan="2">' + (feature.properties['frequent'] !== null ? autolinker.link(feature.properties['frequent'].toLocaleString()) : '') + '</td>\
            </tr>\
            <tr>\
                <td colspan="2">' + (feature.properties['start'] !== null ? autolinker.link(feature.properties['start'].toLocaleString()) : '') + '</td>\
            </tr>\
            <tr>\
                <td colspan="2">' + (feature.properties['end'] !== null ? autolinker.link(feature.properties['end'].toLocaleString()) : '') + '</td>\
            </tr>\
            <tr>\
                <td colspan="2">' + (feature.properties['cost'] !== null ? autolinker.link(feature.properties['cost'].toLocaleString()) : '') + '</td>\
            </tr>\
            <tr>\
                <td colspan="2">' + (feature.properties['layer'] !== null ? autolinker.link(feature.properties['layer'].toLocaleString()) : '') + '</td>\
            </tr>\
            <tr>\
                <td colspan="2">' + (feature.properties['path'] !== null ? autolinker.link(feature.properties['path'].toLocaleString()) : '') + '</td>\
            </tr>\
        </table>';
    layer.bindPopup(popupContent, {maxHeight: 400});
    var popup = layer.getPopup();
    var content = popup.getContent();
    var updatedContent = removeEmptyRowsFromPopupContent(content, feature);
    popup.setContent(updatedContent);
}

function style_transit_network_2_0() {
    return {
        pane: 'pane_transit_network_2',
        opacity: 1,
        color: 'rgba(200,200,200,1.0)',
        dashArray: '',
        lineCap: 'square',
        lineJoin: 'bevel',
        weight: 1.0,
        fillOpacity: 0,
        interactive: true,
    }
}

bounds_group.addLayer(layer_transit_network_2);
map.addLayer(layer_transit_network_2);



var baseMaps = {};
L.control.layers(baseMaps,{'<img src="legend/street_network_3.png" /> street_network': layer_street_network_3,'<img src="legend/transit_network_2.png" /> transit_network': layer_transit_network_2,'<img src="legend/blocks_1.png" /> blocks': layer_blocks_1,"OpenStreetMap": layer_OpenStreetMap_0,}).addTo(map);
setBounds();

var featureGroup = L.featureGroup().addTo(map);

function onMapClick(e) {
    var coords = e.latlng;
    var marker = new L.marker(e.latlng).addTo(map);
    var popupContent =
    '<form role="form" id="form" enctype="multipart/form-data" class="form" >'+
        '<div class="form-group" style:"float:left;">'+
            '<h4>Generate transit isochrone from this location</h4>'+
            '<label for="lat">Lat: </label>'+
            '<input id="lat" type="text" readonly class="form-control" value="'+coords.lat.toFixed(6)+'"><br>'+
            '<label for="lon">Lon: </label>'+
            '<input id="lon" type="text" readonly class="form-control" value="'+coords.lng.toFixed(6)+'"><br>'+
            '<label for="time">Time limit (minutes): </label>'+
            '<input id="time" type="number" min="1" max ="60" class="form-control"><br>'+
            '<label for="velocity">Walking speed (kph): </label>'+
            '<input id="velocity" type="number" min="0" max ="60" value="4.5" class="form-control"><br>'+
            '<div class="form-group">'+
                    '<div style="text-align:center;" class="btn btn-primary"><button type="submit" value="submit" class="btn btn-primary trigger-submit">Submit</button></div>'+
            '</div>'+
        '</div>'+
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