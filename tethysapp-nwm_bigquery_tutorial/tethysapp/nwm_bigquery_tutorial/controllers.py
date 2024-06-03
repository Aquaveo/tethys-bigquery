from tethys_sdk.layouts import MapLayout
from tethys_sdk.routing import controller
from .app import NwmBigqueryTutorial as app

@controller(name="home", app_workspace=True)
class NWMBigQueryMap(MapLayout):
    app = app
    base_template = 'nwm_bigquery_tutorial/base.html'
    map_title = 'National Water Model BigQuery Tutorial'
    map_subtitle = 'NWM Big Query Outputs'
    basemaps = [
        'OpenStreetMap',
        'ESRI',
    ]

    def compose_layers(self, request, map_view, app_workspace, *args, **kwargs):
        # Streamflow layer
        streamflow_layer = self.build_arc_gis_layer(endpoint='https://mapservices.weather.noaa.gov/vector/rest/services/obs/NWM_Stream_Analysis/MapServer',
                                                            layer_id = "streamflow",
                                                            layer_name = "0",
                                                            layer_title = "Streamflow",
                                                            layer_variable="streamflow",
                                                            visible=True,
                                                            selectable=True)
        
        # Local layer
        local_layer = self.build_arc_gis_layer(endpoint='https://mapservices.weather.noaa.gov/vector/rest/services/obs/NWM_Stream_Analysis/MapServer',
                                                           layer_id = "local",
                                                           layer_name = "7",
                                                           layer_title = "Local",
                                                           layer_variable="local",
                                                           visible=True,
                                                           selectable=True)
        
        # Anomaly layer
        anomaly_layer = self.build_arc_gis_layer(endpoint='https://mapservices.weather.noaa.gov/vector/rest/services/obs/NWM_Stream_Analysis/MapServer',
                                                           layer_id = "anomaly",
                                                           layer_name = "14",
                                                           layer_title = "Anomaly",
                                                           layer_variable="anomaly",
                                                           visible=True,
                                                           selectable=True)

        # Add layers to map
        map_view.layers.append(streamflow_layer)
        map_view.layers.append(local_layer)
        map_view.layers.append(anomaly_layer)

        # Add layer to layer group
        layer_groups = [
            self.build_layer_group(
                id='nwm_layers',
                display_name='NWM Layers',
                layer_control='checkbox',
                layers=[streamflow_layer, local_layer, anomaly_layer],
            )
        ]

        return layer_groups
    