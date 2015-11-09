define(['jquery.ui.touch-punch'], function() {
    $(function() {
        $(document).on('click', '.help,.help-text', function(e) {
            var $this = $(this);
            $this.next('.help-text').toggle();
        });
    });
    return {};
});
