"use client";

import { PointerEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

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
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState({ x: 56, y: -20 });
  const drag = useRef({ x: 0, y: 0, rx: 56, ry: -20 });

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

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, rx: rotation.x, ry: rotation.y };
  }
  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    setRotation({
      x: Math.max(25, Math.min(78, drag.current.rx - (event.clientY - drag.current.y) * 0.25)),
      y: drag.current.ry + (event.clientX - drag.current.x) * 0.35,
    });
  }
  function zoomScene(event: React.WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    setZoom(value => Math.max(.72, Math.min(1.35, value - event.deltaY * .0007)));
  }

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
    <aside className={`slide-panel glass ${panel ? "is-open" : ""}`}>
      <p className="eyebrow">COMMAND / 01</p><h2>CONTROL<br /><span className="accent">ROOM.</span></h2>
      <p className="panel-copy">Welcome back. The cluster is within nominal operating range.</p>
      <div className="live-metric"><span>POWER DRAW</span><strong>342.8 <small>kW</small></strong><i><b style={{ width: "61%" }} /></i></div>
      <div className="live-metric"><span>THERMAL DELTA</span><strong>68.4 <small>°C</small></strong><i><b style={{ width: "68%" }} /></i></div>
      <div className="live-metric"><span>ACTIVE WORKLOADS</span><strong>184 <small>/ 240</small></strong><i><b style={{ width: "77%" }} /></i></div>
      <div className="panel-actions"><button className="button primary" onClick={() => alert("Optimization cycle queued.")}>Optimize <span>→</span></button><button className="button ghost" onClick={() => setPanel(false)}>Hide panel</button></div>
    </aside>
    <section className={`dashboard-content ${switching ? "is-switching" : ""}`}>
      {visiblePage === "Overview" && <div className="overview-page">
        <div className="dashboard-intro"><p className="eyebrow">AUTONOMOUS ENERGY SYSTEMS / 02</p><h1>CLUSTER<br /><span className="accent">OVERVIEW.</span></h1><p>Thirty nodes. One adaptive system. Watch workload migration, thermal awareness, and power efficiency in real time.</p></div>
        <div className="overview-tools"><span className="room-status"><i /> ROOM A / 30 NODES</span><span>DRAG TO ROTATE</span><span>SCROLL TO ZOOM</span></div>
        <div className="rack-window glass">
          <div className="window-top"><span className="dot red" /><span className="dot yellow" /><span className="dot green" /><span className="window-label">LIVE NODE TELEMETRY / STANDBY</span></div>
          <div className="room-viewport" onPointerDown={startDrag} onPointerMove={moveDrag} onWheel={zoomScene}>
            <div className="room-scene" style={{ transform: `scale(${zoom}) rotateX(${rotation.x}deg) rotateZ(${rotation.y / 8}deg) rotateY(${rotation.y}deg)` }}>
              <div className="floor" />
              <div className="rack-grid">{nodes.map(node => <div className={`rack rack-${node.state}`} key={node.id}>
                <div className="rack-top"><span>{node.id}</span></div>
                <div className="rack-front"><div className="rack-lights">{Array.from({ length: 5 }, (_, i) => <i key={i} />)}</div><div className="rack-slots"><b /><b /><b /></div></div>
                <div className="rack-back"><div className="rack-lights">{Array.from({ length: 5 }, (_, i) => <i key={i} />)}</div></div>
                <div className="rack-side" />
              </div>)}</div>
            </div>
          </div>
        </div>
        <div className="room-legend"><span><i className="legend-online" /> ACTIVE</span><span><i className="legend-ready" /> READY</span><span><i className="legend-warning" /> MIGRATING</span><span><i className="legend-offline" /> OFFLINE / LIGHTS OFF</span></div>
      </div>}
      {visiblePage === "Live Workflow" && <div className="empty-page"><p className="eyebrow">WORKSPACE / 02</p><h1>LIVE<br /><span className="accent">WORKFLOW.</span></h1><p>Workflow stream will appear here when the live data connection is enabled.</p></div>}
      {visiblePage === "Logs" && <div className="empty-page"><p className="eyebrow">WORKSPACE / 03</p><h1>SYSTEM<br /><span className="accent">LOGS.</span></h1><p>Event history is intentionally empty for this preview.</p></div>}
    </section>
  </main>;
}