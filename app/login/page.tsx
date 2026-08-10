"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const LOGIN_EMAIL = "Tanishq.wanderer@gmail.com";
const LOGIN_PASSWORD = "Infiniteminecraftersnetwork@1234";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (email.trim().toLowerCase() === LOGIN_EMAIL.toLowerCase() && password === LOGIN_PASSWORD) {
      localStorage.setItem("equinox-auth", "active");
      router.push("/dashboard");
      return;
    }
    setError("Access denied. Check your credentials.");
  }

  return <main className="auth-page">
    <div className="wallpaper"><i /><i /><i /><i /><i /></div>
    <header className="header"><a className="logo" href="/">EQUINOX</a><a className="header-cta" href="/">Return home <span>↗</span></a></header>
    <section className="auth-card glass">
      <p className="eyebrow"><span className="pulse" /> NEXUS / SECURE ACCESS</p>
      <h1>ENTER THE<br /><span className="accent">SYSTEM.</span></h1>
      <p className="auth-copy">Authenticate to view live cluster intelligence and energy-aware workload controls.</p>
      <form onSubmit={submit}>
        <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="operator@equinox.systems" required /></label>
        <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••••••" required /></label>
        {error && <p className="auth-error">{error}</p>}
        <button className="button primary" type="submit">Authenticate <span>→</span></button>
      </form>
    </section>
  </main>;
}