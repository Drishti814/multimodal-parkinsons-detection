from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import joblib
import tensorflow as tf
from PIL import Image
import io
import tempfile
import os
import parselmouth
from parselmouth.praat import call
from pydub import AudioSegment

app = FastAPI()

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

def extract_voice_features(wav_path):
    """Extract 27 clinical voice features using Praat"""
    sound = parselmouth.Sound(wav_path)

    # Extract pitch
    pitch = call(sound, "To Pitch", 0.0, 75, 600)
    mean_pitch = call(pitch, "Get mean", 0, 0, "Hertz")
    max_pitch = call(pitch, "Get maximum", 0, 0, "Hertz", "Parabolic")
    min_pitch = call(pitch, "Get minimum", 0, 0, "Hertz", "Parabolic")
    sd_pitch = call(pitch, "Get standard deviation", 0, 0, "Hertz")
    median_pitch = call(pitch, "Get quantile", 0, 0, 0.5, "Hertz")

    # Extract jitter
    point_process = call(sound, "To PointProcess (periodic, cc)", 75, 600)
    jitter_local = call(point_process, "Get jitter (local)", 0, 0, 0.0001, 0.02, 1.3)
    jitter_abs = call(point_process, "Get jitter (local, absolute)", 0, 0, 0.0001, 0.02, 1.3)
    jitter_rap = call(point_process, "Get jitter (rap)", 0, 0, 0.0001, 0.02, 1.3)
    jitter_ppq5 = call(point_process, "Get jitter (ppq5)", 0, 0, 0.0001, 0.02, 1.3)
    jitter_ddp = call(point_process, "Get jitter (ddp)", 0, 0, 0.0001, 0.02, 1.3)

    # Extract shimmer
    shimmer_local = call([sound, point_process], "Get shimmer (local)", 0, 0, 0.0001, 0.02, 1.3, 1.6)
    shimmer_db = call([sound, point_process], "Get shimmer (local_dB)", 0, 0, 0.0001, 0.02, 1.3, 1.6)
    shimmer_apq3 = call([sound, point_process], "Get shimmer (apq3)", 0, 0, 0.0001, 0.02, 1.3, 1.6)
    shimmer_apq5 = call([sound, point_process], "Get shimmer (apq5)", 0, 0, 0.0001, 0.02, 1.3, 1.6)
    shimmer_apq11 = call([sound, point_process], "Get shimmer (apq11)", 0, 0, 0.0001, 0.02, 1.3, 1.6)
    shimmer_dda = call([sound, point_process], "Get shimmer (dda)", 0, 0, 0.0001, 0.02, 1.3, 1.6)

    # Harmonicity
    harmonicity = call(sound, "To Harmonicity (cc)", 0.01, 75, 0.1, 1.0)
    hnr = call(harmonicity, "Get mean", 0, 0)
    nth = 1 / (10 ** (hnr / 10)) if hnr > 0 else 0.1
    ac = 1 - nth

    # Pulses
    num_pulses = call(point_process, "Get number of periods", 0, 0, 0.0001, 0.02, 1.3)
    num_periods = max(num_pulses - 1, 1)
    mean_period = call(point_process, "Get mean period", 0, 0, 0.0001, 0.02, 1.3)
    sd_period = call(point_process, "Get jitter (local, absolute)", 0, 0, 0.0001, 0.02, 1.3)

    # Voice breaks
    fraction_unvoiced = 0.0
    num_voice_breaks = 0
    degree_voice_breaks = 0.0
    updrs = 0.0

    features = [
        jitter_local, jitter_abs, jitter_rap, jitter_ppq5, jitter_ddp,
        shimmer_local, shimmer_db, shimmer_apq3, shimmer_apq5,
        shimmer_apq11, shimmer_dda,
        ac, nth, hnr,
        median_pitch, mean_pitch, sd_pitch, min_pitch, max_pitch,
        num_pulses, num_periods, mean_period, sd_period,
        fraction_unvoiced, num_voice_breaks, degree_voice_breaks,
        updrs
    ]

    feature_names = [
        "Jitter_local", "Jitter_abs", "Jitter_rap", "Jitter_ppq5", "Jitter_ddp",
        "Shimmer_local", "Shimmer_dB", "Shimmer_apq3", "Shimmer_apq5",
        "Shimmer_apq11", "Shimmer_dda",
        "AC", "NTH", "HTN",
        "Median_pitch", "Mean_pitch", "SD_pitch", "Min_pitch", "Max_pitch",
        "Pulses", "Periods", "Mean_period", "SD_period",
        "Fraction_unvoiced", "Num_voice_breaks", "Degree_voice_breaks",
        "UPDRS"
    ]

    return dict(zip(feature_names, [round(float(f), 6) for f in features]))

@app.get("/")
def home():
    return {"message": "Parkinson's Detection API is running!"}

@app.post("/predict/voice")
async def predict_voice(features: dict):
    try:
        feature_values = np.array(list(features.values())).reshape(1, -1)
        scaled = voice_scaler.transform(feature_values)
        prediction = voice_model.predict(scaled)[0]
        probability = voice_model.predict_proba(scaled)[0][1]
        return {
            "prediction": int(prediction),
            "label": "Parkinson" if prediction == 1 else "Healthy",
            "probability": round(float(probability), 2)
        }
    except Exception as e:
        return {"error": str(e)}

@app.post("/predict/voice/audio")
async def predict_voice_audio(file: UploadFile = File(...)):
    try:
        # Save uploaded audio
        contents = await file.read()
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
            tmp.write(contents)
            tmp_path = tmp.name

        # Convert to wav
        wav_path = tmp_path.replace(".webm", ".wav")
        audio = AudioSegment.from_file(tmp_path)
        audio = audio.set_channels(1).set_frame_rate(16000)
        audio.export(wav_path, format="wav")
        os.unlink(tmp_path)

        # Extract 27 clinical features using Praat
        features = extract_voice_features(wav_path)
        os.unlink(wav_path)

        # Predict
        feature_values = np.array(list(features.values())).reshape(1, -1)
        scaled = voice_scaler.transform(feature_values)
        prediction = voice_model.predict(scaled)[0]
        probability = voice_model.predict_proba(scaled)[0][1]

        return {
            "prediction": int(prediction),
            "label": "Parkinson" if prediction == 1 else "Healthy",
            "probability": round(float(probability), 2),
            "features": features
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
        prediction = 1 if probability > 0.65 else 0
        return {
            "prediction": prediction,
            "label": "Parkinson" if prediction == 1 else "Healthy",
            "probability": round(probability, 2)
        }
    except Exception as e:
        return {"error": str(e)}