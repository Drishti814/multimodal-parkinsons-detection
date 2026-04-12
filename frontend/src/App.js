import { useState } from "react";
import axios from "axios";

function App() {
  const [spiralFile, setSpiralFile] = useState(null);
  const [spiralResult, setSpiralResult] = useState(null);
  const [voiceResult, setVoiceResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const voiceFeatures = {
    "MDVP:Fo(Hz)": 119.992, "MDVP:Fhi(Hz)": 157.302, "MDVP:Flo(Hz)": 74.997,
    "MDVP:Jitter(%)": 0.00784, "MDVP:Jitter(Abs)": 0.00007, "MDVP:RAP": 0.0037,
    "MDVP:PPQ": 0.00554, "Jitter:DDP": 0.01109, "MDVP:Shimmer": 0.04374,
    "MDVP:Shimmer(dB)": 0.426, "Shimmer:APQ3": 0.02182, "Shimmer:APQ5": 0.0313,
    "MDVP:APQ": 0.02971, "Shimmer:DDA": 0.06545, "NHR": 0.02211,
    "HNR": 21.033, "RPDE": 0.414783, "DFA": 0.815285,
    "spread1": -4.813031, "spread2": 0.266482, "D2": 2.301442, "PPE": 0.284654
  };

  const predictVoice = async () => {
    setLoading(true);
    try {
      const res = await axios.post("http://127.0.0.1:8000/predict/voice", voiceFeatures);
      setVoiceResult(res.data);
    } catch (e) {
      setVoiceResult({ error: "Failed to connect to API" });
    }
    setLoading(false);
  };

  const predictSpiral = async () => {
    if (!spiralFile) return alert("Please upload a spiral image first!");
    setLoading(true);
    const formData = new FormData();
    formData.append("file", spiralFile);
    try {
      const res = await axios.post("http://127.0.0.1:8000/predict/spiral", formData);
      setSpiralResult(res.data);
    } catch (e) {
      setSpiralResult({ error: "Failed to connect to API" });
    }
    setLoading(false);
  };

  const getFinalScore = () => {
    if (!voiceResult || !spiralResult) return null;
    return ((voiceResult.probability * 0.4) + (spiralResult.probability * 0.6)).toFixed(2);
  };

  const getRiskLevel = (score) => {
    if (score >= 0.7) return { level: "High Risk", color: "#e74c3c" };
    if (score >= 0.4) return { level: "Medium Risk", color: "#f39c12" };
    return { level: "Low Risk", color: "#27ae60" };
  };

  const finalScore = getFinalScore();
  const risk = finalScore ? getRiskLevel(finalScore) : null;

  return (
    <div style={{ fontFamily: "Arial", maxWidth: 800, margin: "0 auto", padding: 30 }}>
      <h1 style={{ textAlign: "center", color: "#2c3e50" }}>
        🧠 Parkinson's Disease Detection
      </h1>
      <p style={{ textAlign: "center", color: "#7f8c8d" }}>
        Multi-Modal Detection using Voice & Spiral Drawing Analysis
      </p>

      {/* Voice Section */}
      <div style={{ background: "#f8f9fa", borderRadius: 10, padding: 25, marginBottom: 20 }}>
        <h2 style={{ color: "#2980b9" }}>🎙️ Voice Analysis</h2>
        <p style={{ color: "#555" }}>Using sample voice features from the dataset.</p>
        <button onClick={predictVoice} disabled={loading}
          style={{ background: "#2980b9", color: "white", border: "none",
            padding: "12px 25px", borderRadius: 8, cursor: "pointer", fontSize: 16 }}>
          {loading ? "Analyzing..." : "Analyze Voice"}
        </button>
        {voiceResult && (
          <div style={{ marginTop: 15, padding: 15, background: "white", borderRadius: 8,
            borderLeft: `5px solid ${voiceResult.label === "Parkinson" ? "#e74c3c" : "#27ae60"}` }}>
            <p><strong>Result:</strong> {voiceResult.label}</p>
            <p><strong>Probability:</strong> {(voiceResult.probability * 100).toFixed(1)}%</p>
          </div>
        )}
      </div>

      {/* Spiral Section */}
      <div style={{ background: "#f8f9fa", borderRadius: 10, padding: 25, marginBottom: 20 }}>
        <h2 style={{ color: "#8e44ad" }}>🌀 Spiral Drawing Analysis</h2>
        <input type="file" accept="image/*"
          onChange={(e) => setSpiralFile(e.target.files[0])}
          style={{ marginBottom: 10, display: "block" }} />
        <button onClick={predictSpiral} disabled={loading}
          style={{ background: "#8e44ad", color: "white", border: "none",
            padding: "12px 25px", borderRadius: 8, cursor: "pointer", fontSize: 16 }}>
          {loading ? "Analyzing..." : "Analyze Spiral"}
        </button>
        {spiralResult && (
          <div style={{ marginTop: 15, padding: 15, background: "white", borderRadius: 8,
            borderLeft: `5px solid ${spiralResult.label === "Parkinson" ? "#e74c3c" : "#27ae60"}` }}>
            <p><strong>Result:</strong> {spiralResult.label}</p>
            <p><strong>Probability:</strong> {(spiralResult.probability * 100).toFixed(1)}%</p>
          </div>
        )}
      </div>

      {/* Final Score */}
      {finalScore && (
        <div style={{ background: risk.color, borderRadius: 10, padding: 25, color: "white", textAlign: "center" }}>
          <h2>📊 Final Risk Score</h2>
          <h1 style={{ fontSize: 60, margin: 0 }}>{finalScore}</h1>
          <h3>{risk.level}</h3>
          <p>Voice (40%) + Spiral (60%) combined analysis</p>
        </div>
      )}
    </div>
  );
}

export default App;