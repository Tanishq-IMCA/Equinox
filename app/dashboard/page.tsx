"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const nodes = Array.from({ length: 30 }, (_, i) => ({
  id: `NODE-${String(i + 1).padStart(2, "0")}`,
  state: i === 7 || i === 18 ? "MIGRATING" : i % 9 === 0 ? "IDLE" : "ACTIVE",
  load: 42 + ((i * 17) % 48),
}));

export default function Dashboard() {
  const router = useRouter();
  const [panel, setPanel] = useState(true);
  useEffect(() => {
    if (localStorage.getItem("equinox-auth") !== "active") router.replace("/login");
  }, [router]);
  function logout() { localStorage.removeItem("equinox-auth"); router.push("/login"); }

  return <main className="dashboard">
    <div className="wallpaper"><i /><i /><i /><i /><i /></div>
    <header className="header dashboard-header"><a className="logo" href="/">EQUINOX</a><div className="dashboard-status"><span className="pulse" /> LIVE / CLUSTER 01</div><button className="logout" onClick={logout}>Logout ↗</button></header>
    <button className="panel-toggle" onClick={() => setPanel(!panel)} aria-label="Toggle control panel">{panel ? "←" : "→"}</button>
    <aside className={`slide-panel glass ${panel ? "is-open" : ""}`}>
      <p className="eyebrow">COMMAND / 01</p><h2>CONTROL<br /><span className="accent">ROOM.</span></h2>
      <p className="panel-copy">Welcome back, Tanishq. The cluster is within nominal operating range.</p>
      <div className="live-metric"><span>POWER DRAW</span><strong>342.8 <small>kW</small></strong><i><b style={{ width: "61%" }} /></i></div>
      <div className="live-metric"><span>THERMAL DELTA</span><strong>68.4 <small>°C</small></strong><i><b style={{ width: "68%" }} /></i></div>
      <div className="live-metric"><span>ACTIVE WORKLOADS</span><strong>184 <small>/ 240</small></strong><i><b style={{ width: "77%" }} /></i></div>
      <div className="panel-actions"><button className="button primary" onClick={() => alert("Optimization cycle queued.")}>Optimize <span>→</span></button><button className="button ghost" onClick={() => setPanel(false)}>Hide panel</button></div>
    </aside>
    <section className="dashboard-content">
      <div className="dashboard-intro"><p className="eyebrow">AUTONOMOUS ENERGY SYSTEMS / 02</p><h1>CLUSTER<br /><span className="accent">OVERVIEW.</span></h1><p>Thirty nodes. One adaptive system. Watch workload migration, thermal awareness, and power efficiency in real time.</p></div>
      <div className="dash-stats"><div className="glass"><span>EFFICIENCY</span><strong>94.2%</strong><em>+8.4% this cycle</em></div><div className="glass"><span>OPTIMIZATION</span><strong>12.6%</strong><em>power saved today</em></div><div className="glass"><span>NODE STATE</span><strong>27 / 30</strong><em>active and healthy</em></div></div>
      <div className="node-window glass"><div className="window-top"><span className="dot red" /><span className="dot yellow" /><span className="dot green" /><span className="window-label">LIVE NODE TELEMETRY</span></div><div className="node-grid">{nodes.map(node => <div className={`node ${node.state.toLowerCase()}`} key={node.id}><span>{node.id}</span><b>{node.load}%</b><small>{node.state}</small></div>)}</div></div>
    </section>
  </main>;
}