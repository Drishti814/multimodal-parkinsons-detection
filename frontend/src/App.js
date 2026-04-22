import { useState, useRef } from "react";
import axios from "axios";

function App() {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [voiceResult, setVoiceResult] = useState(null);
  const [extractedFeatures, setExtractedFeatures] = useState(null);
  const [spiralResult, setSpiralResult] = useState(null);
  const [drawing, setDrawing] = useState(false);
  const [hasDrawing, setHasDrawing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const canvasRef = useRef(null);

  // ── VOICE RECORDING ──
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      setRecordingTime(0);
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      timerRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    } catch (e) {
      alert("Microphone access denied. Please allow microphone access.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    clearInterval(timerRef.current);
    setRecording(false);
  };

  const analyzeVoice = async () => {
    if (!audioBlob) return alert("Please record your voice first!");
    setLoading(true);
    setVoiceResult(null);
    setExtractedFeatures(null);
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.webm");
    try {
      const res = await axios.post(
        "http://127.0.0.1:8002/predict/voice/audio",
        formData
      );
      if (res.data.error) {
        setVoiceResult({ error: res.data.error });
      } else {
        setVoiceResult(res.data);
        setExtractedFeatures(res.data.features);
      }
    } catch (e) {
      setVoiceResult({ error: "Failed to connect to API" });
    }
    setLoading(false);
  };

  // ── SPIRAL DRAWING ──
  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    if (e.touches) return {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top
    };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setDrawing(true);
    setHasDrawing(true);
  };

  const draw = (e) => {
    if (!drawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#2c3e50";
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDraw = () => setDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawing(false);
    setSpiralResult(null);
  };

  const analyzeSpiral = async () => {
    if (!hasDrawing) return alert("Please draw a spiral first!");
    setLoading(true);
    canvasRef.current.toBlob(async (blob) => {
      const formData = new FormData();
      formData.append("file", blob, "spiral.png");
      try {
        const res = await axios.post(
          "http://127.0.0.1:8002/predict/spiral",
          formData
        );
        setSpiralResult(res.data);
      } catch (e) {
        setSpiralResult({ error: "Failed to connect to API" });
      }
      setLoading(false);
    }, "image/png");
  };

  // ── FINAL SCORE ──
  const getFinalScore = () => {
    if (!voiceResult?.probability || !spiralResult?.probability) return null;
    return (voiceResult.probability * 0.4 + spiralResult.probability * 0.6).toFixed(2);
  };

  const getRisk = (score) => {
    if (score >= 0.7) return { level: "High Risk 🔴", color: "#e74c3c" };
    if (score >= 0.4) return { level: "Medium Risk 🟡", color: "#f39c12" };
    return { level: "Low Risk 🟢", color: "#27ae60" };
  };

  const finalScore = getFinalScore();
  const risk = finalScore ? getRisk(finalScore) : null;

  const card = {
    background: "#f8f9fa", borderRadius: 12,
    padding: 25, marginBottom: 20,
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
  };

  const btn = (color, disabled) => ({
    background: disabled ? "#ccc" : color,
    color: "white", border: "none",
    padding: "11px 22px", borderRadius: 8,
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 14, marginRight: 8, marginTop: 8
  });

  const resultBox = (result) => (
    <div style={{
      marginTop: 15, padding: 15, background: "white",
      borderRadius: 8,
      borderLeft: `5px solid ${result.label === "Parkinson" ? "#e74c3c" : "#27ae60"}`
    }}>
      <p style={{ margin: "4px 0" }}><strong>Result:</strong> {result.label}</p>
      <p style={{ margin: "4px 0" }}><strong>Probability:</strong> {(result.probability * 100).toFixed(1)}%</p>
    </div>
  );

  return (
    <div style={{ fontFamily: "Arial", maxWidth: 860, margin: "0 auto", padding: 30 }}>
      <h1 style={{ textAlign: "center", color: "#2c3e50" }}>
        🧠 Parkinson's Disease Detection
      </h1>
      <p style={{ textAlign: "center", color: "#7f8c8d" }}>
        Real-time Voice Recording & Spiral Drawing Analysis
      </p>

      {/* ── VOICE SECTION ── */}
      <div style={card}>
        <h2 style={{ color: "#2980b9" }}>🎙️ Voice Recording</h2>
        <p style={{ color: "#555", fontSize: 14 }}>
          Click <strong>Start Recording</strong>, sustain a vowel sound like{" "}
          <strong>"Aaaaah"</strong> for <strong>5–7 seconds</strong>, then stop.
          The system will automatically extract clinical voice features and predict.
        </p>

        <button
          onClick={recording ? stopRecording : startRecording}
          style={btn(recording ? "#e74c3c" : "#2980b9", false)}
        >
          {recording ? `⏹ Stop Recording (${recordingTime}s)` : "🎙 Start Recording"}
        </button>

        {recording && (
          <p style={{ color: "#e74c3c", marginTop: 10, fontWeight: "bold" }}>
            🔴 Recording... sustain "Aaaaah" clearly
          </p>
        )}

        {/* Upload audio file option */}
        <div style={{ marginTop: 12, padding: 12, background: "#eaf4fb", borderRadius: 8 }}>
          <p style={{ margin: "0 0 8px 0", fontSize: 13, color: "#555" }}>
            📁 Or upload a voice file (.wav, .mp3):
          </p>
          <input
            type="file"
            accept=".wav,.mp3,.webm,.ogg"
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) setAudioBlob(file);
            }}
            style={{ fontSize: 13 }}
          />
        </div>

        {audioBlob && !recording && (
          <>
            <div style={{ marginTop: 12 }}>
              <audio controls src={URL.createObjectURL(audioBlob)} />
            </div>
            <button
              onClick={analyzeVoice}
              disabled={loading}
              style={btn("#27ae60", loading)}
            >
              {loading ? "Extracting features & analyzing..." : "🔍 Analyze Voice"}
            </button>
            <button
              onClick={() => {
                setAudioBlob(null);
                setVoiceResult(null);
                setExtractedFeatures(null);
              }}
              style={btn("#95a5a6", false)}
            >
              🗑 Clear Recording
            </button>
          </>
        )}

        {voiceResult?.error && (
          <p style={{ color: "red", marginTop: 10 }}>⚠️ {voiceResult.error}</p>
        )}

        {voiceResult?.label && resultBox(voiceResult)}

        {/* Show extracted features */}
        {extractedFeatures && (
          <div style={{ marginTop: 15 }}>
            <p style={{ fontWeight: "bold", color: "#555", marginBottom: 8 }}>
              📊 Extracted Clinical Features:
            </p>
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
              gap: 8, background: "white", padding: 12,
              borderRadius: 8, fontSize: 12
            }}>
              {Object.entries(extractedFeatures).map(([key, val]) => (
                <div key={key} style={{
                  background: "#f0f4f8", padding: "6px 10px",
                  borderRadius: 6
                }}>
                  <span style={{ color: "#888" }}>{key}</span>
                  <br />
                  <strong>{typeof val === "number" ? val.toFixed(5) : val}</strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── SPIRAL SECTION ── */}
      <div style={card}>
        <h2 style={{ color: "#8e44ad" }}>🌀 Spiral Drawing</h2>
        <p style={{ color: "#555", fontSize: 14 }}>
          Draw a spiral on the canvas below using your mouse or trackpad.
        </p>

        <canvas
          ref={canvasRef}
          width={500} height={300}
          style={{
            border: "2px solid #8e44ad", borderRadius: 8,
            background: "white", cursor: "crosshair", display: "block"
          }}
          onMouseDown={startDraw} onMouseMove={draw}
          onMouseUp={stopDraw} onMouseLeave={stopDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
        />

        <button onClick={clearCanvas} style={btn("#95a5a6", false)}>🗑 Clear</button>
        <button
          onClick={analyzeSpiral}
          disabled={loading || !hasDrawing}
          style={btn("#8e44ad", loading || !hasDrawing)}
        >
          {loading ? "Analyzing..." : "Analyze Spiral"}
        </button>

        {spiralResult?.error && (
          <p style={{ color: "red", marginTop: 10 }}>⚠️ {spiralResult.error}</p>
        )}
        {spiralResult?.label && resultBox(spiralResult)}
      </div>

      {/* ── FINAL SCORE ── */}
      {finalScore && (
        <div style={{
          background: risk.color, borderRadius: 12,
          padding: 30, color: "white", textAlign: "center"
        }}>
          <h2>📊 Final Risk Score</h2>
          <h1 style={{ fontSize: 64, margin: "10px 0" }}>{finalScore}</h1>
          <h3>{risk.level}</h3>
          <p>Voice (40%) + Spiral (60%) combined analysis</p>
          <p style={{ fontSize: 12, opacity: 0.8 }}>
            ⚠️ Research tool only. Consult a medical professional for diagnosis.
          </p>
        </div>
      )}
    </div>
  );
}

export default App;