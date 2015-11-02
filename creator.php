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
    $script = "";
    if ($key) {
        $json = get_post_meta(1, $key, true);
        $script = "<script>window.game_init=$json; </script>";
    } elseif($id) {
        $json = get_post_meta($id, 'gamedata', true);
        $script = "<script>window.game_init=$json; </script>";
    }
    $view['script'] = $script;
	echo template_render('creator', $view);
?>
