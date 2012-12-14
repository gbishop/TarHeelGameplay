<?php thr_header('thr-book-page thr-colors'); ?>

    <?php if (have_posts()):
        while (have_posts()):
            the_post();

            $book = ParseBookPost($post);
            $pages = $book['pages'];
            $Npages = count($pages);
            $link = get_permalink();
            $mp3 = null;
            if (has_speech($book['language'])) {
                $voice = THR('voice');
                if ($voice != 'silent') {
                    $v = $voice[0];
                    $id = $book['ID'];
                    $folder = substr($id, -2) . '/' . $id;
                    $language = $book['language'];
                    $mp3 = "/cache/speech/$folder/$language-$v-$page.mp3";
                    echo "<!-- $mp3 -->";
                }
            }
            $pageNumber = $page;
            $view = array();
            $view['frontPage'] = $pageNumber == 1;
            $view['title'] = $book['title'];
            $view['textColor'] = THR('textColor');
            $view['pageColor'] = THR('pageColor');
            $view['ID'] = $book['ID'];
            $N = count($book['pages']);
            if ($pageNumber <= $N) {
                $view['author'] = $book['author'];
                $view['pageNumber'] = $pageNumber;
                $view['backto'] = urlencode($book['link']);
                $view['image'] = $book['pages'][max(1, $pageNumber-1)];
                $view['caption'] = $view['image']['text'];
                if ($pageNumber == 1) {
                    $view['backLink'] = THR('findAnotherLink');
                    $view['nextLink'] = pageLink($book['link'], 2);
                } else {
                    $view['backLink'] = pageLink($book['link'], $pageNumber-1);
                    $view['nextLink'] = pageLink($book['link'], $pageNumber+1);
                }
                setImageSizes($view['image']);
                if ($mp3) $view['audio'] = audio($mp3);
                echo template_render('bookPage', $view);
            } else {
                $view['nextPage'] = $pageNumber+1;
                $view['link'] = $book['link'];
                $view['findLink'] = THR('findAnotherLink');
                $view['what'] = $pageNumber == $N+1;
                $view['rate'] = $pageNumber == $N+2;
                $view['thanks'] = $pageNumber >= $N+3;
                $rating = getParam('rating', '', '/[123]/');
                if ($rating && $view['thanks']) {
                    $rating = intval($rating, 10);
                    $view['rating'] = update_book_rating($post->ID, $rating);
                } else {
                    $view['rating'] = $book['rating_value'];
                }
                echo template_render('choicePage', $view);
            }
    endwhile; endif;
thr_footer(false, false); ?>
