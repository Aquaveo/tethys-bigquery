from tethys_sdk.base import TethysAppBase


class NwmBigqueryTutorial(TethysAppBase):
    """
    Tethys app class for NWM BigQuery Tutorial.
    """

    name = 'NWM BigQuery Tutorial'
    description = 'Tutorial for an application that allows users to query data from the National Water Model and visualize the results.'
    package = 'nwm_bigquery_tutorial'  # WARNING: Do not change this value
    index = 'home'
    icon = f'{package}/images/NWM_app_image.png'
    root_url = 'nwm-bigquery-tutorial'
    color = '#5CA4FD'
    tags = ''
    enable_feedback = False
    feedback_emails = []