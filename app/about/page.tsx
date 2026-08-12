"use client";

import { useEffect, useRef, useState } from "react";

function Glitch({ children }: { children: string }) {
  const [text, setText] = useState("");
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && setStarted(true), { threshold: .2 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!started) return;
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"; let frame = 0;
    const timer = window.setInterval(() => {
      frame += 1; setText(children.split("").map((c, i) => c === " " || i < frame / 2 ? c : chars[Math.floor(Math.random() * chars.length)]).join(""));
      if (frame > children.length * 2 + 4) { clearInterval(timer); setText(children); }
    }, 34);
    return () => clearInterval(timer);
  }, [started, children]);
  return <span ref={ref} className="glitch-reveal">{text || "\u00a0"}</span>;
}

const tanishq = ["MongoDB", "Express", "React", "Node.js", "Kubernetes", "Python", "C++", "JavaScript", "SwiftUI", "Unreal Engine", "Unity", "Godot"];

function PersonCard({ name, role, image, bio, stack, pending = false }: { name: string; role: string; image?: string; bio: string; stack: string[]; pending?: boolean }) {
  return <article className="person-card glass">
    {image ? <img className="person-photo" src={image} alt={name} /> : <div className="person-photo person-placeholder">E</div>}
    <div className="person-info">
      <p className="eyebrow">{role}</p>
      <h2>{name}</h2>
      <p className="person-bio">{bio}</p>
      <div className="stack">{stack.map(item => <span key={item}>{item}</span>)}</div>
    </div>
  </article>;
}

export default function About() {
  return <main>
    <div className="wallpaper"><i /><i /><i /><i /><i /></div>
    <header className="header"><a className="logo" href="/">EQUINOX</a><nav><a href="/">Home</a><a href="/login">Login</a><a className="header-cta" href="/login">Dashboard <span>↗</span></a></nav></header>
    <section className="about-hero">
      <p className="eyebrow"><span className="pulse" /> ABOUT EQUINOX / 01</p>
      <h1><Glitch>ENERGY-AWARE</Glitch><br /><span className="accent">COMPUTE.</span></h1>
      <p className="about-lede">Equinox is an autonomous workload migration orchestrator designed to make clustered compute more efficient, cooler, and easier to operate.</p>
    </section>
    <section className="software-brief section">
      <div><p className="eyebrow">THE SYSTEM / 02</p><h2><Glitch>ONE ROOM.</Glitch><br /><span className="accent">BETTER STATES.</span></h2></div>
      <div className="brief-copy"><p>Equinox simulates high-variance tasks entering a 30-node data center. Each node tracks CPU, RAM, GPU memory, power draw, and temperature while workloads move through eight real-world categories.</p><p>The logic engine reads that telemetry, predicts workload density, and migrates active tasks before a node becomes thermally or energetically inefficient. When work can be consolidated safely, idle nodes can move toward a lower-power state.</p><p className="dim">Reference bounds per node: 120 GB RAM, 60 GB VRAM, 100°C thermal cap, and a 19.2 kW power envelope.</p></div>
    </section>
    <section className="people section"><p className="eyebrow">THE PEOPLE / 03</p><h2><Glitch>BUILT BY</Glitch><br /><span className="accent">SYSTEMS THINKERS.</span></h2>
      <div className="people-grid">
        <PersonCard name="TANISHQ" role="Full-Stack Systems Engineer" image="/tanishq.jpeg" bio="Founder and lead engineer with eight years of hands-on experience across full-stack web development, distributed systems, game engines, and server infrastructure. For Equinox, the focus is a clear, responsive interface around reliable workload and node orchestration." stack={tanishq} />
         <PersonCard name="AAROH DHARMADHIKARI" role="AI & Data Science Developer" image="/aaroh.png" bio="Aaroh Dharmadhikari is an AI and Data Science undergraduate building intelligent, practical, and scalable software at the intersection of AI, machine learning, NLP, and full-stack development. He designs reliable applications, deep-learning systems, and language technology that turn complex problems into meaningful real-world impact." stack={["Python", "Machine Learning", "NLP", "Deep Learning", "Telemetry", "Workload Migration", "Data Science", "Full-Stack Development", "Power Efficiency"]} />
      </div>
    </section>
    <footer><span className="logo">EQUINOX</span><span>ALGORITHMIC ENERGY-AWARE WORKLOAD ORCHESTRATION</span><span>© 2026</span></footer>
  </main>;
}