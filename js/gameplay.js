// Modify game structure 17 October

define(["route", "state", "youtube", "speech"], function (
  route,
  state,
  youtube,
  speech
) {
  // data structure for a game
  var game = {
    videoId: "ia8bhFoqkVE",
    vocabulary: "Go! Stop! Yes? No? Again Quit",
    start: 8.6,
    duration: 60,
    timePoints: [
      {
        // prompt with 2 choices
        time: 10,
        choices: [
          {
            prompt: "Go!",
            next: 0,
          },
          {
            prompt: "Stop!",
            next: 9.9,
          },
        ],
      },
      {
        time: 15,
        choices: [
          {
            prompt: "Yes?",
            next: 0,
          },
          {
            prompt: "No?",
            next: 30,
          },
        ],
      },
      {
        time: 20,
        choices: [
          {
            prompt: "Again",
            next: -1, // start over
          },
        ],
      },
      {
        time: 35,
        choices: [
          {
            prompt: "Quit",
            next: -2, // quit
          },
        ],
      },
    ],
  };

  function init() {
    // log("init");
    if (window.game_init) {
      game = window.game_init;
      // log("game", game);
      var end = 0;
      if (game.interval) {
        game.timePoints = [];
        var t = game.start + game.interval;
        while (t < game.end) {
          game.timePoints.push({
            time: t,
            choices: [{ prompt: game.message, next: 0 }],
          });
          t += game.interval;
        }
        end = game.end;
      } else {
        game.timePoints.sort(function (a, b) {
          if (a.time < b.time) return -1;
          if (a.time > b.time) return 1;
          return 0;
        });
        end = game.duration;
      }
      game.timePoints.push({
        time: end,
        choices: [
          { prompt: "Again", next: -1 },
          { prompt: "Quit", next: -2 },
        ],
      });
      // log("tps", game.timePoints);

      let $apiReady = youtube.loadApi();
      initHandlers();
      $apiReady.done(Go);
    }
    // log("init finish");
  }

  var player;

  function checkEnded(event) {
    // log("onSC", event);
    if (event.data == window["YT"].PlayerState.ENDED) {
      atTimePoint(player.getCurrentTime());
    }
  }
  // I'm assuming the game data structure has been populated
  function Go() {
    // log("Go");
    youtube
      .loadVideo(game.videoId, $("#player").get(0), checkEnded)
      .done(function (p) {
        // log("done callback");
        player = p;
        player.seekTo(game.start, true);
        if (state.get("speech") == "1") {
          speech.speak("Play!", { volume: 0.01 }).then(startGame);
        } else {
          startGame();
        }
      });
  }

  function startGame() {
    // log("startGame");
    nextTimePoint = getNext(game.start);
    //console.log('ntp=', nextTimePoint);
    // fill in the table for the start, step, stop case
    player.playVideo();
    // watch for the next timePoint
    setInterval(checkTimePoint, 100);
  }

  // pointer into game.timePoints
  var nextTimePoint = null;

  // check to see if we are at a timePoint when playing
  function checkTimePoint() {
    if (player.getPlayerState() != window["YT"].PlayerState.PLAYING) return;

    if ($("#message").is(":visible")) {
      return;
    }
    var t = player.getCurrentTime();
    if (!t) return;
    if (nextTimePoint && t >= nextTimePoint.time) {
      atTimePoint(t);
    }
  }

  // find the next time point after now
  function getNext(now) {
    //console.log('getNext', game.timePoints, now);
    var n = game.timePoints.findIndex(function (tp) {
      return now < tp.time;
    });
    // log("getNext", now, n, game.timePoints[n]);
    return game.timePoints[n];
  }

  // jump to a new time
  function goToTime(t) {
    //console.log('goto', t);
    if (t == -2) {
      // log("quit", state.get("findAnotherLink"));
      location.href = state.get("findAnotherLink");
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
    if (nextTimePoint && "choices" in nextTimePoint) {
      player.pauseVideo();
      showPrompt();
      return;
    }
    nextTimePoint = getNext(t);
  }

  // from http://stackoverflow.com/a/2450976/1115662
  function shuffle(array) {
    var currentIndex = array.length,
      temporaryValue,
      randomIndex;

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
      $message = $("#message").empty(),
      style = "";
    if (state.get("moveprompts") == "1") {
      var quad = Math.floor(Math.random() * 4);
      style = "position:absolute;";
      if (quad & 1) {
        style = style + "right:0;";
      } else {
        style = style + "left:0;";
      }
      if (quad & 2) {
        style = style + "top:0;";
      } else {
        style = style + "bottom:0;";
      }
    }
    $message.attr("style", style);
    // log("randomize", state.get("randomize"));
    if (state.get("randomize") == "1") {
      // log("randomize");
      shuffle(choices);
    }
    for (var i = 0; i < choices.length; i++) {
      var $tr = $(
        '<tr><td><a href="#">' + choices[i].prompt + "</a></td></tr>"
      );
      $tr.data("next", choices[i].next);
      if (i === 0 && state.get("hover") == "0") {
        $tr.addClass("selected");
      }
      $message.append($tr);
    }
    $("#shade")
      .css({
        //width: $("iframe").width(),
        //height: $("iframe").height(),
        lineHeight: $("iframe").height() + "px",
      })
      .fadeIn(200);
    document.body.tabIndex = 1;
    document.body.focus();
    if (state.get("speech") == "1" && !choices[0].nospeak) {
      speech.speak(choices[0].prompt);
    }
  }

  // handle user response
  function doResponse($tr) {
    // log("doResponse");
    if (!$tr) {
      let $trs = $("#message tr");
      if ($trs.length == 1) {
        $tr = $trs.first();
      } else {
        // log("ignored");
        return;
      }
    }
    $("#shade").hide();
    var next = $tr.data("next");
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
    $(document).on("click touchstart", "tr", function (evt) {
      evt.stopPropagation();
      evt.preventDefault();
      var $tr = $(this);
      doResponse($tr);
    });
    // click anywhere on page
    $(document).on("click touchstart", "#shade", function (evt) {
      if (evt.target !== this) return;
      doResponse();
    });

    // key events
    var movers = [39, 32], // right arrow, space
      choosers = [37, 13]; // left arrow, enter
    var down = {};
    var cycleCount = 0; // escape after 3 cycles through the choices
    $(document).on("keydown", function (evt) {
      evt.preventDefault();
      if (down[evt.keyCode]) return; // prevent key repeat
      if (!$("#message").is(":visible")) return; // ignore when not displayed
      down[evt.keyCode] = true;
      //console.log('kd', evt);
      var $choices = $("#message tr"),
        $selected = $choices.filter(".selected"),
        escape = state.get("escape") == "1";
      if (evt.keyCode == 27) {
        // escape key to quit
        location.href = state.get("findAnotherLink");
        return;
      }
      if (!escape && $choices.length == 1) {
        // allow any key if only one choice
        cycleCount = 0;
        doResponse($selected);
      } else if (movers.indexOf(evt.keyCode) >= 0) {
        // mover
        var n = 0;
        if ($selected.length > 0) {
          n = ($choices.index($selected) + 1) % $choices.length;
          $selected.removeClass("selected");
        }
        // count the number of times cycling through the choices
        // after 3 cycles, offer to quit
        if (n == 0) cycleCount += 1;
        if (escape && cycleCount >= 3) {
          showPrompt({
            choices: [
              {
                prompt: "Quit",
                next: -2, // quit
              },
              {
                prompt: "Continue",
                next: -3, // reprompt
              },
            ],
          });
          cycleCount = 0;
          return;
        }
        $selected = $choices.eq(n);
        $selected.addClass("selected");
        if (state.get("speech") == "1") {
          speech.speak($selected.text());
        }
      } else if (choosers.indexOf(evt.keyCode) >= 0) {
        // chooser
        if ($selected.length > 0) {
          doResponse($selected);
        }
        cycleCount = 0;
      } else if ($choices.length == 1) {
        // allow any key if only one choice
        cycleCount = 0;
        doResponse($selected);
      }
    });
    $(document).on("keyup", function (evt) {
      evt.preventDefault();
      down[evt.keyCode] = false;
    });

    if (state.get("hover") != "0") initHover();
  }

  function initHover() {
    var over = null;
    var timeStamp = 0;
    var accumulators = new Map();
    var threshold = +(state.get("hover") || "0") * 500;

    /** @param {PointerEvent} event */
    function handlePointerEvent(event) {
      if (!timeStamp) {
        timeStamp = event.timeStamp;
      }
      var dt = event.timeStamp - timeStamp;
      timeStamp = event.timeStamp;

      // increment the accumulator for the target we are over
      var sum = accumulators.get(over) || 0;
      sum += dt;
      accumulators.set(over, sum);
      // if it exceeds the threshold issue a click event
      if (sum > threshold) {
        if (over) {
          over.click();
          over = null;
        }
      }
      // decrement the other accumulators
      accumulators.forEach(function (value, target, map) {
        if (target !== over) {
          value -= dt;
          if (value < 0) {
            map.delete(target);
          } else {
            map.set(target, value);
          }
        }
      });
      if (
        event.type == "pointerover" &&
        event.target instanceof HTMLAnchorElement &&
        over != event.target
      ) {
        over = event.target;
      } else if (event.type == "pointerout") {
        over = null;
      }
    }
    document.addEventListener("pointerover", handlePointerEvent);
    document.addEventListener("pointerout", handlePointerEvent);
    setInterval(function () {
      handlePointerEvent(new PointerEvent("step"));
    }, 100);
  }

  route.add("init", /^\/play\/.*/, init);
  route.add("init", /^\/\d+\/\d+\/\d+\/([^\/]+)\/(?:(\d+)\/)?(?:\?.*)?$/, init);

  return { speak: speech.speak };
});
