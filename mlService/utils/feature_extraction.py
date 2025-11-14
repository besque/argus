# utils/feature_extraction.py
import numpy as np
import pandas as pd
from datetime import datetime

# These must match EXACTLY your isolation_forest_features.csv column names:
NUMERIC_FEATURE_COLS = [
    "logon_count",
    "failed_login_count",
    "external_ip_count",
    "late_night_login_count",
    "file_access_count",
    "total_file_size",
    "avg_file_size",
    "max_file_size",
    "sensitive_folder_access_count",
    "usb_copy_count",
    "email_count",
    "total_email_size",
    "avg_email_size",
    "email_with_attachment_count",
    "external_email_count",
    "web_visit_count",
    "suspicious_domain_count",
    "usb_connect_count",
    "total_bytes_out",
    "avg_bytes_out",
    "max_bytes_out",
    "total_bytes_in",
    "avg_bytes_in",
    "large_upload_count",
    "lateral_movement_count",
    "process_count",
    "scripting_tool_count",
    "high_integrity_count",
]

def load_isolation_features(path):
    """
    Loads isolation_forest_features.csv and returns:
    - the dataframe
    - the numeric feature matrix X (numpy array)
    """
    df = pd.read_csv(path)

    # ensure only numeric columns are kept
    X = df[NUMERIC_FEATURE_COLS].fillna(0).astype(float).values
    return df, X


def event_to_features(event_json, baseline=None):
    """
    Converts a single incoming event JSON (from backend) into a numeric feature vector.
    Missing numeric fields default to zero.
    """

    features = {}

    # Fill numeric columns
    for col in NUMERIC_FEATURE_COLS:
        features[col] = float(event_json.get(col, 0.0))

    # Hour-of-day and new-device are useful signals but the isolation-forest
    # model was trained only on the numeric columns listed in
    # NUMERIC_FEATURE_COLS. Keep computing the optional signals here for
    # downstream use, but ensure the returned feature vector matches the
    # columns the model expects (NUMERIC_FEATURE_COLS).
    ts = event_json.get("ts")
    if ts:
        try:
            dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            features["hour"] = dt.hour
        except:
            features["hour"] = 0
    else:
        features["hour"] = 0

    features["is_new_device"] = 0
    if baseline:
        known = baseline.get("known_devices", [])
        if event_json.get("device") and event_json.get("device") not in known:
            features["is_new_device"] = 1

    # Return vector and ordered column list that match the trained model.
    ordered_cols = NUMERIC_FEATURE_COLS
    vec = np.array([features[c] for c in ordered_cols], dtype=float)

    return vec, ordered_cols
