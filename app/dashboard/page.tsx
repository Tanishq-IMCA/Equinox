"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const nodes = Array.from({ length: 30 }, (_, i) => ({
  id: i + 1,
  state: i === 7 || i === 18 ? "warning" : i % 9 === 0 || i === 25 ? "offline" : i % 4 === 0 ? "ready" : "online",
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
    camera.position.set(17, 12, 19);
    camera.lookAt(0, 0.8, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.className = "rack-canvas";
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.8, 0);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 10;
    controls.maxDistance = 30;
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
      new THREE.PlaneGeometry(16, 17),
      new THREE.MeshStandardMaterial({ color: "#30363b", roughness: 0.82, metalness: 0.12 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const grid = new THREE.GridHelper(16, 16, "#555d63", "#3d454b");
    grid.position.y = 0.012;
    scene.add(grid);

    let animationFrame = 0;
    let disposed = false;
    const loader = new GLTFLoader();
    loader.load("/data_center_rack.glb", (gltf) => {
      if (disposed) return;
      const source = gltf.scene;
      const bounds = new THREE.Box3().setFromObject(source);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      const scale = 1.9 / Math.max(size.y, 0.001);
      for (let index = 0; index < 30; index += 1) {
        const rack = source.clone(true);
        const column = index % 5;
        const row = Math.floor(index / 5);
        rack.scale.setScalar(scale);
        rack.position.set((column - 2) * 2.55 - center.x * scale, -bounds.min.y * scale, (row - 2.5) * 2.55 - center.z * scale);
        rack.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.castShadow = true;
            object.receiveShadow = true;
          }
        });
        scene.add(rack);
      }
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