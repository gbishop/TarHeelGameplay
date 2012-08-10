/* book.js render a book page */

define(["jquery",
        "route",
        "page",
        "templates",
        "keyboard",
        "state",
        "speech"
        ], function($, route, page, templates, keys, state, speech) {

    var book = null; // current book

    function fetchBook(slug) {
        var $def = $.Deferred();
        if (book && book.slug === slug) {
            $def.resolve(book);
        } else {
            $.ajax({
                url: '/book-as-json/',
                data: {
                    slug: slug
                },
                dataType: 'json'
            }).done(function(data) {
                book = data;
                $def.resolve(book);
            });
        }
        return $def;
    }

    function pageLink(link, page) {
        if (page === 1) {
            return link;
        } else {
            return link + page + '/';
        }
    }

    function renderBook(url, slug, pageNumber) {
        console.log('renderBook', url, slug, pageNumber);
        var $def = $.Deferred();
        fetchBook(slug).then(function(book) {

            var view = {};
            if (!pageNumber) {
                pageNumber = 1;
            } else {
                pageNumber = parseInt(pageNumber, 10);
            }
            view.frontPage = pageNumber === 1;
            view.title = book.title;
            view.ID = book.ID;
            var newContent;
            var N = book.pages.length;
            if (pageNumber <= N) {
                view.author = book.author;
                view.pageNumber = pageNumber;
                view.backto = encodeURI(book.link);
                view.image = book.pages[Math.max(1, pageNumber-1)];
                view.caption = view.image.text;
                if (pageNumber === 1) {
                    view.backLink = state.get('findAnotherLink');
                    view.nextLink = pageLink(book.link, pageNumber+1);
                } else {
                    view.backLink = pageLink(book.link, pageNumber-1);
                    view.nextLink = pageLink(book.link, pageNumber+1);
                }
                templates.setImageSizes(view.image);
                newContent = templates.render('bookPage', view);
                speech.play(book.ID, book.language, state.get('voice'), pageNumber);
            } else {
                view.nextPage = pageNumber+1;
                view.link = book.link;
                view.findLink = state.get('findAnotherLink');
                view.rating = book.rating_value; // TODO: handle updating the rating
                view.what = pageNumber === N+1;
                view.rate = pageNumber === N+2;
                view.thanks = pageNumber >= N+3;
                newContent = templates.render('choicePage', view);
            }
            var $oldPage = page.getInactive('thr-book-page');
            $oldPage.addClass('thr-colors');
            $oldPage.empty().append('<div class="content-wrap">' + newContent + '</div>');
            $def.resolve($oldPage, {title: book.title, colors: true});
        });
        return $def;
    }

    function scalePicture ($page) {
        var $box = $page.find('.thr-pic-box');
        if ($box.length === 0) return;

        var $window = $(window),
            $container = $page.find('.content-wrap'),
            ww = $container.width(),
            wh = $window.height(),
            b = $box.width(),
            bt = $box.offset().top,
            available,
            $caption = $page.find('.thr-caption'),
            ct, ch, gap, $credit;

        if ($caption.length === 1) {
            ct = $caption.length > 0 ? $caption.offset().top : 0;
            ch = $caption.height();
            gap = ct - bt - b;
            available = Math.min(ww, wh - bt - ch - gap);
        } else {
            $credit = $page.find('.thr-credit');
            gap = $credit.offset().top - bt - b + $credit.outerHeight() + 4;
            available = Math.min(ww, wh - bt - gap);
        }
        $box.css({
            width: available + 'px',
            height: available + 'px'
        });
    }

    function chooseOrPreviousPage() {
        if ($('.active-page .thr-choices').length > 0) {
            makeChoice();
        } else {
            previousPage();
        }
    }

    function nextChoiceOrPage() {
        if ($('.active-page .thr-choices').length > 0) {
            changeChoice(+1);
        } else {
            nextPage();
        }
    }

    function previousChoiceOrPage() {
        if ($('.active-page .thr-choices').length > 0) {
            changeChoice(-1);
        } else {
            previousPage();
        }
    }

    function makeChoice() {
        var choice = $('.active-page .thr-choices .selected a');
        if (choice.length == 1) {
            choice.click();
        } else {
            console.log('no choice', choice.length);
        }
    }

    function previousPage() {
        $('.active-page a.thr-back-link').click();
    }

    function nextPage() {
        $('.active-page a.thr-next-link').click();
    }

    function changeChoice(dir) {
        var choices = $('.active-page .thr-choices li');
        if (choices.length > 0) {
            var index = 0;
            var selected = choices.filter('.selected');
            if (selected.length > 0) {
                index = choices.index(selected);
                index += dir;
                if (index < 0) {
                    index = choices.length - 1;
                } else if (index > choices.length - 1) {
                    index = 0;
                }
            }
            choices.removeClass('selected');
            var $choice = $(choices.get(index));
            $choice.addClass('selected');
            var toSay = $choice.attr('data-speech');
            if (toSay) {
                speech.play('site', state.get('locale'), state.get('voice'), toSay);
            }
        } else {
            console.log('no choices');
        }
    }

    function keyChoice(e, name, code) {
        var selector = '.active-page .key-' + name;
        var link = $(selector);
        link.click();
    }

    function swipe(e, dx, dy) {
        console.log('do swipe');
        if (dx < 0) {
            nextPage();
        } else {
            previousPage();
        }
    }

    $.subscribe('/read/chooseOrPreviousPage', chooseOrPreviousPage);
    $.subscribe('/read/nextChoiceOrPage', nextChoiceOrPage);
    $.subscribe('/read/previousChoiceOrPage', previousChoiceOrPage);
    $.subscribe('/read/makeChoice', makeChoice);
    $.subscribe('/read/key', keyChoice);
    $.subscribe('/read/swipe', swipe);

    // configure the keyboard controls
    keys.setMap('.active-page.thr-book-page', {
        'left space': '/read/chooseOrPreviousPage',
        'right space': '/read/nextChoiceOrPage',
        'up': '/read/previousChoiceOrPage',
        'down': '/read/makeChoice',
        'p n m c a r d 1 2 3': '/read/key',
        'swipe': '/read/swipe'
    });

    function configureBook(url, slug, pageNumber) {
        console.log('configureBook', url, slug, pageNumber);
        var $page = $(this);
        scalePicture($page);
        $page.find('.thr-pic').fadeIn(200);
        var toSay = $page.find('.thr-question').attr('data-speech');
        if (toSay) {
            speech.play('site', state.get('locale'), state.get('voice'), toSay);
        }
    }

    route.add('render', /^\/\d+\/\d+\/\d+\/([^\/]+)\/(?:(\d+)\/)?(?:\?.*)?$/, renderBook);
    route.add('init', /^\/\d+\/\d+\/\d+\/([^\/]+)\/(?:(\d+)\/)?(?:\?.*)?$/, configureBook);

    return {};
});
