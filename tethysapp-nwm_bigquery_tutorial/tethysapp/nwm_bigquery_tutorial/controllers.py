import os
import datetime

from tethys_sdk.routing import controller
from tethys_sdk.layouts import MapLayout
from tethys_sdk.gizmos import DatePicker, SelectInput, TextInput, Button

from django.http import JsonResponse

from google.cloud.bigquery import Client

from .app import NwmBigqueryTutorial as app

os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = os.getcwd() + 'name_of_your_file_here.json'

@controller(name="home", app_workspace=True)
class NWMBigQueryMap(MapLayout):
    app = app
    base_template = 'nwm_bigquery_tutorial/base.html'
    template_name = 'nwm_bigquery_tutorial/home.html'
    map_title = 'National Water Model BigQuery Tutorial'
    map_subtitle = 'NWM Big Query Outputs'
    basemaps = [
        'OpenStreetMap',
        'ESRI',
        'Stamen',
        {'Stamen': {'layer': 'toner', 'control_label': 'Black and White'}},
    ]

    def get_context(self, request, *args, **kwargs):
        # Reach ID text input field Gizmo
        reach_id = TextInput(display_text='Reach ID', name='reach_id', placeholder='Enter a Reach ID', attributes={"class": "form-input"})

        # Create time range options for start and end reference times
        time_range = [(f"{i}:00:00", f"{i}:00:00") for i in range(0, 24)]
        start_time_options = [('Select a start reference time', '')] + time_range
        end_time_options = [('Select an end reference time', '')] + time_range

        # Start and end reference date and time Gizmos
        start_date = DatePicker(display_text='Start Reference Date', name='start_date', attributes={"class": "form-input"})
        start_time = SelectInput(display_text='Start Reference Time', name='start_time', multiple=False, options=start_time_options, attributes={"class": "form-input"})
        end_date = DatePicker(display_text='End Reference Date', name='end_date', attributes={"class": "form-input"})
        end_time = SelectInput(display_text='End Reference Time', name='end_time', multiple=False, options=end_time_options, attributes={"class": "form-input"})

        # Table and variable select input drop down Gizmos
        table_options = [('Select a table', ''),
                         ('Short Range', 'short_range'),
                         ('Medium Range', 'medium_range'),  
                         ('Medium Range No DA', 'medium_range_no_da'),  
                         ('Long Range', 'long_range')]
       
        table = SelectInput(display_text='Table', name='table', multiple=False, options=table_options, attributes={"class": "form-input"})
        variable_options = [('Select a variable', ''), ('Streamflow', 'streamflow'), ('Velocity', 'velocity')]
        variable = SelectInput(display_text='Variable', name='variable', multiple=False, options=variable_options, attributes={"class": "form-input"})\
       
        # Forecast offset text input field Gizmo - this will be hidden but is used in the query and will be
        # changed in javascript dynamically based on the table that's been selected
        forecast_offset = TextInput(name='forecast_offset', attributes={"style": "display:none;"})

        # Download and Query buttons
        download_button = Button(display_text='Download', name='download', style='primary', attributes={"id": "download-button"})
        query_button = Button(display_text='Query', name='query', style='success', submit=True, attributes={'form': 'query-form'})

        # Generate the base context to add Gizmos to
        context = super().get_context(request, *args, **kwargs)

        # Add Gizmos to the context
        context['reach_id'] = reach_id
        context['start_date'] = start_date
        context['start_time'] = start_time
        context['end_date'] = end_date
        context['end_time'] = end_time
        context['table'] = table
        context['variable'] = variable
        context['download_button'] = download_button
        context['query_button'] = query_button
        context['forecast_offset'] = forecast_offset

        return context

    def post(self, request, *args, **kwargs):
        form_data = request.POST

        query_results = self.run_query(form_data)
        data, layout = self.get_graph_data(query_results, form_data.get('variable'))
        download_data = self.get_download_data(query_results)

        return JsonResponse({'message': "Success",
                             'download_data':download_data,
                             'data': data,
                             'graph_layout': layout})
    
    def run_query(self, query_parameters):
        project_id = app.get_custom_setting('project_id')
        client = Client( project=project_id)
       
        reach_id = query_parameters.get('reach_id')
        table = query_parameters.get("table")
        variable_choice = query_parameters.get("variable")

        start_date = query_parameters.get('start_date')
        start_date = datetime.datetime.strptime(start_date, '%m/%d/%Y').date()
        start_date = str(start_date.strftime("%Y-%m-%d"))

        start_time = query_parameters.get('start_time')

        end_date = query_parameters.get('end_date')
        end_date = datetime.datetime.strptime(end_date, '%m/%d/%Y').date()
        end_date = str(end_date.strftime("%Y-%m-%d"))

        end_time = query_parameters.get('end_time')

        forecast_offset = query_parameters.get('forecast_offset')

        query = f"""
                    SELECT
                        reference_time,
                        ensemble,
                        {variable_choice} as variable_value
                    FROM
                        `bigquery-public-data.national_water_model.{table}_channel_rt`
                    WHERE
                        feature_id = {reach_id}
                        AND
                        reference_time >= '{start_date} {start_time}'
                        AND
                        reference_time <= '{end_date} {end_time}'
                        AND
                        forecast_offset = {forecast_offset}
                    ORDER BY
                        reference_time, ensemble
                """
        
        job = client.query(query)
        df = job.to_dataframe()
       
        return df

    def get_graph_data(self, query_results, variable_choice):
        ensembles = query_results['ensemble'].unique().tolist()
        data_sets = []
        for ensemble in ensembles:
            # Only make the 0 ensemble data visible by default in our graph
            visible = True if ensemble == 0 else 'legendonly'
            filtered_rows = query_results[query_results['ensemble'] == ensemble]
            
            x_data = filtered_rows["reference_time"].tolist()
            y_data = filtered_rows["variable_value"].tolist()

            data_sets.append({'x': x_data, 'y': y_data, 'name': f'Ensemble {ensemble}', 'visible': visible})
            
        min_values = query_results.groupby('reference_time')['variable_value'].min().tolist()
        max_values = query_results.groupby('reference_time')['variable_value'].max().tolist()
        
        datetimes = query_results['reference_time'].unique().tolist()
        data_sets.append({'x': datetimes, 'y': min_values, 'name': 'Min Values', 'visible': 'legendonly', })
        data_sets.append({'x': datetimes, 'y': max_values, 'name': 'Max Values', 'visible': 'legendonly', })

        # Create a layout dictionary to customize the appearance of the graph
        layout = {
            'xaxis': {'title': 'Date/Time'},
            'yaxis': {'title': f'{variable_choice}'},
            'template': 'plotly_dark'
        }

        return data_sets, layout
    
    def get_download_data(self, query_results):
        ensembles = query_results['ensemble'].unique()
        data_groups = []
        
        for ensemble in ensembles:
            rows = query_results[query_results['ensemble'] == ensemble]
            new_values_dict = {"group_name": f"Ensemble {ensemble}", "reference_time": rows["reference_time"].tolist(), "variable_values": rows["variable_value"].tolist(), "ensemble": rows["ensemble"].tolist()}
            data_groups.append(new_values_dict)

        min_indices = query_results.groupby('reference_time')['variable_value'].idxmin()
        max_indices = query_results.groupby('reference_time')['variable_value'].idxmax()
        min_rows = query_results.loc[min_indices]
        max_rows = query_results.loc[max_indices]

        data_groups.append({"group_name": "Minimum Values", "reference_time": min_rows["reference_time"].tolist(), "variable_values": min_rows["variable_value"].tolist(), "ensemble": min_rows["ensemble"].tolist()})
        data_groups.append({"group_name": "Maximum Values", "reference_time": max_rows["reference_time"].tolist(), "variable_values": max_rows["variable_value"].tolist(), "ensemble": max_rows["ensemble"].tolist()})

        return data_groups

    def compose_layers(self, request, map_view, app_workspace, *args, **kwargs):
        # Streamflow layer
        streamflow_layer = self.build_arc_gis_layer(endpoint='https://mapservice.nohrsc.noaa.gov/arcgis/rest/services/national_water_model/NWM_Stream_Analysis/MapServer',
                                                            layer_id = "streamflow",
                                                            layer_name = "0",
                                                            layer_title = "Streamflow",
                                                            layer_variable="streamflow",
                                                            visible=True,
                                                            selectable=True)
        
        # Local layer
        local_layer = self.build_arc_gis_layer(endpoint='https://mapservice.nohrsc.noaa.gov/arcgis/rest/services/national_water_model/NWM_Stream_Analysis/MapServer',
                                                           layer_id = "local",
                                                           layer_name = "7",
                                                           layer_title = "Local",
                                                           layer_variable="local",
                                                           visible=True,
                                                           selectable=True)
        
        # Anomaly layer
        anomaly_layer = self.build_arc_gis_layer(endpoint='https://mapservice.nohrsc.noaa.gov/arcgis/rest/services/national_water_model/NWM_Stream_Analysis/MapServer',
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
    