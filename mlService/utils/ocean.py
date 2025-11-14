# mlService/utils/ocean.py
import pandas as pd
import numpy as np
from numpy.linalg import norm

DATA_DIR = "../cleaned_data"

def load_ocean(path=f"{DATA_DIR}/psychometric.csv"):
    df = pd.read_csv(path)
    df = df.set_index('user_id')[['O','C','E','A','N']]
    return df

def cosine_similarity(a, b):
    a = np.array(a, dtype=float)
    b = np.array(b, dtype=float)
    if np.linalg.norm(a)==0 or np.linalg.norm(b)==0:
        return 0.0
    return float(np.dot(a,b)/(norm(a)*norm(b)))
