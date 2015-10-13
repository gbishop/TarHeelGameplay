<!-- footer.php -->
    </div>

    <?php wp_footer(); ?>

    <?php if (!THR('classic')) : ?>
    <?php else : ?>
        <script>
            logEvent('classicmode', 'on', 'now');
        </script>
    <?php endif ?>
</body>
</html>
