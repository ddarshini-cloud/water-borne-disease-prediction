# predict.py
import sys
import joblib
import numpy as np
import json
import os

# Paths to model and scaler (relative to this script)
model_path = '../water_health_model.pkl'
scaler_path = '../scaler.pkl'

try:
    model = joblib.load(model_path)
    scaler = joblib.load(scaler_path)
except Exception as e:
    print(json.dumps({"error": str(e)}))
    sys.exit(1)

def predict(temp, do, ph, turb):
    features = np.array([[temp, do, ph, turb]])
    scaled = scaler.transform(features)
    pred = model.predict(scaled)[0]
    proba = model.predict_proba(scaled)[0]
    confidence = float(max(proba) * 100)
    status = "Stable" if pred == 0 else "At Risk"
    return {"status": status, "confidence": confidence}

if __name__ == "__main__":
    if len(sys.argv) == 5:
        temp = float(sys.argv[1])
        do = float(sys.argv[2])
        ph = float(sys.argv[3])
        turb = float(sys.argv[4])
        result = predict(temp, do, ph, turb)
        print(json.dumps(result))
    else:
        print(json.dumps({"error": "Invalid arguments"}))
        sys.exit(1)