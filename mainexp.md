# EQUINOX: COMPREHENSIVE SYSTEM DOCUMENTATION

Welcome to the definitive guide for **EQUINOX**, an advanced Energy-Aware Workload Migration Orchestrator. This document provides an exhaustive breakdown of the project's architecture, file structure, operational logic, and functional capabilities.

---

## 1. MISSION & VISION
EQUINOX is designed as a prototype for a next-generation data center management system. Its primary goal is to optimize energy consumption and thermal efficiency by intelligently orchestrating workloads across clusters of servers.

**Core Objectives:**
*   **Energy Awareness:** Reducing power draw by consolidating tasks and shutting down idle hardware.
*   **Autonomous Orchestration:** A "hands-off" system that scales capacity based on real-time demand.
*   **Thermal Protection:** Ensuring no server exceeds safe temperature bounds while maintaining high performance.
*   **Seamless Migration:** Moving tasks between servers within a cluster to facilitate maintenance or power savings without interrupting service.

---

## 2. SYSTEM ARCHITECTURE

EQUINOX is built using a modern, reactive stack that blends high-performance 3D visualization with complex simulation logic.

### Technical Stack:
*   **Frontend Framework:** Next.js (React)
*   **3D Engine:** Three.js (for the interactive server room visualization)
*   **State Management:** React Hooks (Custom `useSimulation` hook)
*   **Styling:** CSS3 with Glassmorphism effects
*   **Data Generation:** Python (Pandas) for synthetic task libraries
*   **API Layer:** Next.js API Routes (Route Handlers)

### High-Level Flow:
1.  **Data Source:** A Python script generates 400 unique task profiles, exported to CSV, XLSX, and PKL.
2.  **Backend API:** Next.js API routes parse the CSV data and serve it to the frontend.
3.  **Simulation Engine:** A browser-based simulation engine (`simulation.ts`) runs every second, calculating resource usage, thermal dynamics, and task lifecycles.
4.  **UI/UX:** A dashboard provides three views (Overview, Workflow, Logs) to monitor and control the system.

---

## 3. FILE & DIRECTORY STRUCTURE

Every file and folder in EQUINOX serves a specific purpose in the ecosystem.

### Root Directory
*   `main.py`: The primary launcher script. It checks for Python and Node.js dependencies, installs them if missing, and starts both the frontend and backend services.
*   `package.json`: Defines the Node.js environment, including dependencies like `three.js`, `next`, and `framer-motion`.
*   `pyproject.toml` & `uv.lock`: Configuration files for the Python environment, managed by the `uv` tool.
*   `README.md`: The initial project overview.
*   `replit.md`: Specific instructions for running the project in a Replit environment.
*   `roadmap.md`: The long-term development plan, detailing phases from simulation foundation to decision intelligence.
*   `tsconfig.json`: TypeScript configuration for the frontend.
*   `history.txt`: A log of project changes and milestones.

### `agenticwork/` (The Data Lab)
This folder contains the "brain" behind the task data.
*   `main.py`: A Python script that builds a DataFrame of 400 task records using randomized bounds for CPU, RAM, GPU, Power, and Temperature.
*   `tasks_preview.csv`: The human-readable export used by the Next.js API to load task templates.
*   `tasks_library.xlsx`: A spreadsheet version for manual review/editing of the task library.
*   `tasks.pkl`: A serialized Python object for fast reloading in Python environments.
*   `EXPLANATION.md`: A guide to the data formats used in this directory.

### `app/` (The Application Core)
*   `page.tsx`: The landing page/entry point.
*   `layout.tsx`: The root layout shared across the app.
*   `login/`: Contains the login page logic.
    *   `page.tsx`: The login interface. **Note:** Credentials are hardcoded here (`Tanishq.wanderer@gmail.com` / `Infiniteminecraftersnetwork@1234`).
*   `dashboard/`: The heart of the operator interface.
    *   `page.tsx`: The main dashboard UI, containing the 3D server room, cluster metrics, and navigation.
    *   `simulation.ts`: The simulation engine. This file handles the logic for all 60 nodes, task lifecycles, and autonomous behavior.
*   `api/`: Backend endpoints.
    *   `tasks/route.ts`: Parses `tasks_preview.csv` and serves task templates to the dashboard.
    *   `powerwall/route.ts`: Serves the 3D GLB model for the Tesla Powerwall used in the visualization.

### `public/` & `attached_assets/`
*   Contains static assets, images, and 3D models (GLB files) required for the Three.js scene.

### `reffiles/`
*   A repository of reference HTML designs and older prototypes (AURA, NEXUS, etc.) used as inspiration for the current glassmorphism interface.

---

## 4. CORE COMPONENTS & LOGIC

### The Simulation Engine (`simulation.ts`)
The engine tracks 60 servers (nodes) organized into 6 clusters.
*   **Intake Cycle:** Every 10 seconds, the system evaluates cluster capacity and adds new tasks if the node is below 80% utilization.
*   **Thermal Modeling:** Temperature rises based on task intensity and falls when the node is idle or offline.
*   **Task Lifecycle:** Tasks have a random duration (10s to 150s). Once finished, they are cleared to free up resources.

### Autonomous Mode (The "Agentic" Behavior)
Autonomous Mode is the flagship feature of EQUINOX. When turned **ON**:
1.  **Workload Consolidation:** The system actively moves tasks from lightly loaded nodes to others that have spare capacity.
2.  **Sequential Power-Down:** Once a node is empty, it is automatically powered down to save energy.
3.  **Demand-Based Activation:** If new tasks arrive and no active nodes can accept them, the system automatically wakes up a new node.
4.  **Minimal Footprint:** The goal is to keep as many server "lights" off as possible.

When turned **OFF**:
*   The system maintains a "Full Capacity" state.
*   All nodes are powered up sequentially.
*   Tasks are distributed across all available nodes to minimize individual stress.

### Cluster Management
The 60 nodes are divided into 6 **Isolated Task Domains** (Clusters).
*   **Isolation:** Tasks can only be moved or transferred between nodes within the same cluster. This prevents cross-cluster dependency.
*   **Sequential Power:** Powering a cluster up or down happens one node at a time (sequential) to prevent power surges and allow for safe workload migration.

---

## 5. USER INTERFACE: WHAT BUTTON DOES WHAT?

### Sidebar
*   **Overview (01):** The main 3D view and cluster control panel.
*   **Live Workflow (02):** A detailed tabular view of all clusters and their specific tasks.
*   **Logs (03):** A chronological history of all system events (Power, Engine, Transfer, Complete).
*   **Logout:** Ends the session and returns to the login screen.
*   **Panel Toggle (←/→):** Collapses or expands the sidebar.

### Overview Page
*   **AUTONOMOUS ON/OFF:** Toggles the agentic orchestration engine.
*   **POWER ALL:** Manually wakes up every server in the room (only works when Autonomous is OFF).
*   **Cluster Tabs:** Selects one of the 6 clusters to view its combined telemetry (CPU, RAM, GPU, Power, etc.).
*   **EMERGENCY POWER UP/DOWN:** Triggers a sequential power event for the entire selected cluster.
*   **3D Racks:** Click any server rack in the 3D room to see its individual telemetry card and active processes.

### Task Operations (Telemtry Panel)
*   **TERMINATE:** Manually kills a process. The system will attempt to **TRANSFER** the workload to another healthy node in the same cluster before it dies.
*   **WAIT:** Displayed when a task is in the middle of a migration.

---

## 6. SYSTEM BEHAVIOR & SERVER DYNAMICS

### Why do certain servers behave the way they do?
*   **Thermal Throttling:** If a server's temperature approaches 90°C, the system triggers a `NOTICE`. The simulator models a cooling rate that is slower for high-intensity clusters.
*   **Intake Rejection:** If a node's CPU, RAM, GPU, or Power usage is above 80%, it will reject new tasks. This is the **80% Operating Envelope**.
*   **Transfer Failure:** If you try to terminate a task but no other server in that cluster has room, the transfer fails, and you receive a "Transfer paused" notice.

### Autonomous Mode: On vs. Off
*   **ON:** You will see nodes shutting down (lights going out) as tasks complete. The room will become dark except for the nodes actively working.
*   **OFF:** The room will gradually light up as the system ensures every node is ready for maximum throughput.

### Cluster Power Events
*   **Powering Down:** The system first tries to `moveTasks()` from the node to a peer. If successful, the node turns off. If no peer can take the load, the node stays online for safety (indicated by a notice).
*   **Powering Up:** Nodes enter a `starting` state (indicated by a yellow pulse in the 3D view) before becoming `nominal` (green).

---

## 7. DATA SPECS & OPERATING BOUNDS

| Metric | Threshold / Capacity |
| :--- | :--- |
| **Nodes** | 60 Total (10 per cluster) |
| **Clusters** | 6 Isolated Domains |
| **Max CPU** | 100% per node |
| **Max RAM** | 120 GB per node |
| **Max VRAM** | 60 GB per node |
| **Max Power** | 19.2 kW per node |
| **Safe Temp** | Below 80°C (Critical at 90°C+) |
| **Task Intake** | Every 10 seconds |
| **Task Duration** | 10s - 150s |

---

## 8. WHAT ARE WE TRYING TO ACHIEVE?

Ultimately, EQUINOX is a study in **Agentic Infrastructure**. We are moving away from "static" server management where everything is always on, toward an **autonomous system** that:
1.  **Learns** the demand of the incoming workload.
2.  **Predicts** the best placement for energy efficiency.
3.  **Executes** migration and power actions without human intervention.

By using the **Autonomous Mode**, the system demonstrates how a data center can "breathe" — expanding capacity when the queue builds up and contracting to a tiny energy footprint when the work is done.

---
*Documentation generated for the EQUINOX Energy Orchestrator Project.*
