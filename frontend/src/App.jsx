import { useState, useRef, useCallback, useEffect } from "react";
import axios from "axios";

const API = "http://127.0.0.1:8002";

// ── Design tokens ─────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: hsl(210 40% 99%); --bg2: hsl(210 30% 97%); --card: hsl(0 0% 100%);
    --border: hsl(214 25% 91%); --border-hover: hsl(211 92% 45% / 0.22);
    --text: hsl(215 30% 14%); --text-muted: hsl(215 16% 45%); --text-dim: hsl(215 12% 62%);
    --primary: hsl(211 92% 45%); --primary-soft: hsl(211 100% 96%); --primary-glow: hsl(211 92% 45% / 0.22);
    --green: hsl(158 64% 42%); --green-soft: hsl(158 70% 95%); --green-border: hsl(158 64% 42% / 0.25);
    --red: hsl(0 75% 55%); --red-soft: hsl(0 85% 96%); --red-border: hsl(0 75% 55% / 0.25);
    --amber: hsl(38 92% 50%); --amber-soft: hsl(45 100% 95%); --amber-border: hsl(38 92% 50% / 0.3);
    --gradient-primary: linear-gradient(135deg, hsl(211 92% 45%) 0%, hsl(199 95% 55%) 100%);
    --gradient-mesh: radial-gradient(at 15% 10%, hsl(199 90% 92%) 0px, transparent 55%),
                     radial-gradient(at 85% 5%, hsl(211 100% 94%) 0px, transparent 55%),
                     radial-gradient(at 55% 85%, hsl(199 80% 95%) 0px, transparent 55%);
    --shadow-sm: 0 1px 3px hsl(215 30% 14% / 0.06);
    --shadow-md: 0 4px 16px -2px hsl(211 60% 30% / 0.09), 0 2px 4px -2px hsl(211 60% 30% / 0.05);
    --shadow-lg: 0 12px 36px -6px hsl(211 60% 30% / 0.13);
    --shadow-glow: 0 8px 32px -8px hsl(211 92% 45% / 0.3);
    --font-display: 'Plus Jakarta Sans', system-ui, sans-serif;
    --font-body: 'Inter', system-ui, sans-serif;
    --radius: 14px; --radius-sm: 10px; --radius-xs: 7px;
  }
  html { scroll-behavior: smooth; }
  body { font-family: var(--font-body); background: var(--bg); color: var(--text); min-height: 100vh; -webkit-font-smoothing: antialiased; background-image: var(--gradient-mesh); background-attachment: fixed; }

  /* Navbar */
  .navbar { position: sticky; top: 0; z-index: 50; width: 100%; background: hsl(0 0% 100% / 0.88); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-bottom: 1px solid var(--border); box-shadow: var(--shadow-sm); transition: all 0.3s; }
  .navbar.scrolled { background: hsl(0 0% 100% / 0.96); box-shadow: var(--shadow-md); }
  .navbar-inner { max-width: 1080px; margin: 0 auto; padding: 0 24px; height: 64px; display: flex; align-items: center; justify-content: space-between; }
  .nav-brand { display: flex; align-items: center; gap: 10px; cursor: pointer; }
  .nav-brand-icon { width: 38px; height: 38px; border-radius: 11px; background: var(--gradient-primary); box-shadow: var(--shadow-glow); display: flex; align-items: center; justify-content: center; font-size: 18px; transition: transform 0.2s; }
  .nav-brand:hover .nav-brand-icon { transform: scale(1.07); }
  .nav-brand-name { font-family: var(--font-display); font-size: 15px; font-weight: 800; color: var(--text); line-height: 1.1; }
  .nav-brand-sub { font-size: 10px; color: var(--text-muted); letter-spacing: 0.08em; text-transform: uppercase; }
  .nav-tabs-bar { display: flex; align-items: center; gap: 2px; background: hsl(210 30% 96%); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 4px; }
  .nav-tab { padding: 7px 16px; border-radius: var(--radius-xs); font-size: 13px; font-weight: 500; background: none; border: none; color: var(--text-muted); cursor: pointer; transition: all 0.18s; font-family: var(--font-body); white-space: nowrap; }
  .nav-tab:hover:not(.active) { color: var(--text); background: hsl(0 0% 100% / 0.7); }
  .nav-tab.active { background: var(--primary); color: white; box-shadow: 0 2px 8px hsl(211 92% 45% / 0.3); }
  .nav-cta { background: var(--gradient-primary); color: white; border: none; border-radius: var(--radius-sm); padding: 9px 18px; font-size: 13px; font-weight: 600; font-family: var(--font-body); cursor: pointer; box-shadow: var(--shadow-glow); transition: all 0.2s; }
  .nav-cta:hover { transform: translateY(-1px); box-shadow: 0 8px 28px hsl(211 92% 45% / 0.38); }

  /* Footer */
  .footer { border-top: 1px solid var(--border); background: var(--card); margin-top: 80px; padding: 56px 0 32px; }
  .footer-inner { max-width: 1080px; margin: 0 auto; padding: 0 24px; }
  .footer-grid { display: grid; grid-template-columns: 1.5fr 1fr 1fr 1.2fr; gap: 40px; margin-bottom: 40px; }
  .footer-head { font-family: var(--font-display); font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text); margin-bottom: 14px; }
  .footer-link { display: block; font-size: 13px; color: var(--text-muted); text-decoration: none; margin-bottom: 10px; transition: color 0.18s; cursor: pointer; }
  .footer-link:hover { color: var(--primary); }
  .footer-desc { font-size: 13px; color: var(--text-muted); line-height: 1.65; margin-top: 12px; }
  .footer-contact-item { display: flex; align-items: flex-start; gap: 9px; font-size: 13px; color: var(--text-muted); margin-bottom: 10px; }
  .footer-contact-icon { color: var(--primary); flex-shrink: 0; }
  .footer-bottom { border-top: 1px solid var(--border); padding-top: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
  .footer-copy { font-size: 12px; color: var(--text-dim); }

  /* Layout */
  .page-content { max-width: 1000px; margin: 0 auto; padding: 40px 24px 60px; }

  /* Cards */
  .card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow-sm); transition: box-shadow 0.2s, border-color 0.2s; }
  .card:hover { box-shadow: var(--shadow-md); border-color: var(--border-hover); }
  .card-body { padding: 28px 32px; }

  /* Forms */
  label { font-size: 12px; font-weight: 600; color: var(--text-muted); letter-spacing: 0.04em; text-transform: uppercase; display: block; margin-bottom: 6px; }
  input, select, textarea { width: 100%; background: hsl(210 40% 99%); border: 1.5px solid var(--border); border-radius: var(--radius-xs); color: var(--text); font-family: var(--font-body); font-size: 14px; padding: 9px 13px; outline: none; transition: all 0.18s; appearance: none; -webkit-appearance: none; }
  input:focus, select:focus, textarea:focus { border-color: var(--primary); background: white; box-shadow: 0 0 0 3px var(--primary-glow); }
  input::placeholder, textarea::placeholder { color: var(--text-dim); }

  /* Buttons */
  button { font-family: var(--font-body); font-weight: 600; border: none; border-radius: var(--radius-sm); cursor: pointer; transition: all 0.18s; font-size: 13.5px; }
  .btn-primary { background: var(--gradient-primary); color: white; padding: 10px 22px; box-shadow: var(--shadow-glow); }
  .btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px hsl(211 92% 45% / 0.38); }
  .btn-primary:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }
  .btn-danger { background: var(--red-soft); color: var(--red); border: 1.5px solid var(--red-border); padding: 10px 20px; }
  .btn-danger:hover { background: hsl(0 85% 93%); }
  .btn-ghost { background: white; color: var(--text-muted); border: 1.5px solid var(--border); padding: 9px 18px; box-shadow: var(--shadow-sm); }
  .btn-ghost:hover { background: var(--bg2); color: var(--text); border-color: var(--border-hover); }
  .btn-green { background: var(--green-soft); color: var(--green); border: 1.5px solid var(--green-border); padding: 10px 20px; }
  .btn-green:hover { background: hsl(158 70% 91%); }
  .btn-green:disabled { opacity: 0.45; cursor: not-allowed; }
  .btn-amber { background: var(--amber-soft); color: var(--amber); border: 1.5px solid var(--amber-border); padding: 10px 20px; }
  .btn-amber:hover { background: hsl(45 100% 90%); }
  .btn-sm { padding: 6px 12px; font-size: 12px; }

  /* Tags */
  .tag { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 0.03em; }
  .tag-green { background: var(--green-soft); color: var(--green); border: 1px solid var(--green-border); }
  .tag-red { background: var(--red-soft); color: var(--red); border: 1px solid var(--red-border); }
  .tag-amber { background: var(--amber-soft); color: var(--amber); border: 1px solid var(--amber-border); }
  .tag-blue { background: var(--primary-soft); color: var(--primary); border: 1px solid hsl(211 92% 45% / 0.2); }

  /* Misc */
  .section-header { font-family: var(--font-display); font-size: 17px; font-weight: 800; color: var(--text); margin-bottom: 4px; display: flex; align-items: center; gap: 9px; }
  .section-sub { font-size: 13px; color: var(--text-muted); line-height: 1.6; margin-bottom: 20px; }
  .info-pill { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; background: var(--primary-soft); color: var(--primary); border: 1px solid hsl(211 92% 45% / 0.18); }
  .progress-bar { height: 7px; border-radius: 4px; background: hsl(214 25% 91%); overflow: hidden; }
  .progress-fill { height: 100%; border-radius: 4px; transition: width 0.8s cubic-bezier(0.4,0,0.2,1); }
  .ci-bar { position: relative; height: 20px; background: hsl(214 25% 94%); border-radius: 10px; overflow: hidden; }
  .ci-range { position: absolute; top: 4px; bottom: 4px; border-radius: 10px; opacity: 0.25; }
  .ci-point { position: absolute; top: 50%; transform: translateY(-50%); width: 10px; height: 10px; border-radius: 50%; }
  .divider { height: 1px; background: var(--border); margin: 20px 0; }
  .pulse { animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }
  .fade-in { animation: fadeIn 0.35s ease; }
  @keyframes fadeIn { from{opacity:0;transform:translateY(7px)} to{opacity:1;transform:translateY(0)} }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
  .feature-bar { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--border); }
  .feature-bar:last-child { border-bottom: none; }
  .stat-mini { padding: 10px 14px; background: hsl(210 40% 98%); border-radius: var(--radius-xs); border: 1px solid var(--border); }
  .stat-mini-label { font-size: 10px; color: var(--text-dim); margin-bottom: 3px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
  .stat-mini-value { font-family: var(--font-display); font-size: 13.5px; font-weight: 700; color: var(--text); }
  .result-box { margin-top: 14px; padding: 20px 24px; border-radius: var(--radius-sm); border: 1.5px solid; box-shadow: var(--shadow-sm); }
  .combined-hero { margin-top: 28px; padding: 40px 36px; border-radius: var(--radius); border: 2px solid; text-align: center; box-shadow: var(--shadow-lg); }
  .trend-chart { display: flex; align-items: flex-end; gap: 8px; height: 80px; }
  .report-section-head { font-family: var(--font-display); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.09em; color: var(--text-muted); margin-bottom: 12px; padding-bottom: 7px; border-bottom: 1.5px solid var(--border); }
  audio { width: 100%; border-radius: var(--radius-xs); }

  /* Upload zone */
  .upload-zone { padding: 14px 16px; background: hsl(210 40% 98%); border-radius: var(--radius-sm); border: 1.5px dashed var(--border); margin-bottom: 14px; transition: border-color 0.18s; }
  .upload-zone:hover { border-color: var(--border-hover); }
  .upload-zone input[type="file"] { background: transparent; border: none; padding: 0; font-size: 13px; color: var(--text-muted); box-shadow: none; }

  /* Image preview */
  .img-preview-wrap { position: relative; display: inline-block; margin-bottom: 14px; border-radius: var(--radius-sm); overflow: hidden; border: 1.5px solid var(--border); }
  .img-preview-wrap img { display: block; max-width: 320px; max-height: 220px; object-fit: contain; background: hsl(210 40% 98%); }
  .img-remove-btn { position: absolute; top: 7px; right: 7px; width: 28px; height: 28px; border-radius: 50%; background: hsl(0 0% 10% / 0.7); color: white; border: none; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.18s; }
  .img-remove-btn:hover { background: var(--red); }

  /* Canvas */
  .spiral-canvas { width: 100%; max-width: 520px; border: 1.5px solid var(--border); border-radius: var(--radius-sm); background: hsl(210 40% 98.5%); cursor: crosshair; display: block; touch-action: none; box-shadow: var(--shadow-sm); }
  .spiral-canvas:hover { border-color: var(--border-hover); }

  /* History */
  .history-item { padding: 14px 18px; border-radius: var(--radius-sm); background: var(--card); border: 1.5px solid var(--border); cursor: pointer; transition: all 0.2s; box-shadow: var(--shadow-sm); margin-bottom: 8px; }
  .history-item:hover { border-color: var(--border-hover); box-shadow: var(--shadow-md); transform: translateY(-1px); }
  .patient-group { border: 1.5px solid var(--border); border-radius: var(--radius-sm); margin-bottom: 14px; overflow: hidden; box-shadow: var(--shadow-sm); }
  .patient-group-header { padding: 14px 20px; background: var(--card); display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: background 0.18s; user-select: none; }
  .patient-group-header:hover { background: hsl(210 40% 98%); }
  .patient-group-body { background: hsl(210 40% 99%); }
  .patient-session-row { padding: 12px 20px 12px 32px; border-top: 1px solid var(--border); cursor: pointer; transition: background 0.18s; display: flex; justify-content: space-between; align-items: center; }
  .patient-session-row:hover { background: hsl(211 100% 97%); }

  /* Final analyse CTA */
  .analyse-cta { display: flex; align-items: center; gap: 14px; padding: 20px 28px; background: linear-gradient(135deg, hsl(211 100% 97%) 0%, hsl(199 100% 96%) 100%); border: 2px solid hsl(211 92% 45% / 0.25); border-radius: var(--radius); box-shadow: var(--shadow-md); margin-top: 8px; }

  /* Waveform */
  @keyframes wave { 0%, 100% { height: 6px; } 50% { height: 24px; } }
  .waveform { display: flex; align-items: center; gap: 3px; height: 32px; }
  .wave-bar { width: 3px; background: var(--primary); border-radius: 2px; height: 6px; animation: wave 0.8s ease-in-out infinite; }

  /* Hero */
  .hero-page { min-height: calc(100vh - 64px); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 60px 24px; }
  .hero-badge { display: inline-flex; align-items: center; gap: 7px; padding: 6px 16px; background: var(--primary-soft); color: var(--primary); border: 1px solid hsl(211 92% 45% / 0.2); border-radius: 20px; font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 24px; }
  .hero-title { font-family: var(--font-display); font-size: clamp(34px, 6vw, 58px); font-weight: 800; line-height: 1.08; margin-bottom: 18px; background: var(--gradient-primary); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
  .hero-sub { font-size: 17px; color: var(--text-muted); max-width: 560px; line-height: 1.65; margin-bottom: 36px; }
  .hero-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; max-width: 680px; margin: 0 auto 40px; text-align: left; }
  .hero-stat-card { background: var(--card); border: 1.5px solid var(--border); border-radius: var(--radius-sm); padding: 18px 20px; box-shadow: var(--shadow-sm); transition: box-shadow 0.2s, border-color 0.2s; }
  .hero-stat-card:hover { box-shadow: var(--shadow-md); border-color: var(--border-hover); }
  .hero-stat-number { font-family: var(--font-display); font-size: 28px; font-weight: 800; color: var(--primary); }
  .hero-stat-label { font-size: 12px; color: var(--text-muted); margin-top: 3px; }
  .disclaimer-bar { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: hsl(38 100% 97%); border: 1px solid hsl(38 92% 50% / 0.25); border-radius: var(--radius-xs); font-size: 12px; color: hsl(38 70% 30%); max-width: 560px; }

  /* ── PRINT / PDF styles ─────────────────────────────────────────────── */
  @media print {
    .no-print, .navbar, .footer, .mobile-nav { display: none !important; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { background: white !important; background-image: none !important; font-size: 11pt; }
    .page-content { padding: 0 !important; max-width: 100% !important; }
    .card, .card:hover { box-shadow: none !important; border: 1px solid #d1d5db !important; break-inside: avoid; margin-bottom: 14px !important; border-radius: 8px !important; }
    .card-body { padding: 18px 22px !important; }
    .report-card-body { padding: 0 !important; }
    .report-banner { border-radius: 8px 8px 0 0 !important; }
    .report-inner { padding: 24px 28px !important; }
    h1 { font-size: 20pt !important; }
    .grid-2 { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 8px !important; }
    .grid-3 { display: grid !important; grid-template-columns: 1fr 1fr 1fr !important; gap: 8px !important; }
    .stat-mini { padding: 7px 10px !important; }
    .stat-mini-label { font-size: 8px !important; }
    .stat-mini-value { font-size: 11px !important; }
    .tag { font-size: 9px !important; padding: 2px 7px !important; }
    .section-header { font-size: 13px !important; }
    .report-section-head { font-size: 8px !important; letter-spacing: 0.08em !important; }
    .progress-bar { height: 5px !important; }
    .combined-hero { padding: 18px 22px !important; }
    .result-box { padding: 12px 16px !important; }
    .biomarker-table-row { padding: 6px 10px !important; }
  }

  /* Mobile */
  .mobile-nav { display: none; }
  @media (max-width: 680px) {
    .grid-2, .grid-3 { grid-template-columns: 1fr; }
    .footer-grid { grid-template-columns: 1fr 1fr; }
    .card-body { padding: 20px; }
    .navbar-inner { padding: 0 16px; }
    .page-content { padding: 24px 16px 80px; }
    .nav-tabs-bar { display: none; }
    .nav-cta { display: none; }
    .hero-cards { grid-template-columns: 1fr; }
    .mobile-nav { display: flex; position: fixed; bottom: 0; left: 0; right: 0; background: hsl(0 0% 100% / 0.97); backdrop-filter: blur(20px); border-top: 1px solid var(--border); padding: 8px 0 env(safe-area-inset-bottom, 8px); z-index: 40; box-shadow: 0 -4px 20px hsl(215 30% 14% / 0.08); }
    .mobile-tab { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 6px 4px; border: none; background: none; cursor: pointer; font-family: var(--font-body); }
    .mobile-tab-icon { font-size: 18px; }
    .mobile-tab-label { font-size: 10px; font-weight: 600; color: var(--text-muted); }
    .mobile-tab.active .mobile-tab-label { color: var(--primary); }
    body { padding-bottom: 72px; }
    .analyse-cta { flex-direction: column; align-items: flex-start; }
  }
`;

// ── Helpers ───────────────────────────────────────────────────────────────────
const pct = (v) => `${(parseFloat(v) * 100).toFixed(1)}%`;          // for CSS widths only
const score100 = (v) => `${(parseFloat(v) * 100).toFixed(1)} / 100`; // display score
const getRiskMeta = (score) => {
  const s = parseFloat(score);
  if (s >= 0.7) return { label: "High Risk", color: "var(--red)", bg: "var(--red-soft)", border: "var(--red-border)", tag: "tag-red", icon: "🔴" };
  if (s >= 0.4) return { label: "Moderate Risk", color: "var(--amber)", bg: "var(--amber-soft)", border: "var(--amber-border)", tag: "tag-amber", icon: "🟡" };
  return { label: "Low Risk", color: "var(--green)", bg: "var(--green-soft)", border: "var(--green-border)", tag: "tag-green", icon: "🟢" };
};
const EMPTY = { name: "", age: "", gender: "", height: "", weight: "", familyHistory: "", familyRelation: "", tremors: "", stiffness: "", slowMovement: "", balanceIssues: "", sleepProblems: "", smellLoss: "" };

// ── UI helpers ────────────────────────────────────────────────────────────────
function Field({ label, children }) { return <div><label>{label}</label>{children}</div>; }
function Select({ label, value, onChange, options, placeholder = "Select…" }) {
  return (
    <Field label={label}>
      <select value={value} onChange={e => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Field>
  );
}

function ResultCard({ result, label }) {
  if (!result) return null;
  if (result.error) return (
    <div className="fade-in" style={{ padding: "12px 16px", borderRadius: "var(--radius-sm)", background: "var(--red-soft)", border: "1.5px solid var(--red-border)", color: "var(--red)", fontSize: 13, marginTop: 12 }}>
      ⚠️ {result.error}
    </div>
  );
  const isP = result.label === "Parkinson";
  const prob = parseFloat(result.probability);
  const s100 = (v) => (parseFloat(v) * 100).toFixed(1);
  const ci = result.confidence_interval;
  return (
    <div className="result-box fade-in" style={{ borderColor: isP ? "var(--red-border)" : "var(--green-border)", background: isP ? "var(--red-soft)" : "var(--green-soft)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label} Result</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 21, fontWeight: 800, color: isP ? "var(--red)" : "var(--green)" }}>{result.label}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 3, justifyContent: "flex-end" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 42, fontWeight: 800, color: isP ? "var(--red)" : "var(--green)", lineHeight: 1 }}>{s100(result.probability)}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: isP ? "var(--red)" : "var(--green)", opacity: 0.7 }}>/100</div>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>risk score</div>
        </div>
      </div>
      <div className="progress-bar" style={{ marginBottom: 6 }}>
        <div className="progress-fill" style={{ width: `${prob * 100}%`, background: isP ? "var(--red)" : "var(--green)" }} />
      </div>
      {ci && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 5 }}>95% CI: {s100(ci.lower)} – {s100(ci.upper)} / 100</div>
          <div className="ci-bar">
            <div className="ci-range" style={{ left: `${ci.lower * 100}%`, width: `${(ci.upper - ci.lower) * 100}%`, background: isP ? "var(--red)" : "var(--green)" }} />
            <div className="ci-point" style={{ left: `calc(${prob * 100}% - 5px)`, background: isP ? "var(--red)" : "var(--green)" }} />
          </div>
        </div>
      )}
      {result.updrs_estimate !== undefined && (
        <div style={{ marginTop: 14, padding: "10px 14px", background: "white", borderRadius: "var(--radius-xs)", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>UPDRS Motor Score</span>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, color: result.updrs_estimate > 20 ? "var(--red)" : result.updrs_estimate > 10 ? "var(--amber)" : "var(--green)" }}>
            {result.updrs_estimate} <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)" }}>/ 40</span>
          </span>
        </div>
      )}
    </div>
  );
}

function FeatureChart({ features }) {
  if (!features?.length) return null;
  const max = features[0]?.importance || 1;
  return (
    <div style={{ marginTop: 14, padding: "18px 20px", background: "hsl(210 40% 98%)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 14, fontFamily: "var(--font-display)" }}>📊 Top Voice Biomarkers</div>
      {features.map(f => (
        <div key={f.feature} className="feature-bar">
          <div style={{ width: 120, fontSize: 11, color: "var(--text-muted)", flexShrink: 0, fontWeight: 500 }}>{f.feature}</div>
          <div style={{ flex: 1 }}>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${(f.importance / max) * 100}%`, background: f.status === "elevated" ? "var(--red)" : f.status === "low" ? "var(--amber)" : "var(--green)" }} />
            </div>
          </div>
          <div style={{ width: 40, textAlign: "right", fontSize: 11, color: "var(--text-muted)" }}>{(f.importance * 100).toFixed(1)}%</div>
          <span className={`tag ${f.status === "elevated" ? "tag-red" : f.status === "low" ? "tag-amber" : "tag-green"}`} style={{ marginLeft: 6, width: 60, justifyContent: "center" }}>{f.status}</span>
        </div>
      ))}
    </div>
  );
}

function FinalScorePanel({ combined, profileMult, voiceResult, spiralResult }) {
  if (!combined) return null;
  const meta = getRiskMeta(combined.final_score);
  const ci = combined.confidence_interval;
  return (
    <div className="combined-hero fade-in" style={{ borderColor: meta.border, background: meta.bg }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>Combined Risk Assessment</div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 66, fontWeight: 800, color: meta.color, lineHeight: 1, marginBottom: 6 }}>{score100(combined.final_score)}</div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: meta.color, marginBottom: 20 }}>{meta.icon} {meta.label}</div>
      {ci && (
        <div style={{ maxWidth: 380, margin: "0 auto 24px" }}>
          <div className="ci-bar">
            <div className="ci-range" style={{ left: `${ci.lower * 100}%`, width: `${(ci.upper - ci.lower) * 100}%`, background: meta.color }} />
            <div className="ci-point" style={{ left: `calc(${parseFloat(combined.final_score) * 100}% - 5px)`, background: meta.color }} />
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>95% CI: {score100(ci.lower)} – {score100(ci.upper)}</div>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "center", gap: 28, fontSize: 13, color: "var(--text-muted)", flexWrap: "wrap" }}>
        <div>Voice <strong style={{ color: "var(--text)" }}>{score100(voiceResult?.probability || 0)}</strong></div>
        <div>Spiral <strong style={{ color: "var(--text)" }}>{score100(spiralResult?.probability || 0)}</strong></div>
        <div>Profile adj. <strong style={{ color: "var(--text)" }}>{profileMult >= 0 ? "+" : ""}{((profileMult || 0) * 100).toFixed(1)} pts</strong></div>
      </div>
      <div style={{ marginTop: 18, padding: "9px 14px", background: "white", borderRadius: "var(--radius-xs)", border: "1px solid var(--border)", fontSize: 11.5, color: "var(--text-muted)", display: "inline-block" }}>
        ⚠️ Research tool only — not a clinical diagnosis. Consult a qualified neurologist.
      </div>
    </div>
  );
}

// ── Patient-grouped history panel ─────────────────────────────────────────────
function GroupedHistory({ history, onSelect, onReassess }) {
  const [open, setOpen] = useState({});
  if (!history.length) return (
    <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-dim)", fontSize: 14 }}>
      <div style={{ fontSize: 44, marginBottom: 14 }}>📋</div>
      No sessions yet — complete a full assessment to see history here.
    </div>
  );
  const groups = history.reduce((acc, item) => {
    const key = item.patient?.name?.trim() || "Anonymous";
    (acc[key] = acc[key] || []).push(item);
    return acc;
  }, {});
  const toggle = (k) => setOpen(p => ({ ...p, [k]: !p[k] }));
  return (
    <div>
      <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
        {Object.keys(groups).length} patient{Object.keys(groups).length !== 1 ? "s" : ""} · {history.length} session{history.length !== 1 ? "s" : ""}
      </div>
      {Object.entries(groups).map(([name, sessions]) => {
        const isOpen = open[name] !== false;
        const latest = sessions[0];
        const latestMeta = getRiskMeta(latest?.combined?.final_score || 0);
        return (
          <div key={name} className="patient-group">
            <div className="patient-group-header" onClick={() => toggle(name)}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--primary-soft)", border: "2px solid hsl(211 92% 45% / 0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, color: "var(--primary)", flexShrink: 0 }}>
                  {name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: "var(--text)" }}>{name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {sessions[0]?.patient?.age ? `${sessions[0].patient.age}y` : ""}{sessions[0]?.patient?.gender ? ` · ${sessions[0].patient.gender}` : ""} · {sessions.length} session{sessions.length !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 3 }}>Latest</div>
                  <span className={`tag ${latestMeta.tag}`}>{latestMeta.icon} {latest?.combined ? score100(latest.combined.final_score) : "—"}</span>
                </div>
                <button className="btn-green btn-sm" style={{ whiteSpace: "nowrap" }}
                  onClick={e => { e.stopPropagation(); onReassess(sessions[0]); }}>
                  🔁 Reassess
                </button>
                <div style={{ color: "var(--text-dim)", fontSize: 20, transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>›</div>
              </div>
            </div>
            {isOpen && (
              <div className="patient-group-body">
                {sessions.map((item, i) => {
                  const meta = getRiskMeta(item.combined?.final_score || 0);
                  const prev = sessions[i + 1];
                  const delta = prev?.combined?.final_score != null
                    ? ((item.combined.final_score - prev.combined.final_score) * 100).toFixed(1)
                    : null;
                  return (
                    <div key={i} className="patient-session-row" onClick={() => onSelect(item)}>
                      <div>
                        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{new Date(item.timestamp).toLocaleString()}</div>
                        {delta !== null && (
                          <div style={{ fontSize: 12, marginTop: 2 }}>
                            Δ <span style={{ color: parseFloat(delta) > 0 ? "var(--red)" : "var(--green)", fontWeight: 700 }}>
                              {parseFloat(delta) > 0 ? "+" : ""}{delta}%
                            </span> vs previous
                          </div>
                        )}
                        {item.doctorNotes && <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2, maxWidth: 360, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>📝 {item.doctorNotes}</div>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, color: meta.color }}>{item.combined ? score100(item.combined.final_score) : "—"}</div>
                          <span className={`tag ${meta.tag}`}>{meta.label}</span>
                        </div>
                        <div style={{ color: "var(--text-dim)" }}>›</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar({ activeTab, setActiveTab, onNew }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8);
    fn(); window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);
  return (
    <header className={`navbar ${scrolled ? "scrolled" : ""} no-print`}>
      <div className="navbar-inner">
        <div className="nav-brand" onClick={() => setActiveTab("home")}>
          <div className="nav-brand-icon">⚕️</div>
          <div>
            <div className="nav-brand-name">NeuroDetect</div>
            <div className="nav-brand-sub">Clinical AI</div>
          </div>
        </div>
        <div className="nav-tabs-bar">
          {[["home","🏠 Home"],["assess","🩺 Assessment"],["history","📈 History"],["report","📄 Report"]].map(([id, label]) => (
            <button key={id} className={`nav-tab ${activeTab === id ? "active" : ""}`} onClick={() => setActiveTab(id)}>{label}</button>
          ))}
        </div>
        <button className="nav-cta" onClick={onNew}>+ New Assessment</button>
      </div>
    </header>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer({ setActiveTab }) {
  return (
    <footer className="footer no-print">
      <div className="footer-inner">
        <div className="footer-grid">
          <div>
            <div className="nav-brand" style={{ marginBottom: 14 }}>
              <div className="nav-brand-icon" style={{ width: 36, height: 36, fontSize: 16 }}>⚕️</div>
              <div><div className="nav-brand-name">NeuroDetect</div><div className="nav-brand-sub">Clinical AI</div></div>
            </div>
            <div className="footer-desc">AI-powered Parkinson's screening via voice biomarkers and motor spiral analysis.</div>
          </div>
          <div>
            <div className="footer-head">Quick Links</div>
            {[["home","Home"],["assess","Assessment"],["history","History"],["report","Report"]].map(([t,l]) => (
              <span key={t} className="footer-link" onClick={() => setActiveTab(t)}>{l}</span>
            ))}
          </div>
          <div>
            <div className="footer-head">Resources</div>
            <a className="footer-link" href="#">Clinical Guidelines</a>
            <a className="footer-link" href="#">Research Papers</a>
            <a className="footer-link" href="#">Privacy Policy</a>
            <a className="footer-link" href="#">Terms of Use</a>
          </div>
          <div>
            <div className="footer-head">Contact</div>
            <div className="footer-contact-item"><span className="footer-contact-icon">✉</span>contact@neurodetect.health</div>
            <div className="footer-contact-item"><span className="footer-contact-icon">📞</span>+1 (800) 555-0142</div>
            <div className="footer-contact-item"><span className="footer-contact-icon">📍</span><span>1200 Medical Center Dr<br />Boston, MA 02115</span></div>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="footer-copy">© {new Date().getFullYear()} NeuroDetect Clinical AI — for research only.</div>
          <div className="footer-copy">Not a substitute for professional medical diagnosis.</div>
        </div>
      </div>
    </footer>
  );
}

// ── Home Page ─────────────────────────────────────────────────────────────────
function HomePage({ setActiveTab, onNew }) {
  return (
    <div className="hero-page">
      <div className="hero-badge">🧠 Multi-Modal AI Screening</div>
      <h1 className="hero-title">Early Parkinson's<br />Detection Platform</h1>
      <p className="hero-sub">Voice analysis, spiral drawing, and clinical profile — fused by AI into a comprehensive risk score.</p>
      <div className="hero-cards">
        {[["92%","Voice accuracy on validated datasets","🎙️"],["88%","Spiral analysis detection rate","🌀"],["3-in-1","Modalities fused into one risk score","🔬"]].map(([n,l,i]) => (
          <div key={n} className="hero-stat-card"><div style={{ fontSize: 22, marginBottom: 4 }}>{i}</div><div className="hero-stat-number">{n}</div><div className="hero-stat-label">{l}</div></div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginBottom: 28 }}>
        <button className="btn-primary" style={{ padding: "13px 28px", fontSize: 15 }} onClick={onNew}>🩺 Start New Assessment</button>
        <button className="btn-ghost" style={{ padding: "13px 28px", fontSize: 15 }} onClick={() => setActiveTab("report")}>📄 View Sample Report</button>
      </div>
      <div className="disclaimer-bar">⚠️ Research tool only — not a clinical diagnostic instrument. Always consult a neurologist.</div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [profile, setProfile] = useState({ ...EMPTY });
  const [mult, setMult] = useState(1.0);

  // Voice
  const [recording, setRecording] = useState(false);
  const [recTime, setRecTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState(null);
  const [voiceResult, setVoiceResult] = useState(null);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceDone, setVoiceDone] = useState(false);

  // Spiral
  const [drawing, setDrawing] = useState(false);
  const [hasDrawing, setHasDrawing] = useState(false);
  const [spiralFile, setSpiralFile] = useState(null);   // uploaded image File
  const [spiralPreview, setSpiralPreview] = useState(null); // object URL
  const [spiralResult, setSpiralResult] = useState(null);
  const [spiralLoading, setSpiralLoading] = useState(false);
  const [spiralDone, setSpiralDone] = useState(false);
  const canvasRef = useRef(null);
  const ptRef = useRef([]);

  // Combined / report
  const [combined, setCombined] = useState(null);
  const [combining, setCombining] = useState(false);
  const [doctorNotes, setDoctorNotes] = useState("");
  const [history, setHistory] = useState([]);
  const [pdfLoading, setPdfLoading] = useState(false);

  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  // ── Compute profile multiplier ────────────────────────────────────────────
  const calcMult = useCallback((p) => {
    let m = 1.0;
    const age = parseInt(p.age);
    if (!isNaN(age)) {
      if (age >= 80) m += 0.40; else if (age >= 70) m += 0.30;
      else if (age >= 60) m += 0.20; else if (age >= 50) m += 0.12;
      else if (age >= 40) m += 0.05; else if (age < 30) m -= 0.15;
    }
    if (p.gender === "male") m += 0.08;
    if (p.familyHistory === "yes") {
      if (p.familyRelation === "parent") m += 0.25;
      else if (p.familyRelation === "sibling") m += 0.20;
      else if (p.familyRelation === "grandparent") m += 0.12;
      else if (p.familyRelation === "uncle_aunt") m += 0.08;
      else m += 0.05;
    }
    if (p.tremors === "yes") m += 0.15;
    if (p.slowMovement === "yes") m += 0.13;
    if (p.stiffness === "yes") m += 0.10;
    if (p.balanceIssues === "yes") m += 0.08;
    if (p.sleepProblems === "yes") m += 0.07;
    if (p.smellLoss === "yes") m += 0.06;
    const raw = Math.min(m, 2.0);
    // Mirror backend: tiny additive bonus capped at ±0.08 (in 0–100 points: ±8 pts)
    const bonus = Math.min((raw - 1.0) * 0.06, 0.08);
    return Math.max(bonus, -0.04); // return the bonus value directly
  }, []);

  const updateProfile = (field, value) => {
    const updated = { ...profile, [field]: value };
    setProfile(updated);
    setMult(calcMult(updated));
    // If combined already computed, invalidate it so user must re-run
    if (combined) setCombined(null);
  };

  // ── Reset everything for a new assessment ────────────────────────────────
  const handleNew = () => {
    setProfile({ ...EMPTY }); setMult(1.0);
    setRecording(false); setRecTime(0);
    setAudioBlob(null); setAudioPreviewUrl(null); setVoiceResult(null); setVoiceDone(false);
    setSpiralFile(null); setSpiralPreview(null);
    setSpiralResult(null); setSpiralDone(false);
    setHasDrawing(false); setDrawing(false);
    setCombined(null); setDoctorNotes("");
    if (canvasRef.current) canvasRef.current.getContext("2d").clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    clearInterval(timerRef.current);
    setActiveTab("assess");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Voice recording ───────────────────────────────────────────────────────
  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = []; setRecTime(0);
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = e => chunksRef.current.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioPreviewUrl(URL.createObjectURL(blob));
        setVoiceResult(null); setVoiceDone(false); setCombined(null);
      };
      mediaRef.current = rec; rec.start(); setRecording(true);
      timerRef.current = setInterval(() => setRecTime(t => t + 1), 1000);
    } catch { alert("Microphone access denied."); }
  };
  const stopRec = () => { mediaRef.current?.stop(); clearInterval(timerRef.current); setRecording(false); };

  const analyzeVoice = async () => {
    if (!audioBlob) return;
    setVoiceLoading(true); setVoiceResult(null); setVoiceDone(false);
    const fd = new FormData(); fd.append("file", audioBlob, "rec.webm");
    try {
      const res = await axios.post(`${API}/predict/voice/audio`, fd);
      setVoiceResult(res.data); setVoiceDone(true); setCombined(null);
    } catch { setVoiceResult({ error: "Failed to connect to API" }); }
    setVoiceLoading(false);
  };

  // ── Spiral drawing ────────────────────────────────────────────────────────
  const getPos = (e, c) => {
    const r = c.getBoundingClientRect();
    if (e.touches) return { x: e.touches[0].clientX - r.left, y: e.touches[0].clientY - r.top };
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const startDraw = e => {
    const c = canvasRef.current, ctx = c.getContext("2d");
    const p = getPos(e, c); ctx.beginPath(); ctx.moveTo(p.x, p.y);
    ptRef.current = [p]; setDrawing(true); setHasDrawing(true);
    setSpiralFile(null); setSpiralPreview(null); setSpiralResult(null); setSpiralDone(false);
  };
  const onDraw = e => {
    if (!drawing) return; e.preventDefault();
    const c = canvasRef.current, ctx = c.getContext("2d");
    const p = getPos(e, c); ptRef.current.push(p);
    if (ptRef.current.length >= 3) {
      const pts = ptRef.current, l = pts.length;
      const m1 = { x: (pts[l-3].x + pts[l-2].x) / 2, y: (pts[l-3].y + pts[l-2].y) / 2 };
      const m2 = { x: (pts[l-2].x + pts[l-1].x) / 2, y: (pts[l-2].y + pts[l-1].y) / 2 };
      ctx.beginPath(); ctx.moveTo(m1.x, m1.y);
      ctx.quadraticCurveTo(pts[l-2].x, pts[l-2].y, m2.x, m2.y);
      ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.strokeStyle = "hsl(211 92% 45%)"; ctx.shadowBlur = 6; ctx.shadowColor = "hsl(211 92% 45% / 0.4)";
      ctx.stroke();
    }
  };
  const stopDraw = () => { setDrawing(false); ptRef.current = []; };
  const clearCanvas = () => {
    canvasRef.current.getContext("2d").clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHasDrawing(false); setSpiralResult(null); setSpiralDone(false);
  };

  // Handle uploaded spiral image
  const handleSpiralUpload = (f) => {
    if (!f) return;
    setSpiralFile(f);
    setSpiralPreview(URL.createObjectURL(f));
    setHasDrawing(false);
    setSpiralResult(null); setSpiralDone(false);
    if (canvasRef.current) canvasRef.current.getContext("2d").clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };
  const removeSpiralUpload = () => {
    if (spiralPreview) URL.revokeObjectURL(spiralPreview);
    setSpiralFile(null); setSpiralPreview(null); setSpiralResult(null); setSpiralDone(false);
  };

  const analyzeSpiral = async () => {
    setSpiralLoading(true); setSpiralResult(null); setSpiralDone(false);
    try {
      const fd = new FormData();
      if (spiralFile) {
        fd.append("file", spiralFile);
      } else {
        await new Promise(res => canvasRef.current.toBlob(blob => { fd.append("file", blob, "spiral.png"); res(); }, "image/png"));
      }
      const r = await axios.post(`${API}/predict/spiral`, fd);
      setSpiralResult(r.data); setSpiralDone(true); setCombined(null);
    } catch { setSpiralResult({ error: "Failed to connect to API" }); }
    setSpiralLoading(false);
  };

  // ── Run final combined analysis → add to history ──────────────────────────
  // Only called when user clicks "Run Final Analysis" / "Re-Run Analysis" button
  const runFinalAnalysis = async () => {
    if (!voiceResult?.probability || !spiralResult?.probability) return;
    setCombining(true);
    try {
      const params = new URLSearchParams({
        voice_probability: voiceResult.probability,
        spiral_probability: spiralResult.probability,
        age: profile.age || 0, gender: profile.gender,
        family_history: profile.familyHistory, family_relation: profile.familyRelation,
        tremors: profile.tremors, slow_movement: profile.slowMovement,
        stiffness: profile.stiffness, balance_issues: profile.balanceIssues,
        sleep_problems: profile.sleepProblems, smell_loss: profile.smellLoss,
      });
      const res = await axios.post(`${API}/predict/combined?${params}`);
      const c = res.data;
      setCombined(c);
      // Save to history ONLY here, after final analysis
      const entry = { timestamp: new Date().toISOString(), patient: { ...profile }, voice: voiceResult, spiral: spiralResult, combined: c, doctorNotes };
      setHistory(prev => [entry, ...prev.slice(0, 49)]);
    } catch { setCombined(null); alert("Combined analysis failed. Check backend is running."); }
    setCombining(false);
  };

  // canRunFinal: both analyses done
  const canRunFinal = voiceDone && spiralDone;

  // ── Load session from history ─────────────────────────────────────────────
  const loadSession = (item) => {
    setProfile(item.patient || { ...EMPTY });
    setMult(calcMult(item.patient || EMPTY));
    setVoiceResult(item.voice); setVoiceDone(!!item.voice?.probability);
    setSpiralResult(item.spiral); setSpiralDone(!!item.spiral?.probability);
    setCombined(item.combined);
    setDoctorNotes(item.doctorNotes || "");
    setAudioBlob(null); setAudioPreviewUrl(null); setSpiralFile(null); setSpiralPreview(null); setHasDrawing(false);
    if (canvasRef.current) canvasRef.current.getContext("2d").clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setActiveTab("assess");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Reassess same patient — keep profile, clear voice+spiral ────────────
  const handleReassess = (item) => {
    setProfile(item.patient || { ...EMPTY });
    setMult(calcMult(item.patient || EMPTY));
    // Clear voice
    setAudioBlob(null); setAudioPreviewUrl(null); setVoiceResult(null); setVoiceDone(false);
    // Clear spiral
    setSpiralFile(null); setSpiralPreview(null); setSpiralResult(null); setSpiralDone(false);
    setHasDrawing(false);
    if (canvasRef.current) canvasRef.current.getContext("2d").clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    // Clear combined
    setCombined(null); setDoctorNotes("");
    setActiveTab("assess");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };


  const downloadPDF = async () => {
    setPdfLoading(true);
    try {
      const res = await axios.post(`${API}/generate-pdf-report`, {
        patient: profile, voice: voiceResult, spiral: spiralResult,
        combined, doctorNotes, timestamp: new Date().toISOString(),
      }, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a"); a.href = url;
      a.download = `parkinsons_report_${profile.name || "patient"}_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click(); URL.revokeObjectURL(url);
    } catch { alert("PDF generation failed. Ensure the backend is running."); }
    setPdfLoading(false);
  };

  const riskMeta = combined ? getRiskMeta(combined.final_score) : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{css}</style>
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} onNew={handleNew} />

      {/* HOME */}
      {activeTab === "home" && <HomePage setActiveTab={setActiveTab} onNew={handleNew} />}

      {/* ASSESSMENT */}
      {activeTab === "assess" && (
        <div className="page-content">
          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <div className="info-pill" style={{ marginBottom: 14 }}>🩺 Multi-Modal Assessment</div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 800, marginBottom: 8, color: "var(--text)" }}>Patient Assessment</h1>
            <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
              Step 1: Fill profile &nbsp;·&nbsp; Step 2: Analyse voice &nbsp;·&nbsp; Step 3: Analyse spiral &nbsp;·&nbsp; Step 4: Run Final Analysis
            </p>
          </div>

          {/* ── Step 1: Patient Profile ── */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-body">
              <div className="section-header" style={{ marginBottom: 4 }}><span style={{ fontSize: 22 }}>👤</span> Step 1 — Patient Profile</div>
              <div className="section-sub">Demographics and clinical history calibrate the risk multiplier.</div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Basic Information</div>
                <div className="grid-3" style={{ marginBottom: 12 }}>
                  <Field label="Full Name"><input type="text" placeholder="Patient name" value={profile.name} onChange={e => updateProfile("name", e.target.value)} /></Field>
                  <Field label="Age"><input type="number" min="1" max="120" placeholder="Years" value={profile.age} onChange={e => updateProfile("age", e.target.value)} /></Field>
                  <Select label="Gender" value={profile.gender} onChange={v => updateProfile("gender", v)} options={[{value:"male",label:"Male"},{value:"female",label:"Female"},{value:"other",label:"Other"}]} />
                </div>
                <div className="grid-2">
                  <Field label="Height (cm)"><input type="number" placeholder="e.g. 170" value={profile.height} onChange={e => updateProfile("height", e.target.value)} /></Field>
                  <Field label="Weight (kg)"><input type="number" placeholder="e.g. 70" value={profile.weight} onChange={e => updateProfile("weight", e.target.value)} /></Field>
                </div>
              </div>
              <div className="divider" />

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Family History</div>
                <div className="grid-2">
                  <Select label="Family history of Parkinson's?" value={profile.familyHistory} onChange={v => updateProfile("familyHistory", v)} options={[{value:"yes",label:"Yes"},{value:"no",label:"No"}]} />
                  {profile.familyHistory === "yes" && (
                    <Select label="Relation" value={profile.familyRelation} onChange={v => updateProfile("familyRelation", v)}
                      options={[{value:"parent",label:"Parent"},{value:"sibling",label:"Sibling"},{value:"grandparent",label:"Grandparent"},{value:"uncle_aunt",label:"Uncle/Aunt"},{value:"other",label:"Other"}]} />
                  )}
                </div>
              </div>
              <div className="divider" />

              <div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Current Symptoms</div>
                <div className="grid-3">
                  <Select label="Tremors?" value={profile.tremors} onChange={v => updateProfile("tremors", v)} options={[{value:"yes",label:"Yes"},{value:"no",label:"No"}]} />
                  <Select label="Stiffness?" value={profile.stiffness} onChange={v => updateProfile("stiffness", v)} options={[{value:"yes",label:"Yes"},{value:"no",label:"No"}]} />
                  <Select label="Slow movement?" value={profile.slowMovement} onChange={v => updateProfile("slowMovement", v)} options={[{value:"yes",label:"Yes"},{value:"no",label:"No"}]} />
                  <Select label="Balance issues?" value={profile.balanceIssues} onChange={v => updateProfile("balanceIssues", v)} options={[{value:"yes",label:"Yes"},{value:"no",label:"No"}]} />
                  <Select label="Sleep disturbances?" value={profile.sleepProblems} onChange={v => updateProfile("sleepProblems", v)} options={[{value:"yes",label:"Yes"},{value:"no",label:"No"}]} />
                  <Select label="Loss of smell?" value={profile.smellLoss} onChange={v => updateProfile("smellLoss", v)} options={[{value:"yes",label:"Yes"},{value:"no",label:"No"}]} />
                </div>
              </div>

              {profile.age && (
                <div style={{ marginTop: 20, padding: "14px 18px", borderRadius: "var(--radius-sm)", background: mult > 0.04 ? "var(--amber-soft)" : mult < 0 ? "var(--green-soft)" : "hsl(210 40% 97%)", border: `1.5px solid ${mult > 0.04 ? "var(--amber-border)" : mult < 0 ? "var(--green-border)" : "var(--border)"}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Profile Risk Adjustment</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Small additive adjustment based on demographics & symptoms (max ±8 pts)</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: mult > 0.04 ? "var(--amber)" : mult < 0 ? "var(--green)" : "var(--text-muted)" }}>
                      {mult >= 0 ? "+" : ""}{(mult * 100).toFixed(1)} pts
                    </span>
                    <span className={`tag ${mult > 0.04 ? "tag-amber" : mult < 0 ? "tag-green" : "tag-blue"}`}>
                      {mult > 0.04 ? "Elevated" : mult < 0 ? "Reduced" : "Neutral"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Step 2: Voice Analysis ── */}
          <div className="card" style={{ marginBottom: 20, outline: voiceDone ? "2px solid var(--green)" : "none", outlineOffset: 2 }}>
            <div className="card-body">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div className="section-header" style={{ marginBottom: 4 }}>
                    <span style={{ fontSize: 22 }}>🎙️</span> Step 2 — Voice Analysis
                    {voiceDone && <span className="tag tag-green" style={{ marginLeft: 8 }}>✓ Done</span>}
                  </div>
                  <div className="section-sub">Sustain <strong>"Aaaaaah"</strong> for 5–7 seconds, then click Analyse Voice.</div>
                </div>
                {voiceDone && <button className="btn-ghost btn-sm" onClick={() => { setVoiceResult(null); setVoiceDone(false); setAudioBlob(null); setAudioPreviewUrl(null); setCombined(null); }}>↩ Redo</button>}
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
                <button className={recording ? "btn-danger" : "btn-primary"} onClick={recording ? stopRec : startRec}>
                  {recording ? `⏹ Stop (${recTime}s)` : "🎙 Start Recording"}
                </button>
                {audioBlob && !recording && (
                  <button className="btn-green" onClick={analyzeVoice} disabled={voiceLoading}>
                    {voiceLoading ? "⏳ Analysing…" : "🔍 Analyse Voice"}
                  </button>
                )}
              </div>

              {recording && (
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, padding: "10px 14px", background: "var(--red-soft)", borderRadius: "var(--radius-xs)", border: "1px solid var(--red-border)" }}>
                  <div className="waveform">{[.2,.4,.6,.8,1,.8,.6,.4].map((d,i) => <div key={i} className="wave-bar" style={{ animationDelay: `${d * 0.1}s` }} />)}</div>
                  <span style={{ fontSize: 13, color: "var(--red)", fontWeight: 600 }}>Recording… sustain "Aaaaah" clearly</span>
                </div>
              )}

              <div className="upload-zone">
                <div className="upload-label">Or upload a voice file (.wav, .mp3, .webm, .ogg)</div>
                <input type="file" accept=".wav,.mp3,.webm,.ogg" onChange={e => {
                  const f = e.target.files[0];
                  if (f) {
                    if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
                    const url = URL.createObjectURL(f);
                    setAudioBlob(f); setAudioPreviewUrl(url);
                    setVoiceResult(null); setVoiceDone(false); setCombined(null);
                  }
                  e.target.value = "";
                }} />
              </div>

              {audioBlob && !recording && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Audio Preview</div>
                    <button className="btn-ghost btn-sm" style={{ color: "var(--red)", borderColor: "var(--red-border)" }}
                      onClick={() => {
                        if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
                        setAudioBlob(null); setAudioPreviewUrl(null);
                        setVoiceResult(null); setVoiceDone(false); setCombined(null);
                      }}>✕ Remove Audio</button>
                  </div>
                  <audio controls src={audioPreviewUrl} style={{ width: "100%" }} />
                </div>
              )}
              <ResultCard result={voiceResult} label="Voice" />
              {voiceResult?.top_features && <FeatureChart features={voiceResult.top_features} />}
            </div>
          </div>

          {/* ── Step 3: Spiral Drawing ── */}
          <div className="card" style={{ marginBottom: 20, outline: spiralDone ? "2px solid var(--green)" : "none", outlineOffset: 2 }}>
            <div className="card-body">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div className="section-header" style={{ marginBottom: 4 }}>
                    <span style={{ fontSize: 22 }}>🌀</span> Step 3 — Spiral Drawing
                    {spiralDone && <span className="tag tag-green" style={{ marginLeft: 8 }}>✓ Done</span>}
                  </div>
                  <div className="section-sub">Draw a spiral on the canvas, or upload an image — then click Analyse Spiral.</div>
                </div>
                {spiralDone && <button className="btn-ghost btn-sm" onClick={() => { setSpiralResult(null); setSpiralDone(false); clearCanvas(); removeSpiralUpload(); setCombined(null); }}>↩ Redo</button>}
              </div>

              {/* Upload zone with preview */}
              {spiralPreview ? (
                <div style={{ marginBottom: 14 }}>
                  <div className="upload-label">Uploaded image</div>
                  <div className="img-preview-wrap">
                    <img src={spiralPreview} alt="Spiral preview" />
                    <button className="img-remove-btn" onClick={removeSpiralUpload} title="Remove image">✕</button>
                  </div>
                </div>
              ) : (
                <div className="upload-zone">
                  <div className="upload-label">Upload a spiral image (or draw below)</div>
                  <input type="file" accept="image/*" onChange={e => { const f = e.target.files[0]; if (f) handleSpiralUpload(f); e.target.value = ""; }} />
                </div>
              )}

              {/* Canvas — hide when uploaded image is present */}
              {!spiralPreview && (
                <>
                  <canvas ref={canvasRef} width={520} height={280} className="spiral-canvas"
                    onMouseDown={startDraw} onMouseMove={onDraw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                    onTouchStart={startDraw} onTouchMove={onDraw} onTouchEnd={stopDraw}
                  />
                  <button className="btn-ghost" style={{ marginTop: 10 }} onClick={clearCanvas}>🗑 Clear Canvas</button>
                </>
              )}

              {(hasDrawing || spiralFile) && (
                <div style={{ marginTop: 12 }}>
                  <button className="btn-primary" onClick={analyzeSpiral} disabled={spiralLoading}>
                    {spiralLoading ? "⏳ Analysing…" : "🔬 Analyse Spiral"}
                  </button>
                </div>
              )}
              <ResultCard result={spiralResult} label="Spiral" />
            </div>
          </div>

          {/* ── Step 4: Clinician Notes + Final Analysis CTA ── */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-body">
              <div className="section-header" style={{ marginBottom: 14 }}><span style={{ fontSize: 22 }}>📝</span> Step 4 — Clinician Notes</div>
              <Field label="Observations, recommendations, or follow-up notes">
                <textarea rows={4} placeholder="Enter clinical observations, differential diagnosis notes, follow-up plan…" value={doctorNotes} onChange={e => setDoctorNotes(e.target.value)} style={{ resize: "vertical", lineHeight: 1.65 }} />
              </Field>
            </div>
          </div>

          {/* Final Analysis CTA — only shown first time, not as re-run bar */}
          {canRunFinal && !combined && (
            <div className="analyse-cta fade-in" style={{
              borderColor: "hsl(211 92% 45% / 0.25)",
              background: "linear-gradient(135deg, hsl(211 100% 97%) 0%, hsl(199 100% 96%) 100%)"
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800, marginBottom: 4, color: "var(--primary)" }}>
                  ✅ Voice & spiral done — run final analysis
                </div>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  Click below to calculate the combined risk score and save to history.
                </div>
              </div>
              <button className="btn-primary" style={{ padding: "13px 28px", fontSize: 15, whiteSpace: "nowrap" }}
                onClick={runFinalAnalysis} disabled={combining}>
                {combining ? "⏳ Computing…" : "🧠 Run Final Analysis"}
              </button>
            </div>
          )}

          {/* Pending state — one done, other not */}
          {(voiceDone || spiralDone) && !canRunFinal && !combined && (
            <div style={{ marginTop: 12, padding: "14px 18px", background: "hsl(45 100% 96%)", border: "1px solid var(--amber-border)", borderRadius: "var(--radius-sm)", fontSize: 13, color: "hsl(38 70% 30%)" }}>
              {voiceDone && !spiralDone && "🌀 Voice done — complete the spiral analysis to enable the final report."}
              {spiralDone && !voiceDone && "🎙️ Spiral done — complete the voice analysis to enable the final report."}
            </div>
          )}

          <FinalScorePanel combined={combined} profileMult={mult} voiceResult={voiceResult} spiralResult={spiralResult} />

          {/* Actions */}
          {combined && (
            <div style={{ display: "flex", gap: 12, marginTop: 20, justifyContent: "flex-end", flexWrap: "wrap" }} className="no-print">
              <button className="btn-ghost" onClick={() => window.print()}>🖨️ Print</button>
              <button className="btn-ghost" onClick={() => setActiveTab("report")}>👁 View Report</button>
              <button className="btn-primary" onClick={downloadPDF} disabled={pdfLoading}>
                {pdfLoading ? "⏳ Generating…" : "⬇️ Download PDF"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* HISTORY */}
      {activeTab === "history" && (
        <div className="page-content">
          <div style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div className="info-pill" style={{ marginBottom: 14 }}>📈 Session History</div>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 800, marginBottom: 8, color: "var(--text)" }}>Test History & Trends</h1>
              <p style={{ fontSize: 14, color: "var(--text-muted)" }}>Grouped by patient — click any session to reload it into the assessment form.</p>
            </div>
            <button className="btn-primary no-print" onClick={handleNew}>+ New Assessment</button>
          </div>

          {history.length >= 2 && (
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-body">
                <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14 }}>
                  Overall Risk Trend — last {Math.min(history.length, 10)} sessions
                </div>
                <div className="trend-chart">
                  {[...history].reverse().slice(-10).map((item, i) => {
                    const score = item.combined?.final_score || 0;
                    const meta = getRiskMeta(score);
                    return (
                      <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        <div style={{ width: "100%", borderRadius: 5, background: meta.color, height: `${Math.max(score * 72, 4)}px`, opacity: 0.85, transition: "height 0.5s" }} />
                        <div style={{ fontSize: 9, color: "var(--text-dim)", fontWeight: 600 }}>{(score * 100).toFixed(0)}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-body">
              <GroupedHistory history={history} onSelect={loadSession} onReassess={handleReassess} />
            </div>
          </div>
        </div>
      )}

      {/* REPORT */}
      {activeTab === "report" && (
        <div className="page-content">
          <div style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div className="info-pill" style={{ marginBottom: 14 }}>📄 Clinical Report</div>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 800, marginBottom: 8, color: "var(--text)" }}>Assessment Report</h1>
              <p style={{ fontSize: 14, color: "var(--text-muted)" }}>Auto-populated once a final analysis is complete.</p>
            </div>
            {combined && (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }} className="no-print">
                <button className="btn-amber" onClick={handleNew}>🔄 New Assessment</button>
                <button className="btn-ghost" onClick={() => window.print()}>🖨️ Print</button>
                <button className="btn-primary" onClick={downloadPDF} disabled={pdfLoading}>{pdfLoading ? "⏳ Generating…" : "⬇️ Download PDF"}</button>
              </div>
            )}
          </div>

          {!combined ? (
            <div className="card">
              <div className="card-body" style={{ textAlign: "center", padding: "64px 32px" }}>
                <div style={{ fontSize: 52, marginBottom: 16 }}>📄</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, marginBottom: 8, color: "var(--text)" }}>No report yet</div>
                <div style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 24 }}>Complete voice + spiral analysis, then click <strong>Run Final Analysis</strong> on the Assessment page.</div>
                <button className="btn-primary" onClick={handleNew}>+ Start New Assessment</button>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="report-card-body">
                {/* Coloured banner header */}
                <div className="report-banner" style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #0369a1 100%)", padding: "28px 36px", borderRadius: "14px 14px 0 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <div style={{ fontSize: 22 }}>⚕️</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.8)", textTransform: "uppercase", letterSpacing: "0.1em" }}>NeuroDetect Clinical AI</div>
                    </div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, color: "white", lineHeight: 1.2, marginBottom: 6 }}>
                      Parkinson's Early Detection Report
                    </div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>Generated: {new Date().toLocaleString()}</div>
                  </div>
                  <div style={{ textAlign: "center", padding: "14px 22px", borderRadius: "var(--radius-sm)", background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.25)", minWidth: 130 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.75)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Risk Score</div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 800, color: "white", lineHeight: 1 }}>{score100(combined.final_score)}</div>
                    <div style={{ marginTop: 8 }}>
                      <span className={`tag ${riskMeta?.tag}`} style={{ fontSize: 12, padding: "4px 12px" }}>{riskMeta?.icon} {riskMeta?.label}</span>
                    </div>
                  </div>
                </div>

                {/* Report body */}
                <div className="report-inner" style={{ padding: "32px 36px" }}>

                  {/* Patient Info */}
                  <div style={{ marginBottom: 28 }}>
                    <div className="report-section-head">👤 Patient Information</div>
                    <div className="grid-2">
                      {[["Full Name", profile.name || "N/A"], ["Age", profile.age ? `${profile.age} years` : "N/A"],
                        ["Gender", profile.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : "N/A"],
                        ["Height / Weight", `${profile.height || "—"} cm / ${profile.weight || "—"} kg`],
                        ["Family History", profile.familyHistory === "yes" ? "Yes" : profile.familyHistory === "no" ? "No" : "N/A"],
                        ["Family Relation", profile.familyRelation?.replace("_", "/") || "N/A"]
                      ].map(([k, v]) => (
                        <div key={k} className="stat-mini">
                          <div className="stat-mini-label">{k}</div>
                          <div className="stat-mini-value">{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Symptoms */}
                  <div style={{ marginBottom: 28 }}>
                    <div className="report-section-head">🩺 Reported Symptoms</div>
                    <div className="grid-3">
                      {[["Tremors", profile.tremors], ["Muscle Stiffness", profile.stiffness], ["Slow Movement", profile.slowMovement],
                        ["Balance Issues", profile.balanceIssues], ["Sleep Disturbances", profile.sleepProblems], ["Loss of Smell", profile.smellLoss]
                      ].map(([k, v]) => (
                        <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }} className="stat-mini">
                          <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>{k}</span>
                          <span className={`tag ${v === "yes" ? "tag-red" : v === "no" ? "tag-green" : "tag-blue"}`}>
                            {v === "yes" ? "Yes" : v === "no" ? "No" : "N/A"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Voice */}
                  {voiceResult?.probability != null && (
                    <div style={{ marginBottom: 28 }}>
                      <div className="report-section-head">🎙️ Voice Analysis</div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                        {[["Result", voiceResult.label, voiceResult.label === "Parkinson" ? "tag-red" : "tag-green"],
                          ["Score", score100(voiceResult.probability), "tag-blue"],
                          ["95% CI", voiceResult.confidence_interval ? `${score100(voiceResult.confidence_interval.lower)} – ${score100(voiceResult.confidence_interval.upper)}` : "N/A", "tag-blue"],
                          ["UPDRS", voiceResult.updrs_estimate != null ? `${voiceResult.updrs_estimate} / 40` : "N/A", "tag-blue"]
                        ].map(([k, v, cls]) => (
                          <div key={k} className="stat-mini" style={{ minWidth: 120 }}>
                            <div className="stat-mini-label">{k}</div>
                            <span className={`tag ${cls}`} style={{ marginTop: 4, display: "inline-flex" }}>{v}</span>
                          </div>
                        ))}
                      </div>
                      <div className="progress-bar"><div className="progress-fill" style={{ width: pct(voiceResult.probability), background: voiceResult.label === "Parkinson" ? "var(--red)" : "var(--green)" }} /></div>
                      {voiceResult.top_features?.length > 0 && (
                        <div style={{ marginTop: 14, borderRadius: "var(--radius-xs)", overflow: "hidden", border: "1px solid var(--border)" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 1fr 1fr", padding: "7px 14px", background: "#1e293b" }}>
                            {["Feature","Value","Importance","Status"].map(h => <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.8)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</div>)}
                          </div>
                          {voiceResult.top_features.slice(0, 6).map((f, i) => (
                            <div key={f.feature} className="biomarker-table-row" style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 1fr 1fr", padding: "8px 14px", background: i % 2 === 0 ? "white" : "hsl(210 40% 98.5%)", borderTop: "1px solid var(--border)" }}>
                              <div style={{ fontSize: 12, fontWeight: 600 }}>{f.feature}</div>
                              <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>{f.value}</div>
                              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{(f.importance * 100).toFixed(1)}%</div>
                              <span className={`tag ${f.status === "elevated" ? "tag-red" : f.status === "low" ? "tag-amber" : "tag-green"}`} style={{ justifySelf: "start", fontSize: 10 }}>{f.status}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Spiral */}
                  {spiralResult?.probability != null && (
                    <div style={{ marginBottom: 28 }}>
                      <div className="report-section-head">🌀 Spiral Drawing Analysis</div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                        {[["Result", spiralResult.label, spiralResult.label === "Parkinson" ? "tag-red" : "tag-green"],
                          ["Score", score100(spiralResult.probability), "tag-blue"],
                          ["95% CI", spiralResult.confidence_interval ? `${score100(spiralResult.confidence_interval.lower)} – ${score100(spiralResult.confidence_interval.upper)}` : "N/A", "tag-blue"]
                        ].map(([k, v, cls]) => (
                          <div key={k} className="stat-mini" style={{ minWidth: 120 }}>
                            <div className="stat-mini-label">{k}</div>
                            <span className={`tag ${cls}`} style={{ marginTop: 4, display: "inline-flex" }}>{v}</span>
                          </div>
                        ))}
                      </div>
                      <div className="progress-bar"><div className="progress-fill" style={{ width: pct(spiralResult.probability), background: spiralResult.label === "Parkinson" ? "var(--red)" : "var(--green)" }} /></div>
                    </div>
                  )}

                  {/* Combined */}
                  <div style={{ marginBottom: 28, padding: "22px 26px", borderRadius: "var(--radius-sm)", border: `2px solid ${riskMeta?.border}`, background: riskMeta?.bg }}>
                    <div className="report-section-head">📊 Combined Risk Assessment</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 52, fontWeight: 800, color: riskMeta?.color, lineHeight: 1 }}>{score100(combined.final_score)}</div>
                      <div>
                        <span className={`tag ${riskMeta?.tag}`} style={{ fontSize: 13, padding: "5px 14px", display: "inline-flex", marginBottom: 8 }}>{riskMeta?.icon} {riskMeta?.label}</span>
                        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                          Voice 70% · Spiral 30% · Profile adj. {combined.profile_bonus != null ? `+${(combined.profile_bonus * 100).toFixed(1)} pts` : "N/A"}
                        </div>
                        {combined.confidence_interval && <div style={{ fontSize: 13, color: "var(--text-muted)" }}>95% CI: {score100(combined.confidence_interval.lower)} – {score100(combined.confidence_interval.upper)}</div>}
                      </div>
                    </div>
                    <div style={{ marginTop: 16 }}>
                      <div className="progress-bar" style={{ height: 10 }}>
                        <div className="progress-fill" style={{ width: pct(combined.final_score), background: riskMeta?.color }} />
                      </div>
                    </div>
                  </div>

                  {/* Clinician notes */}
                  {doctorNotes && (
                    <div style={{ marginBottom: 28 }}>
                      <div className="report-section-head">📝 Clinician Notes</div>
                      <div style={{ padding: "14px 18px", background: "hsl(210 40% 98%)", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--border)", fontSize: 14, lineHeight: 1.75, color: "var(--text)", whiteSpace: "pre-wrap" }}>
                        {doctorNotes}
                      </div>
                    </div>
                  )}

                  {/* Disclaimer */}
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: 18 }}>
                    <div style={{ padding: "12px 16px", background: "hsl(38 100% 97%)", border: "1px solid hsl(38 92% 50% / 0.25)", borderRadius: "var(--radius-xs)", fontSize: 11.5, color: "hsl(38 60% 28%)", lineHeight: 1.65 }}>
                      ⚠️ <strong>Important Disclaimer:</strong> This report is generated by an AI-assisted research tool for informational purposes only. It does <em>not</em> constitute a medical diagnosis. All results must be interpreted by a qualified neurologist. Please consult your doctor for clinical evaluation.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <Footer setActiveTab={setActiveTab} />

      {/* Mobile nav */}
      <nav className="mobile-nav no-print">
        {[["home","🏠","Home"],["assess","🩺","Assess"],["history","📈","History"],["report","📄","Report"]].map(([id, icon, label]) => (
          <button key={id} className={`mobile-tab ${activeTab === id ? "active" : ""}`} onClick={() => setActiveTab(id)}>
            <span className="mobile-tab-icon">{icon}</span>
            <span className="mobile-tab-label">{label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
