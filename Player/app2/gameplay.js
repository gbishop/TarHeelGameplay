// Cleanup 7 August 2015

// data structure for a game
var game = {
    videoId: 'ia8bhFoqkVE',
    timePoints: [
        {
            // non zero start time with a label
            label: 'start',
            time: 8.6
        },
        {
            // prompt with 2 choices
            label: 'here',
            time: 10,
            choices: [
                {
                    prompt: 'Go!'
                },
                {
                    prompt: 'Stop!',
                    next: 'here' // jump to here label creating a loop
                }
            ]
        },
        {
            time: 15,
            choices: [
                {
                    prompt: 'Yes?'
                },
                {
                    prompt: 'No?',
                    next: 'skip'
                }
            ]
        },
        {
            time: 20,
            choices: [
                {
                    prompt: 'Again',
                    next: 'start'
                }
            ]
        },
        {
            label: 'skip',
            time: 30
        },
        {
            time: 35,
            next: 'start'
        }
    ]
};
// parse the query string and construct the game object
game = initializeGame(window.location.search);

console.log('game', game);

function onYouTubeIframeAPIReady() {
    // youtube is ready
    $(function() {
        // the dom is ready
        Go();
    });
}

var player;

// I'm assuming the game data structure has been populated
function Go() {
    player = new YT.Player('player', {
        height: $(window).height() - 8 + 'px',
        width: '100%',
        videoId: game.videoId,
        playerVars: {
            iv_load_policy: 3 // no annotations
        },
        events: {
            'onReady': function() {
                // set the initial time
                player.seekTo(game.timePoints[0].time, true);
                // fill in the table for the start, step, stop case
                if (game.onFirstPlay) {
                    game.onFirstPlay();
                    delete game.onFirstPlay;
                }
                // process any prompts that might be there
                atTimePoint();
                // watch for the next timePoint
                setInterval(checkTimePoint, 100);
            }
        }
    });
    // handle resize events
    $(window).resize(function() {
        $('#player').css('height', $(window).height() - 8);
    });
}

// index into game.timePoints
var nextTimePoint = 0;

// for debugging
var lastT = 0;
function report() {
    var t = player.getCurrentTime();
    if (t != lastT) {
        console.log('t', t);
        lastT = t;
    }
}

// check to see if we are at a timePoint when playing
function checkTimePoint() {
    // report();
    if (player.getPlayerState() != YT.PlayerState.PLAYING) {
        return;
    }
    if (player.getCurrentTime() >= game.timePoints[nextTimePoint].time) {
        atTimePoint();
    }
}

// jump to a new timePoint
function goToTimePoint(label) {
    console.log('goto', label);
    for (var i=0; i < game.timePoints.length; i++) {
        var tp = game.timePoints[i];
        if ('label' in tp && label == tp.label) {
            console.log('goto target', i, tp.time);
            nextTimePoint = i;
            player.seekTo(tp.time, true);
            return;
        }
    }
    console.log('missing label', label);
}

// process timePoint events
function atTimePoint() {
    if ('choices' in game.timePoints[nextTimePoint]) {
        player.pauseVideo();
        showPrompt();
        return;
    }
    if ('next' in game.timePoints[nextTimePoint]) {
        goToTimePoint(game.timePoints[nextTimePoint].next);
        return;
    } else if (nextTimePoint < game.timePoints.length-1) {
        nextTimePoint = (nextTimePoint + 1);
        console.log('increment', nextTimePoint);
    } else {
        nextTimePoint = 0;
        console.log('seekTo', game.timePoints[0].time)
        player.seekTo(game.timePoints[0].time, true);
    }
    if (player.getPlayerState() != YT.PlayerState.PLAYING) {
        console.log('play');
        player.playVideo();
    }
}

// speak prompt
function speak(txt) {
    var msg = new SpeechSynthesisUtterance(txt);
    msg.lang = 'en';
    speechSynthesis.speak(msg);
}

// display choices
function showPrompt() {
    var choices = game.timePoints[nextTimePoint].choices,
        $message = $('#message').empty();
    for (var i=0; i < choices.length; i++) {
        var $tr = $('<tr><td>' + choices[i].prompt + '</td></tr>');
        $tr.data('next', choices[i].next);
        $message.append($tr);
    }
    $("#shade").css({
        width: $("iframe").width(),
        height: $("iframe").height(),
        lineHeight: $("iframe").height() + 'px'
    }).fadeIn(200);
    speak(choices[0].prompt);
}

// handle user response
function doResponse($tr) {
    if (!$tr) {
        $trs = $('#message tr');
        if ($trs.length == 1) {
            $tr = $trs.first();
        } else {
            console.log('ignored');
            return;
        }
    }
    $('#shade').hide();
    var next = $tr.data('next');
    if (next) {
        goToTimePoint(next); // game.timePoints[nextTimePoint].next);
        return;
    } else if (nextTimePoint < game.timePoints.length-1) {
        nextTimePoint = (nextTimePoint + 1);
        console.log('increment', nextTimePoint);
    } else {
        nextTimePoint = 0;
        console.log('seekTo', game.timePoints[0].time)
        player.seekTo(game.timePoints[0].time, true);
    }
    player.playVideo();
}

function initializeGame(search) {
    var q = {};
    if (location.search.indexOf('?_') == 0) {
        // URLON representation of the data structure
        q = URLON.parse(location.search.substr(1));
        // construct the game object here
        var tps = [];
        for (var i=0; i < q.t.length; i++) {
            var tp = { time: q.t[i] },
                msg = q.m[q.i[i]];
            if (msg) {
                tp.choices = [ { prompt: msg }];
            }
            tps.push(tp);
        }
        return {
            videoId: q.v,
            timePoints: tps
        }
    } else {
        return initializeGameFromForm(search);
    }
}

function initializeGameFromForm(search) {
    // form representation
    // apply defaults and types to the query parameters
    var defaults = {
        start: 0,
        end: 3600,
        message: 'Go!',
        interval: 15,
        video: 'ln_WjVLEJtc'
    };
    q = (function(a, def) {
        if (a == "") return {};
        var b = $.extend({}, def);
        for (var i = 0; i < a.length; ++i)
        {
            var p=a[i].split('=', 2);
            if (p.length == 1)
                b[p[0]] = "";
            else
                b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
            if (typeof(def[p[0]]) == 'number') {
                b[p[0]] = parseFloat(b[p[0]]);
            }
        }
        return b;
    })(search.substr(1).split('&'), defaults);
    console.log('q=', q);
    // convert URL to videoID
    var videoId = q.video;
    console.log(videoId);
    var regExp = /^.*(youtube\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    var match = videoId.match(regExp);
    console.log(match);
    if (match && match[2].length == 11) {
      videoId = match[2];
    }
    console.log(videoId);
    q.video = videoId;

    // setup a function to build the table when the duration is known after video is loaded
    function onFirstPlay() {
        var duration = player.getDuration();
        if (q.end) {
            duration = Math.min(duration, q.end);
        }
        if (!q.start) {
            q.start = 0;
        }
        console.log('duration', duration);
        for(var t = q.start + q.interval; t < duration; t += q.interval) {
            game.timePoints.push({ time: t,
                                   choices: [{prompt: q.message}] });
        }
        game.timePoints.push({time: duration,
                              choices: [{prompt: "Again!", next: 'start'}]});
        console.log('tp', game.timePoints);
    }
    return {
        videoId: q.video,
        timePoints: [
            {
                label: 'start',
                time: q.start
            }
        ],
        onFirstPlay: onFirstPlay
    };
}

// click or touch right on the prompt
$(document).on('click touchstart', 'tr', function(evt) {
    evt.stopPropagation();
    var $tr = $(this);
    doResponse($tr);
});
// click anywhere on page
$(document).on('click touchstart', '#shade', function(evt) {
    if (evt.target !== this) return;
    doResponse();
});

// key events
var movers = [39, 32],   // right arrow, space
    choosers = [37, 13]; // left arrow, enter
var down = {};
$(document).on('keydown', function(evt) {
    evt.preventDefault();
    if (down[evt.keyCode]) return; // prevent key repeat
    if (!$('#message').is(':visible')) return; // ignore when not displayed
    down[evt.keyCode] = true;
    console.log('kd', evt);
    var $choices = $('#message tr'),
        $selected = $choices.filter('.selected');
    if($choices.length == 1) {
        // any key for one choice
        doResponse($choices.eq(0));

    } else if (movers.indexOf(evt.keyCode) >= 0) {
        // mover
        var n = 0;
        if($selected.length > 0) {
            n = ($choices.index($selected) + 1) % $choices.length;
            $selected.removeClass('selected');
        }
        $selected = $choices.eq(n);
        $selected.addClass('selected');
        speak($selected.text());

    } else if(choosers.indexOf(evt.keyCode) >= 0) {
        // chooser
        if ($selected.length > 0) {
            doResponse($selected);
        }
    }
});
$(document).on('keyup', function(evt) {
    evt.preventDefault();
    down[evt.keyCode] = false;
});
