/* book.js render a book page */

define(["route",
        "page",
        "templates",
        "keyboard",
        "state",
        "speech"
        ], function(route, page, templates, keys, state, speech) {

    var book = null; // current book

    $("body").on("PageRendered", function() {
        page.setHoverColors($(this));
    }); // end PageVisible

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
        console.log('renderBook', url, slug, pageNumber, this);
        // only render a book locally when the link has data-type=book
        if (!this || !this.data_type || this.data_type != 'book') {
            console.log('renderBook rejects based on type');
            return false; // it will get rendered by the host
        }
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
                speech.play(book.ID, state.get('voice'), pageNumber, book.bust);
            } else {
                view.nextPage = pageNumber+1;
                view.link = book.link;
                view.findLink = state.get('findAnotherLink');
                view.what = pageNumber === N+1;
                view.rate = pageNumber === N+2;
                view.thanks = pageNumber >= N+3;
                if (view.thanks) {
                    // we need to update the rating on the host
                    updateRating(book, url);
                }
                view.rating = templates.rating_info(book.rating_value);
                newContent = templates.render('choicePage', view);
            }
            var $oldPage = page.getInactive('thr-book-page');
            // add classes to specific pages for styling purposes
            if (pageNumber === 1) {
                $oldPage.addClass('thr-colors front-page').removeClass('choice-page');
            } else if (pageNumber <= N) {
                $oldPage.addClass('thr-colors').removeClass('front-page choice-page');
            } else {
                $oldPage.addClass('thr-colors choice-page').removeClass('front-page');
            }
            $oldPage.removeClass('favoriteYes favoriteNo')
                .addClass(state.isFavorite(book.ID) ? 'favoriteYes' : 'favoriteNo');
            $oldPage.empty()
                .append(templates.render('heading', view)) // need to pass in view for book ID
                .append('<div class="content-wrap">' + newContent + '</div>');

            $def.resolve($oldPage, {title: 'Tar Heel Reader | ' + book.title,
                colors: true});
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
                speech.play('site', state.get('voice'), toSay);
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

    function updateRating(book, url) {
        var ratingRE = /rating=([123])/;
        var m = ratingRE.exec(url);
        if (m) {
            var rating = parseInt(m[1], 10);
            book.rating_count += 1;
            book.rating_total += rating;
            book.rating_value = Math.round(2.0*book.rating_total / book.rating_count) * 0.5;
            $.ajax({
                url: '/rateajax/',
                data: {
                    id: book.ID,
                    rating: rating
                }
            });
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

    // handle toggling favorites
    $(document).on('click', '.front-page .thr-favorites-icon', function(ev) {
        ev.preventDefault();
        var $page = $('.front-page.active-page'),
            id = $page.find('.content-wrap h1').attr('data-id');
        if ($page.hasClass('favoriteYes')) {
            $page.removeClass('favoriteYes').addClass('favoriteNo');
            state.removeFavorite(id);
        } else {
            $page.removeClass('favoriteNo').addClass('favoriteYes');
            state.addFavorite(id);
        }
    });

    function configureBook(url, slug, pageNumber) {
        console.log('configureBook', url, slug, pageNumber);
        var $page = $(this);
        if (!$page.is('.thr-book-page')) {
            console.log('not book page, no configure');
        }
        scalePicture($page);
        $page.find('.thr-pic').fadeIn(200);
        var toSay = $page.find('.thr-question').attr('data-speech');
        if (toSay) {
            speech.play('site', state.get('voice'), toSay);
        }
    }

    route.add('render', /^\/\d+\/\d+\/\d+\/([^\/]+)\/(?:(\d+)\/)?(?:\?.*)?$/, renderBook);
    route.add('init', /^\/\d+\/\d+\/\d+\/([^\/]+)\/(?:(\d+)\/)?(?:\?.*)?$/, configureBook);

    return {};
});
