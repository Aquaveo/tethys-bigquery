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
        'Stamen',
        {'Stamen': {'layer': 'toner', 'control_label': 'Black and White'}},
    ]