# train_models.py
import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from utils.feature_extraction import load_isolation_features
from utils.markov import SimpleMarkov

# Paths
DATA_DIR = "../cleaned_data"
ISO_FEATURES = f"{DATA_DIR}/isolation_forest_features.csv"
SEQS = f"{DATA_DIR}/event_sequences.csv"
BASELINES = f"{DATA_DIR}/user_baselines.csv"
PSYCHOMETRIC = f"{DATA_DIR}/psychometric.csv"
MODELS_DIR = "models"

def train_isolation():
    df, X = load_isolation_features(ISO_FEATURES)
    iso = IsolationForest(n_jobs=-1, contamination=0.02, random_state=42)
    iso.fit(X)
    joblib.dump(iso, f"{MODELS_DIR}/isolation_forest.pkl")
    print("saved isolation_forest")

def train_markov():
    seq_df = pd.read_csv(SEQS, sep=None, engine='python')  # auto-detect sep
    mk = SimpleMarkov()
    # parse sequence column (split by '->' and strip)
    seqs = []
    for s in seq_df['sequence'].astype(str):
        toks = [t.strip() for t in s.split("->")]
        seqs.append(toks)
    mk.fit_from_sequences(seqs)
    joblib.dump(mk, f"{MODELS_DIR}/markov_model.pkl")
    print("saved markov_model")

if __name__ == "__main__":
    train_isolation()
    train_markov()
