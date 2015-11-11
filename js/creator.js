require(['templates', 'route', 'state', 'youtube'],
    function(templates, route, state, youtube) {

        // extract a YouTube VideoId from the URL if necessary
        function ytVideoId(id_or_url) {
            var regExp = /^.*(youtube\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
            var match = id_or_url.match(regExp);
            if (match && match[2].length == 11) {
              id_or_url = match[2];
            }
            return id_or_url;
        }
        // update a control with the YouTube Id
        function fixupVideoId($inp) {
            var v = ytVideoId($inp.val());
            $inp.val(v);
            return v;
        }

        var gameplay_id = 0;
        var videoID = '';

        // save a gameplay as sharable on the site
        function saveGameplay(gp, publish) {
            var $errors = $('div#errors'),
                $messages = $('div#messages'),
                $def = $.Deferred();
            $errors.empty();
            $messages.empty();

            // validate title
            var topic = $('select[name=topic]').val();
            if (topic) {
                gp.tags.push(topic);
            }
            gp.audience = $('select[name=audience]').val();
            gp.author = $('input[name=author]').val();
            gp.title = $('input[name=title]').val();
            gp.language = $('select[name=language]').val();
            var args = {
                content: JSON.stringify(gp),
                publish: publish,
                id: gameplay_id
            };
            $.post('/gameplay-as-json/', args)
            .done(function(ngp) {
                $messages.append(gameplay_id ? 'Gameplay updated' : 'Gameplay saved')
                $def.resolve(ngp);
                gameplay_id = ngp.ID;
            })
            .error(function(e) {
                $errors.append('Save failed');
                $def.reject();
            });
            return $def;
        }

        // save an anonymous gameplay and activate it
        function playGame(gp) {
            $.ajax({
                type: "POST",
                url: '/play/',
                data: { gp: JSON.stringify(gp) },
                async: false // fix this
            }).done(function(res) {
                window.open('/play/?key=' + res.name, '_blank');
            }).error(function(e) {
                console.log('play failed', e);
            });
        }

        Number.prototype.toFixedDown = function(digits) {
            var re = new RegExp("(\\d+\\.\\d{" + digits + "})(\\d)"),
                m = this.toString().match(re);
            return m ? parseFloat(m[1]) : this.valueOf();
        };

        function tabInit($tab) {
            // initialize the player and its controls
            var player = null,
                duration = 0;

            var $video = $tab.find("input[name='video']");
            $video.on('input', function(e) {
                fixupVideoId($video);
                enableLoad();
            });
            function enableLoad() {
                $tab.find('button.loadVideo').prop('disabled', $video.is(':invalid'));
            }
            enableLoad();

            function loadVideo() {
                videoId = fixupVideoId($video);
                $tab.find('.player').replaceWith('<div class="player"></div>');
                var node = $tab.find('.player').get(0);
                var $def = $.Deferred();
                youtube.loadVideo(videoId, node).done(function(p) {
                    player = p;
                    duration = player.getDuration().toFixedDown(1);
                    initTimepoints();
                    $tab.find('button.add-pause').prop('disabled', false);
                    $def.resolve();
                });
                return $def;
            }
            $tab.find('button.loadVideo').on('click', loadVideo);

            // allow jogging the video from the various time inputs
            $tab.on('keydown', "input[type='number'][step]", function(evt) {
                if (evt.keyCode == 38 || evt.keyCode == 40) { // up or down arrow
                    evt.preventDefault();
                    var $target = $(evt.target),
                        value = parseFloat($target.val() || '0'),
                        step = evt.shiftKey ? 1 : 0.1,
                        sign = evt.keyCode == 38 ? 1 : -1;
                    value = Math.min(duration, Math.max(0, value + sign * step));
                    value = Math.round(value * 10) / 10;
                    $target.val(value.toFixed(1));
                    if (player) {
                        player.pauseVideo();
                        player.seekTo(value);
                    }
                } else if (evt.keyCode == 13) { // return
                    var $target = $(evt.target),
                        value = parseFloat($target.val());
                    if (player) {
                        player.pauseVideo();
                        player.seekTo(value);
                    }
                }

            }).on('focus', "input[type='number'][step]", function(evt) {
                var $target = $(evt.target),
                    value = parseFloat($target.val());
                if (player) {
                    player.pauseVideo();
                    player.seekTo(value);
                }
                return true;
            });

            // saving
            $tab.data('save', function(saveFunc, publish) {
                var g = extractGameplay();
                return saveFunc(g, publish);
            });

            // playing
            $tab.find('button.play').on('click', function() {
                var gp = extractGameplay();
                playGame(gp);
            });

            var extractGameplay = null,
                enablePlay = null,
                initTimepoints = null;
            if ($tab.prop('id') == 'basic') {
                extractGameplay = function() {
                    // validate all of these
                    var gp = {
                        videoId: $tab.find('input[name=video]').val(),
                        message: $tab.find('input[name=message]').val(),
                        interval: parseInt($tab.find('input[name=interval]').val()),
                        start: parseInt($tab.find('input[name=start]').val() || '0'),
                        end: parseInt($tab.find('input[name=end]') || '0'),
                    };
                    gp.vocabulary = gp.message;
                    gp.tags = [ 'basic', 'error-free' ];
                    gp.kind = 'basic';
                    if (!gp.end) {
                        gp.end = duration;
                    }
                    gp.duration = gp.end - gp.start;
                    gp.dof = 1;
                    gp.hits = Math.round(gp.duration / gp.interval);
                    return gp;
                };

                // enable the play button
                enablePlay = function() {
                    var invalid = $tab.find("input:invalid").length > 0;

                    $tab.find('button.play').prop('disabled', invalid);
                };
                enablePlay();
                $tab.find('#basic-gameplay input').on('input', enablePlay);

                initTimepoints = function() {
                    $tab.find('input[name=start]').val(0);
                    $tab.find('input[name=end]').val(duration);
                    enablePlay();
                };

                $tab.data('loadGameplay', function(gp) {
                    $tab.find('input[name=video]').val(gp.videoId);
                    enableLoad();
                    return loadVideo().done(function() {
                        $tab.find('input[name=start]').val(gp.start);
                        $tab.find('input[name=interval]').val(gp.interval);
                        $tab.find('input[name=end]').val(gp.end);
                        $tab.find('input[name=message]').val(gp.message);
                        enablePlay();
                    });
                });


            } else {
                var version = $tab.prop('id');
                function createChoice(p, tnow) {
                    var vc = {
                        message: p.prompt,
                        target: tnow
                    };
                    var action = p.next;
                    if (p.next > 0) {
                        vc.target = p.next;
                        action = 'jump';
                    }
                    vc['select' + action] = 'selected';
                    return templates.render('choice', vc);
                }

                function createTimepoint(time, type, prompt) {
                    var v = {
                        type: type,
                        time: time.toFixedDown(1),
                        timeLabel: type=='start' ? 'Start at' : 'Pause at',
                        duration: duration
                    };
                    if (type == 'single') {
                        v.message = prompt;
                        v.single = true;
                    } else if (type == 'multiple') {
                        v.prompts = prompt.map(function(p) {
                            return createChoice(p, v.time); }).join('\n');
                        v.multiple = true;
                    }
                    $item = $(templates.render('timepoint', v));
                    return $item;
                };

                initTimepoints = function() {
                    var $tp = $tab.find('.timepoints');
                    $tp.find('li:gt(0)').remove();
                    $tp.append(createTimepoint(0, 'start', ''));
                };

                function insertTimepoint($tp) {
                    $tab.find('.timepoints').append($tp);
                    return $tp;
                }

                function scrollIntoView($tp) {
                    $tp.parent().scrollTop($tp.offset().top);
                }

                function addTimepoint() {
                    var t = player && player.getCurrentTime() || 0,
                        $tp
                    if (version == 'precise') {
                        $tp = createTimepoint(t, 'single', '');
                    } else {
                        $tp = createTimepoint(t, 'multiple',
                            [{prompt: "", next: 0}]);
                    }
                    insertTimepoint($tp);
                    scrollIntoView($tp);
                    enablePlay();
                }

                function unique(array){
                    return array.filter(function(el, index, arr) {
                        return index === arr.indexOf(el);
                    });
                }

                extractGameplay = function() {
                    var tps = [],
                        messages = [],
                        maxchoices = 1,
                        hits = 0;
                    // get the start time
                    var start = parseFloat($tab.find(".tp-start input[name=time]").val());
                    // get the rest of the timepoints
                    if (version == 'precise') {
                        $tab.find(".timepoints li").not('.tp-start').each(function() {
                            var $this = $(this),
                                time = parseFloat($this.find('input[name=time]').val()),
                                message = $this.find('input[name=message]').val();
                            if (!message) message = "";
                            tps.push({ time: time, choices: [{prompt: message, next: 0}] });
                            messages.push(message);
                        });
                    } else {
                        $tab.find(".timepoints > li").not('.tp-start').each(function() {
                            var $this = $(this),
                                time = parseFloat($this.find('input[name=time]').val()),
                                choices = [];
                            $this.find('ol li').each(function() {
                                var $li = $(this),
                                    prompt = $li.find('input[name=message]').val() || 'undef',
                                    action = $li.find('select').val(),
                                    target = parseFloat($li.find('input[name=target]').val()),
                                    choice = {
                                        prompt: prompt,
                                        next: action == 'jump' ? target : parseInt(action)
                                    };
                                choices.push(choice);
                                messages.push(prompt);
                            });
                            tps.push({
                                time: time,
                                choices: choices
                            });
                            maxchoices = Math.max(maxchoices, choices.length);
                            hits += choices.length;
                        });
                    }
                    var gp = {
                        start: start,
                        timePoints: tps,
                        vocabulary: unique(messages).join(' '),
                        videoId: videoId,
                        tags: [version],
                        kind: version,
                        duration: duration // fix this
                    };
                    if (version == 'precise') {
                        gp.tags.push('error free');
                        gp.dof = 1;
                        gp.hits = gp.timePoints.length;
                    } else {
                        gp.dof = maxchoices;
                        gp.hits = hits;
                    }
                    //var url = '/app3/gameplay.html?' + urlon.stringify(gp);
                    return gp;
                }

                enablePlay = function() {
                    var invalid = $tab.find('input:invalid').length > 0;
                    $tab.find('button.play').prop('disabled', invalid);
                }
                $tab.find('.timepoints')
                .on('click', 'button.delete-pause', function(e) {
                    $(e.currentTarget).closest('li').remove();
                    enablePlay();
                })
                .on('click', 'button.delete-choice', function(e) {
                    $(e.currentTarget).closest('li').remove();
                    enablePlay();
                })
                .on('click', 'button.add-choice', function(e) {
                    var $t = $(e.currentTarget),
                        tnow = $t.closest('li.tp-multiple').find('input[name=time]').val(),
                        n = createChoice({
                        prompt: '',
                        next: 0
                    }, tnow);
                    $(e.currentTarget).closest('ol').append(n);
                    enablePlay();
                })
                .on('change', 'select[name=action]', function(e) {
                    var $s = $(e.target),
                        sv = $s.find(":selected").val();
                    $s.siblings('input[name=target]').toggle(sv == 'jump');
                    enablePlay();
                })
                .on('input', 'input', enablePlay);
                enablePlay();

                $tab.find('button.add-pause').on('click', addTimepoint);
                $tab.find('i.fa-info-circle').on('click', function() {
                    $(this).next('div.help').toggle();
                });

                $tab.data('loadGameplay', function(gp) {
                    var tab = $tab.prop('id');
                    $tab.find('input[name=video]').val(gp.videoId);
                    enableLoad();
                    return loadVideo().done(function() {
                        $tab.find('.tp-start input[name=time]').val(gp.start);
                        gp.timePoints.forEach(function(tp, i) {
                            var $tp;
                            if (tab == 'precise') {
                                $tp = createTimepoint(tp.time, 'single', tp.choices[0].prompt);
                            } else {
                                $tp = createTimepoint(tp.time, 'multiple', tp.choices)
                            }
                            insertTimepoint($tp);
                        });
                        enablePlay();
                    });
                });
            }
        };

        function enableSave() {
            var $tab = $('.tab-content.current'),
                invalid = $('#save-gameplay input:invalid').length > 0 ||
                    $tab.find('button.play').prop('disabled');
            $('#publish').prop('disabled', invalid);
        }

        function saveInit() {
            $('#draft').on('click', function(e) {
                var $tab = $('.tab-content.current');
                $tab.data('save')(saveGameplay, false).done(function(ngp) {
                    console.log('updated', ngp);
                });
            });
            $('#publish').on('click', function(e) {
                var $tab = $('.tab-content.current');
                $tab.data('save')(saveGameplay, true).done(function(ngp) {
                    console.log('published', ngp);
                    location.href = '/your-games/';
                });
            });
            $(document).on('input', enableSave);
            enableSave();
        }

        function tabController() {
            $('ul.tabs li').click(function(){
                var tab_id = $(this).attr('data-tab');

                $('ul.tabs li').removeClass('current');
                $('.tab-content').removeClass('current');

                $(this).addClass('current');
                $("#"+tab_id).addClass('current');
            });
            $('.tab-content').each(function(i, t) {
                tabInit($(t));
            });
        }

        function creatorInit() {
            youtube.loadApi().done(function() {
                tabController();
                saveInit();
                if (window.game_init) {
                    var gp = window.game_init,
                        kind = gp.kind;
                    gameplay_id = gp.ID;
                    $('.tab-link[data-tab=' + kind + ']').click();
                    console.log('loading', gp, kind);
                    $('#' + kind + '.tab-content').data('loadGameplay')(gp)
                        .done(function() {
                            $('input[name=title]').val(gp.title);
                            $('input[name=author').val(gp.author);
                            $('select[name=audience]').val(gp.audience);
                            $('select[name=topic').val(gp.topic);
                            $('select[name=language').val(gp.language);
                            enableSave();
                        });
                }
            });
        }

        route.add('init', /^\/create\/.*$/, creatorInit);


        // workaround for Chrome scroll bug
        $(function() {
            $('.timepoints').on('focus', 'input', function(e) {
                if(this.scrollIntoViewIfNeeded) {
                    this.scrollIntoViewIfNeeded();
                }
            });
        });
});