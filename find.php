<?php
/*
Template Name: FindBooks

GET: Return a list of books that match the query
*/
?>
<?php
$count = 24;
$args = array(
    's'                => THR('search'),
    'posts_per_page'   => $count,
    'offset'           => 0,
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
$nrows = count($posts);
$json = 0;

$result = posts_to_find_results($posts, $nrows, $count);

//print_r($result);

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
// construct the searchForm view object
$searchFormData = $Templates['searchForm'];
foreach( $searchFormData['controls'] as &$control) {
    if (!array_key_exists('name', $control)) {
        continue;
    }
    if ($control['name'] == 'category') {
        $control['options'] = array_merge($control['options'], $Templates['categories']);
    } elseif ($control['name'] == 'language') {
        $control['options'] = $Templates['languages'];
    }
}
$searchFormData = setFormFromState($searchFormData);
setTHR('findAnotherLink', find_url()); // set the return to link to come back to this state
?>
<?php thr_header('find-page', array('settings'=>true, 'chooseFavorites'=>true)); ?>
<!-- find.php -->
<?php
$view = array();
$view['searchForm'] = template_render('form', $searchFormData);

$view['bookList'] = template_render('bookList', $result);

if ($page > 1) {
    $view['backLink'] = find_url($page-1);
}
if ($result['more']) {
    $view['nextLink'] = find_url($page+1);
}
echo template_render('find', $view);

thr_footer();
?>
