"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const nodes = Array.from({ length: 60 }, (_, i) => ({
  id: i + 1,
  state: [8, 21, 27].includes(i + 1) ? "offline" : i === 7 || i === 18 ? "warning" : i % 4 === 0 ? "ready" : "online",
}));

export default function Dashboard() {
  const router = useRouter();
  const [panel, setPanel] = useState(true);
  const [page, setPage] = useState("Overview");
  const [visiblePage, setVisiblePage] = useState("Overview");
  const [switching, setSwitching] = useState(false);
  const sceneHost = useRef<HTMLDivElement>(null);

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

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
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
    const addPowerLine = (points: THREE.Vector3[]) => {
      const curve = new THREE.CatmullRomCurve3(points);
      const line = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(points.length * 8, 12), powerLineRadius, 6, false), neonMaterial);
      scene.add(line);
      return curve;
    };

    let animationFrame = 0;
    let disposed = false;
    const powerPulses: { mesh: THREE.Mesh; curve: THREE.CatmullRomCurve3; offset: number }[] = [];
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
        online: "#42f59b",
        ready: "#ffd34f",
        warning: "#ff5f67",
        offline: "#b2bdc4",
      };
      const makeTopLabel = (node: typeof nodes[number], width: number, depth: number) => {
        const canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 128;
        const context = canvas.getContext("2d");
        if (!context) return null;
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = "rgba(18,25,30,.78)";
        context.fillRect(7, 7, 242, 114);
        context.strokeStyle = statusColors[node.state];
        context.lineWidth = 3;
        context.strokeRect(8.5, 8.5, 239, 111);
        context.fillStyle = statusColors[node.state];
        context.font = 'bold 66px "Gotham Black", Arial';
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(`${node.id}`, 128, 66);
        if (node.state === "offline") {
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
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        const label = new THREE.Mesh(
          new THREE.PlaneGeometry(width * 0.58, depth * 0.58),
          new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide })
        );
        label.rotation.x = -Math.PI / 2;
        return label;
      };
      for (let index = 0; index < nodes.length; index += 1) {
        const rack = source.clone(true);
        const column = index % 6;
        const row = Math.floor(index / 6);
        rack.scale.setScalar(scale);
        const node = nodes[index];
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
              if (node.state === "offline" && "color" in object.material) {
                (object.material as THREE.MeshStandardMaterial).color.multiplyScalar(0.38);
                if ("emissive" in object.material) (object.material as THREE.MeshStandardMaterial).emissive.set("#050607");
              }
            }
          }
        });
        const label = makeTopLabel(node, rackWidth, rackDepth);
        if (label) {
          label.position.set(rack.position.x, rack.position.y + size.y * scale + 0.006, rack.position.z);
          scene.add(label);
        }
        scene.add(rack);
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
        ]);
        addPowerLine([
          new THREE.Vector3(x + tapeWidth / 2, 0.035, gridFrontZ),
          new THREE.Vector3(x + tapeWidth / 2, 0.035, gridBackZ),
        ]);
        addPowerLine([
          new THREE.Vector3(x, 0.04, gridBackZ),
          new THREE.Vector3(x, 0.04, spineZ),
        ]);
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
          powerPulses.push({ mesh: particle, curve: route, offset: index / 3 });
        });
      });
    });

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
      controls.update();
      powerPulses.forEach(({ mesh, curve, offset }) => {
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
        <div className="overview-tools"><span className="room-status"><i /> ROOM A / 30 NODES</span><span>DRAG TO ROTATE</span><span>SCROLL TO ZOOM</span></div>
        <div className="rack-window glass">
          <div className="window-top"><span className="dot red" /><span className="dot yellow" /><span className="dot green" /><span className="window-label">LIVE NODE TELEMETRY / STANDBY</span></div>
          <div className="room-viewport"><div className="rack-canvas-host" ref={sceneHost} /></div>
        </div>
        <div className="room-legend"><span><i className="legend-online" /> ACTIVE</span><span><i className="legend-ready" /> READY</span><span><i className="legend-warning" /> MIGRATING</span><span><i className="legend-offline" /> OFFLINE / LIGHTS OFF</span></div>
      </div>}
      {visiblePage === "Live Workflow" && <div className="empty-page"><p className="eyebrow">WORKSPACE / 02</p><h1>LIVE<br /><span className="accent">WORKFLOW.</span></h1><p>Workflow stream will appear here when the live data connection is enabled.</p></div>}
      {visiblePage === "Logs" && <div className="empty-page"><p className="eyebrow">WORKSPACE / 03</p><h1>SYSTEM<br /><span className="accent">LOGS.</span></h1><p>Event history is intentionally empty for this preview.</p></div>}
    </section>
  </main>;
}