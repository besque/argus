# Argus – UEBA Security and Anomaly Detection Platform

Argus is a full-stack **User & Entity Behavior Analytics (UEBA)** system designed to detect **suspicious behavior**, **compromised accounts**, **insider threats**, and other **anomalies** in real time. It combines **behavioral baselining**, **statistical anomaly detection**, **Markov sequence modeling**, **Isolation Forest**, **rule-based signals**, and **psychometric OCEAN drift analysis**. Argus provides a modern dashboard, detailed user profiles, AI-generated behavior summaries, and **real-time alerting**.

## Features

* Real-time processing of **user, system, and network logs**
* **Statistical baseline deviation** detection
* **Markov chain** event-sequence anomaly scoring
* **Isolation Forest** anomaly detection
* **Rule-based** high-risk behavior checks
* **Risk severity** classification (**High / Medium / Low**)
* **OCEAN behavioral drift** computation
* **AI-generated analyst summaries**
* Dashboard with **KPI strip**, **severity distribution**, **risk timeline**, and **anomaly-type breakdown**
* User page with **risky-user ranking**, **color-coded risk cards**, and **lazy loading**
* User detail page with **radar (OCEAN) chart**, **AI summary**, **recent logs**, and **timeline navigation**
* **Socket.IO** for real-time alerts
* Efficient **pagination** and **partial-load** API endpoints

## Architecture Overview

* **Frontend**: React + Vite with Tailwind, Shadcn UI, Recharts, Framer Motion.
* **Backend**: Node.js (Express), **MongoDB**, Mongoose, **Socket.IO**. Handles log ingestion, ML orchestration, alert storage, risk aggregation, and user APIs.
* **ML Service**: Python **FastAPI** with **scikit-learn** and statistical models. Performs feature extraction, baseline scoring, Markov scoring, Isolation Forest prediction, rule evaluation, risk classification, anomaly typing, and **OCEAN vector** computation.

## ML Logic Summary

* **Baseline score**: z-score deviation from user/global norms
* **Markov score**: low-probability event transitions
* **Isolation Forest**: numeric anomaly detection
* **Rule engine**: deterministic high-risk checks
* **Final score**: weighted combination of all models
* **Severity thresholds**: High ≥ 0.75, Medium ≥ 0.5, Low < 0.5
* **OCEAN vector**: derived from behavioral patterns to detect drift

## Running the Services

### Frontend

```
cd frontend
npm install
npm run dev
```

### Backend

```
cd backend
npm install
npm run dev
```

Environment variables:

```
MONGO_URI=...
ML_SERVICE_URL=http://localhost:8000
```

### ML Service

```
cd mlService
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```


