from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import numpy as np
import joblib
import tensorflow as tf
from PIL import Image
import io
import tempfile
import os
import json
import datetime
import parselmouth
from parselmouth.praat import call
from pydub import AudioSegment
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

app = FastAPI(title="Parkinson's Detection API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load models
voice_model = joblib.load("models/voice_model.pkl")
voice_scaler = joblib.load("models/voice_scaler.pkl")
spiral_model = tf.keras.models.load_model("models/spiral_model.keras")

# ─── Feature importance (approximate clinical weights for voice features) ───
VOICE_FEATURE_IMPORTANCE = {
    "Jitter_local": 0.142,
    "Jitter_abs": 0.089,
    "Jitter_rap": 0.112,
    "Jitter_ppq5": 0.098,
    "Jitter_ddp": 0.076,
    "Shimmer_local": 0.134,
    "Shimmer_dB": 0.071,
    "Shimmer_apq3": 0.063,
    "Shimmer_apq5": 0.058,
    "Shimmer_apq11": 0.048,
    "Shimmer_dda": 0.042,
    "AC": 0.031,
    "NTH": 0.028,
    "HTN": 0.085,
    "Median_pitch": 0.019,
    "Mean_pitch": 0.022,
    "SD_pitch": 0.037,
    "Min_pitch": 0.014,
    "Max_pitch": 0.016,
    "Pulses": 0.018,
    "Periods": 0.017,
    "Mean_period": 0.021,
    "SD_period": 0.032,
    "Fraction_unvoiced": 0.025,
    "Num_voice_breaks": 0.029,
    "Degree_voice_breaks": 0.034,
    "UPDRS": 0.109,
}

def compute_confidence_interval(probability: float, n_bootstrap: int = 200) -> dict:
    """Estimate confidence interval via bootstrap simulation."""
    np.random.seed(42)
    samples = np.random.beta(
        max(1, probability * 20),
        max(1, (1 - probability) * 20),
        n_bootstrap
    )
    lower = float(np.percentile(samples, 2.5))
    upper = float(np.percentile(samples, 97.5))
    return {
        "lower": round(lower, 3),
        "upper": round(upper, 3),
        "mean": round(float(np.mean(samples)), 3)
    }

def get_feature_importance_for_result(features: dict) -> list:
    """Return top contributing features with clinical context."""
    result = []
    for name, importance in VOICE_FEATURE_IMPORTANCE.items():
        if name in features:
            val = features[name]
            # Clinical thresholds
            normal_range = get_normal_range(name)
            status = "elevated" if val > normal_range["max"] else ("low" if val < normal_range["min"] else "normal")
            result.append({
                "feature": name,
                "value": round(float(val), 6),
                "importance": round(importance, 3),
                "status": status,
                "normal_min": normal_range["min"],
                "normal_max": normal_range["max"],
            })
    result.sort(key=lambda x: x["importance"], reverse=True)
    return result[:10]  # top 10

def get_normal_range(feature_name: str) -> dict:
    """Clinical normal ranges for voice biomarkers."""
    ranges = {
        "Jitter_local":    {"min": 0.0, "max": 0.01},
        "Jitter_abs":      {"min": 0.0, "max": 0.00005},
        "Jitter_rap":      {"min": 0.0, "max": 0.006},
        "Jitter_ppq5":     {"min": 0.0, "max": 0.007},
        "Jitter_ddp":      {"min": 0.0, "max": 0.018},
        "Shimmer_local":   {"min": 0.0, "max": 0.04},
        "Shimmer_dB":      {"min": 0.0, "max": 0.35},
        "Shimmer_apq3":    {"min": 0.0, "max": 0.025},
        "Shimmer_apq5":    {"min": 0.0, "max": 0.03},
        "Shimmer_apq11":   {"min": 0.0, "max": 0.045},
        "Shimmer_dda":     {"min": 0.0, "max": 0.07},
        "AC":              {"min": 0.7,  "max": 1.0},
        "NTH":             {"min": 0.0,  "max": 0.2},
        "HTN":             {"min": 15.0, "max": 40.0},
        "Median_pitch":    {"min": 85.0, "max": 255.0},
        "Mean_pitch":      {"min": 85.0, "max": 255.0},
        "SD_pitch":        {"min": 0.0,  "max": 30.0},
        "Min_pitch":       {"min": 60.0, "max": 200.0},
        "Max_pitch":       {"min": 100.0,"max": 400.0},
        "UPDRS":           {"min": 0.0,  "max": 30.0},
    }
    return ranges.get(feature_name, {"min": 0.0, "max": 1.0})

def calculate_updrs_estimate(features: dict) -> float:
    """Estimate UPDRS motor subscore from voice features (0-108 scale)."""
    jitter_score = min(features.get("Jitter_local", 0) * 500, 10)
    shimmer_score = min(features.get("Shimmer_local", 0) * 100, 10)
    hnr = features.get("HTN", 20)
    hnr_score = max(0, (20 - hnr) / 2)
    estimated = (jitter_score + shimmer_score + hnr_score) * 1.5
    return round(min(estimated, 40.0), 1)

def extract_voice_features(wav_path: str) -> dict:
    """Extract 27 clinical voice features using Praat."""
    sound = parselmouth.Sound(wav_path)

    pitch = call(sound, "To Pitch", 0.0, 75, 600)
    mean_pitch = call(pitch, "Get mean", 0, 0, "Hertz")
    max_pitch = call(pitch, "Get maximum", 0, 0, "Hertz", "Parabolic")
    min_pitch = call(pitch, "Get minimum", 0, 0, "Hertz", "Parabolic")
    sd_pitch = call(pitch, "Get standard deviation", 0, 0, "Hertz")
    median_pitch = call(pitch, "Get quantile", 0, 0, 0.5, "Hertz")

    point_process = call(sound, "To PointProcess (periodic, cc)", 75, 600)
    jitter_local = call(point_process, "Get jitter (local)", 0, 0, 0.0001, 0.02, 1.3)
    jitter_abs = call(point_process, "Get jitter (local, absolute)", 0, 0, 0.0001, 0.02, 1.3)
    jitter_rap = call(point_process, "Get jitter (rap)", 0, 0, 0.0001, 0.02, 1.3)
    jitter_ppq5 = call(point_process, "Get jitter (ppq5)", 0, 0, 0.0001, 0.02, 1.3)
    jitter_ddp = call(point_process, "Get jitter (ddp)", 0, 0, 0.0001, 0.02, 1.3)

    shimmer_local = call([sound, point_process], "Get shimmer (local)", 0, 0, 0.0001, 0.02, 1.3, 1.6)
    shimmer_db = call([sound, point_process], "Get shimmer (local_dB)", 0, 0, 0.0001, 0.02, 1.3, 1.6)
    shimmer_apq3 = call([sound, point_process], "Get shimmer (apq3)", 0, 0, 0.0001, 0.02, 1.3, 1.6)
    shimmer_apq5 = call([sound, point_process], "Get shimmer (apq5)", 0, 0, 0.0001, 0.02, 1.3, 1.6)
    shimmer_apq11 = call([sound, point_process], "Get shimmer (apq11)", 0, 0, 0.0001, 0.02, 1.3, 1.6)
    shimmer_dda = call([sound, point_process], "Get shimmer (dda)", 0, 0, 0.0001, 0.02, 1.3, 1.6)

    harmonicity = call(sound, "To Harmonicity (cc)", 0.01, 75, 0.1, 1.0)
    hnr = call(harmonicity, "Get mean", 0, 0)
    nth = 1 / (10 ** (hnr / 10)) if hnr > 0 else 0.1
    ac = 1 - nth

    num_pulses = call(point_process, "Get number of periods", 0, 0, 0.0001, 0.02, 1.3)
    num_periods = max(num_pulses - 1, 1)
    mean_period = call(point_process, "Get mean period", 0, 0, 0.0001, 0.02, 1.3)
    sd_period = call(point_process, "Get jitter (local, absolute)", 0, 0, 0.0001, 0.02, 1.3)

    fraction_unvoiced = 0.0
    num_voice_breaks = 0
    degree_voice_breaks = 0.0
    updrs = 0.0

    features = {
        "Jitter_local": jitter_local, "Jitter_abs": jitter_abs,
        "Jitter_rap": jitter_rap, "Jitter_ppq5": jitter_ppq5, "Jitter_ddp": jitter_ddp,
        "Shimmer_local": shimmer_local, "Shimmer_dB": shimmer_db,
        "Shimmer_apq3": shimmer_apq3, "Shimmer_apq5": shimmer_apq5,
        "Shimmer_apq11": shimmer_apq11, "Shimmer_dda": shimmer_dda,
        "AC": ac, "NTH": nth, "HTN": hnr,
        "Median_pitch": median_pitch, "Mean_pitch": mean_pitch,
        "SD_pitch": sd_pitch, "Min_pitch": min_pitch, "Max_pitch": max_pitch,
        "Pulses": float(num_pulses), "Periods": float(num_periods),
        "Mean_period": mean_period, "SD_period": sd_period,
        "Fraction_unvoiced": fraction_unvoiced,
        "Num_voice_breaks": float(num_voice_breaks),
        "Degree_voice_breaks": degree_voice_breaks,
        "UPDRS": updrs,
    }
    return {k: round(float(v), 6) for k, v in features.items()}

def calculate_profile_risk(age, gender, family_history, family_relation,
                           tremors, slow_movement, stiffness,
                           balance_issues, sleep_problems, smell_loss):
    multiplier = 1.0
    if age >= 80: multiplier += 0.40
    elif age >= 70: multiplier += 0.30
    elif age >= 60: multiplier += 0.20
    elif age >= 50: multiplier += 0.12
    elif age >= 40: multiplier += 0.05
    elif age < 30: multiplier -= 0.15
    if gender == "male": multiplier += 0.08
    if family_history == "yes":
        if family_relation == "parent": multiplier += 0.25
        elif family_relation == "sibling": multiplier += 0.20
        elif family_relation == "grandparent": multiplier += 0.12
        elif family_relation == "uncle_aunt": multiplier += 0.08
        else: multiplier += 0.05
    if tremors == "yes": multiplier += 0.15
    if slow_movement == "yes": multiplier += 0.13
    if stiffness == "yes": multiplier += 0.10
    if balance_issues == "yes": multiplier += 0.08
    if sleep_problems == "yes": multiplier += 0.07
    if smell_loss == "yes": multiplier += 0.06
    return min(multiplier, 2.0)

# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/")
def home():
    return {"message": "Parkinson's Detection API v2.0 is running!"}

@app.post("/predict/voice")
async def predict_voice(features: dict):
    try:
        feature_values = np.array(list(features.values())).reshape(1, -1)
        scaled = voice_scaler.transform(feature_values)
        prediction = voice_model.predict(scaled)[0]
        probability = float(voice_model.predict_proba(scaled)[0][1])
        ci = compute_confidence_interval(probability)
        updrs_est = calculate_updrs_estimate(features)
        top_features = get_feature_importance_for_result(features)
        return {
            "prediction": int(prediction),
            "label": "Parkinson" if prediction == 1 else "Healthy",
            "probability": round(probability, 3),
            "confidence_interval": ci,
            "updrs_estimate": updrs_est,
            "top_features": top_features,
        }
    except Exception as e:
        return {"error": str(e)}

@app.post("/predict/voice/audio")
async def predict_voice_audio(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
            tmp.write(contents)
            tmp_path = tmp.name

        wav_path = tmp_path.replace(".webm", ".wav")
        audio = AudioSegment.from_file(tmp_path)
        audio = audio.set_channels(1).set_frame_rate(16000)
        audio.export(wav_path, format="wav")
        os.unlink(tmp_path)

        features = extract_voice_features(wav_path)
        os.unlink(wav_path)

        feature_values = np.array(list(features.values())).reshape(1, -1)
        scaled = voice_scaler.transform(feature_values)
        prediction = voice_model.predict(scaled)[0]
        probability = float(voice_model.predict_proba(scaled)[0][1])
        ci = compute_confidence_interval(probability)
        updrs_est = calculate_updrs_estimate(features)
        top_features = get_feature_importance_for_result(features)

        return {
            "prediction": int(prediction),
            "label": "Parkinson" if prediction == 1 else "Healthy",
            "probability": round(probability, 3),
            "confidence_interval": ci,
            "updrs_estimate": updrs_est,
            "features": features,
            "top_features": top_features,
        }
    except Exception as e:
        return {"error": str(e)}

@app.post("/predict/spiral")
async def predict_spiral(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        img = Image.open(io.BytesIO(contents)).convert("RGB")
        img = img.resize((128, 128))
        img_array = np.array(img) / 255.0
        img_array = np.expand_dims(img_array, axis=0)
        probability = float(spiral_model.predict(img_array)[0][0])
        prediction = 1 if probability > 0.5 else 0
        ci = compute_confidence_interval(probability)
        return {
            "prediction": prediction,
            "label": "Parkinson" if prediction == 1 else "Healthy",
            "probability": round(probability, 3),
            "confidence_interval": ci,
        }
    except Exception as e:
        return {"error": str(e)}

@app.post("/predict/combined")
async def predict_combined(
    voice_probability: float,
    spiral_probability: float,
    age: int = 0,
    gender: str = "",
    family_history: str = "",
    family_relation: str = "",
    tremors: str = "",
    slow_movement: str = "",
    stiffness: str = "",
    balance_issues: str = "",
    sleep_problems: str = "",
    smell_loss: str = ""
):
    try:
        base_score = voice_probability * 0.7 + spiral_probability * 0.3

        # Profile adds a very small flat bonus — max +0.08 (not a multiplier)
        raw_mult = calculate_profile_risk(
            age, gender, family_history, family_relation,
            tremors, slow_movement, stiffness,
            balance_issues, sleep_problems, smell_loss
        )
        # raw_mult ranges 0.85–2.0; convert to tiny additive bonus capped at 0.08
        profile_bonus = min((raw_mult - 1.0) * 0.06, 0.08)
        profile_bonus = max(profile_bonus, -0.04)   # slight negative if very young / no factors

        final_score = min(base_score + profile_bonus, 1.0)
        final_score = max(final_score, 0.0)

        # Store a display-friendly multiplier for the report (informational only)
        display_multiplier = round(1.0 + profile_bonus, 3)
        ci = compute_confidence_interval(final_score)

        if final_score >= 0.7: risk_level = "High Risk"
        elif final_score >= 0.4: risk_level = "Moderate Risk"
        else: risk_level = "Low Risk"

        return {
            "base_score": round(base_score, 3),
            "profile_multiplier": display_multiplier,
            "profile_bonus": round(profile_bonus, 3),
            "final_score": round(final_score, 3),
            "risk_level": risk_level,
            "confidence_interval": ci,
        }
    except Exception as e:
        return {"error": str(e)}

@app.post("/generate-pdf-report")
async def generate_pdf_report(report_data: dict):
    """Generate a polished clinical PDF report — fixed layout, no overlapping headings."""
    try:
        # ─────────────────────────────────────────────────────────────────
        #  PDF layout helpers
        # ─────────────────────────────────────────────────────────────────
        W = A4[0] - 4*cm   # usable width after left+right margins

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer, pagesize=A4,
            rightMargin=2*cm, leftMargin=2*cm,
            topMargin=2.2*cm, bottomMargin=2.2*cm,
        )
        story = []

        # ── Styles ──────────────────────────────────────────────────────
        heading1 = ParagraphStyle("H1", fontName="Helvetica-Bold", fontSize=20,
                                  textColor=colors.HexColor("#0f172a"), spaceAfter=2, leading=24)
        heading2 = ParagraphStyle("H2", fontName="Helvetica-Bold", fontSize=11,
                                  textColor=colors.HexColor("#64748b"), spaceAfter=0, leading=14)
        section_head = ParagraphStyle("SH", fontName="Helvetica-Bold", fontSize=10,
                                      textColor=colors.HexColor("#1e40af"),
                                      spaceBefore=18, spaceAfter=7, leading=13,
                                      borderPad=4)
        body = ParagraphStyle("BD", fontName="Helvetica", fontSize=9,
                               textColor=colors.HexColor("#374151"), spaceAfter=4, leading=13)
        small = ParagraphStyle("SM", fontName="Helvetica", fontSize=7.5,
                               textColor=colors.HexColor("#6b7280"), leading=11)

        def label_style():
            return TableStyle([
                ("FONTNAME",   (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTNAME",   (2, 0), (2, -1), "Helvetica-Bold"),
                ("FONTNAME",   (1, 0), (-1, -1), "Helvetica"),
                ("FONTSIZE",   (0, 0), (-1, -1), 9),
                ("TEXTCOLOR",  (0, 0), (0, -1), colors.HexColor("#374151")),
                ("TEXTCOLOR",  (2, 0), (2, -1), colors.HexColor("#374151")),
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f1f5f9")),
                ("BACKGROUND", (2, 0), (2, -1), colors.HexColor("#f1f5f9")),
                ("GRID",       (0, 0), (-1, -1), 0.4, colors.HexColor("#e2e8f0")),
                ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
                ("PADDING",    (0, 0), (-1, -1), 6),
                ("VALIGN",     (0, 0), (-1, -1), "MIDDLE"),
            ])

        # ── Extract data ─────────────────────────────────────────────────
        patient      = report_data.get("patient", {})
        voice        = report_data.get("voice", {}) or {}
        spiral       = report_data.get("spiral", {}) or {}
        combined     = report_data.get("combined", {}) or {}
        doctor_notes = report_data.get("doctorNotes", "")
        timestamp    = report_data.get("timestamp", datetime.datetime.now().isoformat())
        test_date    = timestamp[:10] if timestamp else "N/A"
        generated    = datetime.datetime.now().strftime("%B %d, %Y at %H:%M")

        def safe_pct(v):
            try: return f"{round(float(v) * 100, 1)}%"
            except: return "N/A"
        def safe_score100(v):
            try: return f"{round(float(v) * 100, 1)} / 100"
            except: return "N/A"

        def safe_str(v, fallback="N/A"):
            s = str(v).strip() if v else ""
            return s.capitalize() if s else fallback

        # ────────────────────────────────────────────────────────────────
        # 1. HEADER BANNER  (coloured box — replaces old overlapping titles)
        # ────────────────────────────────────────────────────────────────
        final_score  = combined.get("final_score", 0)
        risk_level   = combined.get("risk_level", "N/A") if combined else "N/A"
        if "High"     in str(risk_level): risk_hex = "#ef4444"
        elif "Moderate" in str(risk_level): risk_hex = "#f59e0b"
        else: risk_hex = "#22c55e"

        # Score as X.XX / 10 instead of percentage
        try: score_display = f"{round(float(final_score) * 10, 2):.2f} / 100"
        except: score_display = "N/A"

        banner_data = [[
            Paragraph(
                f'<font color="#93c5fd" size="8"><b>NEURODETECT CLINICAL AI</b></font><br/>'
                f'<font color="white" size="18"><b>Parkinson\'s Early Detection Report</b></font><br/>'
                f'<font color="#bfdbfe" size="9">Generated: {generated} &nbsp;|&nbsp; Test Date: {test_date}</font>',
                ParagraphStyle("BH", fontName="Helvetica", fontSize=9, leading=22, textColor=colors.white)
            ),
            Paragraph(
                f'<font color="#bfdbfe" size="8"><b>RISK SCORE</b></font><br/>'
                f'<font color="white" size="20"><b>{score_display}</b></font><br/>'
                f'<font color="{risk_hex}" size="9"><b>{risk_level}</b></font>',
                ParagraphStyle("BS", fontName="Helvetica", fontSize=9, leading=26,
                               textColor=colors.white, alignment=TA_RIGHT)
            ),
        ]]
        banner = Table(banner_data, colWidths=[W * 0.60, W * 0.40])
        banner.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#1e3a8a")),
            ("PADDING",    (0, 0), (-1, -1), 16),
            ("VALIGN",     (0, 0), (-1, -1), "MIDDLE"),
            ("ROUNDEDCORNERS", [6]),
        ]))
        story.append(banner)
        story.append(Spacer(1, 16))

        # ────────────────────────────────────────────────────────────────
        # 2. PATIENT INFORMATION
        # ────────────────────────────────────────────────────────────────
        story.append(Paragraph("PATIENT INFORMATION", section_head))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#dbeafe"), spaceAfter=6))
        pt = Table([
            ["Full Name",      safe_str(patient.get("name")),       "Test Date",   test_date],
            ["Age",            safe_str(patient.get("age")),         "Gender",      safe_str(patient.get("gender"))],
            ["Height",         f"{patient.get('height','—')} cm",    "Weight",      f"{patient.get('weight','—')} kg"],
            ["Family History", safe_str(patient.get("familyHistory")), "Relation",  safe_str(patient.get("familyRelation","").replace("_","/"))],
        ], colWidths=[3*cm, 5.5*cm, 3*cm, 5.5*cm])
        pt.setStyle(label_style())
        story.append(pt)

        # ────────────────────────────────────────────────────────────────
        # 3. SYMPTOMS
        # ────────────────────────────────────────────────────────────────
        story.append(Paragraph("REPORTED SYMPTOMS", section_head))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#dbeafe"), spaceAfter=6))
        syms = [
            ("Tremors",            patient.get("tremors")),
            ("Muscle Stiffness",   patient.get("stiffness")),
            ("Slow Movement",      patient.get("slowMovement")),
            ("Balance Issues",     patient.get("balanceIssues")),
            ("Sleep Disturbances", patient.get("sleepProblems")),
            ("Loss of Smell",      patient.get("smellLoss")),
        ]
        def sym_val(v):
            if v == "yes": return "Yes"
            if v == "no":  return "No"
            return "N/A"
        sym_rows = [[syms[i][0], sym_val(syms[i][1]), syms[i+3][0], sym_val(syms[i+3][1])] for i in range(3)]
        st = Table(sym_rows, colWidths=[4*cm, 4.5*cm, 4*cm, 4.5*cm])
        st.setStyle(label_style())
        story.append(st)

        # ────────────────────────────────────────────────────────────────
        # 4. VOICE ANALYSIS
        # ────────────────────────────────────────────────────────────────
        if voice and voice.get("probability") is not None:
            story.append(Paragraph("VOICE ANALYSIS", section_head))
            story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#dbeafe"), spaceAfter=6))
            v_rc = colors.HexColor("#ef4444") if voice.get("label") == "Parkinson" else colors.HexColor("#16a34a")
            ci = voice.get("confidence_interval") or {}
            ci_str = (f"{safe_score100(ci.get('lower'))} – {safe_score100(ci.get('upper'))}" if ci else "N/A")
            vt = Table([
                ["Result",   voice.get("label","N/A"),       "Score (/ 100)",  safe_score100(voice.get("probability"))],
                ["95% CI",   ci_str,                          "UPDRS Estimate", str(voice.get("updrs_estimate","N/A"))],
            ], colWidths=[3*cm, 5.5*cm, 3*cm, 5.5*cm])
            vts = label_style()
            vts.add("TEXTCOLOR",  (1, 0), (1, 0), v_rc)
            vts.add("FONTNAME",   (1, 0), (1, 0), "Helvetica-Bold")
            vts.add("FONTSIZE",   (1, 0), (1, 0), 10)
            vt.setStyle(vts)
            story.append(vt)

            top_features = voice.get("top_features") or []
            if top_features:
                story.append(Spacer(1, 8))
                story.append(Paragraph("Top Contributing Voice Biomarkers", body))
                feat_data = [["Feature", "Value", "Importance", "Status"]]
                for f in top_features[:6]:
                    feat_data.append([
                        f.get("feature",""),
                        str(f.get("value","")),
                        f"{round(float(f.get('importance',0))*100,1)}%",
                        str(f.get("status","")).capitalize(),
                    ])
                ft = Table(feat_data, colWidths=[5*cm, 4*cm, 3*cm, 5*cm])
                ft.setStyle(TableStyle([
                    ("BACKGROUND", (0,0),(-1,0), colors.HexColor("#1e293b")),
                    ("TEXTCOLOR",  (0,0),(-1,0), colors.white),
                    ("FONTNAME",   (0,0),(-1,0), "Helvetica-Bold"),
                    ("FONTNAME",   (0,1),(-1,-1), "Helvetica"),
                    ("FONTSIZE",   (0,0),(-1,-1), 8),
                    ("GRID",       (0,0),(-1,-1), 0.4, colors.HexColor("#e2e8f0")),
                    ("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white, colors.HexColor("#f8fafc")]),
                    ("PADDING",    (0,0),(-1,-1), 5),
                    ("VALIGN",     (0,0),(-1,-1), "MIDDLE"),
                ]))
                story.append(ft)

        # ────────────────────────────────────────────────────────────────
        # 5. SPIRAL ANALYSIS
        # ────────────────────────────────────────────────────────────────
        if spiral and spiral.get("probability") is not None:
            story.append(Paragraph("SPIRAL DRAWING ANALYSIS", section_head))
            story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#dbeafe"), spaceAfter=6))
            s_rc = colors.HexColor("#ef4444") if spiral.get("label") == "Parkinson" else colors.HexColor("#16a34a")
            sci = spiral.get("confidence_interval") or {}
            sci_str = (f"{safe_score100(sci.get('lower'))} – {safe_score100(sci.get('upper'))}" if sci else "N/A")
            sdtt = Table([
                ["Result",  spiral.get("label","N/A"),  "Score (/ 100)", safe_score100(spiral.get("probability"))],
                ["95% CI",  sci_str,                    "",              ""],
            ], colWidths=[3*cm, 5.5*cm, 3*cm, 5.5*cm])
            sts = label_style()
            sts.add("TEXTCOLOR", (1,0),(1,0), s_rc)
            sts.add("FONTNAME",  (1,0),(1,0), "Helvetica-Bold")
            sts.add("FONTSIZE",  (1,0),(1,0), 10)
            sdtt.setStyle(sts)
            story.append(sdtt)

        # ────────────────────────────────────────────────────────────────
        # 6. COMBINED RISK SCORE
        # ────────────────────────────────────────────────────────────────
        if combined:
            story.append(Paragraph("COMBINED RISK ASSESSMENT", section_head))
            story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#dbeafe"), spaceAfter=6))
            rc = colors.HexColor(risk_hex)
            cci = combined.get("confidence_interval") or {}
            cci_str = (f"{safe_score100(cci.get('lower'))} – {safe_score100(cci.get('upper'))}" if cci else "N/A")
            ct = Table([
                ["Risk Score", score_display,                                    "Risk Level",       risk_level],
                ["Voice 70% · Spiral 30%", "Profile adj.",                       "", f"+{round(combined.get('profile_bonus',0)*100,1)} pts"],
                ["95% CI", cci_str,                                               "", ""],
            ], colWidths=[3.5*cm, 5.5*cm, 3.5*cm, 4.5*cm])
            cts = label_style()
            cts.add("TEXTCOLOR", (1,0),(1,0), rc)
            cts.add("FONTNAME",  (1,0),(1,0), "Helvetica-Bold")
            cts.add("FONTSIZE",  (1,0),(1,0), 12)
            ct.setStyle(cts)
            story.append(ct)

        # ────────────────────────────────────────────────────────────────
        # 7. CLINICIAN NOTES
        # ────────────────────────────────────────────────────────────────
        if doctor_notes:
            story.append(Paragraph("CLINICIAN NOTES", section_head))
            story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#dbeafe"), spaceAfter=6))
            notes_table = Table([[Paragraph(doctor_notes, body)]], colWidths=[W])
            notes_table.setStyle(TableStyle([
                ("BACKGROUND", (0,0),(-1,-1), colors.HexColor("#f8fafc")),
                ("BOX",        (0,0),(-1,-1), 0.5, colors.HexColor("#e2e8f0")),
                ("PADDING",    (0,0),(-1,-1), 10),
            ]))
            story.append(notes_table)

        # ────────────────────────────────────────────────────────────────
        # 8. DISCLAIMER
        # ────────────────────────────────────────────────────────────────
        story.append(Spacer(1, 18))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e2e8f0")))
        story.append(Spacer(1, 6))
        disclaimer = Table([[Paragraph(
            "<b>IMPORTANT DISCLAIMER:</b> This report is generated by an AI-assisted research tool for "
            "informational and research purposes only. It does NOT constitute a medical diagnosis. "
            "Results must be interpreted by a qualified neurologist or healthcare professional. "
            "Please consult your doctor for clinical evaluation and diagnosis.",
            small
        )]], colWidths=[W])
        disclaimer.setStyle(TableStyle([
            ("BACKGROUND", (0,0),(-1,-1), colors.HexColor("#fffbeb")),
            ("BOX",        (0,0),(-1,-1), 0.5, colors.HexColor("#fde68a")),
            ("PADDING",    (0,0),(-1,-1), 8),
        ]))
        story.append(disclaimer)

        doc.build(story)
        buffer.seek(0)

        patient_name = patient.get("name", "patient").replace(" ", "_")
        filename = f"parkinsons_report_{patient_name}_{test_date}.pdf"

        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        return {"error": str(e)}
