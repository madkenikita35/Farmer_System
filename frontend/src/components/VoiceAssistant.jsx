// components/VoiceAssistant.jsx
// -----------------------------------------------------------------------
// A spoken, two-way assistant. A farmer taps the mic, asks a question in
// Marathi, Hindi or English, and hears the answer back in the same
// language. Then it listens again, without another tap.
//
// The browser does the ears and the mouth (Web Speech API). The backend
// does the understanding - see backend/controllers/voiceController.js.
//
// =======================================================================
// THE FOUR THINGS THAT MAKE THIS HARDER THAN IT LOOKS
// =======================================================================
//
// 1. "continuous" recognition is not continuous. Chrome stops listening
//    after a pause no matter what the flag says. So we restart it in the
//    onend handler, which is what keeps the conversation flowing.
//
// 2. It cannot listen while it speaks. Leave the mic open during
//    playback and the assistant hears itself and answers its own answer.
//    So recognition is stopped before speaking and restarted after.
//
// 3. Marathi support is thin. Recognition is decent in Chrome on
//    Android/desktop; a Marathi TTS *voice* is missing on most devices.
//    We look for one, fall back to Hindi (closest phonetics, same
//    script), and if there's nothing, say so on screen and keep the text.
//
// 4. Safari barely supports any of it. We detect that up front and show
//    a typed-input fallback instead of a mic that would never work.
//
// The live transcript on screen is not decoration. When no voice exists
// for a language, it IS the answer - and it lets a farmer check that
// they were heard correctly before trusting a number.
// -----------------------------------------------------------------------

import { useState, useEffect, useRef, useCallback } from "react";
import { askVoiceAssistant } from "../api/api";

// The three languages, with the BCP-47 tags the browser APIs expect.
const LANGUAGES = [
  { code: "en", speechLang: "en-IN", label: "English" },
  { code: "hi", speechLang: "hi-IN", label: "हिन्दी" },
  { code: "mr", speechLang: "mr-IN", label: "मराठी" },
];

// Opening line per language. Kept here as well as on the server so the
// greeting is instant - no round trip before the farmer hears anything.
const GREETINGS = {
  en: "Hello! I am your farming assistant. You can ask me about mandi prices, the nearest mandi, or crop information.",
  hi: "नमस्ते! मैं आपका कृषि सहायक हूँ। आप मुझसे मंडी के भाव, सबसे नजदीकी मंडी, या फसल की जानकारी पूछ सकते हैं।",
  mr: "नमस्कार! मी तुमचा कृषी सहाय्यक आहे. तुम्ही मला मंडईचे भाव, सर्वात जवळची मंडई, किंवा पिकांची माहिती विचारू शकता.",
};

const UI_TEXT = {
  en: {
    title: "Voice Assistant",
    tapToStart: "Tap to speak",
    listening: "Listening…",
    thinking: "Thinking…",
    speaking: "Speaking…",
    stop: "Stop",
    you: "You",
    assistant: "Assistant",
    typeInstead: "Or type your question",
    send: "Send",
    langLabel: "Language",
    tryAsking: "Try asking:",
    examples: ["Highest price of onion", "Nearest mandi for tomato", "Price of wheat in Nashik"],
  },
  hi: {
    title: "आवाज सहायक",
    tapToStart: "बोलने के लिए दबाएं",
    listening: "सुन रहा हूँ…",
    thinking: "सोच रहा हूँ…",
    speaking: "बोल रहा हूँ…",
    stop: "रोकें",
    you: "आप",
    assistant: "सहायक",
    typeInstead: "या अपना सवाल लिखें",
    send: "भेजें",
    langLabel: "भाषा",
    tryAsking: "ऐसे पूछें:",
    examples: ["प्याज का सबसे ज्यादा भाव", "मेरे पास टमाटर की मंडी", "नाशिक में गेहूं का भाव"],
  },
  mr: {
    title: "आवाज सहाय्यक",
    tapToStart: "बोलण्यासाठी दाबा",
    listening: "ऐकत आहे…",
    thinking: "विचार करत आहे…",
    speaking: "बोलत आहे…",
    stop: "थांबा",
    you: "तुम्ही",
    assistant: "सहाय्यक",
    typeInstead: "किंवा तुमचा प्रश्न लिहा",
    send: "पाठवा",
    langLabel: "भाषा",
    tryAsking: "असे विचारा:",
    examples: ["कांद्याचा सर्वात जास्त भाव", "माझ्या जवळची टोमॅटो मंडई", "नाशिक मध्ये गव्हाचा भाव"],
  },
};

/**
 * Guesses the starting language from the browser's own setting.
 *
 * Marathi first, as the brief asks: a device set to mr-IN is almost
 * certainly a Maharashtra farmer. Anything else Indian-Devanagari falls
 * to Hindi, and everything else to English. The farmer can override it
 * with the switcher - auto-detection gets this wrong often enough that
 * the manual control is essential, not a nicety.
 */
function detectBrowserLanguage() {
  const preferred = navigator.languages || [navigator.language || "en"];

  for (const tag of preferred) {
    const lower = String(tag).toLowerCase();
    if (lower.startsWith("mr")) return "mr";
    if (lower.startsWith("hi")) return "hi";
  }
  return "en";
}

function VoiceAssistant() {
  // ---- What the assistant is doing right now ----
  // "idle" | "listening" | "thinking" | "speaking" | "unsupported"
  const [status, setStatus] = useState("idle");
  const [isOpen, setIsOpen] = useState(false);

  const [language, setLanguage] = useState(detectBrowserLanguage);
  const [turns, setTurns] = useState([]); // the visible conversation
  const [interim, setInterim] = useState(""); // words heard mid-sentence
  const [typedQuestion, setTypedQuestion] = useState("");
  const [notice, setNotice] = useState(null); // e.g. "no Marathi voice"

  // ---- Things that must NOT trigger a re-render when they change ----
  const recognitionRef = useRef(null);
  const contextRef = useRef({}); // last crop/intent, for follow-ups
  const coordsRef = useRef(null); // GPS, once granted
  const shouldKeepListeningRef = useRef(false);
  const languageRef = useRef(language);
  const isSpeakingRef = useRef(false);

  // Keep the ref in step, so the recognition callbacks (which close over
  // their first render) always read the CURRENT language rather than the
  // one selected when the session started.
  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  const text = UI_TEXT[language];

  // ---- Can this browser do any of it? ----
  const SpeechRecognition =
    typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);
  const canListen = Boolean(SpeechRecognition);
  const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;

  // =====================================================================
  // SPEAKING
  // =====================================================================

  /**
   * Picks the best installed voice for a language.
   *
   * Exact locale first (mr-IN), then any voice for that language, then -
   * for Marathi only - a Hindi voice. Marathi and Hindi share the
   * Devanagari script and much of their phonetics, so a Hindi voice
   * reading Marathi is accented but understandable. That is far better
   * than silence, which is what most devices would otherwise give.
   */
  const pickVoice = useCallback((languageCode) => {
    if (!canSpeak) return null;

    const voices = window.speechSynthesis.getVoices() || [];
    if (voices.length === 0) return null;

    const target = LANGUAGES.find((l) => l.code === languageCode);
    const wanted = target ? target.speechLang.toLowerCase() : "en-in";

    const exact = voices.find((v) => v.lang && v.lang.toLowerCase() === wanted);
    if (exact) return { voice: exact, fellBack: false };

    const sameLanguage = voices.find(
      (v) => v.lang && v.lang.toLowerCase().startsWith(languageCode)
    );
    if (sameLanguage) return { voice: sameLanguage, fellBack: false };

    if (languageCode === "mr") {
      const hindi = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith("hi"));
      if (hindi) return { voice: hindi, fellBack: "hi" };
    }

    const indianEnglish = voices.find(
      (v) => v.lang && v.lang.toLowerCase().startsWith("en")
    );
    return indianEnglish ? { voice: indianEnglish, fellBack: "en" } : null;
  }, [canSpeak]);

  /** Speaks a sentence, then hands the microphone back. */
  const speak = useCallback(
    (sentence, languageCode, onDone) => {
      if (!canSpeak || !sentence) {
        onDone && onDone();
        return;
      }

      window.speechSynthesis.cancel(); // drop anything still queued

      const utterance = new SpeechSynthesisUtterance(sentence);
      const chosen = pickVoice(languageCode);

      if (chosen) {
        utterance.voice = chosen.voice;
        utterance.lang = chosen.voice.lang;

        if (chosen.fellBack === "hi") {
          setNotice(
            "No Marathi voice is installed on this device, so a Hindi voice is reading the reply. The text below is in Marathi. Fuller Marathi voice support is coming."
          );
        } else if (chosen.fellBack === "en") {
          setNotice(
            "No Indian-language voice is installed on this device. The reply is shown as text below."
          );
        } else {
          setNotice(null);
        }
      } else {
        // Nothing at all to speak with - the transcript carries the answer.
        setNotice(
          "This device has no speech voices available, so replies are shown as text only."
        );
        onDone && onDone();
        return;
      }

      // Slightly slower than default. These are numbers that matter to
      // someone's income, often heard over a noisy field.
      utterance.rate = 0.95;
      utterance.pitch = 1;

      utterance.onstart = () => {
        isSpeakingRef.current = true;
        setStatus("speaking");
      };
      utterance.onend = () => {
        isSpeakingRef.current = false;
        onDone && onDone();
      };
      utterance.onerror = () => {
        isSpeakingRef.current = false;
        onDone && onDone();
      };

      window.speechSynthesis.speak(utterance);
    },
    [canSpeak, pickVoice]
  );

  // =====================================================================
  // ASKING THE BACKEND
  // =====================================================================

  const handleTranscript = useCallback(
    async (transcript, confidence) => {
      if (!transcript || !transcript.trim()) {
        startListening();
        return;
      }

      setTurns((previous) => [...previous, { who: "user", text: transcript }]);
      setInterim("");
      setStatus("thinking");

      try {
        const response = await askVoiceAssistant({
          transcript,
          language: LANGUAGES.find((l) => l.code === languageRef.current)?.speechLang,
          confidence,
          lat: coordsRef.current?.lat,
          lon: coordsRef.current?.lon,
          context: contextRef.current,
        });

        const result = response.data;

        // Remember crop/intent so "and what about tomato?" works.
        contextRef.current = result.context || {};

        // The server may have worked out a different language from the
        // words themselves - follow it, so the reply is spoken correctly.
        if (result.language && result.language !== languageRef.current) {
          setLanguage(result.language);
        }

        setTurns((previous) => [
          ...previous,
          { who: "assistant", text: result.reply, data: result.data },
        ]);

        speak(result.reply, result.language || languageRef.current, () => {
          if (result.endSession) {
            stopSession();
          } else {
            startListening(); // keep the conversation going, no tap needed
          }
        });
      } catch (error) {
        console.error(error);
        const failure =
          language === "mr"
            ? "माफ करा, सर्व्हरशी संपर्क होऊ शकला नाही."
            : language === "hi"
            ? "माफ कीजिए, सर्वर से संपर्क नहीं हो सका।"
            : "Sorry, I could not reach the server.";
        setTurns((previous) => [...previous, { who: "assistant", text: failure }]);
        speak(failure, languageRef.current, () => startListening());
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [speak, language]
  );

  // =====================================================================
  // LISTENING
  // =====================================================================

  const startListening = useCallback(() => {
    if (!canListen || !shouldKeepListeningRef.current) return;

    // Tear down any previous instance first. Calling start() on one
    // that's already running throws InvalidStateError.
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (error) {
        /* already stopped - nothing to do */
      }
    }

    const recognition = new SpeechRecognition();
    recognition.lang =
      LANGUAGES.find((l) => l.code === languageRef.current)?.speechLang || "en-IN";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setStatus("listening");
      setInterim("");
    };

    recognition.onresult = (event) => {
      // BARGE-IN: the farmer started talking while we were still
      // speaking. Cut the playback off mid-sentence - being talked over
      // by a machine that won't stop is infuriating, and they've clearly
      // heard enough.
      if (isSpeakingRef.current) {
        window.speechSynthesis.cancel();
        isSpeakingRef.current = false;
      }

      let finalText = "";
      let interimText = "";
      let confidence = 1;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
          // Chrome reports 0 for some languages; treat that as "unknown"
          // rather than "terrible", or every Marathi turn looks low quality.
          if (result[0].confidence > 0) confidence = result[0].confidence;
        } else {
          interimText += result[0].transcript;
        }
      }

      setInterim(interimText);

      if (finalText.trim()) {
        shouldKeepListeningRef.current = true;
        try {
          recognition.stop(); // can't listen and speak at once - see note 2
        } catch (error) {
          /* already stopping */
        }
        handleTranscript(finalText.trim(), confidence);
      }
    };

    recognition.onerror = (event) => {
      // "no-speech" and "aborted" are normal parts of the loop - someone
      // paused, or we stopped it ourselves. Only real faults deserve a
      // message.
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        shouldKeepListeningRef.current = false;
        setStatus("idle");
        setNotice(
          "Microphone permission was refused. Please allow it in your browser, or type your question below."
        );
      } else if (event.error === "language-not-supported") {
        setNotice(
          `Speech recognition for ${
            LANGUAGES.find((l) => l.code === languageRef.current)?.label
          } is not available in this browser. Try Chrome, switch language, or type your question.`
        );
        setStatus("idle");
        shouldKeepListeningRef.current = false;
      }
    };

    recognition.onend = () => {
      // Recognition stops on its own after a pause, whatever
      // `continuous` claims - see note 1 at the top. If we're still in a
      // session and not busy, start it again so the farmer can just keep
      // talking.
      if (
        shouldKeepListeningRef.current &&
        !isSpeakingRef.current &&
        statusRef.current !== "thinking"
      ) {
        setTimeout(() => startListening(), 250);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (error) {
      // Occasionally throws if the previous instance hasn't released the
      // mic yet. One retry is enough in practice.
      setTimeout(() => {
        try {
          recognition.start();
        } catch (retryError) {
          setStatus("idle");
        }
      }, 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canListen, handleTranscript]);

  // `status` inside onend would be stale (the callback closes over the
  // render that created it), so keep a ref alongside it.
  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // =====================================================================
  // SESSION CONTROL
  // =====================================================================

  function startSession() {
    setIsOpen(true);
    setTurns([]);
    contextRef.current = {};
    shouldKeepListeningRef.current = true;

    // Ask for location up front, quietly. If they say no, "near me"
    // questions fall back to asking which district they're in.
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          coordsRef.current = {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          };
        },
        () => {
          coordsRef.current = null;
        },
        { timeout: 8000, maximumAge: 300000 }
      );
    }

    const greeting = GREETINGS[language];
    setTurns([{ who: "assistant", text: greeting }]);

    if (canListen) {
      speak(greeting, language, () => startListening());
    } else {
      speak(greeting, language, () => {});
    }
  }

  function stopSession() {
    shouldKeepListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (error) {
        /* already stopped */
      }
    }
    if (canSpeak) window.speechSynthesis.cancel();
    isSpeakingRef.current = false;
    setStatus("idle");
    setInterim("");
  }

  // Always release the microphone when the component goes away -
  // otherwise the browser keeps showing a recording indicator.
  useEffect(() => {
    return () => {
      shouldKeepListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (error) {
          /* ignore */
        }
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Voices load asynchronously in Chrome - getVoices() is empty on first
  // call. This nudges a re-render once they arrive.
  useEffect(() => {
    if (!canSpeak) return;
    const handler = () => setNotice((current) => current);
    window.speechSynthesis.addEventListener("voiceschanged", handler);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", handler);
  }, [canSpeak]);

  /** The typed fallback, for Safari or a refused microphone. */
  function submitTyped(e) {
    e.preventDefault();
    const question = typedQuestion.trim();
    if (!question) return;
    setTypedQuestion("");
    shouldKeepListeningRef.current = false; // typed mode: don't grab the mic
    handleTranscript(question, 1);
  }

  // =====================================================================
  // UI
  // =====================================================================

  // Closed: just the floating button.
  if (!isOpen) {
    return (
      <button
        onClick={startSession}
        aria-label={text.title}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-primary-gradient
          text-white text-2xl shadow-lifted hover:scale-110 transition-transform
          grid place-items-center animate-pulseRing"
      >
        🎤
      </button>
    );
  }

  const statusLabel = {
    idle: text.tapToStart,
    listening: text.listening,
    thinking: text.thinking,
    speaking: text.speaking,
  }[status];

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[min(24rem,calc(100vw-3rem))] max-h-[80vh] flex flex-col bg-white rounded-3xl shadow-lifted border border-surface-300 overflow-hidden animate-fadeInUp">
      {/* ---------- Header ---------- */}
      <div className="bg-primary-gradient text-white px-4 py-3 flex items-center justify-between gap-2">
        <span className="font-bold flex items-center gap-2">🎤 {text.title}</span>

        <div className="flex items-center gap-2">
          {/* Language switcher - auto-detection is wrong often enough
              that this has to be one tap away, not buried in settings. */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            aria-label={text.langLabel}
            className="bg-white/20 ring-1 ring-white/30 text-white text-xs font-semibold
              rounded-lg px-2 py-1 cursor-pointer focus:outline-none"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code} className="text-ink-900 bg-white">
                {l.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              stopSession();
              setIsOpen(false);
            }}
            aria-label="Close"
            className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/35 grid place-items-center"
          >
            ✕
          </button>
        </div>
      </div>

      {/* ---------- Unsupported browser ---------- */}
      {!canListen && (
        <div className="bg-accent-50 border-b border-accent-200 px-4 py-3 text-xs text-accent-900">
          <strong>Voice input isn't supported in this browser.</strong> Safari and
          some others don't provide speech recognition. You can still type your
          question below, and replies will be spoken if a voice is available.
          Chrome on Android or desktop gives the best results.
        </div>
      )}

      {/* ---------- Voice-availability notice ---------- */}
      {notice && (
        <div className="bg-ink-50 border-b border-ink-200 px-4 py-2 text-xs text-ink-700">
          ℹ️ {notice}
        </div>
      )}

      {/* ---------- Conversation ---------- */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[12rem]">
        {turns.map((turn, index) => (
          <div
            key={index}
            className={turn.who === "user" ? "text-right" : "text-left"}
          >
            <p className="text-[10px] uppercase tracking-wide text-ink-400 mb-0.5">
              {turn.who === "user" ? text.you : text.assistant}
            </p>
            <div
              className={`inline-block rounded-2xl px-3.5 py-2 text-sm max-w-[85%] ${
                turn.who === "user"
                  ? "bg-ink-100 text-ink-800"
                  : "bg-primary-50 text-primary-900 ring-1 ring-primary-100"
              }`}
            >
              {turn.text}

              {/* The numbers behind the sentence, so a farmer can check
                  them - and so the answer survives a missing TTS voice. */}
              {turn.data && turn.data.modalPrice && (
                <div className="mt-2 pt-2 border-t border-primary-200 text-xs space-y-0.5">
                  <div className="font-semibold">
                    ₹{turn.data.modalPrice.toLocaleString("en-IN")}/quintal
                  </div>
                  <div className="opacity-80">
                    {turn.data.mandiName}
                    {turn.data.state ? `, ${turn.data.state}` : ""}
                    {turn.data.distanceKm != null ? ` · ${turn.data.distanceKm} km` : ""}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Words heard so far, before the sentence is finished. */}
        {interim && (
          <div className="text-right">
            <div className="inline-block rounded-2xl px-3.5 py-2 text-sm bg-ink-50 text-ink-400 italic">
              {interim}…
            </div>
          </div>
        )}

        {/* Example questions, while the conversation is still empty. */}
        {turns.length <= 1 && (
          <div className="text-xs text-ink-400 pt-2">
            <p className="mb-1">{text.tryAsking}</p>
            <ul className="space-y-0.5">
              {text.examples.map((example) => (
                <li key={example}>• {example}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ---------- Mic orb + status ---------- */}
      <div className="px-4 py-3 border-t border-surface-200 bg-surface-50">
        {canListen && (
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => {
                if (status === "listening") {
                  stopSession();
                } else {
                  shouldKeepListeningRef.current = true;
                  startListening();
                }
              }}
              aria-label={statusLabel}
              className={`w-12 h-12 rounded-full grid place-items-center text-xl text-white
                shrink-0 transition-all ${
                  status === "listening"
                    ? "bg-under-600 animate-pulseRing scale-110"
                    : status === "speaking"
                    ? "bg-accent-500"
                    : status === "thinking"
                    ? "bg-ink-400"
                    : "bg-primary-gradient hover:scale-105"
                }`}
            >
              {status === "listening" ? "🎙️" : status === "speaking" ? "🔊" : "🎤"}
            </button>

            <span className="text-sm font-medium text-ink-600">{statusLabel}</span>
          </div>
        )}

        {/* Typed fallback - always available, not just when voice fails.
            A farmer in a noisy mandi may simply prefer it. */}
        <form onSubmit={submitTyped} className="flex gap-2">
          <input
            type="text"
            value={typedQuestion}
            onChange={(e) => setTypedQuestion(e.target.value)}
            placeholder={text.typeInstead}
            className="flex-1 border border-ink-200 rounded-xl px-3 py-2 text-sm
              focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-semibold
              hover:bg-primary-700 transition-colors"
          >
            {text.send}
          </button>
        </form>
      </div>
    </div>
  );
}

export default VoiceAssistant;
