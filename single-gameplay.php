<!--single-gameplay-->
<?php
if (have_posts()) {
    the_post();
    $id = $post->ID;
    $json = get_post_meta($id, 'gamedata', true);
    $accept = $_SERVER['HTTP_ACCEPT'];
    if (strpos($accept, 'application/json') !== false ||
        strpos($accept, 'text/javascript') !== false) {
        $output = $json;
        header('Content-Type: application/json');
        header('Content-Size: ' . mb_strlen($output));
        echo $output;
        die();
    }

    get_header();

    $script = "";
    if($id) {
        $script = "<script>window.game_init=$json; </script>";
    }
}
?>
<body>
<?php echo $script; ?>
    <div class="gameplay-page">

        <div id="player"></div>
        <div id="shade">
            <table id="message"></table>
        </div>
<?php
get_footer();
?>