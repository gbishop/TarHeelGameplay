require(['templates', 'route', 'state', 'youtube', 'urlon'],
    function(templates, route, state, youtube, urlon) {

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

        var slug = null;
        var videoID = '';

        // save a gameplay as sharable on the site
        function saveGameplay(gp, publish) {
            var $errors = $('div#errors'),
                $messages = $('div#messages');
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
                gameplay: JSON.stringify(gp),
                publish: publish
            };
            $.post('/gameplay-as-json/', args)
            .done(function(ngp) {
                $messages.append(gp.slug ? 'Gameplay updated' : 'Gameplay saved')
            })
            .error(function(e) {
                $errors.append('Save failed');
            });
        }

        // save an anonymous gameplay and activate it
        function playGame(gp) {
            console.log('here', gp);
            $.ajax({
                type: "POST",
                url: '/play/',
                data: { gp: JSON.stringify(gp) },
                async: false // fix this
            }).done(function(res) {

                console.log('done', res);
                window.open('/play/?key=' + res.name, '_blank');
            }).error(function(e) {
                console.log('play failed', e);
            });
        }

        function tabInit($tab) {
            // initialize the player and its controls
            var player;

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
                console.log('videoId=', videoId);
                $tab.find('.player').replaceWith('<div class="player"></div>');
                var node = $tab.find('.player').get(0);
                youtube.loadVideo(videoId, node).done(function(p) {
                    player = p;
                    initTimepoints();
                    $tab.find('button.add-pause').prop('disabled', false);
                });
            }
            $tab.find('button.loadVideo').on('click', loadVideo);

            // allow jogging the video from the various time inputs
            $tab.on('keydown', "input[type='number'][step]", function(evt) {
                if (evt.keyCode == 38 || evt.keyCode == 40) { // up or down arrow
                    evt.preventDefault();
                    var $target = $(evt.target),
                        value = parseFloat($target.val()),
                        step = evt.shiftKey ? 1 : 0.1,
                        sign = evt.keyCode == 38 ? 1 : -1;
                    value = Math.min(player.getDuration(), Math.max(0, value + sign * step));
                    value = Math.round(value * 10) / 10;
                    $target.val(value.toFixed(1));
                    if (player) player.seekTo(value);
                } else if (evt.keyCode == 13) { // return
                    var $target = $(evt.target),
                        value = parseFloat($target.val());
                    player.seekTo(value);
                }

            }).on('focus', "input[type='number'][step]", function(evt) {
                var $target = $(evt.target),
                    value = parseFloat($target.val());
                if (player) player.seekTo(value);
                return true;
            });

            // saving
            $tab.on('save', function(e, saveFunc) {
                e.preventDefault();
                var g = extractGameplay();
                saveFunc(g, true);
            });

            // playing
            $tab.find('button.play').on('click', function() {
                var gp = extractGameplay();
                playGame(gp);
            });

            var extractGameplay = null,
                enablePlay = null,
                initTimepoints = null;
            if ($tab.prop('id') == 'quick') {
                console.log('basic init');

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
                    if (!gp.end) {
                        gp.end = player.getDuration();
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
                $tab.find('#quick-gameplay input').on('input', enablePlay);

                initTimepoints = function() {
                    $tab.find('input[name=end]').val(Math.floor(player.getDuration()));
                    enablePlay();
                };


            } else {
                var version = $tab.prop('id');
                console.log('advanced and precise init');
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
                        v.message = prompt;
                        v.target = v.time;
                        v.prompts = templates.render('choice', v);
                        v.multiple = true;
                    }
                    console.log('v=', v);
                    $item = $(templates.render('timepoint', v));
                    return $item;
                };

                var duration = 0;
                initTimepoints = function() {
                    duration = player.getDuration();
                    var $tp = $tab.find('.timepoints');
                    $tp.find('li:gt(0)').remove();
                    $tp.append(createTimepoint(0, 'start', ''));
                };

                function insertTimepoint($tp) {
                    $tab.find('.timepoints').append($tp);
                    return $tp;
                }

                Number.prototype.toFixedDown = function(digits) {
                    var re = new RegExp("(\\d+\\.\\d{" + digits + "})(\\d)"),
                        m = this.toString().match(re);
                    return m ? parseFloat(m[1]) : this.valueOf();
                };

                function scrollIntoView($tp) {
                    $tp.parent().scrollTop($tp.offset().top);
                }

                function addTimepoint() {
                    var t = player && player.getCurrentTime() || 0,
                        kind = version == 'precise' ? 'single' : 'multiple',
                        $tp = createTimepoint(t, kind, '');
                    insertTimepoint($tp);
                    scrollIntoView($tp);
                    enablePlay();
                }

                function deleteTimepoint() {
                    if (!$selectedTimepoint) {
                        return;
                    }
                    $selectedTimepoint.remove();
                    setSelectedTimepoint(null);
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
                    console.log('gp', gp);
                    //var url = '/app3/gameplay.html?' + urlon.stringify(gp);
                    return gp;
                }

                enablePlay = function() {
                    var invalid = $tab.find('.timepoints input:invalid').length > 0;
                    $tab.find('button.play').prop('disabled', invalid);
                }
                $tab.find('.timepoints')
                .on('click', 'button.delete-pause', function(e) {
                    $(e.currentTarget).closest('li').remove();
                })
                .on('click', 'button.delete-choice', function(e) {
                    $(e.currentTarget).closest('li').remove();
                })
                .on('click', 'button.add-choice', function(e) {
                    var n = templates.render('choice', { message: '' });
                    $(e.currentTarget).closest('ol').append(n);
                })
                .on('change', 'select[name=action]', function(e) {
                    var $s = $(e.target),
                        sv = $s.find(":selected").val();
                    console.log('sc', $s, sv);
                    $s.siblings('input[name=target]').toggle(sv == 'jump');
                })
                .on('input', 'input', enablePlay);
                enablePlay();

                $tab.find('button.add-pause').on('click', addTimepoint);
                $tab.find('i.fa-info-circle').on('click', function() {
                    $(this).next('div.help').toggle();
                });
            }
        };

        function saveInit() {
            $('#save-gameplay').on('submit', function(e) {
                e.preventDefault();
                var $tab = $('.tab-content.current');
                $tab.trigger('save', [saveGameplay])
            });
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
                console.log('id', t.id);
                tabInit($(t));
            });
        }

        function creatorInit() {
            youtube.loadApi().done(function() {
                tabController();
                saveInit();
            });
            $.getScript('https://www.youtube.com/iframe_api');
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