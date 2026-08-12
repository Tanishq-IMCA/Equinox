
<div align="center">

# EQUINOX ROADMAP

*From a visual cluster prototype to a measurable, energy-aware orchestration engine.*

</div>

> [!CAUTION]
> PROPRIETARY AND CONFIDENTIAL
> This roadmap describes the intended development of the EQUINOX prototype, its simulation data, orchestration logic, and visual interface.
> Unauthorized use, distribution, or reproduction is prohibited.

<p align="center">
<img src="https://img.shields.io/badge/Simulation-Live%20Telemetry-10b981?style=for-the-badge" alt="Live telemetry">
<img src="https://img.shields.io/badge/Clusters-6-2563eb?style=for-the-badge" alt="Six clusters">
<img src="https://img.shields.io/badge/Task%20Library-400%20Profiles-a855f7?style=for-the-badge" alt="400 task profiles">
<img src="https://img.shields.io/badge/Target%20Envelope-80%25-f59e0b?style=for-the-badge" alt="80 percent target">
</p>

EQUINOX is being built as an energy-aware workload migration orchestrator. The system is split into a task library, live data engine, cluster-local task managers, a decision engine, and the telemetry dashboard.

---

## Current state

- **Reusable telemetry surface:** Rack hover cards and wide cluster task-manager panels use the same telemetry and task objects.
- **Live browser simulation:** Tasks are drawn from the uploaded 400-row library when available, with safe local fallback data.
- **Six isolated clusters:** Each cluster owns ten servers; task placement and transfer checks stay inside the cluster.
- **Resource envelope:** Intake is limited to an 80% operating target for CPU, memory, GPU, power, and thermal load.
- **Task lifetimes:** Workloads run for realistic windows from 10 seconds to 150 seconds, with heavier categories receiving longer lifetimes.
- **Operator controls:** Termination takes 3–6 seconds and reports when an in-cluster transfer target is unavailable.
- **Event history:** Assignment, completion, transfer, termination, and capacity notices are recorded in the Logs workspace.

---

## Development phases

### 01 / Simulation foundation

- [x] Normalize the task CSV into a browser-consumable task catalog.
- [x] Generate recurring task intake without filling nodes to 100%.
- [x] Track CPU, RAM, GPU, VRAM, power, and temperature per node.
- [x] Apply category-aware task durations and resource-safe placement.
- [ ] Move the simulation clock and state into a dedicated backend service.

### 02 / Cluster orchestration

- [x] Keep task assignment and transfer inside one of six clusters.
- [x] Expose capacity-aware termination and transfer notices.
- [ ] Add a deterministic scheduler with priority, affinity, and queue policies.
- [ ] Add workload migration scoring based on heat, power, and remaining lifetime.
- [ ] Add idle-node consolidation and safe shutdown sequencing.

### 03 / Decision intelligence

- [ ] Define the feature set and labels for an orchestration policy.
- [ ] Train and validate a baseline model against simulator traces.
- [ ] Compare model decisions with a rules-based safety controller.
- [ ] Emit `NOTICE` events when the requested envelope cannot be sustained.
- [ ] Replay historical traces to measure power, temperature, and migration quality.

### 04 / Production telemetry

- [ ] Replace simulated values with authenticated node telemetry adapters.
- [ ] Add WebSocket streaming with reconnect and backpressure handling.
- [ ] Persist task, node, transfer, and shutdown events.
- [ ] Add role-aware operator actions and an audit trail.
- [ ] Add health checks and alert routing for cluster failures.

---

## Operating bounds

| Metric | Per Node | Cluster Policy |
| :--- | :--- | :--- |
| **System Memory** | 120 GB | Keep normal load below 80% |
| **GPU Memory** | 60 GB | Keep normal load below 80% |
| **Thermal Threshold** | 100°C | Warn near 80%, protect near 90% |
| **Power Envelope** | 19.2 kW | Keep normal load below 80% |
| **Task Lifetime** | 10–150 seconds | Refill only after completion |

---

## Local development

```bash
npm install
npm run dev
```

The preview runs on port 5000. The live dashboard is available through `/login`.