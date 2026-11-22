import { useCallback, useEffect, useRef, useState } from "react";
import "./Home.css";

const API = "http://192.168.130.104:8000";

function Home() {
  // =====================================================
  // STATES
  // =====================================================

  const [objects, setObjects] = useState([]);
  const [language, setLanguage] = useState("en");
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [cameraStarted, setCameraStarted] = useState(false);

  // =====================================================
  // REFS
  // =====================================================

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const cameraStartingRef = useRef(false);
  const detectingRef = useRef(false);

  const speakingRef = useRef(false);
  const lastSpokenRef = useRef("");
  const voiceTimerRef = useRef(null);

  // =====================================================
  // SPEECH LANGUAGES
  // =====================================================

  const speechLanguages = {
    en: "en-IN",
    ta: "ta-IN",
    hi: "hi-IN",
    te: "te-IN",
    ml: "ml-IN",
    kn: "kn-IN",
  };

  // =====================================================
  // VOICE
  // =====================================================

  const speak = useCallback(
    (message) => {
      if (!message || !voiceEnabled) {
        return;
      }

      if (!window.speechSynthesis) {
        console.error("Speech synthesis not supported");
        return;
      }

      if (speakingRef.current) {
        console.log("VOICE BUSY");
        return;
      }

      if (message === lastSpokenRef.current) {
        console.log("SAME MESSAGE - SKIP");
        return;
      }

      if (voiceTimerRef.current) {
        clearTimeout(voiceTimerRef.current);
      }

      speakingRef.current = true;
      lastSpokenRef.current = message;

      window.speechSynthesis.cancel();

      const utterance =
        new SpeechSynthesisUtterance(message);

      utterance.lang =
        speechLanguages[language] || "en-IN";

      utterance.rate = 0.85;
      utterance.pitch = 1;
      utterance.volume = 1;

      utterance.onstart = () => {
        console.log("🔊 VOICE START:", message);
      };

      utterance.onend = () => {
        console.log("🔊 VOICE END");

        speakingRef.current = false;

        // Wait 1 second before next statement
        voiceTimerRef.current = setTimeout(() => {
          lastSpokenRef.current = "";
          console.log("🔊 VOICE READY");
        }, 1000);
      };

      utterance.onerror = (error) => {
        console.error("🔊 VOICE ERROR:", error);

        speakingRef.current = false;
        lastSpokenRef.current = "";
      };

      window.speechSynthesis.speak(utterance);
    },
    [language, voiceEnabled]
  );

  // =====================================================
  // START CAMERA
  // =====================================================

  const startCamera = useCallback(async () => {
    if (cameraStartingRef.current) {
      console.log("CAMERA ALREADY STARTING");
      return;
    }

    if (streamRef.current) {
      console.log("CAMERA ALREADY RUNNING");
      return;
    }

    try {
      cameraStartingRef.current = true;

      console.log("================================");
      console.log("📷 STARTING MOBILE CAMERA");
      console.log("================================");

      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        throw new Error(
          "Camera API not available"
        );
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: {
              ideal: "environment",
            },
            width: {
              ideal: 1280,
            },
            height: {
              ideal: 720,
            },
          },
          audio: false,
        });

      streamRef.current = stream;

      console.log("✅ CAMERA PERMISSION GRANTED");
      console.log("✅ CAMERA STREAM READY");

      const video = videoRef.current;

      if (!video) {
        throw new Error(
          "Video element not available"
        );
      }

      video.srcObject = stream;

      await video.play();

      console.log(
        "✅ VIDEO STARTED:",
        video.videoWidth,
        "x",
        video.videoHeight
      );

      setCameraStarted(true);

      console.log("================================");
      console.log("🤖 CAMERA READY");
      console.log("🤖 AI DETECTION WILL START");
      console.log("================================");
    } catch (error) {
      console.error(
        "❌ CAMERA ERROR:",
        error
      );

      setCameraStarted(false);

      alert(
        `Camera failed: ${error.message}`
      );
    } finally {
      cameraStartingRef.current = false;
    }
  }, []);

  // =====================================================
  // AUTOMATIC CAMERA START
  // ONLY ONE useEffect
  // =====================================================

  useEffect(() => {
    console.log("🔥 LOOFER HOME LOADED");

    const timer = setTimeout(() => {
      startCamera();
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [startCamera]);

  // =====================================================
  // SEND FRAME TO DJANGO
  // =====================================================

  const sendFrame = useCallback(async () => {
    if (!cameraStarted) {
      return;
    }

    if (detectingRef.current) {
      console.log(
        "⏳ PREVIOUS DETECTION STILL RUNNING"
      );
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      console.error(
        "VIDEO OR CANVAS NOT AVAILABLE"
      );
      return;
    }

    if (
      video.readyState < 2 ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      console.log("⏳ VIDEO NOT READY");
      return;
    }

    detectingRef.current = true;

    try {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context =
        canvas.getContext("2d");

      if (!context) {
        throw new Error(
          "Canvas context unavailable"
        );
      }

      context.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
      );

      const blob =
        await new Promise((resolve) => {
          canvas.toBlob(
            resolve,
            "image/jpeg",
            0.70
          );
        });

      if (!blob) {
        throw new Error(
          "Image conversion failed"
        );
      }

      const url =
        `${API}/api/cam/mobile/`;

      console.log(
        "📤 SENDING FRAME:",
        url
      );

      console.log(
        "📦 FRAME SIZE:",
        blob.size,
        "bytes"
      );

      const response =
        await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "image/jpeg",
          },
          body: blob,
        });

      console.log(
        "📡 DJANGO STATUS:",
        response.status
      );

      const responseText =
        await response.text();

      console.log(
        "📥 DJANGO RESPONSE:",
        responseText
      );

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}: ${responseText}`
        );
      }

      let data;

      try {
        data = JSON.parse(
          responseText
        );
      } catch {
        throw new Error(
          "Django returned invalid JSON"
        );
      }

      if (
        Array.isArray(data.objects)
      ) {
        console.log(
          "🎯 DETECTED OBJECTS:",
          data.objects
        );

        setObjects(data.objects);
      } else {
        console.log(
          "👀 NO OBJECTS"
        );

        setObjects([]);
      }
    } catch (error) {
      console.error(
        "❌ FRAME UPLOAD ERROR:",
        error
      );
    } finally {
      detectingRef.current = false;
    }
  }, [cameraStarted]);

  // =====================================================
  // AUTOMATIC AI DETECTION
  // EVERY 1 SECOND
  // =====================================================

  useEffect(() => {
    if (!cameraStarted) {
      return;
    }

    console.log("================================");
    console.log("🤖 AI DETECTION STARTED");
    console.log("🤖 BACKEND:", API);
    console.log("🤖 INTERVAL: 1 SECOND");
    console.log("================================");

    // First detection immediately
    sendFrame();

    const interval = setInterval(() => {
      sendFrame();
    }, 1000);

    return () => {
      clearInterval(interval);

      console.log(
        "🤖 AI DETECTION STOPPED"
      );
    };
  }, [cameraStarted, sendFrame]);

  // =====================================================
  // FULL OBJECT VOICE
  // =====================================================

  useEffect(() => {
    if (!voiceEnabled) {
      return;
    }

    if (!objects.length) {
      return;
    }

    const messages = objects
      .map((item) => {
        if (item.message) {
          return item.message;
        }

        return `${item.object} detected ${
          item.position || "in front"
        }`;
      })
      .filter(Boolean);

    if (!messages.length) {
      return;
    }

    // Example:
    // "Person detected in front.
    //  Car detected on the left.
    //  Bottle detected on the right."

    const fullMessage =
      messages.join(". ");

    console.log(
      "🗣️ FULL VOICE:",
      fullMessage
    );

    speak(fullMessage);
  }, [
    objects,
    voiceEnabled,
    speak,
  ]);

  // =====================================================
  // LANGUAGE CHANGE
  // =====================================================

  useEffect(() => {
    lastSpokenRef.current = "";

    speakingRef.current = false;

    if (voiceTimerRef.current) {
      clearTimeout(
        voiceTimerRef.current
      );
    }

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, [language]);

  // =====================================================
  // VOICE TOGGLE
  // =====================================================

  const toggleVoice = () => {
    const newValue =
      !voiceEnabled;

    setVoiceEnabled(newValue);

    if (!newValue) {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }

      speakingRef.current = false;
      lastSpokenRef.current = "";
    }
  };

  // =====================================================
  // MANUAL SPEAK
  // =====================================================

  const speakObject = (item) => {
    const message =
      item.message ||
      `${item.object} detected ${
        item.position || "in front"
      }`;

    lastSpokenRef.current = "";
    speakingRef.current = false;

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    speak(message);
  };

  // =====================================================
  // CLEANUP
  // =====================================================

  useEffect(() => {
    return () => {
      console.log(
        "🧹 CLEANING LOOFER"
      );

      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) => {
            track.stop();
          });

        streamRef.current = null;
      }

      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }

      if (voiceTimerRef.current) {
        clearTimeout(
          voiceTimerRef.current
        );
      }
    };
  }, []);

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="home">

      <header className="home-header">

        <div className="brand">
          <h1>👁️ Loofer</h1>
          <p>AI Vision Assistant</p>
        </div>

        <div className="controls">

          <div className="control-box">
            <span>🌐 Language</span>

            <select
              value={language}
              onChange={(e) => {
                setLanguage(
                  e.target.value
                );
              }}
            >
              <option value="en">
                English
              </option>

              <option value="ta">
                தமிழ்
              </option>

              <option value="hi">
                हिन्दी
              </option>

              <option value="te">
                తెలుగు
              </option>

              <option value="ml">
                മലയാളം
              </option>

              <option value="kn">
                ಕನ್ನಡ
              </option>
            </select>
          </div>

          <button
            className={
              `voice-button ${
                voiceEnabled
                  ? "active"
                  : ""
              }`
            }
            onClick={toggleVoice}
          >
            🔊 Voice:
            {voiceEnabled
              ? " ON"
              : " OFF"}
          </button>

        </div>
      </header>

      {/* CAMERA */}

      <section className="camera-card">

        <div className="card-title">

          <h2>
            📷 Mobile Camera
          </h2>

          <span className="live-badge">
            ● LIVE
          </span>

        </div>

        <div className="camera-box">

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />

          <canvas
            ref={canvasRef}
            style={{
              display: "none",
            }}
          />

          {!cameraStarted && (
            <button
              onClick={startCamera}
              className="camera-start-button"
            >
              📷 Start Camera
            </button>
          )}

        </div>

        <div className="camera-status">

          <span className="status-dot" />

          {cameraStarted
            ? "Camera Connected"
            : "Starting Camera..."}

        </div>

      </section>

      {/* DETECTION */}

      <section className="detection-card">

        <div className="card-title">

          <h2>
            🤖 Detected Objects
          </h2>

          <span className="object-count">
            {objects.length}
          </span>

        </div>

        {objects.length === 0 ? (

          <div className="no-object">

            <div className="empty-icon">
              👀
            </div>

            <p>
              No object detected
            </p>

          </div>

        ) : (

          <div className="object-list">

            {objects.map(
              (item, index) => (

                <div
                  className="object-item"
                  key={`${item.object}-${index}`}
                >

                  <div className="object-icon">
                    🤖
                  </div>

                  <div className="object-info">

                    <h3>
                      {item.object}
                    </h3>

                    <p>
                      📍 Position:{" "}
                      {item.position ||
                        "front"}
                    </p>

                    <p>
                      🗣️{" "}
                      {item.message ||
                        `${item.object} detected`}
                    </p>

                  </div>

                  <div className="object-actions">

                    <span className="confidence">
                      {item.confidence}%
                    </span>

                    <button
                      className="speak-button"
                      onClick={() =>
                        speakObject(item)
                      }
                    >
                      🔊
                    </button>

                  </div>

                </div>
              )
            )}

          </div>

        )}

      </section>

    </div>
  );
}

export default Home;