const forecastOffsets = {"short_range": 1, "medium_range": 3, "medium_range_no_da": 3, "long_range": 6};

window.onload = function() {
    $("#table").on("change", function() {
        console.log("Hi");
        var table = $("#table").val();
        $("#forecast_offset").val(forecastOffsets[table]);
     });

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
        
        fetch('/apps/nwm-bigquery-tutorial/', {
            method: 'POST',
            body: formData
         }).then(response => response.json())
         .then(data => {
            console.log(data);
        });

    });
}
    

