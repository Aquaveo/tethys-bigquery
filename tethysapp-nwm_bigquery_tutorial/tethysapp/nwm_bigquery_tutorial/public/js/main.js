const forecastOffsets = {"short_range": 1, "medium_range": 3, "medium_range_no_da": 3, "long_range": 6};

window.onload = function() {
    $("#table").on("change", function() {
        var table = $("#table").val();
        $("#forecast_offset").val(forecastOffsets[table]);
    });

    $("#query-form").on("submit", function(event) {
        console.log("Here we go!");

        event.preventDefault();
        var formData = new FormData(this);
        
        // Check if all required fields are filled in
        const requiredFields = ['reach_id', 'start_date', 'start_time', 'end_date', 'end_time', 'table', 'variable'];
        const missingFields = requiredFields.filter(field => !formData.get(field));
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
    