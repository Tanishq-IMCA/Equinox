
<div align="center">

# EQUINOX: Autonomous Energy-Aware Workload Migration Orchestrator

*Algorithmic cluster management engine dynamically migrating active workloads between nodes for maximum power efficiency.*

</div>

> [!CAUTION]
> PROPRIETARY AND CONFIDENTIAL
> This project, along with the associated codebase, simulation models, and dynamic migration algorithms, constitutes the proprietary and strictly confidential intellectual property of its authors.
> UNAUTHORIZED USE IS STRICTLY PROHIBITED. You may not copy, distribute, transmit, reproduce, publish, modify, or create derivative works from this source material without explicit, documented authorization from the chief developers.
> All rights are explicitly reserved.

<p align="center">
<img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python">
<img src="https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white" alt="Flask">
<img src="https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB" alt="React">
<img src="https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
<img src="https://img.shields.io/badge/PyTorch-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white" alt="PyTorch">
<img src="https://img.shields.io/badge/scikit--learn-%23F7931E.svg?style=for-the-badge&logo=scikit-learn&logoColor=white" alt="scikit-learn">
</p>

EQUINOX is an active enterprise prototype: a high-performance, glassmorphic data center orchestrator and dynamic cluster management dashboard. It ingests high-variance real-time telemetry from simulated server nodes and leverages machine learning models to dynamically reallocate tasks, optimize power draw, suppress thermal spikes, and automate idle-node shutdown.

---

## What is implemented

- **30-Node Clustered Data Center Grid:** Interactive 5x6 server matrix visualizing real-time node operational states (Active, High-Load, Migrating, Idle, Offline).
- **High-Variance Task Simulation Engine:** Live streaming daemon generating incoming tasks across 8 categorized enterprise profiles with randomized lifetimes and resource profiles.
- **8-Category Task Library (400 Real-World Logs):** Includes Windows Server OS processes, background daemons, ML training, LLM inference runtimes, cloud gaming, web hosting, disk I/O, and general browsing.
- **Real-Time Node Telemetry:** Live Task Manager UI per node displaying continuous CPU, RAM (120 GB cap), GPU VRAM (60 GB cap), Power Draw (19.2 kW cap), and Thermal Delta (100°C threshold).
- **ML Logic Engine:** Model-driven decision framework predicting workload density and executing zero-downtime task migrations across cluster nodes.
- **Automated Idle-Server Consolidation:** Consolidates sparse workloads onto target nodes to safely execute automated power-down sequences for idle server racks.
- **Capacity & Thermal Warning System:** Automatic alert system dispatching high-priority `NOTICE` events with recommended hardware asset expansion when cluster thermal or resource limits exceed safety margins (>90%).
- **Glassmorphic Command Dashboard:** Draggable, resizable telemetry windows, live cluster heatmaps, real-time power draw graphs, and automated optimization controls.

---

## Architecture

### Frontend

- **React 19 and TypeScript.**
- **Create React App / `react-scripts`.**
- Main dashboard and cluster visualization: `frontend/src/App.tsx`.
- WebSocket client and live streaming graphs: `frontend/src/components/TelemetryView.tsx`.
- Interface styling and dark glassmorphism: `frontend/src/App.css`, `frontend/src/index.css`.

### Backend

- **Python Flask & WebSockets in `backend/run.py`.**
- Synthetic Data Generator Engine in `backend/simulator.py`.
- Machine Learning Logic & Migration Optimizer in `backend/ml_engine.py`.
- Serves the production React build and WebSocket/JSON API telemetry streams.

---

## Data Center Hardware Bounds (Per Node Reference)

| Metric | Single Node Capacity | 30-Node Cluster Total |
| :--- | :--- | :--- |
| **System Memory (RAM)** | 120 GB | 3,600 GB (3.6 TB) |
| **GPU Memory (VRAM)** | 60 GB | 1,800 GB (1.8 TB) |
| **Thermal Threshold Cap** | 100°C Max | Automated Heat Dissipation Alert |
| **Max Power Envelope** | 19.2 kW (19,200 W) | 576 kW Max Enclosure Envelope |
| **Target Operating Envelope** | 80% Nominal / 20% Peak | Dynamic Multi-Node Migration |

---

## Local development

Install the backend dependencies:

```bash
pip install -r backend/requirements.txt