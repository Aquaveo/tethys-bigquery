const forecastOffsets = {"short_range": 1, "medium_range": 3, "medium_range_no_da": 3, "long_range": 6};

window.onload = function() {
    $("#table").on("change", function() {
        var table = $("#table").val();
        $("#forecast_offset").val(forecastOffsets[table]);
     });

     $("#query-form").on("submit", function(event) {
        event.preventDefault();
        var formData = new FormData(this);
        
        // Check if all required fields are filled in
        const requiredFields = ['reach_id', 'start_date', 'start_time', 'end_date', 'end_time', 'table', 'variable'];
        const missingFields = requiredFields.filter(field => !formData.get(field));
        if (missingFields.length > 0) {
            TETHYS_APP_BASE.alert("danger", "Make sure to fill in all required fields.");
            return;
        }
        console.log("Reach ID: ", formData.get('reach_id'));
        console.log("Start Date: ", formData.get('start_date'));
        console.log("Start Time: ", formData.get('start_time'));
        console.log("End Date: ", formData.get('end_date'));
        console.log("End Time: ", formData.get('end_time'));
        console.log("Table: ", formData.get('table'));
        console.log("Variable: ", formData.get('variable'));
        console.log("Forecast Offset: ", formData.get('forecast_offset'));
    });
}
    

