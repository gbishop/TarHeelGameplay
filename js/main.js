define([
    "route",
    "state",
    "controller",
    "find",
    "creator",
    "gameplay",
    "busy",
    "navigation",
    "help",
    "yourgames"
    ],
    function(route, state, controller) {
        $(function() {
            var url = window.location.href,
                $page = $('.active-page');
            // run any configure hooks
            $page.trigger('PageRendered');
            route.go('init', url, $page);
            $page.trigger('PageVisible');
            $('div.loading').removeClass('loading');
        });
    });
