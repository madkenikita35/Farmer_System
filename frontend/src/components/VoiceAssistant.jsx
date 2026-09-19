// components/VoiceAssistant.jsx
// -----------------------------------------------------------------------
// A HANDS-FREE, VOICE-ONLY assistant.
//
// The farmer taps the mic once to open the conversation. After that
// there is nothing to tap and nothing to type: they speak, the assistant
// speaks back, and the microphone reopens by itself for the next
// question. A farmer standing in a field with muddy hands and a phone in
// their pocket can hold an entire conversation without looking at it.
//
// There is deliberately NO text box in the normal flow. Typing is only
// offered when the device genuinely cannot do speech at all (Safari, or
// a refused microphone), and then it is presented as a failure state -
// not as an equal alternative.
//
// The browser does the ears and the mouth (Web Speech API). The backend
// does the understanding - see backend/controllers/voiceController.js.
//
// =======================================================================
// THE STATE MACHINE (this is the whole component, really)
// =======================================================================
//
//   idle ──tap──> greeting spoken ──> LISTENING
//                                        │
//                          farmer stops talking
//                                        ↓
//                                     THINKING   (mic closed)
//                                        ↓
//                                     SPEAKING   (mic closed)
//                                        ↓
//                                    LISTENING   ← loops forever
//
// Two rules keep it honest:
//
//   * The mic is CLOSED whenever we are thinking or speaking. Leave it
//     open and the assistant hears its own voice and answers itself.
//
//   * Recognition stops on its own after a pause, whatever the
//     `continuous` flag claims. So we restart it from `onend`. That
//     restart is what makes the loop continuous in practice.
//
// =======================================================================
// THE RACE THIS CODE EXISTS TO AVOID
// =======================================================================
// An earlier version guarded the restart with React state
// (`status !== "thinking"`). That was broken: setStatus is asynchronous,
// but `recognition.stop()` fires `onend` immediately. The guard was
// still reading the PREVIOUS status, so the mic reopened while the
// answer was still being fetched - and the assistant listened to itself.
//
// `busyRef` below is a plain ref, set synchronously the instant we begin
// processing. Refs update immediately; state does not. For anything that
// gates a hardware resource like a microphone, that difference matters.
// -----------------------------------------------------------------------

import { useState, useEffect, useRef, useCallback } from "react";
import { askVoiceAssistant } from "../api/api";
import {
  InfoIcon,
  MicIcon,
  WarnIcon,
  ICON_MD,
  ICON_STROKE,
  SpeakingIcon,
  SpinnerIcon,
  PlayIcon,
} from "./icons";

const LANGUAGES = [
  { code: "en", speechLang: "en-IN", label: "English" },
  { code: "hi", speechLang: "hi-IN", label: "हिन्दी" },
  { code: "mr", speechLang: "mr-IN", label: "मराठी" },
];

// Spoken immediately on opening, before any network call, so the farmer
// hears something the moment they tap.
const GREETINGS = {
  en: "Hello! I am your farming assistant. You can ask me about mandi prices, the nearest mandi, or crop information.",
  hi: "नमस्ते! मैं आपका कृषि सहायक हूँ। आप मुझसे मंडी के भाव, सबसे नजदीकी मंडी, या फसल की जानकारी पूछ सकते हैं।",
  mr: "नमस्कार! मी तुमचा कृषी सहाय्यक आहे. तुम्ही मला मंडईचे भाव, सर्वात जवळची मंडई, किंवा पिकांची माहिती विचारू शकता.",
};

const UI_TEXT = {
  en: {
    title: "Voice Assistant",
    listening: "Listening — just speak",
    thinking: "Thinking…",
    speaking: "Speaking…",
    starting: "Starting…",
    paused: "Paused — tap to continue",
    you: "You",
    assistant: "Assistant",
    langLabel: "Language",
    tryAsking: "Just say:",
    examples: [
      "Highest price of onion",
      "Nearest mandi for tomato",
      "Price of wheat in Indore",
    ],
    handsFree: "Hands-free — keep talking, no need to tap",
    tapToTalk: "Tap to start talking",
    micBlocked:
      "Microphone permission was refused. Voice needs the microphone — please allow it in your browser settings and tap the mic again.",
    noVoiceSupport:
      "This browser cannot listen to speech. Voice conversation works best in Chrome on Android or desktop.",
    fallbackTitle: "Voice is not available on this device",
    fallbackHelp: "You can still type your question here until voice works:",
    send: "Ask",
  },
  hi: {
    title: "आवाज सहायक",
    listening: "सुन रहा हूँ — बोलिए",
    thinking: "सोच रहा हूँ…",
    speaking: "बोल रहा हूँ…",
    starting: "शुरू हो रहा है…",
    paused: "रुका हुआ — जारी रखने के लिए दबाएं",
    you: "आप",
    assistant: "सहायक",
    langLabel: "भाषा",
    tryAsking: "ऐसे बोलें:",
    examples: [
      "प्याज का सबसे ज्यादा भाव",
      "मेरे पास टमाटर की मंडी",
      "इंदौर में गेहूं का भाव",
    ],
    handsFree: "बिना छुए — बोलते रहिए",
    tapToTalk: "बोलने के लिए दबाएं",
    micBlocked:
      "माइक्रोफोन की अनुमति नहीं मिली। कृपया ब्राउज़र सेटिंग में अनुमति दें और फिर माइक दबाएं।",
    noVoiceSupport:
      "यह ब्राउज़र आवाज नहीं सुन सकता। Android या डेस्कटॉप पर Chrome सबसे अच्छा काम करता है।",
    fallbackTitle: "इस डिवाइस पर आवाज उपलब्ध नहीं है",
    fallbackHelp: "तब तक आप यहाँ लिख सकते हैं:",
    send: "पूछें",
  },
  mr: {
    title: "आवाज सहाय्यक",
    listening: "ऐकत आहे — बोला",
    thinking: "विचार करत आहे…",
    speaking: "बोलत आहे…",
    starting: "सुरू होत आहे…",
    paused: "थांबले — सुरू ठेवण्यासाठी दाबा",
    you: "तुम्ही",
    assistant: "सहाय्यक",
    langLabel: "भाषा",
    tryAsking: "असे बोला:",
    examples: [
      "कांद्याचा सर्वात जास्त भाव",
      "माझ्या जवळची टोमॅटो मंडई",
      "इंदूर मध्ये गव्हाचा भाव",
    ],
    handsFree: "हात न लावता — बोलत राहा",
    tapToTalk: "बोलण्यासाठी दाबा",
    micBlocked:
      "मायक्रोफोनची परवानगी मिळाली नाही. कृपया ब्राउझर सेटिंगमध्ये परवानगी द्या आणि पुन्हा माइक दाबा.",
    noVoiceSupport:
      "हा ब्राउझर आवाज ऐकू शकत नाही. Android किंवा डेस्कटॉपवर Chrome सर्वोत्तम चालते.",
    fallbackTitle: "या डिव्हाइसवर आवाज उपलब्ध नाही",
    fallbackHelp: "तोपर्यंत तुम्ही इथे लिहू शकता:",
    send: "विचारा",
  },
};

/**
 * Guesses the starting language from the browser's own setting.
 * Marathi first, as the brief asks - a device set to mr-IN is almost
 * certainly a Maharashtra farmer.
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
  // "idle" | "starting" | "listening" | "thinking" | "speaking" | "paused"
  const [status, setStatus] = useState("idle");
  const [isOpen, setIsOpen] = useState(false);
  const [language, setLanguage] = useState(detectBrowserLanguage);
  const [turns, setTurns] = useState([]);
  const [interim, setInterim] = useState("");
  const [notice, setNotice] = useState(null);
  const [voiceFailed, setVoiceFailed] = useState(null); // "blocked" | "unsupported"
  const [typedQuestion, setTypedQuestion] = useState("");

  // ---- Refs: updated synchronously, unlike state ----
  const recognitionRef = useRef(null);
  const contextRef = useRef({});
  const coordsRef = useRef(null);
  const sessionActiveRef = useRef(false); // is a conversation running?
  const busyRef = useRef(false); // thinking or speaking - mic must stay shut
  const isSpeakingRef = useRef(false);
  const languageRef = useRef(language);
  const transcriptEndRef = useRef(null);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  // Keep the newest turn in view without the farmer scrolling.
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, interim]);

  const text = UI_TEXT[language];

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
   * Exact locale (mr-IN), then any voice for that language, then - for
   * Marathi only - a Hindi voice. They share Devanagari and much of
   * their phonetics, so a Hindi voice reading Marathi is accented but
   * understandable. On most devices that is the difference between an
   * answer and silence.
   */
  const pickVoice = useCallback(
    (languageCode) => {
      if (!canSpeak) return null;
      const voices = window.speechSynthesis.getVoices() || [];
      if (voices.length === 0) return null;

      const wanted = (
        LANGUAGES.find((l) => l.code === languageCode)?.speechLang || "en-IN").toLowerCase();

      const exact = voices.find((v) => v.lang?.toLowerCase() === wanted);
      if (exact) return { voice: exact, fellBack: false };

      const sameLanguage = voices.find((v) =>
        v.lang?.toLowerCase().startsWith(languageCode)
      );
      if (sameLanguage) return { voice: sameLanguage, fellBack: false };

      if (languageCode === "mr") {
        const hindi = voices.find((v) => v.lang?.toLowerCase().startsWith("hi"));
        if (hindi) return { voice: hindi, fellBack: "hi" };
      }

      const english = voices.find((v) => v.lang?.toLowerCase().startsWith("en"));
      return english ? { voice: english, fellBack: "en" } : null;
    },
    [canSpeak]
  );

  /** Speaks a sentence, then runs `onDone` - normally "listen again". */
  const speak = useCallback(
    (sentence, languageCode, onDone) => {
      if (!canSpeak || !sentence) {
        onDone && onDone();
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(sentence);
      const chosen = pickVoice(languageCode);

      if (!chosen) {
        setNotice(
          "This device has no speech voices installed, so replies are shown as text.");
        onDone && onDone();
        return;
      }

      utterance.voice = chosen.voice;
      utterance.lang = chosen.voice.lang;

      if (chosen.fellBack === "hi") {
        setNotice(
          "No Marathi voice on this device — a Hindi voice is reading the reply. The text below is Marathi. Fuller Marathi voice support is coming.");
      } else if (chosen.fellBack === "en") {
        setNotice(
          "No Indian-language voice on this device — the reply is shown as text below.");
      } else {
        setNotice(null);
      }

      // A little slower than default. These are numbers that decide
      // someone's income, often heard beside a noisy road.
      utterance.rate = 0.95;

      // ---- WATCHDOG ----
      // The whole conversation hangs on `onend` firing, because that is
      // what reopens the microphone. Chrome has a long-standing bug
      // where a long utterance can finish without ever firing it, and a
      // call or notification interrupting playback can do the same.
      // The farmer would be left staring at "Speaking…" forever, with
      // the mic shut and nothing to tap.
      //
      // So we also set a timer. Whichever happens first - the real event
      // or the timeout - hands the microphone back exactly once.
      let finished = false;
      const finishOnce = () => {
        if (finished) return;
        finished = true;
        clearTimeout(watchdog);
        isSpeakingRef.current = false;
        onDone && onDone();
      };

      // Roughly how long this sentence should take, plus headroom.
      // ~12 characters a second is a comfortable speaking pace.
      const expectedMs = Math.min(30000, 3000 + (sentence.length / 12) * 1000);
      const watchdog = setTimeout(() => {
        if (!finished) {
          window.speechSynthesis.cancel();
          finishOnce();
        }
      }, expectedMs);

      utterance.onstart = () => {
        isSpeakingRef.current = true;
        setStatus("speaking");
      };
      utterance.onend = finishOnce;
      utterance.onerror = finishOnce;

      window.speechSynthesis.speak(utterance);
    },
    [canSpeak, pickVoice]
  );

  // =====================================================================
  // LISTENING
  // =====================================================================
  // Declared as a ref-held function because startListening and
  // handleTranscript call each other. A plain pair of useCallbacks would
  // be a circular dependency; this keeps both able to see the latest
  // version without React complaining.
  const startListeningRef = useRef(() => {});

  const handleTranscript = useCallback(
    async (transcript, confidence) => {
      if (!transcript?.trim()) {
        busyRef.current = false;
        startListeningRef.current();
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
        contextRef.current = result.context || {};

        // The server may have worked out a different language from the
        // words themselves - follow it, so the reply is spoken correctly
        // and the NEXT turn listens in the right language too.
        if (result.language && result.language !== languageRef.current) {
          setLanguage(result.language);
          languageRef.current = result.language;
        }

        setTurns((previous) => [
          ...previous,
          { who: "assistant", text: result.reply, data: result.data },
        ]);

        speak(result.reply, result.language || languageRef.current, () => {
          busyRef.current = false; // free the mic again
          if (result.endSession) {
            pauseSession();
          } else {
            startListeningRef.current();
          }
        });
      } catch (error) {
        console.error(error);
        const failure =
          languageRef.current === "mr"? "माफ करा, सर्व्हरशी संपर्क होऊ शकला नाही.": languageRef.current === "hi"? "माफ कीजिए, सर्वर से संपर्क नहीं हो सका।": "Sorry, I could not reach the server.";
        setTurns((previous) => [...previous, { who: "assistant", text: failure }]);
        speak(failure, languageRef.current, () => {
          busyRef.current = false;
          startListeningRef.current();
        });
      }
    },
    [speak]
  );

  const startListening = useCallback(() => {
    // Three reasons not to open the mic, all checked synchronously.
    if (!canListen) return;
    if (!sessionActiveRef.current) return;
    if (busyRef.current) return;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (error) {
        /* already stopped */
      }
    }

    // Read the constructor from `window` HERE rather than using the one
    // captured when this callback was created. A stale closure would
    // keep using an object from an earlier render - and it makes the
    // loop impossible to exercise in a test, because a stand-in
    // recogniser installed later would simply be ignored.
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return;

    const recognition = new Recognition();
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
      // BARGE-IN. The farmer started talking while the assistant was
      // still speaking, so they have heard enough. Cut the playback off
      // mid-word - being talked over by a machine that will not stop is
      // the fastest way to make someone abandon a voice interface.
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
          // Chrome reports 0 for some languages. Treat that as "unknown"// rather than "terrible", or every Marathi turn looks low
          // quality and gets sent back for a repeat.
          if (result[0].confidence > 0) confidence = result[0].confidence;
        } else {
          interimText += result[0].transcript;
        }
      }

      setInterim(interimText);

      if (finalText.trim()) {
        // Claim the mic BEFORE stopping. recognition.stop() fires onend
        // almost immediately, and onend restarts listening unless this
        // flag is already set. A ref updates now; state would not.
        busyRef.current = true;
        try {
          recognition.stop();
        } catch (error) {
          /* already stopping */
        }
        handleTranscript(finalText.trim(), confidence);
      }
    };

    recognition.onerror = (event) => {
      // "no-speech" and "aborted" are ordinary parts of the loop -
      // someone paused, or we stopped it ourselves. Only real faults
      // deserve to interrupt the farmer.
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        sessionActiveRef.current = false;
        setVoiceFailed("blocked");
        setStatus("paused");
      } else if (event.error === "language-not-supported") {
        setNotice(
          `Speech recognition for ${
            LANGUAGES.find((l) => l.code === languageRef.current)?.label
          } is not available in this browser. Try Chrome, or switch language above.`
        );
        setStatus("paused");
        sessionActiveRef.current = false;
      }
    };

    recognition.onend = () => {
      // Recognition always stops by itself after a pause, whatever
      // `continuous` promises. Reopening it here is what makes the
      // conversation hands-free. busyRef keeps us from reopening while
      // an answer is still being fetched or spoken.
      if (sessionActiveRef.current && !busyRef.current && !isSpeakingRef.current) {
        setTimeout(() => startListeningRef.current(), 250);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (error) {
      // Throws if the previous instance has not released the mic yet.
      setTimeout(() => {
        try {
          recognition.start();
        } catch (retryError) {
          setStatus("paused");
        }
      }, 300);
    }
  }, [canListen, handleTranscript]);

  // Publish the newest version for the mutually-recursive callers.
  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  // =====================================================================
  // SESSION
  // =====================================================================

  function startSession() {
    setIsOpen(true);
    setTurns([]);
    setVoiceFailed(canListen ? null : "unsupported");
    contextRef.current = {};
    sessionActiveRef.current = true;
    busyRef.current = true; // held until the greeting finishes
    setStatus("starting");

    // Ask for location quietly up front, so "nearest mandi" works
    // without interrupting the conversation to ask later.
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

    speak(greeting, language, () => {
      busyRef.current = false;
      startListeningRef.current(); // straight into listening - no tap
    });
  }

  /** Stops listening but keeps the conversation on screen. */
  function pauseSession() {
    sessionActiveRef.current = false;
    busyRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (error) {
        /* already stopped */
      }
    }
    if (canSpeak) window.speechSynthesis.cancel();
    isSpeakingRef.current = false;
    setStatus("paused");
    setInterim("");
  }

  function resumeSession() {
    setVoiceFailed(null);
    sessionActiveRef.current = true;
    busyRef.current = false;
    startListeningRef.current();
  }

  function closeAssistant() {
    pauseSession();
    setIsOpen(false);
    setStatus("idle");
  }

  // Always release the microphone when the component unmounts, or the
  // browser keeps showing a recording indicator on a page that isn't
  // listening any more.
  useEffect(() => {
    return () => {
      sessionActiveRef.current = false;
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

  // Voices load asynchronously in Chrome - getVoices() is empty on the
  // first call. This nudges a re-render once they arrive.
  useEffect(() => {
    if (!canSpeak) return;
    const handler = () => setNotice((current) => current);
    window.speechSynthesis.addEventListener("voiceschanged", handler);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", handler);
  }, [canSpeak]);

  /**
   * The typed escape hatch. Only reachable when voice genuinely cannot
   * run on this device - never offered alongside a working microphone,
   * because this is meant to be a spoken conversation.
   */
  function submitTyped(e) {
    e.preventDefault();
    const question = typedQuestion.trim();
    if (!question) return;
    setTypedQuestion("");
    busyRef.current = true;
    handleTranscript(question, 1);
  }

  // =====================================================================
  // UI
  // =====================================================================

  if (!isOpen) {
    return (
      <button
        onClick={startSession}
        aria-label={text.title}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary-600
          text-primary-foreground shadow-lifted hover:bg-primary-hover transition-colors
          grid place-items-center">
        {/* The launcher used to be a microphone EMOJI. The strip that
            removed emoji app-wide took it too, leaving a blank circle -
            a button with no indication of what it does. */}
        <MicIcon size={22} strokeWidth={ICON_STROKE} aria-hidden="true" />
      </button>
    );
  }

  const statusLabel = {
    idle: text.tapToTalk,
    starting: text.starting,
    listening: text.listening,
    thinking: text.thinking,
    speaking: text.speaking,
    paused: text.paused,
  }[status];

  const orbStyle = {
    listening: "bg-under-600 animate-pulseRing scale-110",
    speaking: "bg-accent-500",
    thinking: "bg-ink-400 animate-pulse",
    starting: "bg-ink-400 animate-pulse",
    paused: "bg-ink-300",
    idle: "bg-primary-gradient",
  }[status];

  // A COMPONENT per state, not a character. These used to be emoji,
  // which meant the orb looked different on every phone and could not
  // take the orb's own colour. Each is rendered as <OrbIcon /> below.
  const OrbIcon = {
    listening: MicIcon,
    speaking: SpeakingIcon,
    thinking: SpinnerIcon,
    starting: SpinnerIcon,
    paused: PlayIcon,
    idle: MicIcon,
  }[status];

  // The two states where the app is busy get a spinning icon, so the
  // orb shows it is working rather than just sitting there.
  const orbSpins = status === "thinking" || status === "starting";

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[min(24rem,calc(100vw-3rem))] max-h-[80vh] flex flex-col bg-card rounded-lg shadow-lifted border border-surface-300 overflow-hidden animate-fadeInUp">
      {/* ---------- Header ---------- */}
      <div className="bg-primary-gradient text-primary-foreground px-4 py-3 flex items-center justify-between gap-2">
        <span className="font-semibold flex items-center gap-2"><MicIcon size={ICON_MD} strokeWidth={ICON_STROKE} className="shrink-0" aria-hidden="true" /> {text.title}</span>

        <div className="flex items-center gap-2">
      {/* Auto-detection gets the language wrong often enough that
              this has to be one tap away, not buried in a settings page. */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            aria-label={text.langLabel}
            className="bg-white/20 ring-1 ring-white/30 text-white text-xs font-medium
              rounded-md px-2 py-1 cursor-pointer focus:outline-none">{LANGUAGES.map((l) => (
              <option key={l.code} value={l.code} className="text-ink-900 bg-card">{l.label}
              </option>
            ))}
          </select>

          <button
            onClick={closeAssistant}
            aria-label="Close"
          className="w-7 h-7 rounded-md bg-white/20 hover:bg-white/35 grid place-items-center">
            
          </button>
        </div>
      </div>
      {/* ---------- Voice unavailable ---------- */}
      {voiceFailed && (
        <div className="bg-accent-50 border-b border-accent-200 px-4 py-3 text-xs text-accent-900">
          <p className="font-medium mb-1"><WarnIcon size={ICON_MD} strokeWidth={ICON_STROKE} className="shrink-0" aria-hidden="true" /> {text.fallbackTitle}</p>
          <p>{voiceFailed === "blocked" ? text.micBlocked : text.noVoiceSupport}</p>
        </div>
      )}

      {/* ---------- Voice-quality notice ---------- */}
      {notice && (
        <div className="bg-ink-50 border-b border-ink-200 px-4 py-2 text-xs text-ink-700">
          <InfoIcon size={ICON_MD} strokeWidth={ICON_STROKE} className="shrink-0" aria-hidden="true" /> {notice}
        </div>
      )}

      {/* ---------- Conversation ---------- */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[11rem]">{turns.map((turn, index) => (
          <div key={index} className={turn.who === "user" ? "text-right" : "text-left"}>
            <p className="text-[10px] uppercase tracking-wide text-ink-400 mb-0.5">{turn.who === "user" ? text.you : text.assistant}
            </p>
            <div
              className={`inline-block rounded-lg px-3.5 py-2 text-sm max-w-[85%] text-left ${
                turn.who === "user"? "bg-ink-100 text-ink-800": "bg-primary-50 text-primary-900 ring-1 ring-primary-100"}`}
            >{turn.text}

              {/* The numbers behind the sentence. This is what a farmer
                  checks before trusting a figure - and it is the whole
                  answer when no TTS voice exists for their language. */}
              {turn.data?.modalPrice && (
                <div className="mt-2 pt-2 border-t border-primary-200 text-xs space-y-0.5">
                  <div className="font-medium">
                    ₹{turn.data.modalPrice.toLocaleString("en-IN")}/quintal
                  </div>
                  <div className="opacity-80">{turn.data.mandiName}
                    {turn.data.state ? `, ${turn.data.state}` : ""}
                    {turn.data.distanceKm != null ? ` · ${turn.data.distanceKm} km` : ""}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Words heard so far, before the sentence is complete. Seeing
            this appear is how the farmer knows the mic is really live. */}
        {interim && (
          <div className="text-right">
            <div className="inline-block rounded-lg px-3.5 py-2 text-sm bg-ink-50 text-ink-400 italic">{interim}…
            </div>
          </div>
        )}

        {turns.length <= 1 && !voiceFailed && (
          <div className="text-xs text-ink-400 pt-2">
            <p className="mb-1 font-medium">{text.tryAsking}</p>
            <ul className="space-y-0.5">{text.examples.map((example) => (
                <li key={example}>• “{example}”</li>
              ))}
            </ul>
          </div>
        )}

        <div ref={transcriptEndRef} />
      </div>
      {/* ---------- The mic orb: the ONLY control in normal use ---------- */}
      {!voiceFailed && (
        <div className="px-4 py-4 border-t border-surface-200 bg-surface-50 flex flex-col items-center gap-2">
          <button
            onClick={() => {
              if (status === "paused" || status === "idle") resumeSession();
              else pauseSession();
            }}
            aria-label={statusLabel}
            className={`w-16 h-16 rounded-full grid place-items-center text-white
              transition-all shadow-soft ${orbStyle}`}
          >
            {OrbIcon && (
              <OrbIcon
                size={26}
                strokeWidth={ICON_STROKE}
                className={orbSpins ? "animate-spin" : ""}
                aria-hidden="true"
              />
            )}
          </button>

          <p className="text-sm font-medium text-ink-700">{statusLabel}</p>
      {/* Say out loud that no further tapping is needed - otherwise
              people tap the orb after every reply and cut themselves off. */}
          {(status === "listening" || status === "speaking" || status === "thinking") && (
            <p className="text-[11px] text-ink-400 text-center">{text.handsFree}</p>
          )}
        </div>
      )}

      {/* ---------- Typed fallback: ONLY when voice cannot run ---------- */}
      {voiceFailed && (
        <div className="px-4 py-3 border-t border-surface-200 bg-surface-50">
          <p className="text-xs text-ink-500 mb-2">{text.fallbackHelp}</p>
          <form onSubmit={submitTyped} className="flex gap-2">
            <input
              type="text"
          value={typedQuestion}
              onChange={(e) => setTypedQuestion(e.target.value)}
              className="flex-1 border border-ink-200 rounded-md px-3 py-2 text-sm
                focus:outline-none focus:ring-2 focus:ring-primary-500"/>
            <button
              type="submit"
          className="px-4 py-2 rounded-md bg-primary-600 text-primary-foreground text-sm font-medium
                hover:bg-primary-hover transition-colors">{text.send}
            </button>
          </form>
      {/* Only offered if the mic was refused - if the browser has no
              recognition at all, retrying cannot help. */}
          {voiceFailed === "blocked" && (
            <button
              onClick={resumeSession}
              className="mt-2 w-full text-xs text-primary-700 font-medium hover:underline">
               Try the microphone again
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default VoiceAssistant;
