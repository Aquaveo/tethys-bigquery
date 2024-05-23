from tethys_sdk.base import TethysAppBase
from tethys_sdk.app_settings import CustomSetting

class NwmBigqueryTutorial(TethysAppBase):
    """
    Tethys app class for NWM BigQuery Tutorial.
    """

    name = 'NWM BigQuery Tutorial'
    description = 'Tutorial for an application that allows users to query data from the National Water Model and visualize the results.'
    package = 'nwm_bigquery_tutorial'  # WARNING: Do not change this value
    index = 'home'
    icon = f'{package}/images/NWM_app_icon.png'
    root_url = 'nwm-bigquery-tutorial'
    color = '#5CA4FD'
    tags = ''
    enable_feedback = False
    feedback_emails = []

    def custom_settings(self):
        custom_settings = (
            CustomSetting(
                name='project_id',
                type=CustomSetting.TYPE_STRING,
                description='Google Cloud Project ID',
                required=True
            ),
        )
        return custom_settings