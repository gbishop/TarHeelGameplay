/* ios.js hacks to support ios devices, especially voiceover */

define(["state"], function(state) {
    // detect iOS to implement hacks
    // mobile safari is the ie6 of our day
    var iOS = navigator && navigator.platform &&
              navigator.platform.match(/^(iPad|iPod|iPhone)$/);

    var nop = function(){}; // doing nothing is the default unless we detect we are iOS

    var res = {
        isIOS: function() { return iOS; }
    };

    return res;
});

