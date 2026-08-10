"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const bars = [34, 52, 46, 68, 55, 78, 63, 48, 72, 59, 82, 66, 88, 74, 91, 68];

function Glitch({ children, className = "" }: { children: string; className?: string }) {
  const [text, setText] = useState(children);
  useEffect(() => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let frame = 0;
    const timer = window.setInterval(() => {
      frame += 1;
      setText(children.split("").map((c, i) => (c === " " || i < frame / 2 ? c : chars[Math.floor(Math.random() * chars.length)])).join(""));
      if (frame > children.length * 2 + 4) {
        window.clearInterval(timer);
        setText(children);
      }
    }, 38);
    return () => window.clearInterval(timer);
  }, [children]);
  return <span className={className}>{text}</span>;
}

function Terminal() {
  const lines = [
    ["> awe engine / cluster telemetry", "muted"],
    ["> nodes online .............. 30", "muted"],
    ["> workload variance .......... high", "muted"],
    ["> migration policy ........... loaded", "muted"],
    ["> power envelope ............. 19.2 kw", "green"],
    ["> optimization ............... active ✓", "green"],
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 28, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.7, duration: 0.8 }}
      className="terminal glass"
    >
      <div className="window-top"><span className="dot red" /><span className="dot yellow" /><span className="dot green" /><span className="window-label">LIVE / TELEMETRY</span></div>
      <div className="terminal-body">
        <div className="terminal-title">CLUSTER CONTROL PLANE <span>● ONLINE</span></div>
        {lines.map(([line, tone], i) => <div key={line} className={`terminal-line ${tone}`} style={{ animationDelay: `${1 + i * 0.18}s` }}>{line}</div>)}
        <div className="mini-chart">{bars.map((height, i) => <i key={i} style={{ height: `${height}%`, animationDelay: `${i * 45}ms` }} />)}</div>
        <div className="terminal-foot"><span>POWER DRAW</span><b>11.84 kW</b><span className="saving">↓ 18.6% OPTIMIZED</span></div>
      </div>
    </motion.div>
  );
}

export default function Home() {
  return (
    <main>
      <div className="wallpaper"><i /><i /><i /><i /><i /></div>
      <header className="header">
        <a className="logo" href="#"><Glitch>AW<span className="accent">E</span></Glitch></a>
        <nav><a href="#system">System</a><a href="#about">About</a><a className="header-cta" href="#system">Explore <span>↗</span></a></nav>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="pulse" /> AUTONOMOUS ENERGY SYSTEMS / 01</div>
          <h1><Glitch>MAKE COMPUTE</Glitch><Glitch>WORK <span className="accent">SMARTER.</span></Glitch></h1>
          <p className="lede">Real-time intelligence that migrates active workloads, balances thermal load, and powers down idle infrastructure.</p>
          <div className="hero-actions"><a className="button primary" href="#system">See the system <span>→</span></a><a className="button ghost" href="#about">Read the brief <span>↓</span></a></div>
          <div className="hero-note"><span>30 NODES</span><span>·</span><span>8 TASK PROFILES</span><span>·</span><span>ONE OPTIMAL CLUSTER</span></div>
        </div>
        <Terminal />
      </section>

      <section className="ticker"><div><span>REAL-TIME TELEMETRY</span><span>WORKLOAD MIGRATION</span><span>THERMAL AWARENESS</span><span>POWER EFFICIENCY</span><span>REAL-TIME TELEMETRY</span><span>WORKLOAD MIGRATION</span></div></section>

      <section id="system" className="system section">
        <div className="section-heading"><div><p className="eyebrow">WHAT WE BUILD / 02</p><h2><Glitch>THE CLUSTER,</Glitch><br /><span className="accent">IN MOTION.</span></h2></div><p className="section-intro">AWE turns noisy server telemetry into an active control loop. Every task has a cost. Every node has a better state.</p></div>
        <div className="feature-grid">
          <article className="feature glass"><span className="feature-number">01</span><h3>LIVE TASK<br />INTELLIGENCE</h3><p>Simulated enterprise workloads stream into a 30-node grid with CPU, RAM, GPU, power, and temperature telemetry.</p><div className="feature-line"><span /> 400 TASK PROFILES</div></article>
          <article className="feature glass"><span className="feature-number">02</span><h3>ZERO-DOWNTIME<br />MIGRATION</h3><p>The logic engine predicts density and moves active workloads before heat or power limits become a problem.</p><div className="feature-line"><span /> MODEL-DRIVEN CONTROL</div></article>
          <article className="feature glass"><span className="feature-number">03</span><h3>IDLE POWER<br />CONSOLIDATION</h3><p>Sparse workloads consolidate safely, allowing idle servers to enter a lower-power state without interrupting the room.</p><div className="feature-line"><span /> 19.2 KW / NODE</div></article>
        </div>
      </section>

      <section id="about" className="about section">
        <div className="about-mark">A<span>W</span>E</div>
        <div><p className="eyebrow">ABOUT THE BUILD / 03</p><h2><Glitch>BUILT FOR A</Glitch><br /><span className="accent">COOLER FUTURE.</span></h2><p className="about-copy">We are a two-person team building an algorithmic system for more efficient compute. Our first proof is deliberately tangible: high-variance workloads, real node bounds, and a model that has to make the next move.</p><p className="about-copy dim">The prototype is grounded in a 30-node cluster: 120 GB RAM, 60 GB VRAM, 100°C thermal cap, and a 19.2 kW power envelope per node.</p></div>
      </section>

      <section className="closing"><p className="eyebrow">THE NEXT STATE</p><h2><Glitch>LESS WASTE.</Glitch><br /><span className="accent">MORE COMPUTE.</span></h2><a className="button primary" href="#system">Explore AWE <span>↗</span></a></section>
      <footer><span className="logo">AW<span className="accent">E</span></span><span>ALGORITHMIC ENERGY-AWARE WORKLOAD ORCHESTRATION</span><span>© 2026</span></footer>
    </main>
  );
}