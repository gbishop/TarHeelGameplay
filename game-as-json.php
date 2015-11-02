<?php
/*
Template Name: GameAsJson

GET: Return the json for a gameplay
*/

if($_SERVER['REQUEST_METHOD'] == 'GET') {
    // get the parameters
    $id = getParam('id', 0, '/\d+/');
    if ($id) {
        $post = get_post($id);
        if (!$post) {
            header("HTTP/1.0 404 Not Found");
            die();
        }
    } else {
        $slug = getParam('slug', '', '/[^\/]+/');
        if ($slug) {
            query_posts("name=$slug");
            if(have_posts()) {
                the_post();
            } else {
                header("HTTP/1.0 404 Not Found");
                die();
            }
        } else {
            header("HTTP/1.0 400 Bad Parameter");
            die();
        }
    }
    $gameplay = ParseGameplayPost($post);
    if (!$gameplay) {
        header("HTTP/1.0 404 Not Found");
        die();
    }

    $output = json_encode($gameplay);
    header('Content-Type: application/json');
    header('Content-Size: ' . strlen($output));
    echo $output;
    die();
} elseif($_SERVER['REQUEST_METHOD'] == 'POST') {
    // posting a new or updated book
    $id = getParam('id', 0, '/\d+/', 'post');
    $publish = getParam('publish', 'false', '/false|true/', 'post');
    $gamedata = getParam('content', '', null, 'post');
    $content = json_decode($gamedata, true);
    // validate user
    if (!is_user_logged_in() || !current_user_can('publish_posts') || ($id && !current_user_can('edit_post', $id))) {
        header("HTTP/1.0 401 Not Authorized");
        die();
    }
    $current_user = wp_get_current_user();
    if ($id) {
        $post = get_post($id);
        $gameplay = ParseGameplayPost($post);
        if (!$gameplay) {
            header("HTTP/1.0 404 Not Found");
            die();
        }
    } else {
        $gameplay = array();
    }
    $gameplay = array_merge($gameplay, $content);
    $canPublish = $publish === 'true';
    $gameplay['title'] = trim($gameplay['title']);
    $canPublish = $canPublish && strlen($gameplay['title']) > 0;
    $gameplay['author'] = trim($gameplay['author']);
    $canPublish = $canPublish && strlen($gameplay['author']) > 0;
    // validate audience
    if (!in_array($gameplay['audience'], array('E', 'C', ' '))) {
        header("HTTP/1.0 400 Bad Audience");
        die();
    }
    // validate reviewed
    //$gameplay['reviewed'] = current_user_can('edit_others_posts') && $content['reviewed'];

    // validate language
    if (!in_array($gameplay['language'], $LangNameToLangCode) && $gameplay['language'] != ' ') {
        header("HTTP/1.0 400 Bad Language");
        die();
    }
    $canPublish = $canPublish && $gameplay['language'] != ' ';
    // validate tags
    foreach($gameplay['tags'] as $tag) {
        if (!term_exists($tag, 'post_tag')) {
            header("HTTP/1.0 400 Bad Tag");
            die();
        }
    }

    $gameplay['status'] = $publish && $canPublish ? 'publish' : 'draft';
    $gameplay = SaveGameplayPost($id, $gameplay);
    if ($gameplay === false) {
        header("HTTP/1.0 400 Save Post Failed");
        die();
    }
    $output = json_encode($gameplay);
    header('Content-Type: application/json');
    header('Content-Size: ' . mb_strlen($output));
    echo $output;
    die();
}
?>
