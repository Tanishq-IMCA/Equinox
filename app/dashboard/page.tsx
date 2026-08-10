"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clusterNodeIds, formatTelemetry, useSimulation, type LiveTask, type NodeTelemetry } from "./simulation";

const nodes = Array.from({ length: 60 }, (_, i) => ({
  id: i + 1,
  state: "low",
}));

function metricTone(value: number) {
  return value >= 80 ? "critical" : value >= 50 ? "elevated" : "nominal";
}

function MetricBar({ label, value, unit = "%", valueText }: { label: string; value: number; unit?: string; valueText?: string }) {
  const tone = metricTone(value);
  return <div className="telemetry-metric">
    <div className="telemetry-metric-head"><span>{label}</span><b className={tone}>{valueText ?? `${value.toFixed(1)}${unit}`}</b></div>
    <div className={`telemetry-bar ${tone}`}><i style={{ width: `${Math.min(100, value)}%` }} /></div>
  </div>;
}

function TaskRow({ task, nodeId, onTerminate }: { task: LiveTask; nodeId: number; onTerminate: (nodeId: number, uid: string) => void }) {
  return <div className={`task-row ${task.state === "terminating" ? "is-terminating" : ""}`}>
    <div className="task-row-main"><b>{task.name}</b><span>{task.category} / {task.intensity}</span></div>
    <span className="task-time">{task.state === "terminating" ? "TRANSFERRING" : `${task.remaining}s`}</span>
    <button className="terminate-button" onClick={() => onTerminate(nodeId, task.uid)} disabled={task.state === "terminating"}>{task.state === "terminating" ? "WAIT" : "TERMINATE"}</button>
  </div>;
}

function TelemetryPanel({ telemetry, onTerminate, compact = false }: { telemetry: NodeTelemetry; onTerminate: (nodeId: number, uid: string) => void; compact?: boolean }) {
  const display = formatTelemetry(telemetry);
  return <div className={`telemetry-panel glass ${compact ? "is-compact" : ""}`}>
    <div className="telemetry-panel-kicker">NODE {String(telemetry.id).padStart(2, "0")} / CLUSTER {String(telemetry.cluster + 1).padStart(2, "0")}</div>
    <div className="telemetry-panel-title"><h2>NODE TELEMETRY</h2><span className={`telemetry-state ${telemetry.state}`}>{telemetry.state}</span></div>
    <div className="telemetry-metrics">
      <MetricBar label="CPU" value={telemetry.cpu} valueText={display.cpu} />
      <MetricBar label="GPU" value={telemetry.gpu} valueText={display.gpu} />
      <MetricBar label="RAM" value={telemetry.ram} valueText={display.ram} />
      <MetricBar label="VRAM" value={telemetry.gpuMemory} valueText={display.gpuMemory} />
      <MetricBar label="POWER" value={telemetry.power} valueText={display.power} />
      <MetricBar label="TEMP" value={telemetry.temperature} valueText={display.temperature} />
    </div>
    <div className="process-heading"><span>PROCESSES</span><b>{telemetry.tasks.length} ACTIVE</b></div>
    <div className="process-list">{telemetry.tasks.slice(0, compact ? 4 : 8).map((task) => <TaskRow key={task.uid} task={task} nodeId={telemetry.id} onTerminate={onTerminate} />)}</div>
  </div>;
}

function ClusterPanel({ cluster, telemetry, onTerminate }: { cluster: number; telemetry: NodeTelemetry[]; onTerminate: (nodeId: number, uid: string) => void }) {
  const clusterNodes = telemetry.filter((node) => node.cluster === cluster);
  const tasks = clusterNodes.flatMap((node) => node.tasks.map((task) => ({ task, nodeId: node.id })));
  return <div className="cluster-panel glass">
    <div className="cluster-panel-head">
      <div><span className="telemetry-panel-kicker">CLUSTER {String(cluster + 1).padStart(2, "0")} / ISOLATED TASK DOMAIN</span><h2>CLUSTER TASK MANAGER</h2></div>
      <span className="cluster-capacity">{tasks.length} PROCESSES / {clusterNodes.reduce((sum, node) => sum + node.power * 0.192, 0).toFixed(2)} / 192 kW</span>
    </div>
    <div className="cluster-server-strip">{clusterNodes.map((node) => <div className="cluster-server" key={node.id}><span>NODE {String(node.id).padStart(2, "0")}</span><b>{node.tasks.length}</b><i className={metricTone(Math.max(node.cpu, node.ram, node.gpu, node.power))} /></div>)}</div>
    <div className="cluster-task-list">{tasks.slice(0, 12).map(({ task, nodeId }) => <TaskRow key={task.uid} task={task} nodeId={nodeId} onTerminate={onTerminate} />)}</div>
  </div>;
}

function formatClusterTelemetry(totals: {
  cpu: number;
  gpu: number;
  ram: number;
  gpuMemory: number;
  power: number;
  temperature: number;
}) {
  return {
    cpu: `${totals.cpu.toFixed(1)} / 1000%`,
    gpu: `${totals.gpu.toFixed(1)} / 1000%`,
    ram: `${(totals.ram * 1.2).toFixed(1)} / 1200 GB`,
    gpuMemory: `${(totals.gpuMemory * 0.6).toFixed(1)} / 600 GB`,
    power: `${(totals.power * 0.192).toFixed(2)} / 192 kW`,
    temperature: `${totals.temperature.toFixed(1)} / 100°C`,
  };
}

export default function Dashboard() {
  const router = useRouter();
  const [panel, setPanel] = useState(true);
  const [page, setPage] = useState("Overview");
  const [visiblePage, setVisiblePage] = useState("Overview");
  const [switching, setSwitching] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);
  const [selectedNode, setSelectedNode] = useState<number | null>(null);
  const [selectedCluster, setSelectedCluster] = useState(5);
  const [shutdownNotice, setShutdownNotice] = useState("");
  const sceneHost = useRef<HTMLDivElement>(null);
  const { telemetry, logs, notice, terminateTask, powerCluster, powerAllServers, autonomous, queuedTasks, setAutonomousMode } = useSimulation();
  const telemetryRef = useRef(telemetry);
  telemetryRef.current = telemetry;
  const selectedClusterNodes = telemetry.filter((node) => node.cluster === selectedCluster);
  const clusterTotals = {
    cpu: selectedClusterNodes.reduce((sum, node) => sum + node.cpu, 0),
    gpu: selectedClusterNodes.reduce((sum, node) => sum + node.gpu, 0),
    ram: selectedClusterNodes.reduce((sum, node) => sum + node.ram, 0),
    gpuMemory: selectedClusterNodes.reduce((sum, node) => sum + node.gpuMemory, 0),
    power: selectedClusterNodes.reduce((sum, node) => sum + node.power, 0),
    temperature: selectedClusterNodes.length ? Math.max(...selectedClusterNodes.map((node) => node.temperature)) : 0,
  };
  const clusterDisplay = formatClusterTelemetry(clusterTotals);

  useEffect(() => {
    if (localStorage.getItem("equinox-auth") !== "active") router.replace("/login");
  }, [router]);

  function switchPage(next: string) {
    if (next === page || switching) return;
    setPage(next);
    setSwitching(true);
    window.setTimeout(() => {
      setVisiblePage(next);
      setSwitching(false);
    }, 320);
  }

  function logout() { localStorage.removeItem("equinox-auth"); router.push("/login"); }

  useEffect(() => {
    if (visiblePage !== "Overview" || !sceneHost.current) return;
    const host = sceneHost.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#11161b");

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(29, 17, 32);
    camera.lookAt(0, 0.8, 0);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    } catch {
      host.innerHTML = '<div class="scene-fallback"><span>3D ROOM VIEW UNAVAILABLE</span><small>LIVE TELEMETRY PANELS REMAIN ACTIVE</small></div>';
      return () => {
        host.innerHTML = "";
      };
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.className = "rack-canvas";
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.8, 0);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 16;
    controls.maxDistance = 52;
    controls.minPolarAngle = 0.32;
    controls.maxPolarAngle = Math.PI / 2 - 0.06;
    controls.update();

    scene.add(new THREE.HemisphereLight("#dbeafe", "#090d12", 2.2));
    const keyLight = new THREE.DirectionalLight("#ffffff", 3.8);
    keyLight.position.set(8, 18, 10);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight("#60a5fa", 18, 30);
    rimLight.position.set(-9, 7, -8);
    scene.add(rimLight);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 28),
      new THREE.MeshStandardMaterial({ color: "#252b30", roughness: 0.86, metalness: 0.12 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = false;
    scene.add(floor);
    const grid = new THREE.GridHelper(16, 28, "#566067", "#40484e");
    grid.position.y = 0.012;
    grid.material.transparent = true;
    grid.material.opacity = 0.42;
    scene.add(grid);

    const sideWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 2.38, 28),
      new THREE.MeshStandardMaterial({ color: "#1a2025", roughness: 0.92, metalness: 0.08 })
    );
    sideWall.position.set(-8, 1.19, 0);
    scene.add(sideWall);
    const endWall = new THREE.Mesh(
      new THREE.BoxGeometry(16, 2.38, 0.22),
      new THREE.MeshStandardMaterial({ color: "#181e23", roughness: 0.92, metalness: 0.08 })
    );
    endWall.position.set(0, 1.19, 14);
    scene.add(endWall);

    const neonMaterial = new THREE.MeshBasicMaterial({
      color: "#00f5b8",
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    });
    const powerLineRadius = 0.055;
    const powerLines: { line: THREE.Mesh; cluster: number | null }[] = [];
    const addPowerLine = (points: THREE.Vector3[], cluster: number | null = null) => {
      const curve = new THREE.CatmullRomCurve3(points);
      const line = new THREE.Mesh(
        new THREE.TubeGeometry(curve, Math.max(points.length * 8, 12), powerLineRadius, 6, false),
        neonMaterial.clone()
      );
      powerLines.push({ line, cluster });
      scene.add(line);
      return curve;
    };

    let animationFrame = 0;
    let disposed = false;
    const powerPulses: { mesh: THREE.Mesh; curve: THREE.CatmullRomCurve3; offset: number; cluster: number | null }[] = [];
    const rackRoots: THREE.Object3D[] = [];
    const rackVisuals: { id: number; rack: THREE.Object3D; label: THREE.Mesh | null; state: string }[] = [];
    const syncRackVisual = (visual: typeof rackVisuals[number], state: string) => {
      if (visual.state === state) return;
      visual.state = state;
      visual.rack.traverse((object) => {
        if (object instanceof THREE.Light) object.visible = state !== "offline" && state !== "starting";
        if (!(object instanceof THREE.Mesh)) return;
        const material = Array.isArray(object.material) ? object.material[0] : object.material;
        const baseColor = object.userData.baseColor as THREE.Color | undefined;
        const baseEmissive = object.userData.baseEmissive as THREE.Color | undefined;
        if (baseColor && "color" in material) {
          (material as THREE.MeshStandardMaterial).color.copy(baseColor);
          if (state === "offline") (material as THREE.MeshStandardMaterial).color.multiplyScalar(0.38);
        }
        if (baseEmissive && "emissive" in material) {
          (material as THREE.MeshStandardMaterial).emissive.copy(baseEmissive);
          if (state === "offline") (material as THREE.MeshStandardMaterial).emissive.set("#050607");
          if ("emissiveIntensity" in material) (material as THREE.MeshStandardMaterial).emissiveIntensity = state === "offline" ? 0 : 1;
        }
      });
      if (visual.label) {
        const canvas = visual.label.userData.labelCanvas as HTMLCanvasElement;
        const context = canvas.getContext("2d");
        if (context) {
          const color = { low: "#42f59b", medium: "#facc15", high: "#ff5f67", starting: "#6ee7b7", stopping: "#fb7185", offline: "#b2bdc4" }[state] ?? "#b2bdc4";
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.fillStyle = "rgba(18,25,30,.78)";
          context.fillRect(7, 7, 242, 114);
          context.strokeStyle = color;
          context.lineWidth = 3;
          context.strokeRect(8.5, 8.5, 239, 111);
          context.fillStyle = color;
          context.font = 'bold 66px "Gotham Black", Arial';
          context.textAlign = "center";
          context.textBaseline = "middle";
          context.fillText(`${visual.id}`, 128, 66);
          if (state === "offline") {
            context.strokeStyle = "#ff4f5e";
            context.lineWidth = 11;
            context.lineCap = "round";
            context.beginPath();
            context.moveTo(42, 24);
            context.lineTo(214, 106);
            context.moveTo(214, 24);
            context.lineTo(42, 106);
            context.stroke();
          }
          (visual.label.userData.labelTexture as THREE.CanvasTexture).needsUpdate = true;
        }
      }
    };
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const loader = new GLTFLoader();
    loader.load("/data_center_rack.glb", (gltf) => {
      if (disposed) return;
      const source = gltf.scene;
      const bounds = new THREE.Box3().setFromObject(source);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      const scale = 1.9 / Math.max(size.y, 0.001);
      const rackWidth = size.x * scale;
      const rackDepth = size.z * scale;
      const columnGap = 1.05;
      const rowGap = 0.2;
      const rackOriginZ = 1.2;
      const statusColors: Record<string, string> = {
        low: "#42f59b",
        medium: "#facc15",
        high: "#ff5f67",
        starting: "#6ee7b7",
        stopping: "#fb7185",
        offline: "#b2bdc4",
      };
      const drawTopLabel = (canvas: HTMLCanvasElement, id: number, state: string) => {
        const context = canvas.getContext("2d");
        if (!context) return;
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = "rgba(18,25,30,.78)";
        context.fillRect(7, 7, 242, 114);
        context.strokeStyle = statusColors[state] ?? statusColors.offline;
        context.lineWidth = 3;
        context.strokeRect(8.5, 8.5, 239, 111);
        context.fillStyle = statusColors[state] ?? statusColors.offline;
        context.font = 'bold 66px "Gotham Black", Arial';
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(`${id}`, 128, 66);
        if (state === "offline") {
          context.strokeStyle = "#ff4f5e";
          context.lineWidth = 11;
          context.lineCap = "round";
          context.beginPath();
          context.moveTo(42, 24);
          context.lineTo(214, 106);
          context.moveTo(214, 24);
          context.lineTo(42, 106);
          context.stroke();
        }
      };
      const makeTopLabel = (node: typeof nodes[number], width: number, depth: number) => {
        const canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 128;
        drawTopLabel(canvas, node.id, node.state);
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        const label = new THREE.Mesh(
          new THREE.PlaneGeometry(width * 0.58, depth * 0.58),
          new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide })
        );
        label.rotation.x = -Math.PI / 2;
        label.userData.labelCanvas = canvas;
        label.userData.labelTexture = texture;
        return label;
      };
      for (let index = 0; index < nodes.length; index += 1) {
        const rack = source.clone(true);
        const column = index % 6;
        const row = Math.floor(index / 6);
        rack.scale.setScalar(scale);
        const node = nodes[index];
        rack.userData.nodeId = node.id;
        rackRoots.push(rack);
        rack.position.set(
          (column - 2.5) * (rackWidth + columnGap) - center.x * scale,
          -bounds.min.y * scale,
          rackOriginZ + (row - 4.5) * (rackDepth + rowGap) - center.z * scale
        );
        rack.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.castShadow = true;
            object.receiveShadow = true;
            if (object.material instanceof THREE.Material) {
              object.material = object.material.clone();
              const material = object.material as THREE.MeshStandardMaterial;
              if ("color" in material) object.userData.baseColor = material.color.clone();
              if ("emissive" in material) object.userData.baseEmissive = material.emissive.clone();
            }
          }
        });
        const label = makeTopLabel(node, rackWidth, rackDepth);
        if (label) {
          label.position.set(rack.position.x, rack.position.y + size.y * scale + 0.006, rack.position.z);
          scene.add(label);
        }
        scene.add(rack);
        rackVisuals.push({ id: node.id, rack, label, state: "" });
      }

      const rackXPositions = Array.from({ length: 6 }, (_, column) =>
        (column - 2.5) * (rackWidth + columnGap) - center.x * scale
      );
      const gridBackZ = rackOriginZ + 5 * (rackDepth + rowGap) + 0.3;
      const gridFrontZ = rackOriginZ - 5 * (rackDepth + rowGap) - 0.3;
      const spineZ = 11.9;
      const tapeDepth = Math.max(rackDepth * 0.82, 0.5);
      const tapeWidth = Math.max(rackWidth * 0.72, 0.5);

      for (let column = 0; column < rackXPositions.length; column += 1) {
        const x = rackXPositions[column];
        addPowerLine([
          new THREE.Vector3(x - tapeWidth / 2, 0.035, gridFrontZ),
          new THREE.Vector3(x - tapeWidth / 2, 0.035, gridBackZ),
        ], column);
        addPowerLine([
          new THREE.Vector3(x + tapeWidth / 2, 0.035, gridFrontZ),
          new THREE.Vector3(x + tapeWidth / 2, 0.035, gridBackZ),
        ], column);
        addPowerLine([
          new THREE.Vector3(x, 0.04, gridBackZ),
          new THREE.Vector3(x, 0.04, spineZ),
        ], column);
      }
      addPowerLine([
        new THREE.Vector3(rackXPositions[0], 0.045, spineZ),
        new THREE.Vector3(rackXPositions[rackXPositions.length - 1], 0.045, spineZ),
      ]);
      addPowerLine([
        new THREE.Vector3(rackXPositions[0], 0.05, spineZ),
        new THREE.Vector3(-7.35, 0.05, spineZ),
      ]);

      const powerwallLoader = new GLTFLoader();
      powerwallLoader.load("/api/powerwall", (powerwallGltf) => {
        if (disposed) return;
        const powerwallBounds = new THREE.Box3().setFromObject(powerwallGltf.scene);
        const powerwallSize = powerwallBounds.getSize(new THREE.Vector3());
        const powerwallScale = 1.25 / Math.max(powerwallSize.x, powerwallSize.y, powerwallSize.z, 0.001);
        [11.9, 12.75, 13.6].forEach((z, index) => {
          const powerwall = powerwallGltf.scene.clone(true);
          powerwall.scale.setScalar(powerwallScale);
          powerwall.rotation.y = Math.PI / 2;
          const powerwallGroup = new THREE.Group();
          powerwallGroup.add(powerwall);
          const mountedBounds = new THREE.Box3().setFromObject(powerwallGroup);
          const mountedCenter = mountedBounds.getCenter(new THREE.Vector3());
          powerwallGroup.position.set(-7.35 - mountedCenter.x, 0.92 - mountedCenter.y, z - mountedCenter.z);
          powerwall.traverse((object) => {
            if (object instanceof THREE.Mesh) {
              object.castShadow = true;
              object.receiveShadow = true;
              if (object.material instanceof THREE.Material) object.material = object.material.clone();
            }
          });
          scene.add(powerwallGroup);
          const route = addPowerLine([
            new THREE.Vector3(-7.35, 0.05, z),
            new THREE.Vector3(-7.35, 0.05, spineZ),
            new THREE.Vector3(rackXPositions[0], 0.05, spineZ),
          ]);
          const pulseMaterial = new THREE.MeshBasicMaterial({
            color: "#b6fff0",
            transparent: true,
            opacity: 0.95,
          });
          const particle = new THREE.Mesh(new THREE.BoxGeometry(powerLineRadius * 2, powerLineRadius * 2, powerLineRadius * 2), pulseMaterial);
          scene.add(particle);
           powerPulses.push({ mesh: particle, curve: route, offset: index / 3, cluster: 0 });
        });
      });
    });

    const handlePointerMove = (event: PointerEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(rackRoots, true)[0]?.object;
      let cursor: THREE.Object3D | null = hit ?? null;
      let id: number | null = null;
      while (cursor) {
        if (typeof cursor.userData.nodeId === "number") {
          id = cursor.userData.nodeId;
          break;
        }
        cursor = cursor.parent;
      }
      setHoveredNode(id);
    };
    const handlePointerDown = (event: PointerEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(rackRoots, true)[0]?.object;
      let cursor: THREE.Object3D | null = hit ?? null;
      while (cursor) {
        if (typeof cursor.userData.nodeId === "number") {
          setSelectedNode(cursor.userData.nodeId);
          return;
        }
        cursor = cursor.parent;
      }
    };
    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointerleave", () => setHoveredNode(null));

    const resize = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();
    const render = () => {
      if (disposed) return;
        rackVisuals.forEach((visual) => {
          const liveNode = telemetryRef.current.find((node) => node.id === visual.id);
          syncRackVisual(visual, liveNode?.state ?? nodes[visual.id - 1].state);
        });
        powerLines.forEach(({ line, cluster }) => {
          const clusterNodes = telemetryRef.current.filter((node) => node.cluster === cluster);
          const activeRatio = cluster === null
            ? 1
            : clusterNodes.filter((node) => ["low", "medium", "high"].includes(node.state)).length / Math.max(clusterNodes.length, 1);
          (line.material as THREE.MeshBasicMaterial).opacity = 0.92 * activeRatio;
          line.visible = activeRatio > 0;
        });
      controls.update();
      powerPulses.forEach(({ mesh, curve, offset, cluster }) => {
        const clusterNodes = cluster === null ? [] : telemetryRef.current.filter((node) => node.cluster === cluster);
        const active = cluster === null || clusterNodes.some((node) => ["low", "medium", "high"].includes(node.state));
        mesh.visible = active;
        const t = ((performance.now() * 0.00028 + offset) % 1);
        mesh.position.copy(curve.getPointAt(t));
        mesh.rotation.y += 0.035;
      });
      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(render);
    };
    render();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.dispose();
      renderer.domElement.remove();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
          else object.material.dispose();
        }
      });
    };
  }, [visiblePage]);

  const activeNode = selectedNode ?? hoveredNode;
  const hoveredTelemetry = activeNode ? telemetry.find((node) => node.id === activeNode) : null;
  return <main className="dashboard">
    <div className="wallpaper"><i /><i /><i /><i /><i /></div>
    <header className="dashboard-header">
      <a className="logo" href="/">EQUINOX</a>
      <div className="dashboard-status"><span className="pulse" /> LIVE / CLUSTER 01</div>
      <button className="logout" onClick={logout}>Logout ↗</button>
    </header>
    <aside className={`dashboard-sidebar ${panel ? "is-open" : ""}`}>
      <div className="sidebar-brand"><span className="brand-mark">E</span><span>ENERGY<br />ORCHESTRATOR</span></div>
      <div className="sidebar-label">WORKSPACE</div>
      {["Overview", "Live Workflow", "Logs"].map((item, index) => <button key={item} className={`sidebar-link ${page === item ? "active" : ""}`} onClick={() => switchPage(item)}><span>0{index + 1}</span>{item}<b>↗</b></button>)}
      <div className="sidebar-footer"><span className="pulse" /> STREAM READY<br /><small>NO TELEMETRY ATTACHED</small></div>
      <button className="panel-toggle" onClick={() => setPanel(!panel)} aria-label="Toggle navigation">{panel ? "←" : "→"}</button>
    </aside>
    <section className={`dashboard-content ${switching ? "is-switching" : ""}`}>
      {visiblePage === "Overview" && <div className="overview-page">
        <div className="dashboard-intro"><p className="eyebrow">AUTONOMOUS ENERGY SYSTEMS / 02</p><h1>CLUSTER <span className="accent">OVERVIEW.</span></h1><p>Thirty nodes. One adaptive system. Watch workload migration, thermal awareness, and power efficiency in real time.</p></div>
          <div className="overview-tools"><span className="room-status"><i /> ROOM A / 60 NODES</span><span>HOVER A RACK FOR TELEMETRY</span><span>DRAG TO ROTATE</span><span>SCROLL TO ZOOM</span>{autonomous && <span className="autonomous-queue">QUEUE {queuedTasks}</span>}<button className={`autonomous-toggle ${autonomous ? "active" : ""}`} onClick={() => setAutonomousMode(!autonomous)}>AUTONOMOUS: {autonomous ? "ON" : "OFF"}</button><button className="power-all-toggle" onClick={powerAllServers} disabled={autonomous}>POWER ALL</button></div>
        <div className="rack-window glass">
          <div className="window-top"><span className="dot red" /><span className="dot yellow" /><span className="dot green" /><span className="window-label">LIVE NODE TELEMETRY / STANDBY</span></div>
           <div className="room-viewport"><div className="rack-canvas-host" ref={sceneHost} />{hoveredTelemetry && <div className="hover-telemetry" onPointerDown={(event) => event.stopPropagation()}><TelemetryPanel telemetry={hoveredTelemetry} onTerminate={terminateTask} compact /></div>}</div>
        </div>
        <div className="room-legend"><span><i className="legend-online" /> LOW</span><span><i className="legend-medium" /> MEDIUM</span><span><i className="legend-warning" /> HIGH</span><span><i className="legend-offline" /> OFFLINE / LIGHTS OFF</span></div>
         <div className="cluster-tabs">{Array.from({ length: 6 }, (_, cluster) => <button key={cluster} className={selectedCluster === cluster ? "active" : ""} onClick={() => setSelectedCluster(cluster)}>CLUSTER {String(cluster + 1).padStart(2, "0")} <small>{clusterNodeIds(cluster).join(" · ")}</small></button>)}</div>
         <div className="cluster-overview-card glass">
             <div className="cluster-overview-head"><div><span className="telemetry-panel-kicker">CLUSTER {String(selectedCluster + 1).padStart(2, "0")} / COMBINED TELEMETRY</span><h2>CLUSTER STATUS</h2></div><button className="emergency-button" onClick={() => powerCluster(selectedCluster)}>POWER {selectedClusterNodes.every((node) => node.state === "offline") ? "UP" : "DOWN"} / SEQUENTIAL</button></div>
           <div className="cluster-overview-metrics">
              <MetricBar label="CPU" value={clusterTotals.cpu / 10} valueText={clusterDisplay.cpu} />
              <MetricBar label="GPU" value={clusterTotals.gpu / 10} valueText={clusterDisplay.gpu} />
              <MetricBar label="RAM" value={clusterTotals.ram / 10} valueText={clusterDisplay.ram} />
              <MetricBar label="VRAM" value={clusterTotals.gpuMemory / 10} valueText={clusterDisplay.gpuMemory} />
              <MetricBar label="POWER" value={clusterTotals.power / 10} valueText={clusterDisplay.power} />
              <MetricBar label="PEAK TEMP" value={clusterTotals.temperature} valueText={clusterDisplay.temperature} />
           </div>
           {shutdownNotice && <p className="shutdown-notice">{shutdownNotice}</p>}
         </div>
         {notice && <div className="telemetry-notice" role="status">{notice}</div>}
      </div>}
        {visiblePage === "Live Workflow" && <div className="workflow-page"><div className="dashboard-intro"><p className="eyebrow">WORKSPACE / 02</p><h1>LIVE <span className="accent">WORKFLOW.</span></h1><p>Detailed cluster telemetry and task operations across the six isolated server domains.</p></div><div className="workflow-cluster-tabs">{Array.from({ length: 6 }, (_, cluster) => <button key={cluster} className={selectedCluster === cluster ? "active" : ""} onClick={() => setSelectedCluster(cluster)}>CLUSTER {String(cluster + 1).padStart(2, "0")}<small>{clusterNodeIds(cluster).join(" · ")}</small></button>)}</div><div className="workflow-section-label">DETAILED TASK OPERATIONS / SELECTED CLUSTER</div><ClusterPanel cluster={selectedCluster} telemetry={telemetry} onTerminate={terminateTask} /><div className="workflow-section-label">NODE-LEVEL TELEMETRY / CURRENT VALUES OUT OF CAPACITY</div><div className="workflow-node-grid">{selectedClusterNodes.map((node) => <TelemetryPanel key={node.id} telemetry={node} onTerminate={terminateTask} />)}</div></div>}
       {visiblePage === "Logs" && <div className="logs-page"><p className="eyebrow">WORKSPACE / 03</p><h1>SYSTEM<br /><span className="accent">LOGS.</span></h1><div className="logs-panel glass">{logs.map((log, index) => <div className="log-row" key={`${log.time}-${index}`}><time>{log.time}</time><b>{log.kind}</b><span>{log.message}</span></div>)}</div></div>}
    </section>
  </main>;
}