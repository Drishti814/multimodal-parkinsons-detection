# 🧠 NeuroDetect — Parkinson's Early Detection Platform

<div align="center">

![NeuroDetect Banner](https://img.shields.io/badge/NeuroDetect-Clinical%20AI-1e40af?style=for-the-badge&logo=brain&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.9+-3776ab?style=for-the-badge&logo=python&logoColor=white)
![React](https://img.shields.io/badge/React-18-61dafb?style=for-the-badge&logo=react&logoColor=black)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![TensorFlow](https://img.shields.io/badge/TensorFlow-2.x-ff6f00?style=for-the-badge&logo=tensorflow&logoColor=white)

**An AI-powered, multi-modal screening platform for early detection of Parkinson's disease using voice biomarker analysis, spiral drawing assessment, and clinical risk profiling.**

> ⚠️ **Disclaimer:** This is a research and screening tool only. It does not constitute a medical diagnosis. All results must be interpreted by a qualified neurologist or healthcare professional.

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [How It Works](#-how-it-works)
- [API Endpoints](#-api-endpoints)
- [Installation & Setup](#-installation--setup)
- [Usage Guide](#-usage-guide)
- [Scoring System](#-scoring-system)
- [Clinical Background](#-clinical-background)
- [Screenshots](#-screenshots)

---

## 🔬 Overview

NeuroDetect is a full-stack clinical AI application that combines three independent modalities to generate a comprehensive Parkinson's disease risk score:

| Modality | Weight | Method |
|---|---|---|
| 🎙️ Voice Analysis | **70%** | Acoustic biomarker extraction via Praat |
| 🌀 Spiral Drawing | **30%** | CNN-based motor tremor classification |
| 👤 Clinical Profile | additive | Demographic & symptom risk adjustment (max ±8 pts) |

The platform is designed to assist clinicians in early-stage screening, tracking patient risk over time, and generating structured clinical PDF reports.

---

## ✨ Features

### Assessment
- **Voice Recording & Upload** — Record live audio or upload `.wav/.mp3/.webm/.ogg` files; audio preview with one-click remove
- **Spiral Drawing Canvas** — Draw directly on an interactive canvas with smooth bezier curves, or upload an existing spiral image with preview and remove option
- **Patient Profile Form** — Collects age, gender, height, weight, family history, and 6 clinical symptoms
- **Step-by-step workflow** — Profile → Voice → Spiral → Final Analysis
- **Manual Final Analysis** — Explicit "Run Final Analysis" button to compute and save the combined score

### Results
- **Combined Risk Score** out of 100 with 95% confidence interval
- **Risk classification** — Low / Moderate / High Risk
- **Voice biomarker breakdown** — top contributing features with importance weights and clinical status
- **UPDRS Motor Score estimate** — mapped from acoustic features
- **Clinician notes** field for observations and follow-up plan

### History & Tracking
- **Patient-grouped history** — sessions organized by patient name, collapsible groups
- **Risk trend chart** — visual bar chart of last 10 sessions
- **Delta tracking** — change vs previous session shown per entry
- **Reload session** — click any past session to reload it into the assessment form
- **Reassess patient** — keeps profile data, clears voice and spiral for a fresh measurement

### Reporting
- **In-app report page** — auto-populated after final analysis with full structured layout
- **Print support** — optimized print styles for clean paper output
- **PDF download** — professional clinical PDF with colored header banner, patient info, symptom table, voice biomarker table, spiral results, combined score, and clinician notes

### UX
- Sticky navbar with scroll-aware background
- Mobile-responsive with bottom tab navigation
- New Assessment button for full reset
- Green outline on completed analysis steps
- Amber CTA when changes detected after analysis

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 18 + Vite | UI framework and build tool |
| Plain CSS (CSS variables) | Design system and theming |
| Axios | API communication |
| HTML5 Canvas API | Spiral drawing |
| Web Audio API / MediaRecorder | Live voice recording |
| Plus Jakarta Sans + Inter | Typography |

### Backend
| Technology | Purpose |
|---|---|
| FastAPI | REST API framework |
| scikit-learn | Voice classification model (`.pkl`) |
| TensorFlow / Keras | Spiral CNN model (`.keras`) |
| Parselmouth (Praat) | Acoustic feature extraction |
| pydub | Audio format conversion |
| ReportLab | PDF generation |
| NumPy | Feature processing and bootstrap CI |
| Pillow | Spiral image preprocessing |

---

## 📁 Project Structure

```
parkinsons-detection/
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Main application (all pages + state)
│   │   ├── main.tsx             # React entry point
│   │   ├── index.css            # Global base styles
│   │   ├── components/
│   │   │   ├── layout/          # Navbar, Footer, PageLayout
│   │   │   └── ui/              # shadcn/ui component library
│   │   ├── hooks/               # use-toast, use-mobile
│   │   └── lib/utils.ts         # Utility functions
│   ├── public/                  # Static assets
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── package.json
│
├── backend/
│   ├── app.py                   # FastAPI application
│   ├── requirements.txt         # Python dependencies
│   └── models/                  # ← Place your trained models here
│       ├── voice_model.pkl      # Trained scikit-learn classifier
│       ├── voice_scaler.pkl     # Feature scaler
│       └── spiral_model.keras   # Trained Keras CNN
│
└── README.md
```

---

## ⚙️ How It Works

### 1. Voice Analysis Pipeline

```
Audio Input (.webm/.wav/.mp3)
        ↓
  pydub converts to 16kHz mono WAV
        ↓
  Parselmouth (Praat) extracts 27 acoustic features:
  • Jitter (local, abs, rap, ppq5, ddp)       ← pitch perturbation
  • Shimmer (local, dB, apq3, apq5, apq11, dda) ← amplitude perturbation
  • HNR / NTH / AC                             ← noise-to-harmonics ratio
  • Pitch statistics (mean, median, SD, min, max)
  • Period statistics, voice breaks, UPDRS
        ↓
  StandardScaler normalization
        ↓
  scikit-learn classifier → probability score
        ↓
  Bootstrap confidence interval (n=200 samples)
  UPDRS motor score estimate
  Top feature importance with clinical status
```

### 2. Spiral Drawing Pipeline

```
Canvas drawing OR uploaded image
        ↓
  Exported as PNG blob
        ↓
  Pillow resizes to 128×128 RGB
        ↓
  Pixel values normalized to [0, 1]
        ↓
  Keras CNN → probability score
        ↓
  Bootstrap confidence interval
```

### 3. Combined Score Calculation

```
final_score = (voice_prob × 0.70) + (spiral_prob × 0.30) + profile_bonus

profile_bonus = clamp((raw_multiplier - 1.0) × 0.06, min=-0.04, max=+0.08)

Risk level:
  ≥ 70 / 100  →  High Risk
  40–69 / 100 →  Moderate Risk
  < 40 / 100  →  Low Risk
```

The profile adjustment is intentionally small (max ±8 points) so that the objective acoustic and motor measurements dominate the score.

### 4. Profile Risk Factors

| Factor | Additive weight |
|---|---|
| Age 60–69 | +0.20 |
| Age 70–79 | +0.30 |
| Age ≥ 80 | +0.40 |
| Male gender | +0.08 |
| Parent with Parkinson's | +0.25 |
| Sibling with Parkinson's | +0.20 |
| Tremors | +0.15 |
| Slow movement | +0.13 |
| Muscle stiffness | +0.10 |
| Balance issues | +0.08 |
| Sleep disturbances | +0.07 |
| Loss of smell | +0.06 |

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `POST` | `/predict/voice` | Predict from pre-extracted features (JSON) |
| `POST` | `/predict/voice/audio` | Predict from raw audio file upload |
| `POST` | `/predict/spiral` | Predict from spiral image upload |
| `POST` | `/predict/combined` | Compute combined risk score from query params |
| `POST` | `/generate-pdf-report` | Generate and return clinical PDF |

### Example: Combined Score Request

```http
POST /predict/combined?voice_probability=0.15&spiral_probability=0.35&age=60&gender=female&tremors=yes
```

### Example: Combined Score Response

```json
{
  "base_score": 0.210,
  "profile_multiplier": 1.012,
  "profile_bonus": 0.012,
  "final_score": 0.222,
  "risk_level": "Low Risk",
  "confidence_interval": {
    "lower": 0.089,
    "upper": 0.401,
    "mean": 0.231
  }
}
```

---

## 🚀 Installation & Setup

### Prerequisites

- **Node.js** v18+ and npm
- **Python** 3.9+
- Trained model files (see below)

### 1. Clone the repository

```bash
git clone https://github.com/your-username/parkinsons-detection.git
cd parkinsons-detection
```

### 2. Place model files

Copy your trained models into `backend/models/`:

```
backend/models/
├── voice_model.pkl      # scikit-learn classifier
├── voice_scaler.pkl     # StandardScaler
└── spiral_model.keras   # Keras CNN
```

### 3. Backend setup

```bash
cd backend
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8002 --reload
```

Backend runs at: `http://127.0.0.1:8002`

### 4. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: `http://localhost:8080`

---

## 📖 Usage Guide

### Running a Full Assessment

1. **Home page** → Click "Start New Assessment"
2. **Step 1 — Patient Profile** → Fill in name, age, gender, height, weight, family history, and current symptoms
3. **Step 2 — Voice Analysis** → Click "Start Recording", sustain "Aaaaah" for 5–7 seconds, stop, then click **Analyse Voice**. Alternatively upload a `.wav`/`.mp3` file.
4. **Step 3 — Spiral Drawing** → Draw a spiral from center outward on the canvas, or upload an image. Click **Analyse Spiral**.
5. **Step 4** → Once both analyses show ✓ Done, click **🧠 Run Final Analysis**
6. Results appear as a combined score panel below
7. Add clinician notes, then **Download PDF** or **View Report**

### Viewing History

- Navigate to **History** tab
- Sessions are grouped by patient name
- Click any session row to reload it
- Click **🔁 Reassess** on a patient group to keep their profile and start fresh voice/spiral analysis

### Downloading Reports

- After final analysis → **⬇️ Download PDF** button
- Or navigate to **Report** tab → Download PDF from there
- For print: use **🖨️ Print** button (optimized print CSS applied)

---

## 📊 Scoring System

All scores are displayed as **X.X / 100** throughout the application.

| Display | Meaning |
|---|---|
| Voice Score | Raw classifier probability × 100 |
| Spiral Score | Raw CNN probability × 100 |
| 95% CI | Bootstrap confidence interval (200 samples) |
| Combined Score | Weighted sum + profile bonus, × 100 |
| Profile adj. | Flat additive adjustment shown in pts |
| UPDRS Estimate | Motor sub-score estimated from jitter/shimmer/HNR |

---

## 🏥 Clinical Background

### Why Voice Analysis?

Parkinson's disease affects the muscles controlling speech. Common acoustic markers include:

- **Jitter** — cycle-to-cycle variation in pitch frequency; elevated in PD due to tremor
- **Shimmer** — cycle-to-cycle variation in amplitude; increased in PD
- **HNR (Harmonics-to-Noise Ratio)** — reduced in PD due to breathiness and roughness
- **UPDRS** — Unified Parkinson's Disease Rating Scale; motor sub-score estimated from voice

### Why Spiral Drawing?

The spiral drawing test is a standard neurological screening tool. Parkinson's patients exhibit:

- Irregular stroke width and spacing
- Tremor-induced jagged edges
- Reduced amplitude and speed

A CNN trained on spiral images classifies drawings as Healthy or Parkinson-like.

### Clinical References

- Tsanas et al. (2010) — *Accurate telemonitoring of Parkinson's disease progression by non-invasive speech tests* — IEEE TNSRE
- Zham et al. (2017) — *Distinguishing Different Stages of Parkinson's Disease Using Composite Index of Speed and Pen-Pressure of Handwriting* — Frontiers in Neurology
- UCI ML Repository — [Parkinson's Disease Dataset](https://archive.ics.uci.edu/ml/datasets/parkinsons)

---

## 🖼 Screenshots

| Page | Description |
|---|---|
| Home | Hero page with platform stats and CTA |
| Assessment | Step-by-step form with voice recording, spiral canvas, and profile |
| Results | Combined score panel with confidence interval and breakdown |
| History | Patient-grouped sessions with trend chart |
| Report | Full structured clinical report |
| PDF | Downloadable report with colored header and biomarker table |

---

## 📦 Dependencies

### Backend (`requirements.txt`)

```
fastapi
uvicorn
numpy
scikit-learn
tensorflow
pillow
joblib
parselmouth
pydub
reportlab
python-multipart
```

### Frontend (`package.json` key deps)

```
react, react-dom
vite
axios
typescript
tailwindcss
```

---

## 🔒 Privacy & Ethics

- No patient data is stored on any server — all processing happens locally
- Audio files are converted, processed, and immediately deleted from disk
- The application is intended for research and clinical decision support only
- Not a replacement for clinical diagnosis by a licensed neurologist

---

## 👩‍💻 Author

**Drishti** — Final Year Project, 2026

---

<div align="center">

Made with ❤️ for early Parkinson's detection research

</div>
