define([
    'jquery',
    'route',
    'state',
    "jquery.scrollIntoView"
], function($, route, state) {

    function hideControls() {
        $('.active-page .controlList li.active').removeClass('active')
                                                .find("div").slideUp();
                                                
    }

    // display the controls on click
    $(document).on('click', '.controlList li span', function(ev) {
        // we need a cool transition here. Maybe the controls could slide into view?
        // I'm going to do the simple stupid thing

        // hide any that are shown
        hideControls();

        // activate this one
        $(this).parent().addClass('active')
                        .find("div").slideDown();
        console.log($(this).parent().find("div"));

    });

    // hide the controls on cancel
    $(document).on('click', '.controlList button[data-action="cancel"]', function(event) {
        hideControls();
    });


    return {};
});
