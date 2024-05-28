import Point from "https://js.arcgis.com/4.29/@arcgis/core/geometry/Point.js";
import *  as geometryEngine from "https://js.arcgis.com/4.29/@arcgis/core/geometry/geometryEngine.js";

const forecastOffsets = {"short_range": 1, "medium_range": 3, "medium_range_no_da": 3, "long_range": 6};

function getDistanceByZoom(zoom) {
    switch (true) {
        case (zoom > 20):
            return 25;
        case (zoom > 17):
            return 125;
        case (zoom > 14):
            return 250;
        case (zoom > 11):
            return 500;
        case (zoom > 8):
            return 1000;
        case (zoom > 5):
            return 2000;
    }
    return 10000;
 }

 const isBlank = (str) => {
    return (!str || /^\s*$/.test(str) || str === null);
 }

const getCurrentReachOnClick = (esriPaths) => {
    // Transform ESRI paths into coordinates array for LineString
    const coordinates = esriPaths.map(path => path.map(point =>[point[0], point[1]]))[0];
    const geojsonObject = 
        {
            'type': 'LineString',
            'coordinates': coordinates
        }
 
    return geojsonObject
 }

function processStreamServiceQueryResult(zoom, point, response, map) {
    var minStreamOrder = 5;
    var soAttrName = null;
    var fidAttrName = null;
    var nameAttrName = null;
 
    if (response.features.length === 0) {
        return;
    }
 
    if (zoom >= 5) minStreamOrder--;
    if (zoom >= 6) minStreamOrder--;
    if (zoom >= 8) minStreamOrder--;
    if (zoom >= 10) minStreamOrder--;
 
 
    response.fields.forEach(function (field) {
        if (!fidAttrName && /^(reach_id|station_id|feature_id)$/i.test(field.alias)) {
            fidAttrName = field.name;
        }
 
        if (!soAttrName && /^(stream_?order)$/i.test(field.alias)) {
            soAttrName = field.name;
        }
 
        if (!nameAttrName && /^((reach|gnis)?_?name)$/i.test(field.alias)) {
            nameAttrName = field.name;
        }
    });
 
    var validFeatures = [];
 
    response.features.forEach(function (feature) {
        if (feature.attributes[soAttrName] < minStreamOrder) {
            return;
        }
 
        validFeatures.push(feature);
    });
 
    validFeatures.map(function getDistanceFromPoint(feature) {
        feature.distance = geometryEngine.distance(point, feature.geometry);
        return feature;
    })
    validFeatures.sort(function sortByDistance(a, b) {
        return a.distance - b.distance;
    });
 
    if (validFeatures.length === 0) {
        return;
    }
    
    let stationID = validFeatures[0].attributes[fidAttrName]
 
    let currentGeojsonReach;
    currentGeojsonReach = getCurrentReachOnClick(validFeatures[0].geometry.paths)
    
    if (currentGeojsonReach != undefined) {
          var coordinates = currentGeojsonReach.coordinates;
          var firstPoint = coordinates[0];
          var lastPoint = coordinates[coordinates.length - 1];
 
          var geojsonSource = new ol.source.Vector({
             features: (new ol.format.GeoJSON()).readFeatures(currentGeojsonReach, {
                dataProjection: 'EPSG:4326',
                featureProjection: 'EPSG:3857'
            })
          });
 
          var firstPointFeature = new ol.Feature({
             geometry: new ol.geom.Point(ol.proj.transform(firstPoint, 'EPSG:4326', 'EPSG:3857'))
          });
 
          var lastPointFeature = new ol.Feature({
             geometry: new ol.geom.Point(ol.proj.transform(lastPoint, 'EPSG:4326', 'EPSG:3857'))
          });
          
 
          geojsonSource.addFeature(firstPointFeature);
          geojsonSource.addFeature(lastPointFeature); 
 
          var highlightedLayer = new ol.layer.Vector({
             source: geojsonSource,
             style: function(feature) {
                if (feature.getGeometry() instanceof ol.geom.Point) {
                      return new ol.style.Style({
                         image: new ol.style.Circle({
                            radius: 7,
                            stroke: new ol.style.Stroke({
                               color: 'yellow',
                               width: 2
                            }),
                            fill: new ol.style.Fill({
                                  color: 'red'
                            })
                         })
                      });
                } else {
                      return new ol.style.Style({
                         stroke: new ol.style.Stroke({
                            color: 'yellow',
                            width: 5
                         })
                      });
                }
             }
          });
 
          if (lastHighlightedLayer) {
             map.removeLayer(lastHighlightedLayer);
          }
    
          lastHighlightedLayer = highlightedLayer
 
          highlightedLayer.setZIndex(1000);
          map.addLayer(highlightedLayer);
 
    }
    map.getView().fit(geojsonSource.getExtent());
    map.getView().setZoom(map.getView().getZoom() - 1);
    
   
    return stationID;
 }

window.onload = function() {
    var map = TETHYS_MAP_VIEW.getMap();

    console.log(map);

    $("#table").on("change", function() {
        console.log("Hi");
        var table = $("#table").val();
        $("#forecast_offset").val(forecastOffsets[table]);
    });
    
    map.on('click', function(evt) {
        console.log("Map clicked");
        const pixel = map.getEventPixel(evt.originalEvent);
        let features = [];
        let mapServerInfo = [];

        let clickCoordinate = evt.coordinate;
        
        const layer = map.getLayers().getArray().filter(layer => layer.hasOwnProperty('tethys_data')).find(layer => layer.tethys_data.layer_id == 'anomaly');
        const urlService = layer.getSource().getUrls()[0]; // collect mapServer URL
        
        const id = layer
            .getSource()
            .getParams()
            .LAYERS.replace('show:', '') // remove the visible component to just get the raw url
            
        const server = mapServerInfo.find(server => server.url === urlService) // see if server already exists in mapServerInfo
        
        if (!server) {
            // Query Layer 5 
            const spatialReference= {"latestWkid":3857,"wkid":102100}
            const geometry = {"spatialReference":spatialReference ,"x":clickCoordinate[0],"y":clickCoordinate[1]}
            
            const queryLayer5 = {
                geometry: JSON.stringify(geometry),
                outFields:'*',
                geometryType: 'esriGeometryPoint',
                spatialRel: "esriSpatialRelIntersects",
                units:'esriSRUnit_Meter',
                distance: getDistanceByZoom(map.getView().getZoom()),
                sr: `${map.getView().getProjection().getCode().split(/:(?=\d+$)/).pop()}`,
                returnGeometry: true, // I don't want geometry, but you might want to display it on a 'selection layer'
                f: 'json',
                inSR:102100,
                outSR:4326
            }

            const url = new URL(`${urlService}/5/query`);
            url.search = new URLSearchParams(queryLayer5);
            axios.get(url).then((response) => {
                console.log(response.data);
                const filteredArray = response.data['features'][0]
                const actual_zoom = map.getView().getZoom()
                var esriMapPoint = new Point({
                    longitude: clickCoordinate[0],
                    latitude: clickCoordinate[1],
                    spatialReference: spatialReference,
                });
                let currentStreamFeatureID = processStreamServiceQueryResult(actual_zoom, esriMapPoint, response.data, map)
                if (currentStreamFeatureID != undefined) {
                $("#reach_id").val(currentStreamFeatureID);
                }
                console.log(currentStreamFeatureID);
    
    
            }).catch((error) => {
                console.log(error);
            });
        } else {
            mapServerInfo.find(server => server.url === url).layers.push(id) // if so, add the ID of this layer for query
        }

        map.forEachFeatureAtPixel(pixel, function(feature, layer) {
            features.push(feature);
         });
    })

    document.getElementById('query-form').addEventListener('submit', function(event) {
        event.preventDefault();
        var formData = new FormData(this);
        
        // Check if all required fields are filled in
        const requiredFields = ['reach_id', 'start_date', 'start_time', 'end_date', 'end_time', 'table', 'variable'];
        const missingFields = requiredFields.filter(field => !formData.has(field));
        if (missingFields.length > 0) {
            TETHYS_APP_BASE.alert("danger", "Make sure to fill in all required fields.");
            return;
        }

        MAP_LAYOUT.show_plot();
        MAP_LAYOUT.update_plot(``, {}, {});
        var loadingGifDiv = $('<div>', {
            id: 'loading-gif-div',
            css: { display: 'none',
                   position: 'fixed',
                   top: '60%',
                   left: '30%',
                   width: '20%',
                   'z-index': 1000
                 }
        });

        var loadingGif = $('<img>', {
            id: 'loading-gif-image',
            src: '/static/nwm_bigquery_tutorial/images/graph-loading-image.gif',
            alt: 'Loading...',
            css: { width: '100%' }
        });

        loadingGifDiv.append(loadingGif);

        var slideSheet = $(".slide-sheet-content").first();
        slideSheet.find(".row").eq(1).append(loadingGifDiv);

        $("#loading-gif-div").show();
        
        fetch('/apps/nwm-bigquery-tutorial/', {
            method: 'POST',
            body: formData
         }).then(response => response.json())
         .then(data => {
            var variable = formData.get('variable');
            var reach = formData.get('reach_id');
            if (data.data[0].x.length == 0) {
                TETHYS_APP_BASE.alert("danger", "No data was returned from your query. Please try again.");
                $("#loading-gif-div").hide();
                return;
            }
            MAP_LAYOUT.update_plot(`${variable} at ${reach}`, data.data, data.graph_layout);
            $("#loading-gif-div").hide();

        }).catch(error => {
            console.log(error);
            TETHYS_APP_BASE.alert("danger", "There was an issue loading that query's results. Please try again.");
            $("#loading-gif-div").hide();
         });

    });
}
    
