<?php
/*
Template Name: Gameplay

Play a game
*/
?>
<?php
if($_SERVER['REQUEST_METHOD'] == 'POST') {
    // posting a new or updated book
    global $log;
    $json = getParam('gp', '', null, 'post');
    $name = hash('crc32', $json, false);
    update_post_meta(1, $name, $json);
    $res = array('name'=>$name);
    $output = json_encode($res);
    header('Content-Type: application/json');
    header('Content-Size: ' . mb_strlen($output));
    echo $output;
    die();
}
$accept = $_SERVER['HTTP_ACCEPT'];
if (strpos($accept, 'application/json') !== false ||
    strpos($accept, 'text/javascript') !== false) {
    $key = getParam('key', '', null);
    if ($key) {
        $res = get_post_meta(1, $key, true);
        $output = $res;
        header('Content-Type: application/json');
        header('Content-Size: ' . mb_strlen($output));
        echo $output;
        die();
    }
}
get_header();

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