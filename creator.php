<?php
	$view = array(
		'loggedin' => is_user_logged_in()
	);
	echo template_render('creator', $view);
?>
