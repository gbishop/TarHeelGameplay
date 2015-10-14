var videoId = "";

// This code loads the IFrame Player API code asynchronously.
/*var tag = document.createElement('script');

tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
*/

function onYouTubeIframeAPIReady() {
    console.log('api ready');
    $(function() {
            $('#loadVideo').prop('disabled', false);
    });
}

var player;
function loadVideo() {
    videoId = $('#video').val();
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
                $('#controls').show();
                $('#tp-editor').show();
            },
            'onStateChange': onPlayerStateChange
        }
    });
}
var pauseOnPlay = true;
function initTimepoints() {
    var duration = player.getDuration();
    console.log('duration', duration);
    var $tp = $('#timepoints');
    $tp.empty();
    $tp.append(createTimepoint(0.0, ''));
    //$('#timepoints tr').addClass('selected');
    $tp.append(createTimepoint(duration, 'Again!'));
    $('#play').attr('disabled', false);
    player.playVideo();
}

function createTimepoint(time, prompt) {
    var t = time.toFixed(1);
    var o = {time: t, prompt: prompt};
    var label = prompt;
    if (typeof(prompt) != 'string') {
        label = prompt.join('/')
    }
    var $item = $(ich.timepoint({time: time.toFixed(1), label: label}));
    $item.data('tp', {time: time, prompt: prompt});
    return $item;
}

function insertTimepoint(time, prompt) {
    var $item = createTimepoint(time, prompt),
        done = false;
    $('#timepoints tr').each(function() {
        var $this = $(this),
            ctime = $this.data('tp').time;
        if (ctime == time) {
            $this.replaceWith($item);
            done = true;
            return false;
        } else if ($this.data('tp').time > time) {
            $item.insertBefore($this);
            done = true;
            return false;
        }
    });
    if (!done) {
        $('#timepoints').append($item);
    }
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
    $('#current-time').val(t);
}

function addTimepoint() {
    var t = parseFloat($('#current-time').val());
    var m = $('#message').val();
    setSelectedTimepoint(insertTimepoint(t, m));
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
    $('#timepoints tr').each(function() {
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
    var url = 'gameplay.html?' + URLON.stringify(res);
    console.log('url', url);
    window.open(url, videoId);
}

var $selectedTimepoint = null;
function setSelectedTimepoint($tp) {
    $selectedTimepoint = $tp;
    $('#timepoints tr.selected').removeClass('selected');
    if ($selectedTimepoint) {
        $selectedTimepoint.addClass('selected');
        $('#update').attr('disabled', false);
        $('#delete').attr('disabled', false);
    } else {
        $('#update').attr('disabled', true);
        $('#delete').attr('disabled', true);
    }
}
$(function() {
    $('#loadVideo').on('click', loadVideo);
    $('#player-controls button').on('click', function() {
        var amt = parseFloat(this.dataset.step);
        stepVideo(amt);
    });
    $('#add').on('click', addTimepoint);
    $('#update').on('click', function() {
        if (!$selectedTimepoint){
            return;
        }
        $selectedTimepoint.remove();
        addTimepoint();
    });
    $('#timepoints').on('click', 'tr', function() {
        var $this = $(this);
        setSelectedTimepoint($this);
        var tp = $this.data('tp');
        player.seekTo(tp.time, true);
        // fix for multiple prompts
        $('#message').val(tp.prompt || '');
    });
    $('#delete').on('click', deleteTimepoint);
    console.log($('#play'));
    $('#play').on('click', play);
    $('i.fa-info-circle').on('click', function() {
        $(this).next('div.help').toggle();
    });
});