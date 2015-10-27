// Modify game structure 17 October

define(["route", "state", "youtube", "urlon"], function(route, state, youtube, urlon) {

    // data structure for a game
    var game = {
        videoId: 'ia8bhFoqkVE',
        vocabulary: "Go! Stop! Yes? No? Again Quit",
        start: 8.6,
        duration: 60,
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
                        next: 9.9
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

    function init() {
        console.log('init');
        if (window.game_init) {
            game = window.game_init;
            console.log('game', game);
            if (game.interval) {
                game.timePoints = [];
                var t = game.start + game.interval;
                while(t < game.end) {
                    game.timePoints.push({
                        time: t,
                        choices: [ {prompt: game.message, next: 0} ]
                    });
                    t += game.interval;
                }
                game.timePoints.push({
                    time: game.end,
                    choices: [ {prompt: 'Again', next: -1} ]
                });
                console.log('tps', game);
            }
        }
        $apiReady = youtube.loadApi();
        initHandlers();
        $apiReady.done(Go);
        console.log('init finish');
    }

    var player;

    function checkEnded(event) {
        //console.log('onSC', event);
        if (event.data == YT.PlayerState.ENDED) {
            atTimePoint(player.getCurrentTime());
        }
    }
    // I'm assuming the game data structure has been populated
    function Go() {
        console.log('Go');
        youtube.loadVideo(game.videoId, $('#player').get(0), checkEnded)
        .done(function(p) {
            player = p;
            if (game.onFirstPlay) {
                game.onFirstPlay();
                delete game.onFirstPlay;
            }
            player.seekTo(game.start, true);
            nextTimePoint = getNext(game.start);
            //console.log('ntp=', nextTimePoint);
            // fill in the table for the start, step, stop case
            player.playVideo();
            // watch for the next timePoint
            setInterval(checkTimePoint, 100);
        });
    }

    // pointer into game.timePoints
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
        //console.log('getNext', game.timePoints, now);
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
            console.log('quit', state.get('findAnotherLink'));
            location.href = state.get('findAnotherLink');
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
    function showPrompt(tp) {
        if (!tp) tp = nextTimePoint;
        var choices = tp.choices,
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
            //width: $("iframe").width(),
            //height: $("iframe").height(),
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
        if (next == -3) {
            showPrompt();
            return;
        }
        if (next) {
            goToTime(next);
            return;
        }
        nextTimePoint = getNext(player.getCurrentTime());
        player.playVideo();
    }

    function initHandlers() {
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
        var cycleCount = 0; // escape after 3 cycles through the choices
        $(document).on('keydown', function(evt) {
            evt.preventDefault();
            if (down[evt.keyCode]) return; // prevent key repeat
            if (!$('#message').is(':visible')) return; // ignore when not displayed
            down[evt.keyCode] = true;
            //console.log('kd', evt);
            var $choices = $('#message tr'),
                $selected = $choices.filter('.selected');
            if (evt.keyCode == 27) { // escape key to quit
                location.href = state.get('findAnotherLink');
                return;
            }
            if (movers.indexOf(evt.keyCode) >= 0) {
                // mover
                var n = 0;
                if($selected.length > 0) {
                    n = ($choices.index($selected) + 1) % $choices.length;
                    $selected.removeClass('selected');
                }
                // count the number of times cycling through the choices
                // after 3 cycles, offer to quit
                if (n == 0) cycleCount += 1;
                if (cycleCount >= 3) {
                    showPrompt({
                        choices: [
                            { prompt: 'Quit',
                              next: -2 // quit
                            },
                            { prompt: 'Continue',
                              next: -3 // reprompt
                            }
                        ]});
                    cycleCount = 0;
                    return;
                }
                $selected = $choices.eq(n);
                $selected.addClass('selected');
                speak($selected.text());

            } else if(choosers.indexOf(evt.keyCode) >= 0) {
                // chooser
                if ($selected.length > 0) {
                    doResponse($selected);
                }
                cycleCount = 0;

            } else if ($choices.length == 1) { // allow any key if only one choice
                cycleCount = 0;
                doResponse($selected);
            }
        });
        $(document).on('keyup', function(evt) {
            evt.preventDefault();
            down[evt.keyCode] = false;
        });
    }

    route.add('init', /^\/play\/.*/, init);
});
