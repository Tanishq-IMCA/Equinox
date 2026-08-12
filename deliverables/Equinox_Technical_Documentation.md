# Equinox Technical Documentation

> Long-form engineering reference for the autonomous energy-aware workload orchestration prototype.

## How to use this document

Every section begins with a **Fast summary** so the team can prepare quickly, followed by the deeper explanation and the code-level details.

## Executive quick read

**Fast summary:** Equinox is a browser-based prototype of an autonomous, energy-aware workload orchestrator. It simulates mixed workloads entering a clustered environment, calculates multi-resource pressure, migrates or consolidates work when safe, and powers down capacity that no longer needs to be online. The product is intentionally visual: the 3D room, rack lights, telemetry panels, process lists, autonomous transitions, and logs all explain the control loop in motion.

- The current code is a Next.js 14 application with React and a client-side simulation runtime.
- The current dashboard renders 60 simulated racks in six clusters; the original history brief describes 30 nodes. This is documented as a prototype discrepancy, not hidden.
- Workload intake is intentionally slow: one new autonomous task is generated approximately every 10 seconds after Autonomous mode is ready.
- The current control engine is deterministic and rule-based. It is ML-ready in its separation of task data, placement scoring, and hard admission constraints, but it does not call a trained ML model today.
- There are two internal API routes: /api/tasks for the CSV-backed task catalog and /api/powerwall for streaming the GLB visual asset.
- The repository currently has no explicit LICENSE file. Open-source release therefore requires an explicit license decision and asset-provenance review.

## 1. Project overview and mission

**Fast summary:** Equinox exists to make compute placement respond to physical reality. A conventional demo can show CPU bars; Equinox tries to show the system-level consequence of those bars: a task creates heat, consumes energy, occupies memory, changes placement options, and eventually changes which machines need to be powered. The system’s mission is to make those decisions visible and controllable.

- The product uses an energy-aware vocabulary: workload, node, cluster, capacity, thermal target, admission envelope, migration, consolidation, activation, shutdown, and event log.
- The interface is designed as an operational control room rather than a marketing-only page. The landing page sets the frame, the About page explains the system and team, and the dashboard provides live interaction.
- The prototype is deliberately honest about simulation boundaries. It does not claim to control real servers, issue real power commands, or forecast production energy savings.
- The history brief established per-node reference limits of 120 GB RAM, 60 GB VRAM, 100°C thermal cap, and 19.2 kW power envelope. The simulation normalizes values against these bounds.

## 2. Problem statement and relevance

**Fast summary:** Data centers and clustered compute systems do not fail only because they run out of CPU. They become inefficient when work is scattered, high-power tasks cluster badly, thermal headroom disappears, or capacity remains powered even though the workload has moved elsewhere. Mixed workloads make this harder because an LLM batch, disk repair, browser worker, and game server have radically different resource profiles.

- Static placement is easy to implement but poor at adapting to changing demand. It can leave one node hot while other nodes are underused.
- A single utilization percentage hides bottlenecks. CPU can be low while VRAM, power, or thermal conditions are the real constraint.
- Idle servers create a second inefficiency: they are available, but availability is not free. Autonomous mode makes capacity itself a managed state.
- The relevance extends to AI inference, model training, GPU pools, game hosting, storage services, CI runners, and mixed enterprise environments.
- Equinox’s contribution is a working explanatory model: it connects a task’s resource shape to node state, then exposes the decision sequence to an operator.

## 3. Innovation and creativity

**Fast summary:** The creative idea is to choreograph capacity management. Instead of treating power control as a hidden backend action, Equinox turns it into an observable performance: workloads drain, rack lights change, power paths remain visible, and demand wakes capacity only when placement requires it.

- The Autonomous transition creates a strong before/after state: a busy room is consolidated and powered down, then new work reactivates only the capacity required to accept it.
- Thermal values ease toward workload-derived targets rather than jumping instantly. This makes the demo feel like an infrastructure system with inertia.
- The 3D room is not a decorative scene. Rack states are synchronized with telemetry, offline racks lose their lights, labels change state color, and power pulses are shown along the supply path.
- The task library uses believable operational names across eight categories, which makes the simulation easier to explain than abstract Task 01 / Task 02 records.
- The architecture leaves a clean extension point for an ML ranker: the model can recommend an ordering, while deterministic admission checks continue to protect safety.

## 4. Architecture overview

**Fast summary:** The application is a single Next.js project with a browser runtime. The frontend owns the interactive simulation because the product is a demonstrator; route handlers provide typed, local data boundaries. The system is small enough to understand end to end and structured enough to evolve.

- App routes: app/page.tsx is the landing page, app/about/page.tsx is the product/team page, app/login/page.tsx is the local demo gate, and app/dashboard/page.tsx is the control surface.
- Simulation core: app/dashboard/simulation.ts defines task templates, runtime nodes, telemetry math, placement checks, task lifecycle, autonomous dispatch, consolidation, and power transitions.
- API routes: app/api/tasks/route.ts parses the task CSV and returns JSON; app/api/powerwall/route.ts streams the attached Powerwall GLB model.
- Assets: agenticwork/tasks_preview.csv supplies the catalog; public/data_center_rack.glb supplies the rack model; the Powerwall remains under attached_assets and is served through its route; Gotham fonts and profile images are in public.
- Runtime stack: Next.js 14.2, React 18, TypeScript, Three.js, and Framer Motion. No database, queue, cloud telemetry service, or external sponsor connector is currently connected.

## 5. Codebase map

**Fast summary:** The codebase is intentionally compact. The key engineering story is concentrated in a few files rather than distributed across a large backend.

- app/page.tsx: client-rendered landing page with the Equinox hero, glitch reveal component, ticker, product feature cards, and navigation.
- app/about/page.tsx: product brief, reference bounds, and the team cards for Tanishq and Aaroh.
- app/dashboard/page.tsx: client dashboard, route guard, Three.js scene lifecycle, rack and Powerwall loading, navigation, panels, cluster views, and event views.
- app/dashboard/simulation.ts: the state machine and control loop. It is the most important technical file because it converts templates into live tasks and nodes.
- app/api/tasks/route.ts: CSV parser, range averaging, typed response, and cache header.
- app/api/powerwall/route.ts: binary asset response with model/gltf-binary content type.
- app/globals.css and app/overrides.css: shared visual system, page layout, dashboard panel styling, typography, fonts, scrollbar treatment, and responsive rules.
- package.json and tsconfig.json: runtime dependencies, dev command, and TypeScript boundaries. The reffiles directory is excluded from the type scan because it contains imported reference material.

## 6. Data engine and task library

**Fast summary:** The task library is the source of variety. It contains 400 entries across eight categories: Operating System, Background services, Machine learning, LLM model execution, Gaming, Hosting, Disk read/write, and General tasks. Each row carries a unique Task_ID, believable name, intensity tier, and range-based resource fields.

- The CSV is intentionally range-based. A row can say 5–15 rather than pretending that every run of a task has identical resource usage.
- app/api/tasks/route.ts parses CSV lines with a small quote-aware parser. It maps the source column names to the TaskTemplate shape expected by the simulation.
- averageRange() extracts numeric values. A single number is returned directly; a two-number range becomes the mean. This turns a human-readable catalog into a stable simulation input.
- The response is cached for one hour because the task catalog is static during a demo session. A production version would likely version the library or stream tasks from a scheduler.
- A fallbackTasks list inside simulation.ts keeps the UI alive if the CSV API is unavailable. This is a safe local baseline, not a silent production data substitute.

## 7. Runtime simulation and control logic

**Fast summary:** useSimulation() is a React hook backed by refs for mutable runtime state and a redraw counter for UI refreshes. The runtime contains nodes with tasks, offline state, powerAction, and temperature. The hook exposes telemetry, logs, notices, task termination, cluster power controls, full-capacity restore, Autonomous mode, and queue depth.

- Initial state creates 60 RuntimeNode objects. Each starts active with an empty task list and temperature 30. The initial fill attempts four tasks per node, respecting canAccept().
- The effect fetches /api/tasks and then starts a one-second interval. Each tick updates temperature, removes completed or terminated tasks, and optionally performs intake or consolidation.
- makeTask() chooses a duration. Heavy categories (Machine learning, LLM model execution, Gaming) have a minimum duration of 80 seconds; other categories can run for 10 seconds or longer up to the configured upper bound.
- pickTemplate() samples a desired thermal band with a 10% low, 60% medium, and 30% high distribution when matching templates exist. It then returns a template from the catalog.
- metrics() sums CPU, GPU, power, and resource memory, then normalizes RAM by 1200 MB units, VRAM by 600 MB units, and power by 192 W units so the UI can represent percentage-like values.
- canAccept() uses an 80% headroom threshold for CPU, RAM, GPU, VRAM, and power and applies a thermal admission check. This is a safety guard, not a learned prediction.
- temperatureTarget() cools offline nodes toward zero and active empty nodes toward 30. Busy nodes target a bounded value derived from average task temperature and task count.
- Normal mode adds at most one task per node per intake cycle when the node has fewer than 18 tasks, then attempts capacity consolidation.
- Autonomous mode preserves current tasks in a pending queue, stops active nodes sequentially, waits until the room is ready, then dispatches queued work to fitting nodes.
- If no active node can accept queued work, dispatchAutonomousWork() starts the next offline node. The recent autonomous consolidation fix then moves compatible work together and schedules empty nodes for shutdown so green lights do not accumulate without work.
- The intake cadence is approximately 10 seconds. A one-second tick checks elapsed wall time rather than creating a task every second.

## 8. API and sponsor technology

**Fast summary:** The project uses APIs, but they are internal APIs rather than an external vendor integration. This distinction matters in a technical presentation: the prototype demonstrates clean boundaries without claiming a sponsor integration that does not exist.

- GET /api/tasks reads agenticwork/tasks_preview.csv with node:fs/promises, parses the rows, maps them to TaskTemplate records, and returns NextResponse.json().
- GET /api/powerwall reads attached_assets/tesla_powerwall_2_1786387109575.glb and returns the binary bytes with Content-Type model/gltf-binary. GLTFLoader consumes the route from the browser.
- There is no database or authentication API. The login page sets a localStorage flag equin... (the exact key is equinox-auth in the current code) and the dashboard redirects to /login if the flag is absent. This is a demo gate, not production identity.
- No sponsor technology or third-party telemetry API is currently attached. The current technology story is open-source infrastructure: Next.js, React, TypeScript, Three.js, Framer Motion, and browser APIs.
- A real integration can replace /api/tasks with a queue adapter and /api/powerwall with a static asset/CDN path without forcing the dashboard to understand the upstream source.

## 9. Three.js visualization

**Fast summary:** The overview scene is created only while the Overview page is visible. Three.js builds the camera, lights, floor, grid, walls, power lines, rack clones, labels, Powerwall models, and animated power pulses.

- GLTFLoader loads /data_center_rack.glb. The source model is cloned 60 times and arranged in six columns and ten rows.
- Each rack gets a CanvasTexture label showing the node ID and state color. Offline nodes receive a red cross, while active states use green, yellow, or red.
- The scene stores rack roots and uses a Raycaster to map pointer movement or clicks back to a node ID. That ID selects the matching NodeTelemetry panel.
- Power lines are built from CatmullRomCurve3 paths and TubeGeometry. Animated particles move along the curves to imply energy flow.
- The Powerwall route is loaded as a second GLB and mounted next to the supply path. This is a visual demonstration of energy infrastructure, not an electrical simulation.
- The effect cleans up the animation frame, ResizeObserver, controls, renderer, geometries, and materials when the page changes. WebGL context warnings can occur in browser sandboxes without a GPU and do not imply that the route or simulation is broken.

## 10. UI and UX architecture

**Fast summary:** The user journey is deliberately layered. The landing page explains the proposition, About gives context and people, Login gates the demo, and Dashboard moves from room-level visibility to cluster-level operations and node-level detail.

- Overview: the 3D room is the primary visual anchor. Toolbar actions expose Autonomous mode and full-capacity restore. Hovering a rack opens compact telemetry.
- Live Workflow: cluster tabs, a cluster task manager, task rows, node telemetry panels, capacity bars, task durations, and transfer/termination actions make the operational data readable.
- Logs: every important simulation event is represented as a time, kind, and message row. This is essential to explain autonomous transitions during a judging demo.
- Visual language: dark navy surfaces, glass panels, purple brand accents, green nominal state, yellow elevated state, red critical state, and muted metadata.
- Typography: Gotham Black is used for heavy display text, Gotham Light for task names and light display accents, and the monospace face for operational labels.
- Accessibility and readability improvements enlarged the small dashboard panel text, side-panel copy, task metadata, and controls without changing the main heading scale.

## 11. Team collaboration

**Fast summary:** Tanishq and Aaroh divide the work by system boundary while sharing the contract between data, APIs, simulation, and presentation.

- Tanishq Giri — backend and frontend credit: application shell, Next.js routes and page composition, dashboard architecture, Three.js scene, telemetry UI, navigation, styles, simulation integration, and product assembly.
- Aaroh Dharmadhikari — task-library and API credit: creation and curation of the 400-entry workload library, API development for delivering task data and visual assets, workload/resource profiling, AI/data-science framing, and validation/documentation support.
- Shared contract: TaskTemplate fields, resource units, eight categories, node capacity bounds, event types, and the meaning of Autonomous mode.
- Aaroh’s API contribution is concrete in the current codebase: /api/tasks is the data boundary that turns the catalog into typed runtime templates, and /api/powerwall is the asset boundary used by the 3D scene.
- The team workflow is strongest when the library can evolve independently of the UI and when the UI can render a deterministic fixture while APIs are being developed.

## 12. Open-source availability and contribution

**Fast summary:** The current repository does not include an explicit LICENSE file. That means the code should not be described as already open source simply because it uses open-source dependencies.

- Before public release, add a root LICENSE file and a THIRD_PARTY_NOTICES or dependency-policy section. MIT is a sensible default for the application code, subject to the team’s decision.
- Document the attached GLB models, profile images, fonts, and any generated CSV provenance separately. Application-code licensing does not automatically grant rights to every asset.
- An open-source contribution path should publish the task schema, environment setup, demo instructions, simulation assumptions, and examples for adding a new resource category.
- Good first contributions include: configurable topology, pluggable task sources, placement scoring experiments, additional telemetry adapters, accessibility improvements, test fixtures, and scheduler integrations.
- Label the current system as a prototype. Contributors should know which parts are a local browser simulation and which interfaces are intended to become production adapters.

## 13. Testing and verification

**Fast summary:** The project is a live visualization, so verification has two layers: static/build correctness and behavioral inspection in the browser.

- Build check: npm run build should compile the Next.js application and catch TypeScript/import issues.
- Route checks: GET /api/tasks should return an array of task templates with numeric CPU, RAM, GPU, VRAM, power, and temperature fields; GET /api/powerwall should return a GLB binary response.
- UI check: / and /about should load, /login should set the demo gate, and /dashboard should redirect unauthenticated users then render after the local gate is active.
- Behavior check: toggle Autonomous, observe sequential shutdown, watch queued work activate capacity, wait for tasks to complete, and confirm empty nodes consolidate rather than remain green indefinitely.
- Visual check: inspect overview rack labels, hover telemetry, Live Workflow readability, cluster controls, task rows, and Logs. A no-GPU browser may log WebGL warnings while the fallback path remains valid.
- The current app is a demo-first codebase and does not yet contain a formal unit/e2e test suite. The most valuable next tests are pure tests for canAccept, makeTask bounds, task parsing, and autonomous dispatch.

## 14. Limitations and roadmap

**Fast summary:** The honest next step is to graduate the explanatory prototype into a configurable, testable orchestration model without losing the clarity of the demo.

- Resolve topology configuration: the history brief says 30 nodes, while the current dashboard renders 60 racks. Make node count, cluster count, and nodes-per-cluster environment/config values.
- Move mutable simulation state into a dedicated engine or worker if the simulation grows. The current browser hook is appropriate for a demo but not for a long-running control plane.
- Add a real event stream or queue adapter. The current 10-second intake is a deliberate local simulation cadence, not a production workload arrival guarantee.
- Add a scoring interface so a future ML model can rank candidate nodes using historical telemetry, while canAccept() remains a hard safety boundary.
- Add persistent logs, deterministic seeds for repeatable demos, unit tests, and performance instrumentation.
- Replace localStorage demo authentication with a real identity layer before exposing the dashboard to real users.
- Add an explicit license, asset provenance, contributor guide, and deployment/security documentation before public release.

## 15. Final defense summary

**Fast summary:** Equinox is memorable because it makes an invisible systems problem visible without pretending the prototype is already a production data-center controller.

- Problem: mixed workloads are placed without enough awareness of energy, thermal pressure, and idle capacity.
- Solution: a continuous, resource-aware browser simulation that accepts tasks, tracks finite lifetimes, migrates or consolidates work, powers capacity down, and wakes it when demand returns.
- Technical proof: a real Next.js + React application, typed internal APIs, CSV-backed task library, Three.js rack room, live telemetry, autonomous state machine, and event log.
- Team proof: Tanishq owns the full-stack and dashboard experience; Aaroh owns task-library creation, API development, workload/data-science framing, and supporting validation.
- Open-source answer: dependencies are open source, but the repository needs an explicit application license and asset review before it can honestly be called an open-source release.
- Wow answer: flip Autonomous mode and watch the room go dark for a reason, then come alive for a reason.

## Appendix: file-level reference

| File | Responsibility |
|---|---|
| `app/page.tsx` | Equinox landing page, hero, product framing, feature cards, navigation |
| `app/about/page.tsx` | Product brief, reference bounds, team profiles |
| `app/dashboard/page.tsx` | Dashboard shell, Three.js visualization, telemetry panels, cluster operations |
| `app/dashboard/simulation.ts` | Task lifecycle, telemetry math, placement, migration, autonomous control, power transitions |
| `app/api/tasks/route.ts` | CSV task-library parser and JSON API |
| `app/api/powerwall/route.ts` | GLB asset API response |
| `app/globals.css` | Global page styles and base visual language |
| `app/overrides.css` | Dashboard/about/font/readability overrides |
| `agenticwork/tasks_preview.csv` | 400-entry workload catalog |
| `public/data_center_rack.glb` | Rack model used by Three.js |
| `attached_assets/tesla_powerwall_2_1786387109575.glb` | Powerwall model served through `/api/powerwall` |
| `package.json` | Next, React, Three.js, Framer Motion, TypeScript dependencies and run scripts |
| `tsconfig.json` | TypeScript configuration and reference-build exclusion |

## Appendix: demo script

1. Open the landing page and explain the physical-compute framing.
2. Use About to introduce the two-person team and the 400-task workload library.
3. Enter Login, then Dashboard → Overview.
4. Hover a rack to show CPU, GPU, RAM, VRAM, power, temperature, and active processes.
5. Open Live Workflow and select a cluster to show task-level operations.
6. Return to Overview and enable Autonomous mode.
7. Narrate the sequence: preserve work, drain, power down, slow intake, activate capacity, dispatch, complete, consolidate.
8. Open Logs to prove that each state transition is observable.
9. Close with the open-source answer: dependencies are open, project licensing and asset review are next.
