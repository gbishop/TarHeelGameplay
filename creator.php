<?php
    // get the id if any
    global $current_user;
    get_currentuserinfo();

    global $Templates;
	$view = array(
		'loggedin' => is_user_logged_in(),
        'topics' => $Templates['categories'],
        'languages' => $Templates['languages'],
        'user' => $current_user->display_name
	);
    $key = getParam('key', '', null);
    $id = getParam('id', '', null);
    echo "<!-- $key $id -->";
    $script = "";
    if ($key) {
        $json = gps_get_json($key);
        $script = "<script>window.game_init=$json; </script>";
    } elseif($id) {
        $post = get_post($id);
        $gameplay = ParseGameplayPost($post);
        $json = json_encode($gameplay);
        $script = "<script>window.game_init=$json; </script>";
    }
    $view['script'] = $script;
	echo template_render('creator', $view);
?>
