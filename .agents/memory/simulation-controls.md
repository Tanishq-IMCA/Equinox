---
name: Simulation controls
description: Durable behavior rules for the dashboard's node power, thermal, and autonomous simulation.
---

Node power transitions are intentionally staggered and thermal readings ease toward ambient or workload targets rather than jumping with task changes. Autonomous mode drains active nodes, then activates additional nodes only when queued work needs capacity.

**Why:** The dashboard is meant to communicate believable infrastructure behavior; instantaneous power and temperature changes made the visualization feel incorrect and obscured capacity decisions.

**How to apply:** Preserve the gradual transitions and demand-driven activation when extending task intake, cluster controls, or 3D lighting.