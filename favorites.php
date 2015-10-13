<?php
/*
Template Name: Favorites

GET: Return a list of books that match the query
*/
?>
<?php
// redirect on an empty URL so the page is bookmarkable
if (! array_key_exists('favorites', $_GET) && ! array_key_exists('collection', $_GET) && THR('favorites')) {
    $loc = favorites_url();
    header('Location: ' . $loc);
    die();
}

// redirect on A or R URLs so the resulting URL reflects the state
if (array_key_exists('favorites', $_GET) && preg_match('/^[AR]/', $_GET['favorites'])) {
    $loc = favorites_url();
    header('Location: ' . $loc);
    die();
}

// construct the where clause
$collection = THR('collection');
if ($collection) {
    $favorites = $wpdb->get_var($wpdb->prepare("SELECT booklist FROM $collections_table WHERE slug = %s", $collection));
    setTHR('favorites', $favorites);
    thr_setcookie(1); // make sure the client sees the updated favorties
} else {
    $favorites = THR('favorites');
}
$fav_array = explode(',', $favorites);

$count = 24;
$cp1 = $count + 1; // ask for one more to determine if there are more
$page = THR('fpage');
$offset = ($page - 1) * $count;
$args = array(
    'post__in'          => $fav_array,
    'posts_per_page'   => $cp1,
    'offset'           => $offset,
    'category'         => '',
    'category_name'    => 'Gameplays',
    'orderby'          => 'date',
    'order'            => 'DESC',
    'include'          => '',
    'exclude'          => '',
    'meta_key'         => '',
    'meta_value'       => '',
    'post_type'        => 'post',
    'post_mime_type'   => '',
    'post_parent'      => '',
    'author'       => '',
    'post_status'      => 'publish'
);
$posts = get_posts($args);

$json = array_key_exists('json', $_GET) && $_GET['json'] == 1;

$nrows = count($posts);

$result = posts_to_find_results($posts, $nrows, $count);

if (0) { // force an error for testing
    header("HTTP/1.0 500 Internal Error");
    die();
}
if (0) { // delay for testing
        sleep(3);
}
if ($json) {
    $output = json_encode($result);
    header('Content-Type: application/json');
    header('Content-Size: ' . strlen($output));
    echo $output;
    die();
}
setTHR('findAnotherLink', '/favorites/');
?>
<?php
    thr_header('favorites-page', array('settings'=>true, 'chooseFavorites'=>true));
?>
<!-- favorites.php -->
<?php
$view = array();
$view['searchForm'] = '';
$result['favorites'] = true;
$view['bookList'] = template_render('bookList', $result);
if ($page > 1) {
    $view['backLink'] = favorites_url($page-1);
}
if ($result['more']) {
    $view['nextLink'] = favorites_url($page+1);
}
echo template_render('find', $view);

thr_footer();
?>
