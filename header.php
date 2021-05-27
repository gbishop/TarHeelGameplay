<!DOCTYPE html>
<html class="no-js" <?php language_attributes(); ?>>

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
        'pageColor' => THR('pageColor'),
        'textColor' => THR('textColor')
    );
    echo template_render('styleColor', $view);
    ?>
    <script src="/theme/js/modernizr.custom.js"></script>
    <script src="//code.jquery.com/jquery-2.1.1.min.js"></script>
    <script>
        //var require = { waitSeconds: 200 };
        if (!window.console) window.console = {};
        if (!window.console.log) window.console.log = function() {};
    </script>
    <script data-main="/theme/js/main" src="/theme/js/require.min.js"></script>
    <script src="/theme/js/log.js"></script>
<!--
    <script>
        log('log start');
        window.onerror = log;
    </script>
-->
    <?php wp_head(); ?>

    <!-- Global site tag (gtag.js) - Google Analytics -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=UA-66271805-1"></script>
    <script>
        window.dataLayer = window.dataLayer || [];

        function gtag() {
            dataLayer.push(arguments);
        }
        gtag('js', new Date());

        gtag('config', 'UA-66271805-1');
    </script>

    <script>
        function logMessage(msg) {
            console.log('logMessage', msg);
        }

        function logEvent(category, action, label, value) {
            gtag('event', action, {
                event_category: category,
                event_label: label,
                event_value: value
            });
            console.log('logEvent', category, action, label, value);
        }
    </script>
</head>
