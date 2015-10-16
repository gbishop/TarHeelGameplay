define(['templates', 'route', 'state'], function(templates, route, state) {

    window.onYouTubeIframeAPIReady = function() {
        $(function() {
            $(document).trigger('apiReady');
        });
    }

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
        var method = 'create_post',
            args = {
                title: gp.title,
                content: gp.vocabulary,
                categories: 'Gameplays',
                tags: 'error free',
                'custom[ytid]': gp.ytid,
                'custom[link]': gp.link,
                'custom[duration]': gp.duration ? Math.round(gp.duration/60) : 0,
                status: 'publish'
            };
        if (gp.slug) {
            args.slug = gp.slug;
            method = 'update_post';
        }
        // get the nonce
        $.get('/api/get_nonce/', {
                controller: 'posts',
                method: method })
        .done(function(res) {
            args.nonce = res.nonce;
            // create the new post
            $.post('/api/posts/' + method + '/', args)
            .done(function(r) {
                $messages.append(slug ? 'Gameplay updated' : 'Gameplay saved');
            }).error(function(e) {
                $errors.append('Save failed');
            });
        });
    }

    function basicInit() {
        var $q = $('#quick');
        function extractGameplay() {
            // validate all of these
            var $form = $q.find('#quick-gameplay'),
                g = {
                    title: $("input[name='title']").val(),
                    rating: $("select[name='rating']").val(),
                    ytid: $q.find("input[name='video']").val(),
                    vocabulary: $q.find("input[name='message']").val(),
                    link: $form.attr('action') + '?' + $form.serialize()
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

    function preciseInit() {
        var $a = $('#precise');

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

        function loadVideo() {
            videoId = fixupVideoId();
            player = new YT.Player($a.find('.player').get(0), {
                //height: "30em",
                //width: "40em",
                videoId: videoId,
                playerVars: {
                    iv_load_policy: 3
                },
                events: {
                    'onReady': function() {
                        //player.seekTo(0.0, true);
                        //player.pauseVideo();
                        initTimepoints();
                    },
                    'onStateChange': onPlayerStateChange
                }
            });
        }

        function createTimepoint(time, type, prompt, $item) {
            var v = {
                type: type,
                time: time.toFixedDown(1),
                timeLabel: type=='start' ? 'Start at' : 'Pause at'
            };
            if (type == 'single') {
                v.message = prompt;
                v.single = true;
            } else if (type == 'multiple') {
                v.prompts = prompt;
                v.multiple = true;
            }
            $item = $(templates.render('timepoint', v));
            return $item;
        }

        var pauseOnPlay = true;
        var duration = 0;
        function initTimepoints() {
            duration = player.getDuration();
            var $tp = $a.find('.timepoints');
            $tp.find('li:gt(0)').remove();
            $a.find('.play').attr('disabled', false);
            player.playVideo();
        }

        function insertTimepoint($tp) {
            $a.find('.timepoints').append($tp);
            return $tp;
        }

        function stepVideo(amt) {
            player.pauseVideo();
            var t = player.getCurrentTime();
            t += amt;
            player.seekTo(t, true);
            player.pauseVideo();
        }


        function onPlayerStateChange(event) {
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

        function scrollIntoView($tp) {
            $tp.parent().scrollTop($tp.offset().top);
        }
        function addTimepoint() {
            var t = player.getCurrentTime();
            var $tp = createTimepoint(t, 'single', '');
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
            var $tps = $a.find(".timepoints");
            $tps.children().detach().sort(function(a, b) {
                var ta = parseFloat($(a).find('input[name=time]').val()),
                    tb = parseFloat($(b).find('input[name=time]').val());
                return ta==tb ? 0 : (ta > tb) ? 1 : -1;
            }).appendTo($tps);
            $tps.children().each(function() {
                var $this = $(this),
                    time = parseFloat($this.find('input[name=time]').val()),
                    message = $this.find('input[name=message]').val();
                if (!message) message = "";
                // get message index
                mis.push(getMessageIndex(message));
                tps.push(time);
            });
            var res = {
                t: tps,
                i: mis,
                m: messages,
                v: videoId
            };
            var url = '/app2/gameplay.html?' + URLON.stringify(res);
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
                g = {
                    title: $("input[name='title']").val(),
                    rating: $("select[name='rating']").val(),
                    ytid: $a.find("input[name='video']").val(),
                    duration: duration,
                    vocabulary: vocabulary,
                    link: getPlayLink()
                };
            return g;
        }

        $a.on('save', function(e, saveFunc) {
            e.preventDefault();
            var g = extractGameplay();
            saveFunc(g);
        });

        $(document).on('apiReady', function() {
            $a.find('.loadVideo').prop('disabled', false);
        });

        // allow jogging the video from the various time inputs
        $('#creator').on('keydown', "input[type='number']", function(evt) {
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

        $a.find('.timepoints').on('click', 'i.delete-pause', function(e) {
            $(this).parent().remove();
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
        preciseInit();
        saveInit();
        $.getScript('https://www.youtube.com/iframe_api');
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