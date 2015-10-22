require(['templates', 'route', 'state', 'youtube', 'urlon'],
    function(templates, route, state, youtube, urlon) {

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

    function saveGameplay(gp) {
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
            publish: true
        };
        $.post('/gameplay-as-json/', args)
        .done(function(ngp) {
            $messages.append(gp.slug ? 'Gameplay updated' : 'Gameplay saved')
        })
        .error(function(e) {
            $errors.append('Save failed');
        });
    }

    function basicInit() {
        var $q = $('#quick');
        function extractGameplay() {
            // validate all of these
            var $form = $q.find('#quick-gameplay'),
                g = {
                    ytid: $q.find("input[name='video']").val(),
                    vocabulary: $q.find("input[name='message']").val(),
                    link: '/play/'+ '?' + $form.serialize(),
                    tags: ['basic', 'error-free'],
                    duration: 0 // BUG
                };
            return g;
        }

        function enablePlay() {
            var ok = $q.find("input[name='video']").val() &&
                $q.find("input[name='interval']").val() &&
                $q.find("input[name='message']").val();

            $q.find('button.play').prop('disabled', !ok);
        }

        function enableSave() {
            var ok = $q.find("input[name='title']").val() &&
                !$q.find('button.play').prop('disabled');
            $('#save').prop('disabled', !ok);
        }

        var $video = $q.find("input[name='video']");
        $video.on('change', function(e) {
            $video.val(ytVideoId($video.val()));
        });
        $q.find('#quick-gameplay input').on('change', enablePlay);
        $q.find('input').on('keyup', enablePlay);

        // move these out of here
        //$('#save-gameplay input').on('change', enableSave);
        $q.on('save', function(e, saveFunc) {
            e.preventDefault();
            var g = extractGameplay();
            saveFunc(g);
        });
    }

    function tabInit(tab) {
        var $a = $('#' + tab);
        console.log($a.get(0));

        var player;

        var $video = $a.find("input[name='video']");

        $video.on('change', function(e) {
            fixupVideoId();
        });

        function fixupVideoId() {
            var v = ytVideoId($video.val());
            $video.val(v);
            return v;
        }

        var pauseOnPlay = true;
        function loadVideo() {
            videoId = fixupVideoId();
            console.log('videoId=', videoId);
            $a.find('.player').replaceWith('<div class="player"></div>');
            var node = $a.find('.player').get(0);
            youtube.loadVideo(videoId, node).done(function(p) {
                player = p;
                initTimepoints();
            });
        }

        function createTimepoint(time, type, prompt) {
            console.log('duration', duration);
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
        }

        var duration = 0;
        function initTimepoints() {
            duration = player.getDuration();
            var $tp = $a.find('.timepoints');
            $tp.find('li:gt(0)').remove();
            //$a.find('.play').attr('disabled', false);
        }

        function insertTimepoint($tp) {
            $a.find('.timepoints').append($tp);
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
            var t = player && player.getCurrentTime() || 0;
            var $tp = tab == 'precise' ? createTimepoint(t, 'single', '') :
                createTimepoint(t, 'multiple', '');
            insertTimepoint($tp);
            scrollIntoView($tp);
        }

        function deleteTimepoint() {
            if (!$selectedTimepoint) {
                return;
            }
            $selectedTimepoint.remove();
            setSelectedTimepoint(null);
        }

        function getPlayLink() {
            var tps = {},
                messages = [];
            function getMessageIndex(s) {
                var mi = messages.indexOf(s);
                if (mi < 0) {
                    messages.push(s);
                    mi = messages.length - 1;
                }
                return mi;
            }
            // get the start time
            var start = parseFloat($a.find(".tp-start input[name=time]").val());
            // get the rest of the timepoints
            if (tab == 'precise') {
                $a.find(".timepoints li").not('.tp-start').each(function() {
                    var $this = $(this),
                        time = parseFloat($this.find('input[name=time]').val()),
                        message = $this.find('input[name=message]').val();
                    if (!message) message = "";
                    tps[time] = getMessageIndex(message);
                });
            } else {
                $a.find(".timepoints > li").not('.tp-start').each(function() {
                    var $this = $(this),
                        time = parseFloat($this.find('input[name=time]').val()),
                        choices = {};
                    $this.find('ol li').each(function() {
                        var $li = $(this),
                            prompt = $li.find('input[name=message]').val() || 'undef',
                            pi = getMessageIndex(prompt),
                            action = $li.find('select').val(),
                            target = parseFloat($li.find('input[name=target]').val());
                        choices[pi] = action == 'jump' ? target : parseInt(action);
                    });
                    tps[time] = choices;
                });
            }
            var res = {
                s: start,
                t: tps,
                m: messages,
                v: videoId
            };
            console.log('res', res);
            var url = '/app3/gameplay.html?' + urlon.stringify(res);
            return url;
        }

        function play() {
            var url = getPlayLink();
            window.open(url, videoId);
        }

        function extractGameplay() {
            // validate all of these
            function unique(array){
                return array.filter(function(el, index, arr) {
                    return index === arr.indexOf(el);
                });
            }
            var messages = $a.find("input[name='message']").map(function() {
                    return $(this).val(); }).get(),
                vocabulary = unique(messages).join(', '),
                tags = [ tab ];
            if (tab == 'precise') tags.push('error free');
                g = {
                    ytid: videoId,
                    duration: duration,
                    vocabulary: vocabulary,
                    link: getPlayLink(),
                    tags: tags
                };
            return g;
        }

        $a.on('save', function(e, saveFunc) {
            e.preventDefault();
            var g = extractGameplay();
            saveFunc(g);
        });

        $(document).on('apiReady', function() {
            console.log('apiReady', $a.find('.loadVideo').get(0));
            $(function() {
                $a.find('.loadVideo').prop('disabled', false);
            });
        });

        // allow jogging the video from the various time inputs
        $a.on('keydown', "input[type='number']", function(evt) {
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

        }).on('focus', "input[type='number']", function(evt) {
            var $target = $(evt.target),
                value = parseFloat($target.val());
            if (player) player.seekTo(value);
            return true;
        });

        $a.find('.timepoints')
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
        .on('keydown', 'input', function(e) {
            $a.find('.play').prop('disabled', $a.find('.timepoints input:invalid').length > 0);
        });

        $a.find('.loadVideo').on('click', loadVideo);
        $a.find('button.add-pause').on('click', addTimepoint);
        $a.find('.timepoints').append(createTimepoint(0, 'start', ''));
        $a.find('.play').on('click', play);
        $a.find('i.fa-info-circle').on('click', function() {
            $(this).next('div.help').toggle();
        });

    };

    function saveInit() {
        $('#save-gameplay').on('submit', function(e) {
            e.preventDefault();
            var $tab = $('.tab-content.current');
            $tab.trigger('save', [saveGameplay])
        });
    }

    function tabsInit() {
        $('ul.tabs li').click(function(){
            var tab_id = $(this).attr('data-tab');

            $('ul.tabs li').removeClass('current');
            $('.tab-content').removeClass('current');

            $(this).addClass('current');
            $("#"+tab_id).addClass('current');
        });
    }

    function creatorInit() {
        tabsInit();
        basicInit();
        tabInit('precise');
        tabInit('advanced');
        saveInit();
        $.getScript('https://www.youtube.com/iframe_api');
        youtube.loadApi().done(function() {
            $(document).trigger('apiReady')
        });
    }

    route.add('init', /^\/create\/(?:\?id=(\d+)|\?copy=(\d+))?$/, creatorInit);


    // workaround for Chrome scroll bug
    $(function() {
        $('.timepoints').on('focus', 'input', function(e) {
            if(this.scrollIntoViewIfNeeded) {
                this.scrollIntoViewIfNeeded();
            }
        });
    });
});