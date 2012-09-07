<?php

require('state.php'); // manage shared state in a cookie so both client and host have access
require_once "Mustache.php";
$locale = THR('locale');
if ($locale != 'en') {
    $content = file_get_contents("Templates.$locale.json", FILE_USE_INCLUDE_PATH);
}
if ($locale == 'en' || !$content) {
    $content = file_get_contents("Templates.json", FILE_USE_INCLUDE_PATH);
}
$Templates = json_decode($content, true);
$mustache = new Mustache();

function template_render($name, $data=array()) {
    global $mustache, $Templates;
    return $mustache->render($Templates[$name], $data);
}

$LangNameToLangCode = array();
$SynthLanguages = array();
foreach($Templates['languages'] as $row) {
    $LangNameToLangCode[$row['tag']] = $row['value'];
    if ($row['value']) {
        $SynthLanguages[] = $row['value'];
    }
}
function has_speech($lang) {
    global $SynthLanguages;
    return in_array($lang, $SynthLanguages);
}

$CategoryAbbrv = array('Alphabet' => 'Alph',
                       'Animals and Nature' => 'Anim',
                       'Art and Music' => 'ArtM',
                       'Biographies' => 'Biog',
                       'Fairy and Folk Tales' => 'Fair',
                       'Fiction' => 'Fict',
                       'Foods' => 'Food',
                       'Health' => 'Heal',
                       'History' => 'Hist',
                       'Holidays' => 'Holi',
                       'Math and Science' => 'Math',
                       'Nursery Rhymes' => 'Nurs',
                       'People and Places' => 'Peop',
                       'Poetry' => 'Poet',
                       'Recreation and Leisure' => 'Recr',
                       'Sports' => 'Spor');
$CategoryNames = array();
foreach($CategoryAbbrv as $CN=>$CA) {
    $CategoryNames[$CA] = $CN;
}

function thr_colors() {
    $t = THR('textColor');
    $p = THR('pageColor');
    echo "style=\"color: #$t; background-color: #$p; border-color: #$t\"";
}

function thr_title() {
    if (function_exists('is_tag') && is_tag()) {
       single_tag_title("Tag Archive for &quot;"); echo '&quot; - '; }
    elseif (is_archive()) {
       wp_title(''); echo ' Archive - '; }
    elseif (is_search()) {
       echo 'Search for &quot;'.wp_specialchars($s).'&quot; - '; }
    elseif (!(is_404()) && (is_single()) || (is_page())) {
       wp_title(''); echo ' - '; }
    elseif (is_404()) {
       echo 'Not Found - '; }
    if (is_home()) {
       bloginfo('name'); echo ' - '; bloginfo('description'); }
    else {
        bloginfo('name'); }
    if ($paged>1) {
       echo ' - page '. $paged; }
}

function is_ajax() {
    return (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) == 'xmlhttprequest')
        || (isset($_GET['ajax']) && $_GET['ajax']);
}

// output the header with some tweaks
function thr_header($pageType, $heading, $disableCache=true) {
    thr_setcookie();

    // tell IE8 how to render and to prefer chrome frame
    header('X-UA_Compatible: IE=edge,chrome=1');

    if (!$pageType) {
        $pageType = 'server-page';
    }

    // disable caching on our dynamically generated pages
    if ($disableCache) {
        header('Cache-Control: max-age=10'); // 10 seconds should allow a quick forward and back without a trip to the server
    }

    if (is_ajax()) {
        // this is a ajax request for the page, give it the mininimum header
        echo "<div class=\"$pageType page-wrap\" data-title=\"";
        thr_title();
        echo "\">\n";

    } else {
        // this is a request from a browser for the full page.
        get_header();
        echo "<body>\n";
        echo "<div class=\"$pageType page-wrap active-page\" >\n";
    }
    if ($heading) {
        echo template_render('heading');
    }
    echo "<div class=\"content-wrap\">\n";
}

function thr_footer($sidebar, $full) {
    if (is_ajax()) {
        // this is a ajax request for the page, give it the mininimum header
        if ($sidebar) {
            get_sidebar();
        }
        echo "</div></div>\n";
    } else {
        if ($sidebar) {
            get_sidebar();
        }
        if ($full) {
            include('footing.php');
        }
        echo "</div>\n";
        get_footer();
    }
}

function convert_image_url($url) {
    $root = '/var/www/TarHeelReader';

    if(preg_match('/^\\/cache\\/images.*$|^\\/uploads.*$/', $url)) {
        $nurl = $url;
        $path = $root . $nurl;
    } elseif(preg_match('/\\/photo([0-9])\\/([0-9a-f]+)\\/([0-9a-f]+)_([0-9a-f]+)(_[stmbo])?\\.jpg/', $url, $m)) {
        $size = $m[5];
        if (!$size) {
            $size = '';
        }
        $nurl = '/cache/images/' . substr($m[3], -2) . '/' . $m[3] . '_' . $m[4] . $size . '.jpg';
        $path = $root . $nurl;
        if (!file_exists($path)) {
            $furl = preg_replace('/\\/photo([0-9])/', 'http://farm$1.static.flickr.com', $url);
            $r = copy($furl, $path);
            if (!$r) {
                BuG('copy failed');
            }
        }

    } elseif(preg_match('/http:\\/\\/farm([0-9])\\.static\\.flickr\\.com\\/([0-9a-f]+)\\/([0-9a-f]+)_([0-9a-f]+)(_[stmbo])?\\.jpg/', $url, $m)) {
        $size = $m[5];
        if (!$size) {
            $size = '';
        }
        $nurl = '/cache/images/' . substr($m[3], -2) . '/' . $m[3] . '_' . $m[4] . $size . '.jpg';
        $path = $root . $nurl;
    } elseif(preg_match('/http:.*\\/wp-content(\\/uploads\\/.*)(_[ts])?\\.jpg/', $url, $m)) {
        $nurl = $m[1] . $m[2] . '.jpg';
        $path = $root . '/wp-content' . $nurl;
        $nurl = preg_replace('/ /', '%20', $nurl);
    }
    return array($nurl, $path);
}

function make_page($text, $url) {
    //BuG("make_page($text, $url)");
    list($nurl, $path) = convert_image_url($url);
    if (!file_exists($path)) {
        //BuG("path=$path url=$url");
        if (!copy($url, $path)) {
            BuG('Copy failed');
            return false;
        }
    }
    list($width, $height, $type, $attr) = getimagesize($path);

    return array('text'=>$text, 'url'=>$nurl, 'width'=>$width, 'height'=>$height);
}

function get_img($page, $cls, $scale=false) {
    if ($scale) {
        $f = 100;
        if ($page['width'] > $page['height']) {
            $p = round($f * $page['height'] / $page['width']);
            $m = round((100 - $p) / 2);
            if ($m > 0) {
                $style="width: $f%; height: $p%; padding-top: $m%;";
            } else {
                $style="width: $f%; height: $p%;";
            }
        } else {
            $p = round($f * $page['width'] / $page['height']);
            $style="width: $p%; height: $f%;";
        }
        $img = "<img style=\"$style\" class=\"$cls\" src=\"{$page['url']}\" data-width=\"{$page['width']}\" data-height=\"{$page['height']}\" />";
        $box = "<div class=\"$cls-box\">$img</div>";
        return $box;
    } else {
        $img = "<img class=\"$cls\" src=\"{$page['url']}\" width=\"{$page['width']}\" height=\"{$page['height']}\" />";
        return $img;
    }
}

function echo_img($page, $cls, $scale=false) {
    echo get_img($page, $cls, $scale);
}

function striptrim_deep($value)
{
    if(isset($value)) {
        $value = is_array($value) ?
            array_map('striptrim_deep', $value) :
            trim(stripslashes($value));
    }
    return $value;
}

function ParseBookPost($post) {
    global $LangNameToLangCode, $SynthLanguages, $CategoryAbbrv;

    $id = $post->ID;

    $content = $post->post_content;
    //BuG("content='$content'");
    if (preg_match('/^{.*}$/', $post->post_content)) {
        //BuG('json');
        // new format is json in the post body
        $res = json_decode($post->post_content, true);

    } else {
        //BuG('old format');
        // parse the old format
        $nimages = preg_match_all('/(?:width="(\d+)" height="(\d+)" )?src="([^"]+)"\\/?>([^<]*)/', $post->post_content, $matches);
        $image_urls = $matches[3];
        $image_widths = $matches[1];
        $image_heights = $matches[2];
        $captions = striptrim_deep(array_slice($matches[4], 1));
        $title = trim($post->post_title);
        $pages = array();
        $pages[] = make_page($title, $image_urls[0]);
        for($i = 1; $i < count($image_urls); $i++) {
            $pages[] = make_page($captions[$i-1], $image_urls[$i]);
        }
        $author_id = $post->post_author;
        $author = trim(get_post_meta($id, 'author_pseudonym', true));
        $tags = array();
        $language = '??';
        foreach(wp_get_post_tags($id) as $tag) {
            $n = $tag->name;
            if (array_key_exists($n, $LangNameToLangCode)) {
                $language = $LangNameToLangCode[$n];
            } else {
                $tags[] = $n;
            }
        }
        $audience = ' ';
        $reviewed = false;
        $type = ' ';
        $categories = array();
        foreach(get_the_category($id) as $cat) {
            if ($cat->cat_ID != 3) {
                $n = $cat->cat_name;
                if ($n == 'Reviewed') {
                    $reviewed = true;
                } else if ($n == 'Rated E/Everyone') {
                    $audience = 'E';
                } else if ($n == 'Rated C/Caution') {
                    $audience = 'C';
                } else if ($n == 'Conventional') {
                    $type = 'C';
                } else if ($n == 'Transitional') {
                    $type = 'T';
                } else if ($n == 'Other') {
                    $type = 'O';
                } else {
                    $categories[] = $CategoryAbbrv[$n];
                }
            }
        }
        $res = array('title'=>$title,
                     'author'=>$author,
                     'author_id'=>$author_id,
                     'type'=>$type,
                     'audience'=>$audience,
                     'reviewed'=>$reviewed,
                     'language'=>$language,
                     'tags'=>$tags,
                     'categories'=>$categories,
                     'pages'=>$pages);
    }

    $res['status'] = $post->post_status;

    //TODO: strip by: off the front of these
    if (!$res['author']) {
        $authordata = get_userdata($author_id);
        $res['author'] = $authordata->display_name;
    }
    $res['author'] = preg_replace('/^[bB][yY]:?\s*/', '', $res['author']);

    $rating_count = get_post_meta($id, 'book_rating_count', true);
    if(!$rating_count) {
        $rating_count = 0;
    } else {
        $rating_count = intval($rating_count);
    }
    $res['rating_count'] = $rating_count;

    $rating_value = get_post_meta($id, 'book_rating_value', true);
    if(!$rating_value) {
        $rating_value = 0;
    } else {
        $rating_value = floatval($rating_value);
    }
    $res['rating_value'] = round_rating($rating_value);
    $res['rating_total'] = intval($rating_count * $rating_value);

    $res['modified'] = $post->post_modified;
    $res['created'] = $post->post_date;
    $res['slug'] = $post->post_name;
    $res['link'] = preg_replace('/http:\/\/[a-z0-9.]+/', '', get_permalink($id));
    $res['ID'] = $id;

    return $res;
}

function SaveBookPost($id, $book) {
    $content = json_encode($book);
    $args = array('post_title' => $book['title'],
                  'post_content' => $content,
                  'post_status' => $book['status'],
                  'post_category' => array(3));
    if($id) {
        $args['ID'] = $id;
        $id = wp_update_post($args);
    } else {
        $id = wp_insert_post($args);
    }
    if ($id == 0) {
        BuG('SaveBookPost failed');
        return false;
    }

    update_post_meta($id, 'book_rating_count', $content['rating_count']);
    update_post_meta($id, 'book_rating_value', $content['rating_value']);

    //$book['ID'] = $postid;
    $post = get_post($id);
    $book = ParseBookPost($post);
    updateIndex($book);

    // update speech
    if (has_speech($book['language'])) {
        //BuG('create speech');
        // make sure we have the folder
        $folder = $id . '';
        $pfolder = substr($folder, -2);
        $path = ABSPATH . 'cache/speech/' . $pfolder;
        //BuG("path=$path");
        if (!is_dir($path)) {
            mkdir($path);
        }
        $path .= '/' . $folder;
        //BuG("path=$path");
        if (!is_dir($path)) {
            mkdir($path);
        }
        $lang = $book['language'];
        $data = array('language'=>$lang);
        foreach(array('child', 'female', 'male') as $voice) {
            $data['voice'] = $voice;
            foreach($book['pages'] as $i => $page) {
                $data['text'] = $page['text'];
                // ask the speech server to generate a mp3
                $params = array('http' => array('method' => 'POST', 'content' => http_build_query($data)));
                $ctx = stream_context_create($params);
                $mp3 = fopen('http://gbserver3.cs.unc.edu/synth/', 'rb', false, $ctx);
                // save it
                $fname = $path . '/' . $lang . '-' . substr($voice, 0, 1) . '-' . ($i+1) . '.mp3';
                file_put_contents($fname, $mp3);
            }
        }
    }

    return $book;
}

function updateIndex($book) {
    global $wpdb;
    $table_name = $wpdb->prefix . 'book_search';

    $content = array();
    foreach($book['pages'] as $page) {
      $content[] = html_entity_decode($page['text']);
    }
    foreach($book['tags'] as $tag) {
      $content[] = preprocess_tag(html_entity_decode($tag));
    }
    $content[] = $book['author'];
    $content = implode(' ', $content);

    $categories = implode(' ', $book['categories']);
    $row = array( );
    $row['ID'] = $book['ID'];
    $row['content'] = $content;
    $row['categories'] = $categories;
    $row['reviewed'] = $book['reviewed'] ? 'R' : 'N';
    $row['audience'] = $book['audience'];
    $row['language'] = $book['language'];
    $row['type'] = $book['type'];
    //print_r($row);
    $rows_affected = $wpdb->insert($table_name, $row);
    if ($rows_affected == 0) {
      $result = $wpdb->update($table_name, $row, array('ID'=>$book['ID']));
      if ($result === false) {
        BuG('update failed');
      }
    }
}

// factored out of find, favorites, and collections
function posts_to_find_results($posts, $nrows, $count) {
    if ($nrows > $count) {
        $more = 1;
        $nrows = $count;
    } else {
        $more = 0;
    }

    $books = array();
    for($i=0; $i<$nrows; $i++) {
        $post = $posts[$i];
        $book = ParseBookPost($post);
        $po = array();
        $po['title'] = $book['title'];
        $po['ID'] = $post->ID;
        $po['slug'] = $book['slug'];
        $po['link'] = $book['link'];
        $po['author'] = $book['author'];
        $po['rating'] = round(round($book['rating_value']*2)/2, 1);
        $po['tags'] = $book['tags'];
        $po['categories'] = $book['categories'];
        $po['reviewed'] = $book['reviewed'] == 'R';
        $po['audience'] = $book['audience'];
        $po['caution'] = $book['audience'] == 'C';
        $po['cover'] = $book['pages'][0];
        $po['preview'] = $book['pages'][1];
        $po['preview']['text'] = $po['title'];
        $po['pages'] = count($book['pages']);
        $po['language'] = $book['language'];
        $books[] = $po;
    }

    $result = array(); // result object
    $result['books'] = $books;
    $result['queries2'] = get_num_queries();
    $result['time'] = timer_stop(0);
    $result['more'] = $more;
    return $result;
}

function preprocess_tag($tag) {
    // prepare tags for indexing with fulltext
    return preg_replace("/[-,:.`~!@#$%^&*()_=+\[{}\];?<>]+/", '', $tag);
}

function round_rating($r) {
    return round(round($r * 2) * 0.5, 1);
}

function update_book_rating($id, $rating) {
    $cnt = get_post_meta($id, 'book_rating_count', true);
    if(!$cnt) { /* first rating */
        add_post_meta($id, 'book_rating_count', 1);
        add_post_meta($id, 'book_rating_value', $rating);
        return round_rating($rating);
    } else {
        $value = get_post_meta($id, 'book_rating_value', true);
        if(!$value) { /* should not happen */
           $value = 2;
        }
        $total = ($value * $cnt);
        $total = $total + $rating;
        $cnt = $cnt + 1;
        $value = $total / $cnt;
        update_post_meta($id, 'book_rating_count', $cnt);
        update_post_meta($id, 'book_rating_value', $value);
        return round_rating($value);
    }
}

function getParam($key, $default = null, $rule = null, $method='get')
{
    $ary = $method == 'get' ? $_GET : $_POST;
    if (!isset($ary[$key])) {
        return $default;
    }
    $result = $ary[$key];
    if ($method == 'post') {
        $result = stripslashes($result);
    }
    $result = trim($result);
    if ($rule && !preg_match($rule, $result)) {
        return $default;
    }
    return $result;
}

function audio($mp3) {
    $view = array('url' => $mp3, 'eurl' => urlencode($mp3));
    return template_render('flash', $view);
}

function setFormFromState($FormData) {
    foreach($FormData['controls'] as &$control) {
        $control['unique'] = uniqid();
        if (!isset($control['value']) && isset($control['name'])) {
            $control['value'] = THR($control['name']);
        }
        if (isset($control['options'])) {
            foreach ($control['options'] as &$option) {
                $option['selected'] = $option['value'] === $control['value'];
            }
        }
    }
    return $FormData;
}

function THRoption($label, $value, $var) {
    global $THRState;
    $selected = $THRState[$var] == $value ? 'selected' : '';
    echo "<option value=\"$value\" $selected>$label</option>\n";
}

function setImageSizes(&$c) {
    if ($c['width'] > $c['height']) {
        $c['pw'] = 100;
        $c['ph'] = 100*$c['height']/$c['width'];
        $c['pm'] = (100 - $c['ph']) / 2;
    } else {
        $c['ph'] = 100;
        $c['pw'] = 100*$c['width']/$c['height'];
        $c['pm'] = 0;
    }
}

function pageLink($link, $page) {
    if ($page == 1) return $link;
    return $link . $page . '/';
}
        // Translations can be filed in the /languages/ directory
        load_theme_textdomain( 'html5reset', TEMPLATEPATH . '/languages' );

        $locale = get_locale();
        $locale_file = TEMPLATEPATH . "/languages/$locale.php";
        if ( is_readable($locale_file) )
            require_once($locale_file);

// Clean up the <head>
function removeHeadLinks() {
    remove_action('wp_head', 'rsd_link'); // Might be necessary if you or other people on this site use remote editors.
    remove_action('wp_head', 'feed_links', 2); // Display the links to the general feeds: Post and Comment Feed
    remove_action('wp_head', 'feed_links_extra', 3); // Display the links to the extra feeds such as category feeds
    remove_action('wp_head', 'index_rel_link'); // Displays relations link for site index
    remove_action('wp_head', 'wlwmanifest_link'); // Might be necessary if you or other people on this site use Windows Live Writer.
    remove_action('wp_head', 'start_post_rel_link', 10, 0); // Start link
    remove_action('wp_head', 'parent_post_rel_link', 10, 0); // Prev link
    remove_action('wp_head', 'adjacent_posts_rel_link_wp_head', 10, 0); // Display relational links for the posts adjacent to the current post.
    remove_filter( 'the_content', 'capital_P_dangit' ); // Get outta my Wordpress codez dangit!
    remove_filter( 'the_title', 'capital_P_dangit' );
    remove_filter( 'comment_text', 'capital_P_dangit' );
    // Hide the version of WordPress you're running from source and RSS feed // Want to JUST remove it from the source? Try:
    remove_action('wp_head', 'wp_generator');

}
add_action('init', 'removeHeadLinks');

function fixupLogInOut($link) {
    return str_replace('<a ', '<a class="no-ajaxy" ', $link);
}
add_filter('loginout', 'fixupLogInOut');
add_filter('register', 'fixupLogInOut');

function my_login_redirect() {
  return get_bloginfo('url');
}
add_filter('login_redirect', 'my_login_redirect');

// I suddenly started getting redirect loops when accessing / this seems to fix it.
remove_filter('template_redirect', 'redirect_canonical');

// exclude books from blog
add_action('pre_get_posts', 'thr_modify_query');
function thr_modify_query( $query ) {
    if (!is_admin() && $query->is_main_query() && !$query->get('cat')) {
        $query->set('cat', '-3');
    }
}

// hack error logging
function BuG($msg) {
    date_default_timezone_set('EDT');
    $msg = date('m/d H:i:s') . ' ' . $msg;
    error_log($msg . "\n", 3, '/var/tmp/BuG.txt');
}
?>
