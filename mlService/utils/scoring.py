# mlService/utils/scoring.py
import joblib
import numpy as np
import pandas as pd
from .feature_extraction import event_to_features
from .ocean import load_ocean, cosine_similarity
import os

MODELS_DIR = "models"
ISO = joblib.load(os.path.join(MODELS_DIR, "isolation_forest.pkl"))
MK = joblib.load(os.path.join(MODELS_DIR, "markov_model.pkl"))
OCEAN_DF = load_ocean()

# load user baselines CSV once
BASELINE_DF = pd.read_csv("../cleaned_data/user_baselines.csv", index_col=0)

def compute_baseline_score(user, event):
    # compare a few safe fields using baseline df
    if user not in BASELINE_DF.index:
        return 0.0
    base = BASELINE_DF.loc[user]
    zscores = []
    # example features to compare
    for f in ["logon_count","file_access_count","total_bytes_out"]:
        cur = float(event.get(f, 0.0))
        mean = float(base.get(f"{f}_mean", base.get(f,0.0)))
        std = float(base.get(f"{f}_std", 1.0))
        z = abs(cur - mean) / (std + 1e-9)
        zscores.append(min(z/3.0, 1.0))  # normalized
    return float(np.mean(zscores))

def compute_iso_score(vec):
    # IsolationForest.decision_function: higher means more normal.
    raw = ISO.decision_function(vec.reshape(1,-1))[0]
    # Map to anomaly 0..1: we want higher => more anomalous
    score = 1.0 - (1.0/(1.0 + np.exp(-raw)))  # sigmoid invert
    return float(score)

def compute_markov_score(seq_str):
    if not seq_str:
        return 0.0
    tokens = [t.strip() for t in seq_str.split("->") if t.strip()]
    return float(MK.prob_sequence(tokens))

def compute_rule_score(event):
    s = 0.0
    rules = {}
    if event.get("is_new_device") or event.get("device") and event.get("device") not in (event.get("known_devices") or []):
        s += 0.25; rules["new_device"]=True
    if int(event.get("failed_login_count",0)) >= 5:
        s += 0.3; rules["too_many_failed_logins"]=True
    if int(event.get("large_upload_count",0)) >= 1:
        s += 0.35; rules["large_upload"]=True
    return min(1.0, s), rules

def compute_ocean(user):
    if user in OCEAN_DF.index:
        row = OCEAN_DF.loc[user].astype(float).to_dict()
        return row
    return None

def score_event(event_json):
    user = event_json.get("user")
    vec, order = event_to_features(event_json, baseline=None)
    iso_score = compute_iso_score(vec)
    markov_score = compute_markov_score(event_json.get("recent_sequence",""))
    baseline_score = compute_baseline_score(user, event_json)
    rule_score, rule_map = compute_rule_score(event_json)
    final = 0.35*iso_score + 0.30*markov_score + 0.25*baseline_score + 0.10*rule_score
    final = max(0.0, min(1.0, final))
    severity = "low"
    if final >= 0.75:
        severity = "high"
    elif final >= 0.5:
        severity = "medium"
    # anomaly_type heuristic
    anomaly_type = "unknown"
    if rule_map.get("large_upload"):
        anomaly_type = "data_exfiltration"
    elif rule_map.get("too_many_failed_logins") or rule_map.get("new_device"):
        anomaly_type = "compromised_account"
    ocean_vec = compute_ocean(user)
    # explanation building
    contributors = []
    if markov_score > 0.5: contributors.append("rare action sequence")
    if iso_score > 0.6: contributors.append("numeric anomaly (isolation-forest)")
    if baseline_score > 0.5: contributors.append("deviation from baseline")
    contributors += list(rule_map.keys())
    explanation = " + ".join(contributors) if contributors else "anomaly detected by ensemble"
    return {
        "risk_score": round(final, 4),
        "severity": severity,
        "explanation": explanation,
        "scores": {
            "baseline": round(float(baseline_score),4),
            "markov": round(float(markov_score),4),
            "isolation_forest": round(float(iso_score),4),
            "rules": rule_map
        },
        "anomaly_type": anomaly_type,
        "ocean_vector": ocean_vec
    }
