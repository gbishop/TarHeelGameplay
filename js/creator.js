$.getScript('https://www.youtube.com/iframe_api');

function ytVideoId(id_or_url) {
    var regExp = /^.*(youtube\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    var match = id_or_url.match(regExp);
    if (match && match[2].length == 11) {
      id_or_url = match[2];
    }
    return id_or_url;
}

var slug = null;
var videoID = '';

$(function() {
    var $q = $('#quick');
    function saveGameplay(e) {
        e.preventDefault();
        var $errors = $q.find('div#errors'),
            $messages = $q.find('div#errors');
        $errors.empty();
        $messages.empty();

        // validate title
        var title = $q.find("input[name='title']").val(),
            rating = $q.find("select[name='rating']").val(),
            ytid = $q.find("input[name='video']").val(),
            message = $q.find("input[name='message']").val(),
            $gp = $q.find('#quick-gameplay'),
            link = $gp.attr('action') + '?' + $gp.serialize();
        // get the nonce
        var method = 'create_post',
            args = {
                title: title,
                content: message,
                categories: 'Gameplay',
                tags: 'error free',
                format: 'video',
                'custom[ytid]': ytid,
                'custom[link]': link,
                status: 'publish'
            };
        if (slug) {
            args['slug'] = slug;
            method = 'update_post';
        }
        $.get('/api/get_nonce/', {
                controller: 'posts',
                method: method })
        .done(function(res) {
            console.log('nonce', res.nonce);
            args.nonce = res.nonce;
            // create the new post
            $.post('/api/posts/' + method + '/', args)
            .done(function(r) {
                console.log('cp', r);
                $messages.append(slug ? 'Gameplay updated' : 'Gameplay saved');
            }).error(function(e) {
                $errors.append('Save failed');
            });
        });
    }

    function enablePlay() {
        var ok = $q.find("input[name='video']").val() &&
            $q.find("input[name='interval']").val() &&
            $q.find("input[name='message']").val();

        $q.find('#qplay').prop('disabled', !ok);
    }

    function enableSave() {
        var ok = $q.find("input[name='title']").val() &&
            !$('#qplay').prop('disabled');
        $q('#save').prop('disabled', !ok);
    }

    var $video = $q.find("input[name='video']");
    $video.on('change', function(e) {
        console.log('change', e);
        $video.val(ytVideoId($video.val()));
    });
    $q.find('#quick-gameplay input').on('change', enablePlay);
    $q.find('input').on('keyup', enablePlay);
    $q.find('#save-gameplay input').on('change', enableSave);
    $q.find('#save-gameplay').on('submit', saveGameplay);


});

function onYouTubeIframeAPIReady() {
    console.log('api ready');
    $(function() {
        $(document).trigger('apiReady');
    });
}

$(function() {
    $('ul.tabs li').click(function(){
        var tab_id = $(this).attr('data-tab');

        $('ul.tabs li').removeClass('current');
        $('.tab-content').removeClass('current');

        $(this).addClass('current');
        $("#"+tab_id).addClass('current');
    });
});

$(function() {
    var $a = $('#advanced');

    var player;
    function loadVideo() {
        videoId = $a.find("input[name='video']").val();
        console.log(videoId);
        var regExp = /^.*(youtube\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        var match = videoId.match(regExp);
        console.log(match);
        if (match && match[2].length == 11) {
          videoId = match[2];
        }
        console.log(videoId);
        player = new YT.Player('player', {
            //height: "30em",
            //width: "40em",
            videoId: videoId,
            events: {
                'onReady': function() {
                    console.log('player ready');
                    //player.seekTo(0.0, true);
                    //player.pauseVideo();
                    initTimepoints();
                    setInterval(showTime, 100);
                    $a.find('#controls').show();
                    $a.find('#tp-editor').show();
                },
                'onStateChange': onPlayerStateChange
            }
        });
    }
    var pauseOnPlay = true;
    var duration = 0;
    function initTimepoints() {
        duration = player.getDuration();
        console.log('duration', duration);
        var $tp = $a.find('#timepoints');
        $tp.find('li:gt(0)').remove();
        //$tp.append(createTimepoint(0.0, 'start', []));
        //$tp.append(createTimepoint(0.0, 'stop', [{message:'foo'},{message: 'bar', target: 10}]));
        $a.find('#aplay').attr('disabled', false);
        player.playVideo();
    }

    function createTimepoint(time, type, prompts, $item) {
        var v = {
            type: type,
            time: time,
            prompts: prompts,
            timeLabel: type=='start' ? 'Start at' : 'Pause at'
        };
        $item = $(ich.timepoint(v));
        return $item;
    }

    function insertTimepoint($tp) {
        $a.find('#timepoints').append($item);
        return $item;
    }

    function stepVideo(amt) {
        player.pauseVideo();
        var t = player.getCurrentTime();
        console.log('sV', amt, t);
        t += amt;
        player.seekTo(t, true);
        player.pauseVideo();
    }


    function onPlayerStateChange(event) {
        console.log('state change', event.data);
        if (pauseOnPlay && event.data == YT.PlayerState.PLAYING) {
            player.pauseVideo();
            pauseOnPlay = false;
        }
    }

    Number.prototype.toFixedDown = function(digits) {
        var re = new RegExp("(\\d+\\.\\d{" + digits + "})(\\d)"),
            m = this.toString().match(re);
        return m ? parseFloat(m[1]) : this.valueOf();
    };

    function showTime() {
        var t = player.getCurrentTime();
        t = t.toFixedDown(1);
        $a.find('#current-time').val(t);
    }

    function addTimepoint() {
        var t = parseFloat($('#current-time').val());
        var m = $a.find('#message').val();
        var $tp = createTimepoint(t, 'stop', m);
        var $tps = $a.find('#timepoints');
        $tps.append($tp);
        setSelectedTimepoint($tp);
    }

    function updateTimepoint($tp) {
        var t = parseFloat($('#current-time').val());
        var m = $a.find('#message').val();
        createTimepoint(t, $tp.data('tp').type, m, $tp);
    }

    function deleteTimepoint() {
        if (!$selectedTimepoint) {
            return;
        }
        $selectedTimepoint.remove();
        setSelectedTimepoint(null);
    }

    function play() {
        var tps = [],
            mis = [],
            messages = [];
        function getMessageIndex(s) {
            var mi = messages.indexOf(s);
            if (mi < 0) {
                messages.push(s);
                mi = messages.length - 1;
            }
            return mi;
        }
        // sort the timepoints
        var $tps = $("#timepoints");
        $tps.children().detach().sort(function(a, b) {
            var ta = $(a).data('tp').time,
                tb = $(b).data('tp').time;
            return ta==tb ? 0 : (ta > tb) ? 1 : -1;
        }).appendTo($tps);
        $tps.children().each(function() {
            var $this = $(this),
                tp = $this.data('tp');
            // get message index
            if (typeof(tp.prompt) === 'string') {
                mis.push(getMessageIndex(tp.prompt));
            } else {
                mis.push(tp.prompt.map(getMessageIndex));
            }
            tps.push(tp.time);
        });
        var res = {
            t: tps,
            i: mis,
            m: messages,
            v: videoId
        };
        var url = '/app2/gameplay.html?' + URLON.stringify(res);
        console.log('url', url);
        window.open(url, videoId);
    }

    var $selectedTimepoint = null;
    function setSelectedTimepoint($tp) {
        $selectedTimepoint = $tp;
        $a.find('#timepoints li.selected').removeClass('selected');
        if ($selectedTimepoint) {
            $selectedTimepoint.addClass('selected');
            $a.find('#update').attr('disabled', false);
            $a.find('#delete').attr('disabled', false);
        } else {
            $a.find('#update').attr('disabled', true);
            $a.find('#delete').attr('disabled', true);
        }
    }

    $(document).on('apiReady', function() {
        console.log('apiReady');
        $a.find('#loadVideo').prop('disabled', false);
    });

    $a.find('#loadVideo').on('click', loadVideo);
    $a.find('#player-controls button').on('click', function() {
        var amt = parseFloat(this.dataset.step);
        stepVideo(amt);
    });
    $a.find('#add').on('click', addTimepoint);
    $a.find('#update').on('click', function() {
        if (!$selectedTimepoint){
            return;
        }
        updateTimepoint($selectedTimepoint);
    });
    $a.find('#timepoints').append(createTimepoint(0, 'start', []));
    $a.find('#timepoints').on('click', 'li', function() {
        var $this = $(this);
        setSelectedTimepoint($this);
        var tp = $this.data('tp');
        player.seekTo(tp.time, true);
        // fix for multiple prompts
        $a.find('#message').val(tp.prompt || '');
    });
    $a.find('#delete').on('click', deleteTimepoint);
    console.log($a.find('#play'));
    $a.find('#aplay').on('click', play);
    $a.find('i.fa-info-circle').on('click', function() {
        $(this).next('div.help').toggle();
    });

});
