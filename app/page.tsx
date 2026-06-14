"use client";

import confetti from "canvas-confetti";
import { useEffect, useRef, useState } from "react";

/* ─── Confetti ─── */
function fireConfetti() {
  const colors = ["#d9743f", "#e89866", "#bd5e2a", "#1a1d24"];
  const common = { particleCount: 90, spread: 80, startVelocity: 70, ticks: 420, colors, scalar: 1.5, gravity: 0.85 };
  confetti({ ...common, origin: { x: 0, y: 1 }, angle: 60 });
  confetti({ ...common, origin: { x: 1, y: 1 }, angle: 120 });
  setTimeout(() => {
    confetti({ ...common, particleCount: 65, origin: { x: 0, y: 1 }, angle: 60 });
    confetti({ ...common, particleCount: 65, origin: { x: 1, y: 1 }, angle: 120 });
  }, 200);
}

/* ─── Scroll Reveal ─── */
function useScrollReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/* ─── Hero anim trigger ─── */
function useHeroAnim() {
  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.body.setAttribute("data-anim-ready", "");
    }));
    return () => document.body.removeAttribute("data-anim-ready");
  }, []);
}

/* ─── Theme Toggle ─── */
function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);
  function toggle() {
    const isDark = document.documentElement.classList.toggle("dark");
    setDark(isDark);
    try { localStorage.setItem("relay-theme", isDark ? "dark" : "light"); } catch {}
  }
  return { dark, toggle };
}

/* ─── SVG helpers ─── */
const CheckSvg = () => (
  <svg viewBox="0 0 16 16" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 8.5l3.2 3L13 5" />
  </svg>
);
const CheckSmSvg = () => (
  <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 8.5l3.2 3L13 5" />
  </svg>
);
const ArrowSvg = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 8h10M9 4l4 4-4 4" />
  </svg>
);
const MailSvg = () => (
  <svg viewBox="0 0 18 18" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2.5" y="4" width="13" height="10" rx="1.5" />
    <path d="M3 5.5l6 4 6-4" />
  </svg>
);
const BrandSvg = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <circle cx="9" cy="12" r="5.3" stroke="currentColor" strokeWidth="2.1" />
    <circle cx="15" cy="12" r="5.3" stroke="currentColor" strokeWidth="2.1" />
  </svg>
);
const MoonSvg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
);
const SunSvg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

/* ─── Waitlist Form ─── */
function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const val = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      if (inputRef.current) {
        inputRef.current.style.transition = "box-shadow 200ms";
        inputRef.current.style.boxShadow = "0 0 0 2px rgba(217,116,63,0.5)";
        setTimeout(() => { if (inputRef.current) inputRef.current.style.boxShadow = ""; }, 900);
      }
      return;
    }
    setLoading(true);
    try {
      await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: val }),
      });
    } catch {}
    setSent(true);
    setLoading(false);
    setEmail("");
    fireConfetti();
  }

  return (
    <form
      ref={formRef}
      id="cta-form"
      className={`cmd-input${sent ? " sent" : ""}`}
      onSubmit={handleSubmit}
      noValidate
    >
      <span className="cmd-icon" aria-hidden="true"><MailSvg /></span>
      <input
        ref={inputRef}
        type="email"
        placeholder="you@yourfirm.com"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-label="Email address"
      />
      <span className="kbd-hint">↵ to submit</span>
      <button type="submit" disabled={loading}>
        {sent ? "You're on the list" : loading ? "Joining…" : "Request Access"}
      </button>
    </form>
  );
}

/* ─── Showcase placeholder UI ─── */
function ShowcaseUI() {
  return (
    <div className="showcase-ui">
      <div className="showcase-sidebar">
        <div className="showcase-sidebar-label">Matters</div>
        <div className="showcase-sidebar-item active">
          <span>⚖</span> Thorngate v. Meridian
        </div>
        <div className="showcase-sidebar-item">
          <span>⚖</span> Rivera Estate
        </div>
        <div className="showcase-sidebar-item">
          <span>⚖</span> Jones Patent
        </div>
        <div className="showcase-sidebar-label" style={{ marginTop: 12 }}>Recent</div>
        <div className="showcase-sidebar-item">
          <span>💬</span> Citation check
        </div>
        <div className="showcase-sidebar-item">
          <span>💬</span> Brief analysis
        </div>
        <div className="showcase-sidebar-label" style={{ marginTop: 12 }}>Knowledge Base</div>
        <div className="showcase-sidebar-item">
          <span>📋</span> Case notes
        </div>
        <div className="showcase-sidebar-item">
          <span>📁</span> Documents (47)
        </div>
      </div>
      <div className="showcase-main-area">
        <div className="showcase-chat-bubble">
          Can you check the citation for City of Paris v. Abbott and verify it hasn't been overruled?
        </div>
        <div className="showcase-chat-bubble user" style={{ marginLeft: "auto" }}>
          City of Paris v. Abbott, 360 S.W.3d 567, 580–81 (Tex. App. 2012) is good law. Shepardized — no negative treatment. 4 citing references, all positive.
        </div>
        <div className="showcase-chat-bubble">
          What are the key deposition inconsistencies in Thorngate v. Meridian?
        </div>
        <div className="showcase-input-bar">
          <span>Ask me anything about this matter…</span>
          <span style={{ fontSize: 11, color: "var(--coral)", fontWeight: 500 }}>↵</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Feature art placeholders ─── */
function CitationArt() {
  return (
    <div className="art-citation">
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 4 }}>Citation Check · Thorngate v. Meridian</div>
      <div className="art-citation-case">
        <div style={{ fontWeight: 500, marginBottom: 6, color: "#1a1d24" }}>City of Paris v. Abbott, 360 S.W.3d 567, 580–81 (Tex. App. 2012)</div>
        <div style={{ fontSize: 12, color: "#50545e", lineHeight: 1.5 }}>"The duty of care extends to foreseeable plaintiffs within the zone of danger created by the defendant's negligent conduct…"</div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div className="art-citation-badge">
          <CheckSmSvg /> Verified locally
        </div>
        <span style={{ fontSize: 11, color: "var(--text-3)" }}>No negative treatment · 4 citing refs</span>
      </div>
      <div className="art-citation-case" style={{ borderLeft: "3px solid var(--coral)" }}>
        <div style={{ fontWeight: 500, marginBottom: 6, color: "#1a1d24" }}>TOC / TOA generated</div>
        <div style={{ fontSize: 12, color: "#50545e" }}>12 citations verified · 0 red flags · 2 caution flags</div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {["Brief.docx", "Motion.docx"].map(f => (
          <div key={f} style={{ background: "#f9f7f2", border: "1px solid #dad8d0", borderRadius: 6, padding: "6px 10px", fontSize: 11.5, color: "#50545e" }}>{f}</div>
        ))}
      </div>
    </div>
  );
}

function MatterArt() {
  return (
    <div className="art-matter">
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 16 }}>
        <div className="art-matter-prompt">
          Ask me anything about your matter ↵
        </div>
        <div className="art-matter-chips">
          {["Summarize the complaint", "Key deposition conflicts", "Timeline of events", "Argument strength"].map(c => (
            <div key={c} className="art-matter-chip">{c}</div>
          ))}
        </div>
      </div>
      <div style={{ background: "white", border: "1px solid #dad8d0", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#50545e" }}>
        <span style={{ fontWeight: 500, color: "#1a1d24" }}>47 documents indexed</span> · Matter knowledge base ready
      </div>
    </div>
  );
}

function KnowledgeArt() {
  return (
    <div className="art-knowledge">
      {[
        { title: "Key parties", body: "Plaintiff: Thorngate LLC · Defendant: Meridian Corp · Judge: Hon. R. Chen" },
        { title: "Theory of liability", body: "Breach of contract and fraudulent inducement. Misrepresentation in the Feb 2023 LOI." },
        { title: "Open questions", body: "• Timeline of board approval\n• Email chain from Q4 2022\n• Expert witness availability" },
        { title: "Deadlines", body: "Discovery cutoff: Aug 15 · Summary judgment: Oct 1 · Trial: Jan 12" },
      ].map(n => (
        <div key={n.title} className="art-knowledge-note">
          <div className="art-knowledge-note-title">{n.title}</div>
          <div className="art-knowledge-note-body" style={{ whiteSpace: "pre-line" }}>{n.body}</div>
        </div>
      ))}
    </div>
  );
}

function BillingArt() {
  return (
    <div className="art-billing">
      <div className="art-billing-header">
        <span>Matter</span>
        <span style={{ display: "flex", gap: 32 }}>
          <span>Hours</span><span>Amount</span><span>Status</span>
        </span>
      </div>
      {[
        { matter: "Thorngate v. Meridian", hrs: "2.4h", amt: "$840", status: "Approved" },
        { matter: "Rivera Estate", hrs: "1.1h", amt: "$385", status: "Review" },
        { matter: "Jones Patent", hrs: "0.6h", amt: "$210", status: "Approved" },
        { matter: "Chen v. Park", hrs: "3.2h", amt: "$1,120", status: "Review" },
      ].map(r => (
        <div key={r.matter} className="art-billing-row">
          <span className="matter">{r.matter}</span>
          <span className="hrs">{r.hrs}</span>
          <span className="amt">{r.amt}</span>
          <span className="status" style={r.status === "Approved" ? { background: "rgba(74,122,72,0.12)", color: "#4a7a48" } : {}}>{r.status}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Main Page ─── */
export default function Home() {
  useHeroAnim();
  useScrollReveal();
  const { dark, toggle } = useTheme();

  return (
    <>
      {/* ── NAV ── */}
      <nav className="nav">
        <div className="nav-inner">
          <a className="brand" href="#top">
            <span className="brand-mark" aria-hidden="true"><BrandSvg /></span>
            <span>Relay</span>
          </a>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#craft">Design</a>
            <a href="#privacy">Privacy</a>
            <a href="#pricing">Pricing</a>
          </div>
          <div className="nav-right">
            <button className="theme-toggle" onClick={toggle} type="button" aria-label="Toggle theme" title="Toggle theme">
              {dark ? <SunSvg /> : <MoonSvg />}
            </button>
            <a href="#waitlist" className="nav-cta">
              Join Waitlist <span className="kbd">↵</span>
            </a>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero" id="top">
        <div className="wrap hero-inner">
          <div className="hero-eyebrow">
            <span className="live" />
            Now in early access for attorneys
          </div>
          <h1 className="display h1">
            The AI legal<br />
            assistant that <span className="em">never</span><br />
            leaves your machine.
          </h1>
          <p className="lede">
            Relay runs entirely on your own computer — your files, your research, and your clients&apos; confidences never leave the building. The power of modern AI, with the discretion the profession demands.
          </p>
          <div className="hero-ctas">
            <a href="#waitlist" className="btn-primary">
              Join the Waitlist <ArrowSvg />
            </a>
          </div>
        </div>

        <div className="showcase">
          {/* Floating citation card */}
          <div className="float float-cite" aria-hidden="true">
            <div className="float-head">
              <span>Citation</span>
              <span className="badge">Verified</span>
            </div>
            <div className="float-body">
              <p className="cite-name">City of Paris v. Abbott, 360 S.W.3d 567, 580–81</p>
              <span className="cite-check">
                <CheckSmSvg /> Verified locally
              </span>
            </div>
          </div>

          {/* Floating billing card */}
          <div className="float float-billing" aria-hidden="true">
            <div className="fb-head">
              <span>Time today</span>
              <span className="live-dot">● Tracking</span>
            </div>
            <div className="fb-rows">
              <div className="fb-row"><span className="matter">Thorngate v. Meridian</span><span className="hrs">2.4h</span><span className="amt">$840</span></div>
              <div className="fb-row"><span className="matter">Rivera Estate</span><span className="hrs">1.1h</span><span className="amt">$385</span></div>
              <div className="fb-row"><span className="matter">Jones Patent</span><span className="hrs">0.6h</span><span className="amt">$210</span></div>
            </div>
          </div>

          {/* Status pill */}
          <div className="float-status" aria-hidden="true">
            <span className="ok-dot" />
            Private — nothing leaves this computer
          </div>

          {/* Main window */}
          <div className="showcase-main">
            <div className="showcase-bar">
              <div className="lights"><span /><span /><span /></div>
              <div className="showcase-title">relay — Thorngate v. Meridian</div>
              <div style={{ width: 50 }} />
            </div>
            <div className="showcase-screen">
              <ShowcaseUI />
            </div>
          </div>
        </div>
      </section>

      {/* ── MARQUEE STRIP ── */}
      <div className="strip" aria-hidden="true">
        <div className="strip-inner">
          <span>Privileged by design</span>
          <span>Bar-compliant by default</span>
          <span>Confidential, always</span>
          <span>Built for litigators</span>
          <span>Nothing leaves your office</span>
          <span>Client-ready work product</span>
          <span>Aligned with the ethics rules</span>
          <span>Yours alone</span>
          <span>Privileged by design</span>
          <span>Bar-compliant by default</span>
          <span>Confidential, always</span>
          <span>Built for litigators</span>
          <span>Nothing leaves your office</span>
          <span>Client-ready work product</span>
          <span>Aligned with the ethics rules</span>
          <span>Yours alone</span>
        </div>
      </div>

      {/* ── FEATURES ── */}
      <section className="features" id="features">
        <div className="wrap">

          {/* Feature 1: Smart Filing */}
          <div className="feature-row reveal">
            <div className="feature-copy">
              <div className="feature-meta">
                <span className="num">01</span>
                <span className="divider" />
                <span className="tag">Smart Filing</span>
              </div>
              <h2 className="display h2">File with <span className="em">confidence</span>.</h2>
              <p className="lede">Check every citation. Generate tables of contents and authorities in seconds. Evaluate argument strength before opposing counsel does — all without leaving your draft.</p>
              <ul className="feature-bullets" style={{ marginTop: 32 }}>
                <li><span className="ic"><CheckSvg /></span><span><b>Citation verification</b> — flags shepardized changes against the offline reporter snapshot bundled with Relay.</span></li>
                <li><span className="ic"><CheckSvg /></span><span><b>One-click TOA &amp; TOC</b> — extracted in your firm&apos;s house style. Export to .docx with formatting intact.</span></li>
                <li><span className="ic"><CheckSvg /></span><span><b>Argument strength scoring</b> — a tireless second read on every argument, entirely on your own computer.</span></li>
              </ul>
            </div>
            <div className="feature-art">
              <div className="feature-art-bar">
                <div className="lights"><span /><span /><span /></div>
                <span className="label">citation check · Thorngate v. Meridian</span>
              </div>
              <div className="feature-art-screen"><CitationArt /></div>
            </div>
          </div>

          {/* Feature 2: Document Analysis */}
          <div className="feature-row flip reveal">
            <div className="feature-copy">
              <div className="feature-meta">
                <span className="num">02</span>
                <span className="divider" />
                <span className="tag">Document Analysis</span>
              </div>
              <h2 className="display h2">A matter that <span className="em">thinks</span> with you.</h2>
              <p className="lede">Drop in a complaint, a deposition, or a 4000-page production. Relay reads it where it sits — your disk — and surfaces what changes the case.</p>
              <ul className="feature-bullets" style={{ marginTop: 32 }}>
                <li><span className="ic"><CheckSvg /></span><span><b>Deposition inconsistency detection</b> — surfaces conflicts with documented timelines.</span></li>
                <li><span className="ic"><CheckSvg /></span><span><b>Visualizations on demand</b> — generate timelines, party diagrams, and demonstratives from extracted facts.</span></li>
                <li><span className="ic"><CheckSvg /></span><span><b>Matter-level memory</b> — Relay remembers parties, deadlines, and strategy across every chat.</span></li>
              </ul>
            </div>
            <div className="feature-art">
              <div className="feature-art-bar">
                <div className="lights"><span /><span /><span /></div>
                <span className="label">matter workspace · ask anything</span>
              </div>
              <div className="feature-art-screen"><MatterArt /></div>
            </div>
          </div>

          {/* Feature 3: Research */}
          <div className="feature-row reveal">
            <div className="feature-copy">
              <div className="feature-meta">
                <span className="num">03</span>
                <span className="divider" />
                <span className="tag">Legal Research</span>
              </div>
              <h2 className="display h2">Research that respects <span className="em">jurisdiction</span>.</h2>
              <p className="lede">Find relevant cases and statutes that actually apply to your matter — informed by the parties, the venue, and the precedent you&apos;ve already built. All on your hardware.</p>
              <ul className="feature-bullets" style={{ marginTop: 32 }}>
                <li><span className="ic"><CheckSvg /></span><span><b>Jurisdiction-aware search</b> — never get a 5th Circuit answer to a Texas state question again.</span></li>
                <li><span className="ic"><CheckSvg /></span><span><b>Knowledge-base notes</b> — capture parties, theories, and open questions in your matter&apos;s brain.</span></li>
                <li><span className="ic"><CheckSvg /></span><span><b>Offline reporter coverage</b> — federal &amp; state through current term, bundled with the install.</span></li>
              </ul>
            </div>
            <div className="feature-art">
              <div className="feature-art-bar">
                <div className="lights"><span /><span /><span /></div>
                <span className="label">matter knowledge base</span>
              </div>
              <div className="feature-art-screen"><KnowledgeArt /></div>
            </div>
          </div>

          {/* Feature 4: Billing */}
          <div className="feature-row flip reveal">
            <div className="feature-copy">
              <div className="feature-meta">
                <span className="num">04</span>
                <span className="divider" />
                <span className="tag">Billing</span>
              </div>
              <h2 className="display h2">Passive billing that <span className="em">finds the hours</span> you lost.</h2>
              <p className="lede">Relay watches your work across matters — quietly, locally — and builds accurate time entries in the background. Review weekly. Bill on your schedule.</p>
              <ul className="feature-bullets" style={{ marginTop: 32 }}>
                <li><span className="ic"><CheckSvg /></span><span><b>Activity capture</b> — windows, files, and email subjects matched to matters automatically.</span></li>
                <li><span className="ic"><CheckSvg /></span><span><b>Confidence flags</b> — Relay surfaces low-confidence entries for your review before export.</span></li>
                <li><span className="ic"><CheckSvg /></span><span><b>Export-ready</b> — push approved entries to Clio, PracticePanther, or a clean CSV.</span></li>
              </ul>
            </div>
            <div className="feature-art">
              <div className="feature-art-bar">
                <div className="lights"><span /><span /><span /></div>
                <span className="label">billing · review &amp; approve</span>
              </div>
              <div className="feature-art-screen"><BillingArt /></div>
            </div>
          </div>

        </div>
      </section>

      {/* ── PRIVACY MANIFESTO ── */}
      <section className="privacy" id="privacy">
        <div className="wrap">
          <div className="privacy-head reveal">
            <span className="mono coral">The privacy promise</span>
            <h2 className="display h2">We never see anything.<br /><span className="dim">By design, not by policy.</span></h2>
            <p className="lede" style={{ margin: "16px auto 0", textAlign: "center" }}>
              Every promise below is built into how Relay works — not buried in a contract you have to take on trust. Disconnect from the internet and it keeps running, exactly the same.
            </p>
          </div>
          <div className="manifesto reveal" style={{ ["--delay" as string]: "100ms" }}>
            <div className="mani-row">
              <span className="mono idx">§ 01</span>
              <div className="copy">
                <h4>Inference is local.</h4>
                <p>Every AI inference runs on the processor in your own office. No prompt, no document, and no client detail ever leaves the machine. Disconnect from the internet and watch it keep working — nothing to take on faith.</p>
              </div>
            </div>
            <div className="mani-row">
              <span className="mono idx">§ 02</span>
              <div className="copy">
                <h4>Storage is local.</h4>
                <p>Briefs, contracts, depositions, and the matter knowledge base live in an encrypted vault on your disk. We don&apos;t have credentials, and we couldn&apos;t decrypt them if subpoenaed.</p>
              </div>
            </div>
            <div className="mani-row">
              <span className="mono idx">§ 03</span>
              <div className="copy">
                <h4>Training is prohibited.</h4>
                <p>Your work product is never used to train, fine-tune, or evaluate any model — ours or anyone else&apos;s. Telemetry is opt-in, anonymous, and limited to crash reports.</p>
              </div>
            </div>
            <div className="mani-row">
              <span className="mono idx">§ 04</span>
              <div className="copy">
                <h4>Compliance is the default state.</h4>
                <p>Relay&apos;s architecture maps cleanly to ABA Model Rule 1.6 and the analogous state rules. No additional configuration, no enterprise plan, no &ldquo;private mode&rdquo; toggle to forget.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CRAFT / DESIGN ── */}
      <section className="craft" id="craft">
        <div className="wrap">
          <div className="craft-head reveal">
            <span className="mono coral">User experience</span>
            <h2 className="display h2">An app that actually <span className="em">works</span>.</h2>
            <p>Most legal software is fine — right up until the moment you actually need it, and it stalls, hides the button, or sends you to a support queue. We care about that moment more than almost anyone in this industry. Relay is built to stay fast, dependable, and out of your way — so you can get back to the work that matters.</p>
          </div>
          <div className="craft-grid reveal" style={{ ["--delay" as string]: "100ms" }}>
            <div className="craft-col">
              <div className="ix">i.</div>
              <h3>Similar look, better feel</h3>
              <p>Relay looks like the tools you already know, so there&apos;s nothing to relearn — but every interaction is faster, calmer, and more considered than what you&apos;re used to.</p>
            </div>
            <div className="craft-col">
              <div className="ix">ii.</div>
              <h3>Customizable to fit anyone</h3>
              <p>Shape Relay around the way you actually practice. Tune the workspace, defaults, and shortcuts to fit your matters, your firm, and your habits — not the other way around.</p>
            </div>
            <div className="craft-col">
              <div className="ix">iii.</div>
              <h3>Lets you stay on track</h3>
              <p>Everything works the first time and stays out of your way, so your attention stays on the matter in front of you instead of on fighting the software.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="pricing" id="pricing">
        <div className="wrap">
          <div className="pricing-head reveal">
            <span className="mono coral">Pricing</span>
            <h2 className="display h2">Simple pricing. No usage games.</h2>
            <p>No per-query charges, no tokens to budget, no bargaining with sales. Unlimited everything, forever.</p>
          </div>

          <div className="price-card reveal" style={{ ["--delay" as string]: "100ms" }}>
            <div className="price-grid">
              <div className="price-left">
                <span className="ea-badge">
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--coral)", boxShadow: "0 0 8px var(--coral)", display: "inline-block" }} />
                  Early Demo
                </span>
                <div className="price-rows">
                  <div>
                    <div className="label">Early Demo Price</div>
                    <div className="amount">$50<span className="per">/ user / mo</span></div>
                    <div className="unit">lock in now — price holds for life of subscription</div>
                  </div>
                  <div>
                    <div className="label strike">Standard Price</div>
                    <div className="amount muted">$100<span className="per">/mo</span></div>
                    <div className="unit">per user / month</div>
                  </div>
                </div>
                <p className="price-note">Lock in early demo pricing today. Held for the life of your subscription — no annual price hikes, no surprise tiering. Workstation included via financing or bring your own.</p>
              </div>
              <div className="price-right">
                <ul className="feat-list">
                  {[
                    "Table of contents & authorities generation",
                    "Unlimited case research",
                    "Automatic time tracking & billing export",
                    "Unlimited document uploads",
                    "Matter-level workspaces",
                    "Future features at competitive pricing",
                  ].map((item) => (
                    <li key={item}>
                      <span className="check"><CheckSmSvg /></span>
                      {item}
                    </li>
                  ))}
                </ul>
                <a href="/billing" className="btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                  Get started <ArrowSvg />
                </a>
                <a
                  href="#waitlist"
                  style={{ display: "block", textAlign: "center", marginTop: 12, fontSize: 13.5, color: "var(--text-3)" }}
                >
                  or join the waitlist
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="cta" id="waitlist">
        <div className="wrap cta-inner">
          <span className="mono coral reveal">Early access</span>
          <h2 className="display h2 reveal" style={{ ["--delay" as string]: "60ms" }}>Be first in line.</h2>
          <p className="lede reveal" style={{ ["--delay" as string]: "120ms" }}>
            Rolling out to a small group of attorneys and support staff. Join the waitlist and lock in early access pricing.
          </p>
          <div className="reveal" style={{ ["--delay" as string]: "180ms" }}>
            <WaitlistForm />
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <div className="wrap">
          <div className="footer-inner">
            <div>
              <a className="brand" href="#top">
                <span className="brand-mark" aria-hidden="true"><BrandSvg /></span>
                <span>Relay</span>
              </a>
              <p className="footer-tagline">The AI legal assistant that runs entirely on your machine.</p>
            </div>
            <div>
              <h5>Product</h5>
              <ul>
                <li><a href="#features">Features</a></li>
                <li><a href="#craft">Design</a></li>
                <li><a href="#privacy">Privacy</a></li>
                <li><a href="#pricing">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h5>Company</h5>
              <ul>
                <li><a href="#">About</a></li>
                <li><a href="mailto:support@relay-law.com">Contact</a></li>
                <li><a href="#">Security</a></li>
              </ul>
            </div>
            <div>
              <h5>Resources</h5>
              <ul>
                <li><a href="#">Documentation</a></li>
                <li><a href="#">System requirements</a></li>
                <li><a href="#">Privacy whitepaper</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 Relay Legal Technologies, Inc. All rights reserved.</span>
            <span>Built for attorneys who keep secrets.</span>
          </div>
        </div>
      </footer>
    </>
  );
}
