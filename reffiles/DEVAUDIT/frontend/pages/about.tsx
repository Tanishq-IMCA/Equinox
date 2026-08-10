"use client";

import { motion, useMotionValue, useTransform, useMotionTemplate, animate, type MotionValue } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { Header } from "@/components/Landing/Header";
import { Footer } from "@/components/Landing/Footer";
import GlitchyText from "@/components/ui/GlitchyText";
import Image from "next/image";
import Link from "next/link";
import { getTechInfo } from "@/lib/techConfig";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const, delay: i * 0.1 },
  }),
};

const cardReveal = {
  hidden: { opacity: 0, y: 40, scale: 0.98 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: i * 0.15 },
  }),
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const tagItem = {
  hidden: { opacity: 0, scale: 0.8, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.4 } },
};

const DEVELOPERS = [
  {
    name: "TANISHQ",
    tag: "Full-Stack Systems Engineer",
    tagHint: "Architecture, backend systems, game development & cloud infrastructure",
    image: "/tanishq.jpeg",
    age: 23,
    education: "Vishwakarma University, Final Year",
    experience: "Founder & Lead Engineer — IMCA (Software, Game & Server Solutions) | 8 Years",
    experienceBadge: "IMCA",
    body: "A results-driven systems engineer with eight years of hands-on experience spanning full-stack web development, distributed systems, game engines, and server infrastructure. Built and scaled a multi-disciplinary solutions network from the ground up, covering software architecture, QA, IT operations, HR, networking, and cloud-native deployments. Deeply proficient across the JavaScript, Python, C++, and Java ecosystems, with production-grade work in React, Node.js, MongoDB, Express, and Kubernetes. Spent the last three years actively developing games across Unreal Engine, Unity, and Godot, with Unreal Engine as the primary focus. Strong background in data structures, networking protocols, and system architecture, consistently delivering reliable, scalable products across web, cloud, and interactive media.\n\nBeyond engineering breadth, the focus is on building features that feel seamless from the first click to the final report. Every interaction is designed to be smooth, intentional, and distraction-free — quality over quantity. Instead of packing the interface with noise, the platform prioritizes clarity, motion, and responsiveness so that developers can audit their craft without friction. This obsession with polish extends through the entire stack: carefully considered UI transitions, consistent typography, accessible contrast, and backend flows that stay out of the way. The result is software that respects the user's time and rewards attention with a calm, professional experience.",
    techStack: ["MongoDB", "Express", "React", "Node.js", "Kubernetes", "Java", "Python", "C++", "C", "JavaScript", "SwiftUI"],
    skills: ["DSA", "Networking", "Software Architecture", "Full Stack Development", "Game Development", "Unreal Engine", "Unity", "Godot"],
    email: "tanishq.wanderer@icloud.com",
    linkedin: "https://www.linkedin.com/in/tanishqgiri/",
    github: "Tanishq-IMCA",
  },
];

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <path d="m22 6-10 7L2 6" />
    </svg>
  );
}

function SocialButton({
  href,
  icon,
  label,
  external = true,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  external?: boolean;
}) {
  return (
    <motion.a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      whileHover={{ scale: 1.03, y: -1 }}
      whileTap={{ scale: 0.97 }}
      className="group flex items-center gap-2 px-3 py-2 border border-white/[0.08] bg-white/[0.06] backdrop-blur-sm text-white/50 hover:text-white/95 hover:border-white/[0.22] hover:bg-white/[0.14] transition-all duration-300"
      style={{ borderRadius: "1px" }}
      title={label}
    >
      {icon}
      <span
        className="text-[9px] uppercase tracking-[0.24em]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {label}
      </span>
    </motion.a>
  );
}

function TechTag({ label }: { label: string }) {
  const info = getTechInfo(label);
  return (
    <motion.div
      variants={tagItem}
      whileHover={{ scale: 1.05, y: -2 }}
      className="flex items-center gap-1.5 px-3 py-2 border text-xs transition-all duration-300 cursor-default"
      style={{
        borderRadius: "1px",
        fontFamily: "var(--font-mono)",
        borderColor: info.color,
        backgroundColor: "transparent",
        color: info.color,
      }}
    >
      {info.icon && <span style={{ color: info.color }}>{info.icon}</span>}
      {label}
    </motion.div>
  );
}

function DevelopmentTimeline() {
  const phases = [
    {
      phase: "01",
      title: "Foundation & Architecture",
      body: "Defined the system as a Next.js frontend, an Express/Prisma API, and a PostgreSQL database. Established the repository, user, and analysis models early so every later feature could anchor to a clean schema.",
    },
    {
      phase: "02",
      title: "Authentication & Security",
      body: "Built JWT-based sessions with secure httpOnly cookies, added GitHub OAuth for frictionless repository access, and implemented PAT validation so users can grant scoped, revocable access without sharing passwords.",
    },
    {
      phase: "03",
      title: "Repository Integration",
      body: "Connected to the GitHub API to fetch metadata, language stats, topics, and commit history. The backend stores only lightweight summaries; raw source is pulled on-demand and never persisted in our database.",
    },
    {
      phase: "04",
      title: "Analysis Engine",
      body: "Implemented deterministic static analysis across complexity, security, coupling, and maintainability dimensions. Results are scored by severity and normalized so they can be compared across repositories of any size.",
    },
    {
      phase: "05",
      title: "AI Summary Layer",
      body: "Added an LLM-driven summary layer that turns raw scan metrics into human-readable findings. It classifies issues, suggests next steps, and compares the actual codebase against the skills claimed in the developer profile.",
    },
    {
      phase: "06",
      title: "Dashboard & Reports",
      body: "Shipped a real-time dashboard with scan progress, result cards, and an exportable PDF report. The interface uses glassmorphism, motion transitions, and responsive layouts to present audit data cleanly.",
    },
  ];

  const [mounted, setMounted] = useState(false);
  const [track, setTrack] = useState({ top: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const firstDotRef = useRef<HTMLDivElement>(null);
  const lastDotRef = useRef<HTMLDivElement>(null);
  const duration = 12;
  const progress = useMotionValue(0);
  const fillHeight = useTransform(progress, [0, 1], ["0%", "100%"]);

  useEffect(() => {
    setMounted(true);
    const measure = () => {
      const container = containerRef.current;
      const first = firstDotRef.current;
      const last = lastDotRef.current;
      if (!container || !first || !last) return;
      const cRect = container.getBoundingClientRect();
      const fRect = first.getBoundingClientRect();
      const lRect = last.getBoundingClientRect();
      setTrack({
        top: fRect.top - cRect.top + fRect.height / 2,
        height: lRect.top - fRect.top,
      });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    const controls = animate(progress, 1, {
      duration,
      ease: "linear",
      repeat: Infinity,
      repeatType: "loop",
    });
    return controls.stop;
  }, [progress]);

  return (
    <div ref={containerRef} className="relative max-w-3xl mx-auto">
      {mounted && (
        <div
          className="absolute left-[28px] md:left-9 w-[2px] bg-white/[0.08] overflow-hidden"
          style={{ top: track.top, height: track.height }}
        >
          <motion.div
            className="absolute left-0 top-0 w-full"
            style={{
              height: fillHeight,
              backgroundColor: "var(--accent)",
              boxShadow: "0 0 14px rgba(16,185,129,0.6), 0 0 28px rgba(16,185,129,0.25)",
            }}
          />
        </div>
      )}

      <div className="space-y-10 pl-16 md:pl-24">
        {phases.map((phase, i) => (
          <div key={phase.phase} className="relative">
            <div
              ref={i === 0 ? firstDotRef : i === phases.length - 1 ? lastDotRef : undefined}
              className="absolute left-[-41px] md:left-[-65px] top-1.5 w-3 h-3 rounded-full border border-white/[0.15] bg-white/[0.06] backdrop-blur-md z-10"
            />
            <TimelineCard phase={phase} index={i} total={phases.length} progress={progress} />
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineCard({
  phase,
  index,
  total,
  progress,
}: {
  phase: { phase: string; title: string; body: string };
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  const threshold = index / (total - 1);
  const isActive = useTransform<number, number>(progress, (p) => (p >= threshold ? 1 : 0));

  return (
    <motion.div
      className="relative flex-1 p-5 md:p-6 border bg-white/[0.05] backdrop-blur-md overflow-hidden"
      style={{
        borderRadius: "2px",
        borderColor: useTransform(isActive, [0, 1], ["rgba(255,255,255,0.08)", "rgba(16,185,129,0.55)"]),
        boxShadow: useMotionTemplate`0 0 ${useTransform(isActive, [0, 1], [0, 28])}px rgba(16,185,129,${useTransform(isActive, [0, 1], [0, 0.35])})`,
      }}
    >
      {/* Inner sweep reflection */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)",
          opacity: useTransform(isActive, [0, 0.5, 1], [0, 1, 0]),
          x: useTransform(isActive, [0, 1], ["-100%", "100%"]),
        }}
      />
      <p
        className="text-[10px] uppercase tracking-[0.44em] mb-2"
        style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}
      >
        Phase {phase.phase}
      </p>
      <h3
        className="text-lg md:text-xl text-white tracking-[0.08em] uppercase mb-3"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {phase.title}
      </h3>
      <p className="text-sm leading-7 text-white/40" style={{ fontFamily: "var(--font-body)" }}>
        {phase.body}
      </p>
    </motion.div>
  );
}

function InfoCard({ dev, index }: { dev: typeof DEVELOPERS[0]; index: number }) {
  return (
    <motion.div
      custom={index}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      variants={cardReveal}
      className="group relative overflow-hidden border border-white/[0.08] bg-white/[0.08] backdrop-blur-md transition-all duration-500 hover:border-white/[0.18] hover:bg-white/[0.14]"
      style={{ borderRadius: "2px" }}
    >
      {/* Accent hover line */}
      <motion.div
        className="absolute top-0 left-0 h-[1px] bg-gradient-to-r from-accent/70 to-transparent"
        initial={{ width: "0%" }}
        whileHover={{ width: "100%" }}
        transition={{ duration: 0.6 }}
      />

      <div className="flex flex-col md:flex-row">
        {/* Left column — identity */}
        <div className="w-full md:w-[200px] flex-shrink-0 p-6 md:p-7 border-b md:border-b-0 md:border-r border-white/[0.08] bg-white/[0.04] backdrop-blur-md flex flex-col items-center md:items-start text-center md:text-left">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="relative w-[140px] h-[175px] overflow-hidden border border-accent/25 mb-4"
            style={{ borderRadius: "1px", boxShadow: "0 0 0 1px rgba(16,185,129,0.12), 0 0 20px rgba(16,185,129,0.08)" }}
          >
            <Image
              src={dev.image}
              alt={dev.name}
              width={140}
              height={175}
              unoptimized
              className="object-cover object-center grayscale-[20%] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105"
            />
          </motion.div>

          <h3
            className="text-xl tracking-[0.12em] uppercase text-white mb-2 drop-shadow-[0_1px_8px_rgba(0,0,0,0.5)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {dev.name}
          </h3>

          <div className="group/tag relative">
            <span
              className="inline-block px-2.5 py-1 text-[9px] uppercase tracking-[0.22em] border border-white/[0.12] bg-white/[0.08] backdrop-blur-md text-white/65 hover:bg-white/[0.14] hover:text-white/90 transition-all"
              style={{ fontFamily: "var(--font-display)", borderRadius: "1px" }}
            >
              {dev.tag}
            </span>
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-max max-w-[220px] px-3 py-2 text-[10px] leading-relaxed text-white/90 bg-slate-950/80 border border-white/[0.15] backdrop-blur-lg opacity-0 group-hover/tag:opacity-100 transition-opacity duration-300 pointer-events-none z-30 shadow-2xl"
              style={{ borderRadius: "1px", fontFamily: "var(--font-body)" }}
            >
              {dev.tagHint}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap justify-center md:justify-start gap-2">
            <SocialButton
              href={dev.linkedin}
              icon={<LinkedInIcon className="w-3.5 h-3.5" />}
              label="LinkedIn"
            />
            <SocialButton
              href={`https://github.com/${dev.github}`}
              icon={<GitHubIcon className="w-3.5 h-3.5" />}
              label="GitHub"
            />
            <SocialButton
              href={`mailto:${dev.email}`}
              icon={<MailIcon className="w-3.5 h-3.5" />}
              label="Email"
              external={false}
            />
          </div>
        </div>

        {/* Right column — details */}
        <div className="flex-1 p-6 md:p-8 flex flex-col justify-center">
          <div className="mb-5">
            <p
              className="text-[9px] uppercase tracking-[0.34em] mb-3"
              style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}
            >
              Work Experience
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <span
                className="px-3 py-1.5 text-[10px] uppercase tracking-[0.26em] border border-white/[0.10] bg-white/[0.06] backdrop-blur-sm text-white/70"
                style={{ fontFamily: "var(--font-display)", borderRadius: "1px" }}
              >
                {dev.experienceBadge}
              </span>
              <p
                className="text-xs text-white/35"
                style={{ fontFamily: "var(--font-body)" }}
              >
                {dev.experience}
              </p>
            </div>
            <p className="mt-3 text-xs text-white/45" style={{ fontFamily: "var(--font-body)" }}>
              Age {dev.age} · {dev.education}
            </p>
          </div>

          <div className="h-px w-full bg-white/[0.08] mb-5" />

          <div className="mb-5">
            <p
              className="text-[9px] uppercase tracking-[0.34em] mb-3"
              style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}
            >
              Tech Stack
            </p>
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="flex flex-wrap gap-2"
            >
              {dev.techStack.map((tech) => (
                <TechTag key={tech} label={tech} />
              ))}
            </motion.div>
          </div>

          <div className="h-px w-full bg-white/[0.08] mb-5" />

          <div className="mb-4">
            <p
              className="text-[9px] uppercase tracking-[0.34em] mb-3"
              style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}
            >
              Skills
            </p>
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="flex flex-wrap gap-2"
            >
              {dev.skills.map((skill) => (
                <TechTag key={skill} label={skill} />
              ))}
            </motion.div>
          </div>

          <div className="h-px w-full bg-white/[0.08] mb-5" />

          <div
            className="text-sm leading-7 text-white/45"
            style={{ fontFamily: "var(--font-body)", whiteSpace: 'pre-line' }}
          >
            {dev.body}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function AboutPage() {
  return (
    <main className="min-h-screen">
      <Header />

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-40 pb-20">
        <div className="max-w-4xl">
          <motion.p
            custom={0}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="text-[10px] uppercase tracking-[0.44em] mb-5"
            style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}
          >
            About RepoSight
          </motion.p>
          <motion.h1
            custom={1}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="text-4xl md:text-6xl text-white tracking-[0.07em] uppercase leading-[1.08]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <GlitchyText text="AUDIT YOUR CRAFT" />
            <br />
            <span className="text-white/35">
              <GlitchyText text="PROVE THE WORK" />
            </span>
          </motion.h1>
          <motion.p
            custom={2}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mt-7 max-w-2xl text-sm leading-7 text-white/40"
            style={{ fontFamily: "var(--font-body)" }}
          >
            RepoSight is an AI-powered developer audit platform. It scans your GitHub repositories,
            measures code quality, security exposure and complexity, then cross-references your
            actual work against the skills you claim. The result is an honest, evidence-based
            assessment of where you stand — and where to improve.
          </motion.p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6">
        <div className="h-px bg-white/[0.08]" />
      </div>

      {/* Vision */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="grid md:grid-cols-2 gap-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <p
              className="text-[10px] uppercase tracking-[0.44em] mb-4"
              style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}
            >
              The Vision
            </p>
            <h2
              className="text-2xl md:text-4xl text-white tracking-[0.07em] uppercase"
              style={{ fontFamily: "var(--font-display)" }}
            >
              <GlitchyText text="Make every developer accountable to their own code" />
            </h2>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="space-y-5"
          >
            <p className="text-sm leading-7 text-white/40" style={{ fontFamily: "var(--font-body)" }}>
              We believe static analysis should not be reserved for enterprise teams. RepoSight
              brings production-grade auditing to individual developers, students and hiring teams
              — with clear severity levels, real-time scan progress, and exportable reports.
            </p>
            <p className="text-sm leading-7 text-white/40" style={{ fontFamily: "var(--font-body)" }}>
              The problem is simple: resumes lie, portfolios are curated, and interviewers rarely
              have time to read real code. RepoSight solves this by reading the code for them,
              surfacing bugs, architectural patterns and security risks in seconds.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6">
        <div className="h-px bg-white/[0.08]" />
      </div>

      {/* Development */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="grid md:grid-cols-2 gap-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <p
              className="text-[10px] uppercase tracking-[0.44em] mb-4"
              style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}
            >
              Development
            </p>
            <h2
              className="text-2xl md:text-4xl text-white tracking-[0.07em] uppercase"
              style={{ fontFamily: "var(--font-display)" }}
            >
              <GlitchyText text="How RepoSight was made" />
            </h2>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="space-y-5"
          >
            <p className="text-sm leading-7 text-white/40" style={{ fontFamily: "var(--font-body)" }}>
              RepoSight was built as a full-stack audit pipeline. A Next.js frontend handles the user experience and dashboard, while an Express backend powered by Prisma and PostgreSQL manages authentication, repository metadata, and scan state. GitHub OAuth and PAT flows allow users to import repositories without storing source code — only metadata and scan results are persisted.
            </p>
            <p className="text-sm leading-7 text-white/40" style={{ fontFamily: "var(--font-body)" }}>
              The analysis engine combines deterministic static checks with an AI summary layer. It measures complexity, security exposure, and maintainability across the repository, then cross-references the findings against the skills listed in the developer profile. The result is an evidence-based audit that highlights strengths, exposes gaps, and produces a professional, exportable report.
            </p>
          </motion.div>
        </div>

        <div className="mt-20">
          <DevelopmentTimeline />
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6">
        <div className="h-px bg-white/[0.08]" />
      </div>

      {/* Developers */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-14"
        >
          <p
            className="text-[10px] uppercase tracking-[0.44em] mb-4"
            style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}
          >
            The Team
          </p>
          <h2
            className="text-3xl md:text-4xl text-white tracking-[0.07em] uppercase"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <GlitchyText text="The Developers Behind It" />
          </h2>
        </motion.div>

        <div className="grid gap-6">
          {DEVELOPERS.map((dev, i) => (
            <InfoCard key={dev.name} dev={dev} index={i} />
          ))}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6">
        <div className="h-px bg-white/[0.08]" />
      </div>

      {/* Closing */}
      <section className="max-w-7xl mx-auto px-6 py-28 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="max-w-2xl mx-auto"
        >
          <p
            className="text-[10px] uppercase tracking-[0.44em] mb-4"
            style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}
          >
            What’s next
          </p>
          <h2
            className="text-3xl md:text-5xl text-white tracking-[0.07em] uppercase mb-6"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <GlitchyText text="Built by builders" />
            <br />
            <span className="text-white/35">
              <GlitchyText text="for builders" />
            </span>
          </h2>
          <p className="text-sm leading-7 text-white/35" style={{ fontFamily: "var(--font-body)" }}>
            RepoSight is a self-funded, independent project. We are shipping features fast, keeping the
            design minimal, and making the audit experience honest. If you want to follow the build,
            reach out — we read every email.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 mt-8 px-5 py-2.5 border border-white/[0.10] bg-white/[0.06] text-white/70 hover:text-white hover:border-white/[0.25] hover:bg-white/[0.12] transition-all duration-300 text-[10px] uppercase tracking-[0.26em]"
            style={{ fontFamily: "var(--font-display)", borderRadius: "1px" }}
          >
            ← Back to homepage
          </Link>
        </motion.div>
      </section>

      <Footer />
    </main>
  );
}
