"use client";

import { useEffect, useRef, useState } from "react";

function Glitch({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const value = String(children);
  const [text, setText] = useState("");
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started) setStarted(true);
    }, { threshold: 0.2 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);
  useEffect(() => {
    if (!started) return;
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let frame = 0;
    const timer = window.setInterval(() => {
      frame += 1;
      setText(value.split("").map((c, i) => (c === " " || i < frame / 2 ? c : chars[Math.floor(Math.random() * chars.length)])).join(""));
      if (frame > value.length * 2 + 4) { window.clearInterval(timer); setText(value); }
    }, 34);
    return () => window.clearInterval(timer);
  }, [started, value]);
  return <span ref={ref} className={`glitch-reveal ${className}`}>{text || "\u00a0"}</span>;
}

export default function Home() {
  return (
    <main>
      <div className="wallpaper"><i /><i /><i /><i /><i /></div>
      <header className="header">
        <a className="logo" href="/">EQUINOX</a>
        <nav><a href="#system">System</a><a href="/about">About</a><a href="/login">Login</a><a className="header-cta" href="/login">Explore <span>↗</span></a></nav>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="pulse" /> EQUINOX / AUTONOMOUS ENERGY SYSTEMS / 01</div>
          <h1><Glitch>MAKE COMPUTE</Glitch><Glitch>WORK SMARTER.</Glitch></h1>
          <p className="lede">Real-time intelligence that migrates active workloads, balances thermal load, and powers down idle infrastructure.</p>
          <div className="hero-actions"><a className="button primary" href="#system">See the system <span>→</span></a><a className="button ghost" href="/about">Read the brief <span>↓</span></a></div>
          <div className="hero-note"><span>30 NODES</span><span>·</span><span>8 TASK PROFILES</span><span>·</span><span>ONE OPTIMAL CLUSTER</span></div>
        </div>
      </section>

      <section className="ticker" aria-label="Equinox capabilities"><div><span>TELEMETRY</span><span>WORKLOAD MIGRATION</span><span>THERMAL AWARENESS</span><span>POWER EFFICIENCY</span><span>REAL-TIME TELEMETRY</span><span>WORKLOAD</span><span>TELEMETRY</span><span>WORKLOAD MIGRATION</span><span>THERMAL AWARENESS</span><span>POWER EFFICIENCY</span><span>REAL-TIME TELEMETRY</span><span>WORKLOAD</span></div></section>

      <section id="system" className="system section">
        <div className="section-heading"><div><p className="eyebrow">WHAT WE BUILD / 02</p><h2><Glitch>THE CLUSTER,</Glitch><br /><span className="accent">IN MOTION.</span></h2></div><p className="section-intro">Equinox turns noisy server telemetry into an active control loop. Every task has a cost. Every node has a better state.</p></div>
        <div className="feature-grid">
          <article className="feature glass"><span className="feature-number">01</span><h3>LIVE TASK<br />INTELLIGENCE</h3><p>Simulated enterprise workloads stream into a 30-node grid with CPU, RAM, GPU, power, and temperature telemetry.</p><div className="feature-line"><span /> 400 TASK PROFILES</div></article>
          <article className="feature glass"><span className="feature-number">02</span><h3>ZERO-DOWNTIME<br />MIGRATION</h3><p>The logic engine predicts density and moves active workloads before heat or power limits become a problem.</p><div className="feature-line"><span /> MODEL-DRIVEN CONTROL</div></article>
          <article className="feature glass"><span className="feature-number">03</span><h3>IDLE POWER<br />CONSOLIDATION</h3><p>Sparse workloads consolidate safely, allowing idle servers to enter a lower-power state without interrupting the room.</p><div className="feature-line"><span /> 19.2 KW / NODE</div></article>
        </div>
      </section>

       <section className="closing"><p className="eyebrow">THE NEXT STATE</p><h2><Glitch>LESS WASTE.</Glitch><br /><span className="accent">MORE COMPUTE.</span></h2><a className="button primary" href="/login">Enter dashboard <span>↗</span></a></section>
      <footer><span className="logo">EQUINOX</span><span>ALGORITHMIC ENERGY-AWARE WORKLOAD ORCHESTRATION</span><span>© 2026</span></footer>
    </main>
  );
}