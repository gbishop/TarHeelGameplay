<?php
    global $Templates;
	$view = array(
		'loggedin' => is_user_logged_in(),
        'topics' => $Templates['categories'],
        'languages' => $Templates['languages']
	);
	echo template_render('creator', $view);
?>
