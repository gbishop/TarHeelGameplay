<!DOCTYPE html>
<?php
    //$manifest = 'manifest="/theme/manifest.appcache"';
    $manifest = '';
?>
<html <?php echo $manifest;?> class="no-js" <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=4">
    <title><?php thr_title(); ?></title>
    <link rel="shortcut icon" href="/theme/images/favicon.ico">
    <link rel="apple-touch-icon" href="/theme/images/apple-touch-icon.png">
    <link rel="stylesheet" href="/theme/style.css">
    <?php
        $view = array(
            'pageColor'=>THR('pageColor'),
            'textColor'=>THR('textColor')
        );
        echo template_render('styleColor', $view);

        if (THR('debug')) {
            echo '    <script src="http://152.2.129.207:8080/target/target-script-min.js#anonymous"></script>';
        }
    ?>
    <script src="/theme/js/modernizr.custom.js"></script>
    <script src="//code.jquery.com/jquery-2.1.1.min.js"></script>
    <script>
        //var require = { waitSeconds: 200 };
        if (!window.console) window.console = {};
        if (!window.console.log) window.console.log = function () { };
    </script>
    <script data-main="/theme/js/main" src="/theme/js/require.min.js"></script>
    <script src="http://code.responsivevoice.org/responsivevoice.js"></script>
    <?php wp_head(); ?>

    <script>
      (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
      (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
      m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
      })(window,document,'script','//www.google-analytics.com/analytics.js','ga');

      ga('create', 'UA-66271805-1', 'auto');
      ga('send', 'pageview');
    </script>
    <script>
        function logMessage(msg) {
            console.log('logMessage', msg);
        }
        function logEvent(category, action, label, value) {
            ga('send', 'event', category, action, label, value);
            console.log('logEvent', category, action, label, value);
        }
    </script>
</head>
