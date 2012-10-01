
define([ "jquery",
          "route",
          "page",
          "state",
          "templates",
          "history.adapter.jquery"
         ], function($, route, page, state, templates) {

    var History = window.History,
        document = window.document,
        rootUrl = null;

    if (!History.enabled) {
        console.log('History not enabled');
        return false;
    }

    // load a link or submit a form via Ajax so we don't leave the page
    function hijaxLink(event) {
        var $this = $(this),
            url;

        if ($this.is('a')) {
            // click on a link
            if ($this.attr('data-role') === 'back') {
                console.log('going back');
                History.back();
                event.preventDefault();
                return false;
            }
            url = $this.attr('href');
            if (typeof(url) == 'undefined') {
                e.preventDefault();
                return true;
            }

        } else if ($this.is('form')) {
            // submiting a form
            var method = $this.attr('method') || 'get';
            if (method.toLowerCase() !== 'post') {
                // method is get
                var action = $this.attr('action');
                if (!action) {
                    action = '';
                }
                action = action.replace(/\?.*/, ''); // remove any query parameters as the browser apparently would
                url = action + '?' + $this.serialize();

            } else {
                console.log('not hijaxing post');
                return true;
            }
        }

       // Continue as normal for ctrl clicks or external links
        if (event.which === 2 || event.metaKey || event.ctrlKey ||
            ( url.substring(0,rootUrl.length) !== rootUrl && url.indexOf(':') !== -1 ) ||
            url.indexOf('#') !== -1 ) {
            console.log('not hijaxing', url);
            return true;
        }

        // hijax this link
        History.pushState(null,'',url); // don't know the title here, fill it in later

        event.preventDefault();
        return false;
    }

    function gotoUrl(url, title) {
        History.pushState(null, title, url);
    }

    function stateChange() {

        var url = History.getState().url;
        console.log("State changed...", url);
        renderUrl(url).then(function(title) {
            document.title = title;
        });
    }

    function hostRenderUrl(url) {
        console.log('hostRenderUrl', url);
        var $render = $.Deferred();

        // request the page
        $.ajax({
            url: url,
            data: { ajax: 1 }, // signal this is a ajax request right in the URL
            success: function(data, textStatus, jqXHR) {
                console.log('controller ajax gets data');
                var $newPage = $(data),
                    cls = $newPage.attr('class'),
                    type = (cls && cls.match(/[-a-z]+-page/)[0]) || 'server-page',
                    $oldPage = page.getInactive(type);
                $oldPage.replaceWith($newPage);
                $render.resolve($newPage);
            },

            error: function(jqXHR, textStatus, errorThrown) {
                console.log('ajax request failed for: ', url);
                document.location.href = url; // what is this?
                $render.reject(true); // passing true causes renderFailed (below) to not try again
            }
        }); // end ajax
        return $render;
    }

    function renderUrl(url) {
        console.log('renderUrl', url);
        var $pageReady = $.Deferred();

        function postRender($newPage, options) {
            console.log('newPage', $newPage);
            // transition to the new page
            page.transitionTo($newPage, options).then(function($newPage, title) {
                $(window).off('beforeunload'); // be sure the beforeunload handler gets disabled
                route.go('init', url, $newPage);
                $(window).scrollTop(0);
                $pageReady.resolve(title);
            });
        }

        function renderFailed(die) {
            // this is invoked if the render call failed. We allow for a retry from the host
            // if the render that failed was client side allowing for backing out of client-side
            // rendering.
            console.log('renderFailed', die);
            if (die) {
                console.log('renderFailed quit');
                return;
            }
            hostRenderUrl(url).then(postRender, renderFailed);
            console.log('renderFailed returns');
        }

        // update my app internal state from the cookie and any query parameters
        state.update(url);

        // make sure we've got the right templates for the locale
        templates.setLocale().then(function() {

            // if there is a local handler for this url call it
            var $render = route.go('render', url);

            if ($render === false) { // no local handler, fetch the page from the server
                $render = hostRenderUrl(url);
            }
            // deferred will be resolved when page has been rendered either locally or on server
            $render.then(postRender, renderFailed);
        });
        return $pageReady;
    } // end renderUrl

    // wait for the document
    $(function() {
        var $body = $(document.body);
        rootUrl = History.getRootUrl();

        $body.on('click', 'button.urlRetry', function(e) {
            console.log('retry after error');
            e.preventDefault();
            stateChange();
            return false;
        });

        // hookup links
        $body.on('click', 'a:not(.no-ajaxy)', hijaxLink);

        // and forms
        $body.on('submit', 'form:not(.no-ajaxy)', hijaxLink);

        // hook into state changes
        $(window).on('statechange', stateChange);

    }); // end on dom ready

    return {
        stateChange: stateChange,
        gotoUrl: gotoUrl
    };
});
