<?php
/*
Template Name: Gameplay

Play a game
*/
?>
<?php

define('GPS_DB_VERSION', '1.0');

function gps_install() {
    global $wpdb;

    $table_name = $wpdb->prefix . 'gameplaystore';

    $charset_collate = $wpdb->get_charset_collate();

    $sql = "CREATE TABLE $table_name (
        id mediumint(9) NOT NULL AUTO_INCREMENT,
        time datetime DEFAULT '0000-00-00 00:00:00' NOT NULL,
        hash varchar(32) NOT NULL,
        json text NOT NULL,
        UNIQUE KEY id (id),
        UNIQUE KEY hash (hash)
    ) $charset_collate;";

    require_once( ABSPATH . 'wp-admin/includes/upgrade.php' );
    dbDelta( $sql );

    update_option( 'gps_db_version', GPS_DB_VERSION );

    // copy over data from old meta values
    $metas = get_post_meta(1);
    foreach($metas as $key=>$json) {
        if (strpos($key, '_') === 0) continue;
        if (gps_get_json($key)) continue;
        $wpdb->insert(
            $table_name,
            array(
                'time' => current_time('mysql'),
                'hash' => $key,
                'json' => $json[0]
            )
        );
    }
}

$installed_ver = get_option( "gps_db_version" );
if( $installed_ver !== GPS_DB_VERSION ) {
    gps_install();
}

function gps_get_key($json) {
    require_once 'mn_words.php';
    global $mnemonicode_words;
    global $wpdb;
    $table_name = $wpdb->prefix . 'gameplaystore';
    $base = count($mnemonicode_words);

    $tohash = $json;
    while(true) {
        $num = hexdec(hash('crc32', $tohash, false));
        $key = [];
        for($i = 0; $i < 3; ++$i) {
            $n = $num % $base;
            $num = (int)($num / $base);
            $key[] = $mnemonicode_words[$n];
        }
        $key = join('-', $key);
        $val = gps_get_json($key);
        if (!$val) {
            $wpdb->insert(
                $table_name,
                array(
                    'time' => current_time('mysql'),
                    'hash' => $key,
                    'json' => $json
                )
            );
            return $key;
        }
        if ($val === $json) {
            return $key;
        }
        $tohash = $tohash . ' '; // pad it to change the hash
    }
}

function gps_get_json($key) {
    global $wpdb;
    $table_name = $wpdb->prefix . 'gameplaystore';

    $val = $wpdb->get_var($wpdb->prepare("select json from $table_name where hash = %s",
        $key));
    return $val;
}

if($_SERVER['REQUEST_METHOD'] == 'POST') {
    // posting a new or updated book
    global $log;
    $json = getParam('gp', '', null, 'post');
    $name = gps_get_key($json);
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
        $res = gps_get_json($key);
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
    $json = gps_get_json($key);
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