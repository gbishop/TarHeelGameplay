// Modify game structure 17 October

// data structure for a game
var game = {
    videoId: 'ia8bhFoqkVE',
    start: 8.6,
    timePoints: [
        {
            // prompt with 2 choices
            time: 10,
            choices: [
                {
                    prompt: 'Go!',
                    next: 0
                },
                {
                    prompt: 'Stop!',
                    next: 9.9 // jump to here label creating a loop
                }
            ]
        },
        {
            time: 15,
            choices: [
                {
                    prompt: 'Yes?',
                    next: 0
                },
                {
                    prompt: 'No?',
                    next: 30
                }
            ]
        },
        {
            time: 20,
            choices: [
                {
                    prompt: 'Again',
                    next: -1 // start over
                }
            ]
        },
        {
            time: 35,
            choices: [
                {
                    prompt: 'Quit',
                    next: -2 // quit
                }
            ]
        }
    ]
};
// parse the query string and construct the game object
if (window.location.search)
    game = initializeGame(window.location.search);

//console.log('game', game);

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
            onReady: function() {
                // set the initial time
                player.seekTo(game.start, true);
                nextTimePoint = getNext(game.start);
                // fill in the table for the start, step, stop case
                if (game.onFirstPlay) {
                    game.onFirstPlay();
                    delete game.onFirstPlay;
                }
                // watch for the next timePoint
                setInterval(checkTimePoint, 100);
            },
            onStateChange: function(event) {
                //console.log('onSC', event);
                if (event.data == YT.PlayerState.ENDED) {
                    atTimePoint(player.getCurrentTime());
                }
            }
        }
    });
    // handle resize events
    $(window).resize(function() {
        $('#player').css('height', $(window).height() - 8);
    });
}

// index into game.timePoints
var nextTimePoint = null;

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
    if (player.getPlayerState() != YT.PlayerState.PLAYING)
        return;

    if ($('#message').is(':visible')) {
        return;
    }
    var t = player.getCurrentTime();
    if (!t) return;
    if (t >= nextTimePoint.time) {
        atTimePoint(t);
    }
}

// find the next time point after now
function getNext(now) {
  var n = game.timePoints.findIndex(function(tp) {
    return now < tp.time;
  });
  //console.log('getNext', now, n, game.timePoints[n]);
  return game.timePoints[n];
}

// jump to a new time
function goToTime(t) {
    //console.log('goto', t);
    if (t == -2) {
        window.close();
        return;
    } else if (t == -1) {
        t = game.start;
    }
    player.seekTo(t, true);
    player.playVideo();
    nextTimePoint = getNext(t);
}

// process timePoint events
function atTimePoint(t) {
    //console.log('atTP', t, nextTimePoint);
    if ('choices' in nextTimePoint) {
        player.pauseVideo();
        showPrompt();
        return;
    }
    nextTimePoint = getNext(t);
}

// speak prompt
function speak(txt) {
    var msg = new SpeechSynthesisUtterance(txt);
    msg.lang = 'en';
    speechSynthesis.speak(msg);
}

// from http://stackoverflow.com/a/2450976/1115662
function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex ;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

// display choices
function showPrompt() {
    var choices = nextTimePoint.choices,
        $message = $('#message').empty();
    shuffle(choices);
    for (var i=0; i < choices.length; i++) {
        var $tr = $('<tr><td>' + choices[i].prompt + '</td></tr>');
        $tr.data('next', choices[i].next);
        if (i === 0) {
            $tr.addClass('selected');
        }
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
        goToTime(next);
        return;
    }
    nextTimePoint = getNext(player.getCurrentTime());
    player.playVideo();
}

function initializeGame(search) {
    var q = {};
    if (location.search.indexOf('?_') == 0) {
        // URLON representation of the data structure
        q = URLON.parse(location.search.substr(1));
        //console.log('q=', q);
        // construct the game object here
        var tps = [];
        $.each(q.t, function(k, v) {
            var tp = { time: parseFloat(k) };
            if (typeof(v) === 'number') {
                tp.choices = [ { prompt: q.m[v], next: 0 }];
            } else {
                tp.choices = [];
                $.each(v, function(p, n) {
                    tp.choices.push({ prompt: q.m[p], next: n });
                });
            }
            tps.push(tp);
        });
        tps.sort(function(a, b) {
            if (a.time < b.time) return -1;
            if (a.time > b.time) return 1;
            return 0;
        });
        // function to add a timepoint at the end
        function onFirstPlay() {
            var duration = player.getDuration();
            game.timePoints.push({
                time: duration,
                choices: [
                    { prompt: 'Again', next: -1 }
                ]
            });
        }
        return {
            videoId: q.v,
            start: q.s,
            timePoints: tps,
            onFirstPlay: onFirstPlay
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
        //console.log('duration', duration);
        for(var t = q.start + q.interval; t < duration; t += q.interval) {
            game.timePoints.push({ time: t,
                                   choices: [{prompt: q.message}] });
        }
        game.timePoints.push({time: duration,
                              choices: [{prompt: "Again!", next: 'start'}]});
        //console.log('tp', game.timePoints);
    }
    return {
        videoId: q.video,
        start: q.start,
        timePoints: [ ],
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
    //console.log('kd', evt);
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
