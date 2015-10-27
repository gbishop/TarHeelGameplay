<?php
    global $Templates;
	$view = array(
		'loggedin' => is_user_logged_in(),
        'topics' => $Templates['categories'],
        'languages' => $Templates['languages'],
        'videoId' => 'yOHoHrwwRyk',
        'interval' => 5,
        'message' => "Go",
        'start' => 8
	);
	echo template_render('creator', $view);
?>
