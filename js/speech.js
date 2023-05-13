define([], function () {
  const SpeechStallThreshold = 1;

  const synth = speechSynthesis;
  if (!synth) {
    return { speak: function () {} };
  }

  /** @type{SpeechSynthesisVoice[]} voices */
  let voices = [];
  /**
   * Promise to return voices
   *
   * @return {Promise<SpeechSynthesisVoice[]>} Available voices
   */
  function getVoices() {
    return new Promise(function (resolve) {
      function f() {
        voices = (voices.length && voices) || synth.getVoices();
        if (voices.length) resolve(voices);
        else setTimeout(f, 100);
      }
      f();
    });
  }

  let currentVoiceURI = localStorage.getItem("voiceURI");

  /**
   * Load a select control with options for available voices
   *
   * @param {HTMLSelectElement} select - id of the select control
   * @return {Promise<void>}
   */
  function populateVoiceList(select) {
    if (!select) return;
    // empty before refilling
    while (select.firstChild) {
      select.removeChild(select.firstChild);
    }
    // get the list of voices
    getVoices().then(function (voices) {
      /*
    log(
      "voices",
      voices.map((voice) => `${voice.name} ${voice.voiceURI}`)
    );
    */
      if (!currentVoiceURI) {
        currentVoiceURI = voices[0].voiceURI;
        localStorage.setItem("voiceURI", currentVoiceURI);
      }
      select.options[0] = new Option(
        "Off",
        "0",
        false,
        currentVoiceURI == "Off"
      );
      select.options[0].setAttribute("data-name", "Off");
      select.options[0].setAttribute("data-uri", "Off");
      var i;
      for (i = 0; i < voices.length; i++) {
        const voice = voices[i];
        const option = new Option(
          voice.name + " " + voice.lang,
          "1",
          false,
          voice.voiceURI == currentVoiceURI
        );
        option.setAttribute("data-name", voice.name);
        option.setAttribute("data-uri", voice.voiceURI);
        select.appendChild(option);
      }
      // handle voice changes
      select.addEventListener("change", function () {
        const option = select.selectedOptions[0];
        currentVoiceURI = option.getAttribute("data-uri");
        // const name = option.getAttribute("data-name");
        // log("voice changed to", name, currentVoiceURI);
        localStorage.setItem("voiceURI", currentVoiceURI);
      });
    });
  }

  const utterances = []; // hack to prevent gc

  /** speak text
   * @param {string} text
   * @returns {Promise<utterance>}
   */
  function speak(text, options) {
    options = options || {};
    // log("speak", text, currentVoiceURI);
    return getVoices().then(function (voices) {
      let voice = voices.find(function (voice) {
        return voice.voiceURI == currentVoiceURI;
      });
      // log("got voice", voice && voice.name);
      const utterance = new SpeechSynthesisUtterance();
      utterances.push(utterance); // hack
      if (voice) utterance.voice = voice;
      var keys = Object.keys(options);
      var i;
      for (i=0; i < keys.length; i++) {
        const key = keys[i];
        utterance[key] = options[key];
      }
      utterance.text = text;
      utterance.lang = (voice && voice.lang) || "en-US";

      /*
      utterance.addEventListener("end", function () {
        log(`end ${text}`);
      });
      utterance.addEventListener("start", function () {
        log(`start ${text}`);
      });
      utterance.addEventListener("error", function () {
        log(`error ${text}`);
      });
      */

      synth.cancel(); // cancel current speak, if any is running
      return new Promise(function (resolve) {
        let started = false;
        let error = null;
        let startTime = performance.now();
        utterance.addEventListener("start", function () {
          started = true;
        });
        utterance.addEventListener("error", function (e) {
          error = e;
        });
        function waitForTheSpeech() {
          // log("wait for the speech");
          if (synth.speaking || started) resolve(utterance);
          else if (
            error ||
            performance.now() - startTime > SpeechStallThreshold
          ) {
            // log("stalled");
            const id = "SpeechPlayButton";
            let button = document.getElementById(id);
            if (!button) {
              button = document.createElement("button");
              button.id = id;
              button.innerText = "Play";
              document.body.appendChild(button);
            }
            button.style.position = "fixed";
            button.style.top = "50vh";
            button.style.left = "50vw";
            button.style.transform = "translate(-50%, -50%)";
            button.style.background = "#ff0";
            button.style.padding = "0.3em";
            button.style.borderRadius = "0.3em";
            button.style.fontSize = "4em";
            button.onclick = function () {
              // log("break stall");
              synth.speak(utterance);
              button.style.display = "none";
              resolve(utterance);
            };
          } else {
            setTimeout(waitForTheSpeech, 100);
          }
        }
        // log("calling synth.speak");
        synth.speak(utterance);
        waitForTheSpeech();
      });
    });
  }

  $("body").on("PageRendered", ".settings-page", function () {
    const select = /** @type {HTMLSelectElement} */ (
      document.querySelector("select[name=speech]")
    );
    if (select) {
      populateVoiceList(select);
    }
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = function () {
        populateVoiceList(select);
      };
    }
    document
      .querySelector("input[name=voiceTest]")
      .addEventListener("click", function () {
        const voice = voices.find(function (voice) {
          return voice.voiceURI == currentVoiceURI;
        });
        if (voice) speak("This voice is " + voice.name);
      });
  });

  return { speak: speak };
});
