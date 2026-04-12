from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import joblib
import tensorflow as tf
from PIL import Image
import io

app = FastAPI()

# Allow frontend to talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load models once when server starts
voice_model = joblib.load("models/voice_model.pkl")
voice_scaler = joblib.load("models/voice_scaler.pkl")
spiral_model = tf.keras.models.load_model("models/spiral_model.keras")

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
        return {
            "prediction": prediction,
            "label": "Parkinson" if prediction == 1 else "Healthy",
            "probability": round(probability, 2)
        }
    except Exception as e:
        return {"error": str(e)}