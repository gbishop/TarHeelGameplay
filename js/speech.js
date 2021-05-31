define([], function () {
  const SpeechStallThreshold = 1;

  const synth = speechSynthesis;

  /** @type{SpeechSynthesisVoice[]} voices */
  let voices = [];
  /**
   * Promise to return voices
   *
   * @return {Promise<SpeechSynthesisVoice[]>} Available voices
   */
  function getVoices() {
    return new Promise((resolve) => {
      function f() {
        voices = (voices.length && voices) || synth.getVoices();
        if (voices.length) resolve(voices);
        else setTimeout(f, 100);
      }
      f();
    });
  }

  let currentVoiceURI = localStorage.getItem("voiceURI");
  let currentVoice = null;

  /**
   * Load a select control with options for available voices
   *
   * @async
   * @param {HTMLSelectElement} select - id of the select control
   * @return {Promise<void>}
   */
  async function populateVoiceList(select) {
    if (!select) return;
    // empty before refilling
    while (select.firstChild) {
      select.removeChild(select.firstChild);
    }
    // get the list of voices
    voices = await getVoices();
    // order them with English first
    /*
    voices.sort((a, b) => {
      if (a.lang == "en-US" && b.lang == "en-US")
        return a.lang.localeCompare(b.lang);
      if (a.lang == "en-US") return -1;
      if (b.lang == "en-US") return 1;
      if (a.lang.startsWith("en")) return -1;
      if (b.lang.startsWith("en")) return 1;
      return 0;
    });
    */
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
    select.options[0] = new Option("Off", "0", false, currentVoiceURI == "Off");
    select.options[0].setAttribute("data-name", "Off");
    select.options[0].setAttribute("data-uri", "Off");
    for (const voice of voices) {
      const option = new Option(
        `${voice.name} (${voice.lang})`,
        "1",
        false,
        voice.voiceURI == currentVoiceURI
      );
      option.setAttribute("data-name", voice.name);
      option.setAttribute("data-uri", voice.voiceURI);
      select.appendChild(option);
    }
    // handle voice changes
    select.addEventListener("change", () => {
      const option = select.selectedOptions[0];
      const name = option.getAttribute("data-name");
      currentVoiceURI = option.getAttribute("data-uri");
      // log("voice changed to", name, currentVoiceURI);
      localStorage.setItem("voiceURI", currentVoiceURI);
    });
  }

  const utterances = []; // hack to prevent gc

  /** speak text
   * @param {string} text
   * @returns {Promise<utterance>}
   */
  async function speak(text, options) {
    options = options || {};
    // log("speak", text, currentVoiceURI);
    let voice;
    if (currentVoice && currentVoice.voiceURI == currentVoiceURI) {
      voice = currentVoice;
    } else {
      const voices = await getVoices();
      voice = voices.find((voice) => voice.voiceURI == currentVoiceURI);
      currentVoice = voice;
    }
    // log("got voice", voice && voice.name);
    const utterance = new SpeechSynthesisUtterance();
    utterances.push(utterance); // hack
    if (voice) utterance.voice = voice;
    for (const option of Object.keys(options)) {
      utterance[option] = options[option];
    }
    utterance.text = text;
    utterance.lang = (voice && voice.lang) || "en-US";

    /*
    utterance.addEventListener("end", () => log(`end ${text}`));
    utterance.addEventListener("start", () => log(`start ${text}`));
    utterance.addEventListener("error", () => log(`error ${text}`));
    */

    synth.cancel(); // cancel current speak, if any is running
    return new Promise((resolve) => {
      let started = false;
      let error = null;
      let startTime = performance.now();
      utterance.addEventListener("start", () => (started = true));
      utterance.addEventListener("error", (e) => (error = e));
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
          button.onclick = () => {
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
  }

  $("body").on("PageRendered", ".settings-page", function () {
    const select = /** @type {HTMLSelectElement} */ (
      document.querySelector("select[name=speech]")
    );
    if (select) {
      populateVoiceList(select);
    }
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => populateVoiceList(select);
    }
    document
      .querySelector("input[name=voiceTest]")
      .addEventListener("click", () => {
        const voice = voices.find((voice) => voice.voiceURI == currentVoiceURI);
        if (voice) speak(`This voice is ${voice.name}`);
      });
  });

  return { speak };
});
