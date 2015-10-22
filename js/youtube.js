define([], function() {
    function loadApi() {
        var $def = $.Deferred();
        window.onYouTubeIframeAPIReady = function () {
            $def.resolve();
        };
        $.getScript('https://www.youtube.com/iframe_api');
        return $def;
    }

    function loadVideo(videoId, node, onSC) {
        $def = $.Deferred();
        var pauseOnPlay = true,
            player = new YT.Player(node, {
                videoId: videoId,
                playerVars: {
                    iv_load_policy: 3
                },
                events: {
                    onReady: function() {
                        player.playVideo();
                    },
                    onStateChange: function(event) {
                        if (pauseOnPlay && event.data == YT.PlayerState.PLAYING) {
                            player.pauseVideo();
                            pauseOnPlay = false;
                            $def.resolve(player);
                        }
                        if(onSC) {
                            onSC(event);
                        }
                    }
                }
            });
        console.log('player', player);
        return $def;
    }

    return {
        loadApi: loadApi,
        loadVideo: loadVideo
    };
});