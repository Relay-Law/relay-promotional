"use client";

import confetti from "canvas-confetti";
import { useEffect, useRef, useState } from "react";

/* ─── Confetti ─── */
function fireConfetti() {
  const colors = ["#d9743f", "#e89866", "#faf7f0", "#b85a28", "#c79a4a"];
  const common = { particleCount: 60, spread: 70, startVelocity: 55, ticks: 200, colors, scalar: 0.9 };
  confetti({ ...common, origin: { x: 0, y: 1 }, angle: 60 });
  confetti({ ...common, origin: { x: 1, y: 1 }, angle: 120 });
  setTimeout(() => {
    confetti({ ...common, particleCount: 40, origin: { x: 0, y: 1 }, angle: 60 });
    confetti({ ...common, particleCount: 40, origin: { x: 1, y: 1 }, angle: 120 });
  }, 180);
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

/* ─── Live "0 KB sent" status counter ─── */
function useLiveStatus() {
  const [uptime, setUptime] = useState("00:00");
  useEffect(() => {
    let secs = 0;
    const id = setInterval(() => {
      secs++;
      const mm = String(Math.floor(secs / 60)).padStart(2, "0");
      const ss = String(secs % 60).padStart(2, "0");
      setUptime(`${mm}:${ss}`);
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return uptime;
}

/* ─── SVG helpers ─── */
const CheckSmSvg = () => (
  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 8.5l3.2 3L13 5" />
  </svg>
);
const MailSvg = () => (
  <svg viewBox="0 0 18 18" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2.5" y="4" width="13" height="10" rx="1.5" />
    <path d="M3 5.5l6 4 6-4" />
  </svg>
);
const WebSvg = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3c2.6 2.5 2.6 15.5 0 18" />
    <path d="M12 3c-2.6 2.5-2.6 15.5 0 18" />
  </svg>
);
const MacSvg = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="4.5" />
    <path d="M12 3.5v8" />
    <path d="M7 8.5v1.4" />
    <path d="M16 8.5v1.4" />
    <path d="M8 14.5c1.6 1.7 6.4 1.7 8 0" />
  </svg>
);
const WindowsSvg = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <rect x="3" y="3" width="8" height="8" />
    <rect x="13" y="3" width="8" height="8" />
    <rect x="3" y="13" width="8" height="8" />
    <rect x="13" y="13" width="8" height="8" />
  </svg>
);

/* ─── Shared utility recipes ─── */
const wrap = "mx-auto max-w-[1280px] px-5 min-[600px]:px-6 min-[760px]:px-9";
const mono = "font-mono text-[11.5px] font-medium tracking-[0.12em] uppercase text-t3";
const display = "font-serif font-normal text-t1 m-0 leading-[0.95] tracking-[-0.03em] [&_em]:text-coral [&_em]:italic";
const h1Size = "text-[clamp(42px,9.4vw,132px)]";
const h2Size = "text-[clamp(38px,6vw,80px)] leading-[0.98]";
const lede =
  "font-sans text-[18.5px] leading-[1.5] text-t2 max-w-[56ch] font-normal [&_em]:italic [&_em]:font-serif [&_em]:text-t1 [&_em]:text-[1.05em]";
const arr = "font-serif italic tracking-normal normal-case leading-none font-normal";
const btnPrimary =
  "bg-coral text-white border-0 px-6 py-3.5 rounded-[7px] font-mono text-[11.5px] font-semibold tracking-[0.14em] uppercase inline-flex items-center gap-3.5 transition-[background-color,transform] duration-150 shadow-[0_14px_38px_-10px_var(--coral-glow)] hover:bg-coral-deep hover:-translate-y-px";

const floatBase =
  "absolute bg-surface border border-line-strong rounded-xl overflow-hidden z-[3] shadow-[0_1px_0_rgba(255,248,234,0.04)_inset,0_26px_64px_-22px_rgba(0,0,0,0.75),0_0_0_1px_rgba(217,116,63,0.10)]";

/* ─── Brand mark ─── */
const Brand = ({ className = "", markClassName = "h-[30px]" }: { className?: string; markClassName?: string }) => (
  <a className={`flex items-center ${className}`} href="#top" aria-label="Relay">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img className={`${markClassName} w-auto block rounded-[7px]`} src="/relay-logos/white_relay.svg" alt="Relay" />
  </a>
);

/* ─── Ornament hairline divider ─── */
function Orn({ className = "", children }: { className?: string; children: React.ReactNode }) {
  const line = "flex-1 h-px max-w-[220px] bg-[linear-gradient(90deg,transparent,var(--line-strong),transparent)]";
  return (
    <div className={`flex items-center justify-center gap-[18px] text-t3 font-serif text-[18px] ${className}`}>
      <span className={line} />
      {children}
      <span className={line} />
    </div>
  );
}

/* ─── Waitlist Form ─── */
function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const val = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      if (inputRef.current) {
        inputRef.current.focus();
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
    setName(val.split("@")[0]);
    setSent(true);
    setLoading(false);
    setEmail("");
    fireConfetti();
  }

  return (
    <form
      id="cta-form"
      className="reveal relative mx-auto flex max-w-[560px] items-center gap-3 rounded-xl border border-line-strong bg-surface p-[6px_6px_6px_18px] transition-[border-color,box-shadow] duration-[240ms] focus-within:border-coral focus-within:shadow-[0_0_0_4px_var(--coral-tint),0_24px_60px_-20px_var(--coral-glow)] max-[440px]:flex-wrap max-[440px]:p-2.5"
      style={{ ["--delay" as string]: "180ms" }}
      onSubmit={handleSubmit}
      noValidate
    >
      <span className="grid h-[18px] w-[18px] place-items-center text-t3" aria-hidden="true"><MailSvg /></span>
      <input
        ref={inputRef}
        type="email"
        placeholder={sent ? `See you soon, ${name}` : "you@yourfirm.com"}
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-label="Email address"
        className="flex-1 border-0 bg-transparent py-3.5 font-sans text-[15px] text-white outline-0 placeholder:text-t3 max-[440px]:min-w-0 max-[440px]:py-2.5"
      />
      <span className="font-mono text-[10.5px] tracking-[0.10em] text-t4 max-[540px]:hidden">↵ to send</span>
      <button
        type="submit"
        disabled={loading}
        className={`inline-flex items-center gap-2.5 whitespace-nowrap rounded-lg border-0 px-[18px] py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-white transition-colors duration-[180ms] disabled:cursor-default disabled:opacity-70 max-[440px]:basis-full max-[440px]:justify-center ${sent ? "bg-ok" : "bg-coral hover:bg-coral-deep"}`}
      >
        {sent ? (
          <>On the list <CheckSmSvg /></>
        ) : loading ? (
          "Joining…"
        ) : (
          <>Join the Waitlist <span className={`${arr} text-base`}>→</span></>
        )}
      </button>
    </form>
  );
}

/* ─── Main Page ─── */
export default function Home() {
  useScrollReveal();
  const uptime = useLiveStatus();

  return (
    <>
      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 border-b border-line bg-[rgba(10,8,6,0.82)] [backdrop-filter:saturate(140%)_blur(14px)] [-webkit-backdrop-filter:saturate(140%)_blur(14px)]">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-3 px-5 py-3 min-[600px]:gap-4 min-[600px]:px-6 min-[600px]:py-[14px] min-[760px]:gap-7 min-[760px]:px-9 min-[760px]:py-4">
          <Brand />
          <div className="hidden gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-t2 min-[880px]:flex">
            {[
              ["i.", "Practice", "#features"],
              ["ii.", "Doctrine", "#privacy"],
              ["iii.", "Retainer", "#pricing"],
              ["iv.", "Access", "#waitlist"],
            ].map(([num, label, href]) => (
              <a key={href} href={href} className="rounded px-3 py-1.5 transition-colors duration-[180ms] hover:bg-white/[0.04] hover:text-t1">
                <span className="mr-1.5 font-serif italic normal-case tracking-normal text-coral">{num}</span>
                {label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3.5">
            <a
              href="#waitlist"
              className="inline-flex items-center gap-2.5 rounded-md border border-coral bg-transparent px-4 py-[9px] font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-coral transition-[background-color,color,box-shadow,border-color] duration-150 hover:border-coral hover:bg-coral hover:text-white hover:shadow-[0_0_0_1px_var(--coral),0_8px_26px_-6px_var(--coral-glow),0_0_22px_var(--coral-glow)] max-[600px]:px-[13px] max-[600px]:py-2 max-[600px]:text-[10px] max-[600px]:tracking-[0.10em]"
            >
              Join the Waitlist <span className={`${arr} text-[14px] max-[440px]:hidden`}>→</span>
            </a>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section
        className="relative overflow-hidden pt-8 pb-11 min-[600px]:pt-11 min-[600px]:pb-[52px] min-[760px]:pt-14 min-[760px]:pb-[60px]"
        id="top"
      >
        {/* masked grid backdrop */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 bg-[length:80px_80px] bg-[position:50%_0] bg-[linear-gradient(rgba(250,247,240,0.022)_1px,transparent_1px),linear-gradient(90deg,rgba(250,247,240,0.022)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_1100px_680px_at_50%_24%,black,transparent_72%)] [-webkit-mask-image:radial-gradient(ellipse_1100px_680px_at_50%_24%,black,transparent_72%)]"
        />

        <div className={`${wrap} relative z-[2]`}>
          <div className="relative pt-2 text-center">
            <div
              className="reveal mb-7 inline-flex items-center gap-3 font-mono text-[11.5px] uppercase tracking-[0.20em] text-coral max-[760px]:mb-[22px] max-[760px]:flex-wrap max-[760px]:justify-center max-[760px]:text-[10.5px] max-[760px]:tracking-[0.16em]"
              style={{ ["--delay" as string]: "0ms" }}
            >
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-coral shadow-[0_0_12px_var(--coral)]" />
              Now in early access · Web, macOS &amp; Windows
            </div>

            <h1 className={`reveal ${display} ${h1Size}`} style={{ ["--delay" as string]: "80ms" }}>
              Counsel<br />
              that <em>never</em> leaves<br />
              your machine.
              <span className="mt-[0.85em] block font-serif text-[0.18em] font-normal italic normal-case tracking-[-0.01em] text-t2">A local-first AI for the practice of law.</span>
            </h1>

            <p className={`reveal ${lede} mx-auto mt-7 text-center max-[600px]:mt-[22px] max-[600px]:text-base`} style={{ ["--delay" as string]: "160ms" }}>
              Relay runs <em>entirely</em> on your hardware. Upload anything. Track everything.
              Share nothing. Built for attorneys who truly care about their client&apos;s privacy.
            </p>

            <div className="reveal mt-11 flex items-center justify-center gap-3.5 max-[600px]:mt-8" style={{ ["--delay" as string]: "240ms" }}>
              <a href="#waitlist" className={`${btnPrimary} max-[600px]:w-full max-[600px]:justify-center`}>
                Join the Waitlist
                <span className={`${arr} text-[18px]`}>→</span>
              </a>
            </div>

            <div className="reveal mt-[30px] flex flex-wrap items-center justify-center gap-2.5 max-[600px]:mt-[22px] max-[600px]:gap-2" style={{ ["--delay" as string]: "320ms" }} aria-label="Available on Web, macOS, and Windows">
              <span className="mr-1 font-mono text-[11px] uppercase tracking-[0.14em] text-t4">Available on</span>
              {[
                [<WebSvg key="w" />, "Web"],
                [<MacSvg key="m" />, "macOS"],
                [<WindowsSvg key="win" />, "Windows"],
              ].map(([icon, label], i) => (
                <span key={i} className="inline-flex items-center gap-2 rounded-full border border-line-strong px-3.5 py-[7px] font-mono text-[11px] uppercase tracking-[0.12em] text-t2 [&>svg]:block [&>svg]:text-coral">
                  {icon}{label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* product showcase */}
        <div className="reveal relative mx-auto mt-[52px] max-w-[1320px] px-6 min-[600px]:mt-16 min-[760px]:mt-[92px] min-[760px]:px-9" style={{ ["--delay" as string]: "400ms" }}>
          {/* floating sub-cards */}
          <div className={`${floatBase} top-[12%] left-[-34px] w-[290px] rotate-[-3.5deg] motion-safe:animate-float-a max-[980px]:hidden`} aria-hidden="true">
            <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.10em] text-t3">
              <span>Citation</span>
              <span className="rounded-[3px] bg-coral-tint px-[7px] py-0.5 text-[9.5px] text-coral">Check Passed</span>
            </div>
            <div className="p-3.5">
              <p className="m-0 mb-3 font-serif text-base font-normal italic leading-[1.3] text-t1">City of Paris v. Abbott,<br />360 S.W.3d 567, 580–81</p>
              <span className="inline-flex items-center gap-2 rounded-[5px] bg-coral px-3 py-[7px] font-mono text-[11.5px] uppercase tracking-[0.10em] text-white">
                <CheckSmSvg />
                Verified locally
              </span>
            </div>
          </div>

          <div className={`${floatBase} bottom-[14%] right-[-34px] w-[270px] rotate-[2.5deg] p-0 motion-safe:animate-float-b max-[980px]:hidden`} aria-hidden="true">
            <div className="flex justify-between border-b border-line px-3.5 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.10em] text-t3">
              <span>Today&apos;s tracking</span><span className="text-[9px] text-ok">● LIVE</span>
            </div>
            <div className="divide-y divide-line py-2">
              {[
                ["Thorngate v. Meridian", "2.4h", "$840"],
                ["Rivera Estate", "1.1h", "$385"],
                ["Jones Patent", "0.6h", "$210"],
              ].map(([matter, hrs, amt]) => (
                <div key={matter} className="flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-t2">
                  <span className="flex-1 font-serif text-[14px] italic text-t1">{matter}</span>
                  <span className="font-mono text-[11px] text-t3">{hrs}</span>
                  <span className="font-mono text-[11px] font-semibold text-coral">{amt}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="absolute bottom-[-22px] left-[16%] z-[3] inline-flex items-center gap-3 rounded-full border border-line-strong bg-surface px-[18px] py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-t2 shadow-[0_24px_50px_-20px_rgba(0,0,0,0.6)] motion-safe:animate-float-c max-[980px]:left-1/2 max-[980px]:-translate-x-1/2 max-[980px]:animate-none" aria-hidden="true">
            <span className="h-[7px] w-[7px] animate-pulse-dot rounded-full bg-ok shadow-[0_0_10px_var(--ok)]" />
            0 KB sent · uptime {uptime} · local model
          </div>

          <div className="relative overflow-hidden rounded-[14px] border border-line-strong bg-surface [transform:perspective(2400px)_rotateX(2deg)] shadow-[0_1px_0_rgba(255,248,234,0.04)_inset,0_60px_130px_-32px_rgba(0,0,0,0.8),0_100px_200px_-40px_var(--coral-glow)] max-[980px]:[transform:none]">
            <div className="flex items-center gap-2.5 border-b border-line bg-surface-2 px-4 py-3">
              <div className="flex gap-[7px]">
                <span className="h-3 w-3 rounded-full bg-[#f15c4f]" />
                <span className="h-3 w-3 rounded-full bg-[#f1bc40]" />
                <span className="h-3 w-3 rounded-full bg-[#4cc94a]" />
              </div>
              <div className="flex-1 text-center font-mono text-[11.5px] tracking-[0.04em] text-t3 max-[600px]:text-[10px]">relay · Thorngate v. Meridian</div>
              <div className="w-[50px]" />
            </div>
            <div className="bg-[#f4f1e8]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="block h-auto w-full" src="/showcase/showcase-main.png" alt="Relay matter workspace for Thorngate v. Meridian, with a sidebar of matters, recent chats, knowledge base, and document library." />
            </div>
          </div>
        </div>
      </section>

      {/* ── MARQUEE STRIP ── */}
      <div className="mt-16 overflow-hidden border-y border-line bg-bg-1 py-6 min-[600px]:mt-[88px] min-[600px]:py-8 min-[760px]:mt-24 min-[1024px]:mt-[120px]" aria-hidden="true">
        <div className="flex animate-marquee items-center gap-0 whitespace-nowrap">
          {[0, 1].map((dup) => {
            const serif = "inline-flex items-center gap-[26px] px-[26px] font-serif text-[32px] italic tracking-[-0.02em] text-t1 max-[760px]:text-[26px] max-[600px]:gap-4 max-[600px]:px-4 max-[600px]:text-[22px]";
            const monoItem = "inline-flex items-center gap-[26px] px-[26px] font-mono text-[13px] uppercase tracking-[0.18em] text-t3 max-[600px]:gap-4 max-[600px]:px-4";
            const dot = "font-serif text-[28px] leading-none text-coral";
            return (
              <span key={dup} className="inline-flex items-center">
                <span className={serif}>Local-first.</span><span className={dot}>❦</span>
                <span className={monoItem}>Bar-compliant by default</span><span className={dot}>·</span>
                <span className={serif}>No cloud, ever.</span><span className={dot}>❦</span>
                <span className={monoItem}>Privileged by design</span><span className={dot}>·</span>
                <span className={serif}>Runs on your hardware.</span><span className={dot}>❦</span>
                <span className={monoItem}>Built for civil litigation</span><span className={dot}>·</span>
                <span className={serif}>Discovery-safe.</span><span className={dot}>❦</span>
                <span className={monoItem}>Air-gapped capable</span><span className={dot}>·</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* ── FEATURES ── */}
      <section className="pt-14 pb-4 min-[600px]:pt-[90px] min-[600px]:pb-[30px] min-[960px]:pt-[140px] min-[960px]:pb-[60px]" id="features">
        <div className={wrap}>
          <Orn className="reveal mb-24">
            <span className="italic text-coral">§</span>
            <span className={mono}>The Practice</span>
            <span className="italic text-coral">§</span>
          </Orn>

          {/* BOOK I — Filing Confidence */}
          <div className="reveal relative grid grid-cols-1 items-center gap-12 mb-[88px] min-[600px]:mb-[120px] min-[960px]:grid-cols-2 min-[960px]:gap-16 min-[960px]:mb-[180px] min-[1024px]:gap-[100px]">
            <div>
              <div className="mb-7 flex items-end gap-[18px] leading-none max-[600px]:mb-[22px] max-[600px]:gap-3.5">
                <span className="translate-y-2 font-serif text-[92px] italic leading-[0.8] tracking-[-0.03em] text-coral max-[760px]:text-[72px] max-[600px]:text-[60px]">I.</span>
                <div className="flex-1 border-t border-line-coral pt-3.5">
                  <div className="mb-1.5 font-mono text-[10.5px] uppercase tracking-[0.20em] text-coral">Book I &nbsp;·&nbsp; Of Filings</div>
                  <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-t3">Smart filing</div>
                </div>
              </div>
              <h2 className={`${display} ${h2Size} mb-5`}>File with <em>confidence.</em></h2>
              <p className={`${lede} mt-7 text-left`}>Check every citation. Generate tables of contents and authorities in seconds. Evaluate argument strength before opposing counsel does, all without leaving your draft.</p>
              <ul className="mt-9 flex list-none flex-col gap-0 border-t border-line p-0">
                {[
                  ["¶ 1", <><b className="mr-0.5 font-serif text-[17px] font-normal italic tracking-[-0.01em] text-t1">Citation verification</b> flags shepardized changes against the offline reporter snapshot bundled with Relay.</>],
                  ["¶ 2", <><b className="mr-0.5 font-serif text-[17px] font-normal italic tracking-[-0.01em] text-t1">One-click TOA &amp; TOC</b>, extracted in your firm&apos;s house style. Export to .docx with formatting intact.</>],
                  ["¶ 3", <><b className="mr-0.5 font-serif text-[17px] font-normal italic tracking-[-0.01em] text-t1">Argument strength scoring</b> gives an objective read on which arguments carry weight, computed locally.</>],
                ].map(([marker, body], i) => (
                  <li key={i} className="grid grid-cols-[32px_1fr] gap-3.5 border-b border-line px-1 py-4 text-[15px] leading-[1.5] text-t2">
                    <span className="pt-1.5 font-mono text-[10.5px] tracking-[0.1em] text-coral">{marker}</span>
                    <span>{body}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative overflow-hidden rounded-xl border border-line bg-surface shadow-[0_40px_100px_-30px_rgba(0,0,0,0.7),0_0_0_1px_rgba(217,116,63,0.05)]">
              <div aria-hidden="true" className="pointer-events-none absolute inset-[-1px] rounded-xl bg-[linear-gradient(135deg,rgba(217,116,63,0.18),transparent_50%)] opacity-50" />
              <div className="flex items-center gap-2.5 border-b border-line bg-surface-2 px-3.5 py-[11px]">
                <div className="flex gap-[7px]"><span className="h-2.5 w-2.5 rounded-full bg-[#f15c4f]" /><span className="h-2.5 w-2.5 rounded-full bg-[#f1bc40]" /><span className="h-2.5 w-2.5 rounded-full bg-[#4cc94a]" /></div>
                <span className="ml-1.5 font-mono text-[11px] tracking-[0.06em] text-t3">citation check · Thorngate v. Meridian</span>
              </div>
              <div className="relative h-[320px] overflow-hidden bg-white min-[960px]:h-[460px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="absolute" src="/showcase/citation.png" alt="Citation check panel showing case citation City of Paris v. Abbott alongside brief excerpt." style={{ top: 0, left: 0, width: "100%" }} />
              </div>
            </div>
          </div>

          {/* BOOK II — Document Analysis */}
          <div className="reveal relative grid grid-cols-1 items-center gap-12 mb-[88px] min-[600px]:mb-[120px] min-[960px]:grid-cols-2 min-[960px]:gap-16 min-[960px]:mb-[180px] min-[1024px]:gap-[100px]">
            <div>
              <div className="mb-7 flex items-end gap-[18px] leading-none max-[600px]:mb-[22px] max-[600px]:gap-3.5">
                <span className="translate-y-2 font-serif text-[92px] italic leading-[0.8] tracking-[-0.03em] text-coral max-[760px]:text-[72px] max-[600px]:text-[60px]">II.</span>
                <div className="flex-1 border-t border-line-coral pt-3.5">
                  <div className="mb-1.5 font-mono text-[10.5px] uppercase tracking-[0.20em] text-coral">Book II &nbsp;·&nbsp; Of Matters</div>
                  <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-t3">Document analysis</div>
                </div>
              </div>
              <h2 className={`${display} ${h2Size} mb-5`}>A matter that <em>thinks</em> with you.</h2>
              <p className={`${lede} mt-7 text-left`}>Drop in a complaint, a deposition, a 4,000-page production. Relay reads it where it sits, on your own disk, and surfaces what changes the case.</p>
              <ul className="mt-9 flex list-none flex-col gap-0 border-t border-line p-0">
                {[
                  ["¶ 1", <><b className="mr-0.5 font-serif text-[17px] font-normal italic tracking-[-0.01em] text-t1">Deposition inconsistency detection</b> surfaces conflicts with documented timelines.</>],
                  ["¶ 2", <><b className="mr-0.5 font-serif text-[17px] font-normal italic tracking-[-0.01em] text-t1">Visualizations on demand</b> generate timelines, party diagrams, and demonstratives from extracted facts.</>],
                  ["¶ 3", <><b className="mr-0.5 font-serif text-[17px] font-normal italic tracking-[-0.01em] text-t1">Matter-level memory</b> means Relay remembers parties, deadlines, and strategy across every chat.</>],
                ].map(([marker, body], i) => (
                  <li key={i} className="grid grid-cols-[32px_1fr] gap-3.5 border-b border-line px-1 py-4 text-[15px] leading-[1.5] text-t2">
                    <span className="pt-1.5 font-mono text-[10.5px] tracking-[0.1em] text-coral">{marker}</span>
                    <span>{body}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative overflow-hidden rounded-xl border border-line bg-surface shadow-[0_40px_100px_-30px_rgba(0,0,0,0.7),0_0_0_1px_rgba(217,116,63,0.05)] min-[960px]:order-first">
              <div aria-hidden="true" className="pointer-events-none absolute inset-[-1px] rounded-xl bg-[linear-gradient(135deg,rgba(217,116,63,0.18),transparent_50%)] opacity-50" />
              <div className="flex items-center gap-2.5 border-b border-line bg-surface-2 px-3.5 py-[11px]">
                <div className="flex gap-[7px]"><span className="h-2.5 w-2.5 rounded-full bg-[#f15c4f]" /><span className="h-2.5 w-2.5 rounded-full bg-[#f1bc40]" /><span className="h-2.5 w-2.5 rounded-full bg-[#4cc94a]" /></div>
                <span className="ml-1.5 font-mono text-[11px] tracking-[0.06em] text-t3">matter workspace · ask anything</span>
              </div>
              <div className="relative h-[320px] overflow-hidden bg-[#f3efe4] min-[960px]:h-[460px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="absolute" src="/showcase/matter.png" alt="Relay 'Ask me anything about your matter' prompt with first-upload suggestions and reminders." style={{ top: "5%", left: "4%", width: "92%" }} />
              </div>
            </div>
          </div>

          {/* BOOK III — Billing */}
          <div className="reveal relative grid grid-cols-1 items-center gap-12 mb-[88px] min-[600px]:mb-[120px] min-[960px]:grid-cols-2 min-[960px]:gap-16 min-[960px]:mb-[180px] min-[1024px]:gap-[100px]">
            <div>
              <div className="mb-7 flex items-end gap-[18px] leading-none max-[600px]:mb-[22px] max-[600px]:gap-3.5">
                <span className="translate-y-2 font-serif text-[92px] italic leading-[0.8] tracking-[-0.03em] text-coral max-[760px]:text-[72px] max-[600px]:text-[60px]">III.</span>
                <div className="flex-1 border-t border-line-coral pt-3.5">
                  <div className="mb-1.5 font-mono text-[10.5px] uppercase tracking-[0.20em] text-coral">Book III &nbsp;·&nbsp; Of Hours</div>
                  <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-t3">Billing</div>
                </div>
              </div>
              <h2 className={`${display} ${h2Size} mb-5`}>Passive billing that <em>finds the hours</em> you lost.</h2>
              <p className={`${lede} mt-7 text-left`}>Relay watches your work across matters, quietly and locally, and builds accurate time entries in the background. Review weekly. Bill on your schedule.</p>
              <ul className="mt-9 flex list-none flex-col gap-0 border-t border-line p-0">
                {[
                  ["¶ 1", <><b className="mr-0.5 font-serif text-[17px] font-normal italic tracking-[-0.01em] text-t1">Activity capture</b> matches windows, files, and email subjects to matters automatically.</>],
                  ["¶ 2", <><b className="mr-0.5 font-serif text-[17px] font-normal italic tracking-[-0.01em] text-t1">Confidence flags</b> surface low-confidence entries for your review before export.</>],
                  ["¶ 3", <><b className="mr-0.5 font-serif text-[17px] font-normal italic tracking-[-0.01em] text-t1">Export-ready entries</b> push to Clio, PracticePanther, or a clean CSV.</>],
                ].map(([marker, body], i) => (
                  <li key={i} className="grid grid-cols-[32px_1fr] gap-3.5 border-b border-line px-1 py-4 text-[15px] leading-[1.5] text-t2">
                    <span className="pt-1.5 font-mono text-[10.5px] tracking-[0.1em] text-coral">{marker}</span>
                    <span>{body}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative overflow-hidden rounded-xl border border-line bg-surface shadow-[0_40px_100px_-30px_rgba(0,0,0,0.7),0_0_0_1px_rgba(217,116,63,0.05)]">
              <div aria-hidden="true" className="pointer-events-none absolute inset-[-1px] rounded-xl bg-[linear-gradient(135deg,rgba(217,116,63,0.18),transparent_50%)] opacity-50" />
              <div className="flex items-center gap-2.5 border-b border-line bg-surface-2 px-3.5 py-[11px]">
                <div className="flex gap-[7px]"><span className="h-2.5 w-2.5 rounded-full bg-[#f15c4f]" /><span className="h-2.5 w-2.5 rounded-full bg-[#f1bc40]" /><span className="h-2.5 w-2.5 rounded-full bg-[#4cc94a]" /></div>
                <span className="ml-1.5 font-mono text-[11px] tracking-[0.06em] text-t3">billing · review &amp; approve</span>
              </div>
              <div className="relative h-[320px] overflow-hidden bg-[#f3efe4] min-[960px]:h-[460px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="absolute" src="/showcase/billing.png" alt="Billing review screen showing tracked time entries grouped by matter with hours, rate, and amount." style={{ top: "-4%", left: 0, width: "100%" }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRIVACY DOCTRINE ── */}
      <section className="relative overflow-hidden border-y border-line bg-bg-1 p-0" id="privacy">
        <div className="relative bg-paper text-paper-ink pt-16 pb-[72px] min-[600px]:pt-[88px] min-[600px]:pb-[96px] min-[760px]:pt-[120px] min-[760px]:pb-[130px]">
          {/* parchment fiber */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(120,80,40,0.05)_0,transparent_30%),radial-gradient(circle_at_88%_78%,rgba(217,116,63,0.07)_0,transparent_35%)]" />

          <div className={`${wrap} reveal relative mb-[52px] text-center min-[760px]:mb-[72px]`}>
            <span className={`${mono} !text-[rgba(27,20,13,0.55)]`}>The Privacy Doctrine</span>
            <h2 className={`${display} ${h2Size} mt-[18px] mb-[22px] text-paper-ink [&_em]:!text-coral-deep`}>
              <em>We never see anything.</em>
              <br />
              <span className="text-[rgba(27,20,13,0.55)]">By design, not by policy.</span>
            </h2>
            <p className="mx-auto max-w-[62ch] font-sans text-[16.5px] leading-[1.55] text-[rgba(27,20,13,0.65)] [&_em]:font-serif [&_em]:text-[1.08em] [&_em]:italic [&_em]:text-paper-ink">Every guarantee below is enforced at the <em>architecture</em> layer, not the contract layer. </p>
          </div>

          <div className="reveal relative z-[2] mx-auto max-w-[920px] px-9" style={{ ["--delay" as string]: "100ms" }}>
            {[
              ["I.", "Inference", <>Inference is <em>local.</em></>, <>Every AI inference runs on the computer in your office. No prompt, no document, no thought leaves the machine. <strong className="font-semibold text-paper-ink">Verify with your own packet capture.</strong></>],
              ["II.", "Storage", <>Storage is <em>local.</em></>, <>Your files stay on your disk in their original location. Relay reads them in place and never copies, syncs, or uploads. <strong className="font-semibold text-paper-ink">Nothing to breach, because nothing is centralized.</strong></>],
              ["III.", "Training", <>Training is <em>not</em> on your data.</>, <>Your work product is never used to train, fine-tune, or evaluate any model, whether ours or anyone else&apos;s. <strong className="font-semibold text-paper-ink">Telemetry is opt-in, anonymous, and limited to crash reports.</strong></>],
              ["IV.", "Compliance", <>Compliance is the <em>default</em> state.</>, <>Relay&apos;s architecture maps cleanly to ABA Model Rule 1.6 and the analogous state rules. <strong className="font-semibold text-paper-ink">No additional configuration, no enterprise plan, no &ldquo;private mode&rdquo; toggle to forget.</strong></>],
            ].map(([roman, tag, head, body], i, list) => (
              <div key={i} className={`grid grid-cols-1 items-baseline gap-3 border-t border-line-paper py-7 min-[720px]:grid-cols-[120px_1fr] min-[720px]:gap-9 min-[720px]:py-9 ${i === list.length - 1 ? "border-b border-line-paper" : ""}`}>
                <div className="font-serif text-[44px] italic leading-[0.9] tracking-[-0.03em] text-coral-deep min-[720px]:text-[56px]">
                  {roman}<small className="mt-2 block font-mono text-[10.5px] not-italic uppercase tracking-[0.20em] text-[rgba(27,20,13,0.5)]">{tag}</small>
                </div>
                <div>
                  <h4 className="m-0 mb-3.5 font-serif text-[30px] font-normal leading-[1.1] tracking-[-0.015em] text-paper-ink [&_em]:italic [&_em]:text-coral-deep">{head}</h4>
                  <p className="m-0 max-w-[64ch] text-base leading-[1.6] text-[rgba(27,20,13,0.72)]">{body}</p>
                </div>
              </div>
            ))}

            <div className="reveal mx-auto mt-16 max-w-[920px] border-t border-dashed border-line-paper-2 px-9 py-7 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-[rgba(27,20,13,0.55)]" style={{ ["--delay" as string]: "200ms" }}>
              <span className="mb-1.5 block font-serif text-[38px] normal-case italic tracking-[-0.02em] text-paper-ink">Enforced in code, not in a contract.</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING / RETAINER ── */}
      <section className="relative py-16 min-[600px]:py-[90px] min-[880px]:py-[140px]" id="pricing">
        <div className={wrap}>
          <div className="reveal mb-10 text-center min-[600px]:mb-14">
            <span className={`${mono} !text-coral`}>The Retainer</span>
            <h2 className={`${display} ${h2Size} mt-[18px] mb-[18px]`}>One price. <em>No usage games.</em></h2>
            <p className="m-0 text-base text-t2">No per-query charges. No contacting sales. Unlimited everything, forever at an affordable price.</p>
          </div>

          <div className="reveal relative mx-auto max-w-[1100px] overflow-hidden rounded-2xl border border-line-strong bg-surface shadow-[0_60px_120px_-40px_rgba(0,0,0,0.6)]" style={{ ["--delay" as string]: "100ms" }}>
            <div className="grid grid-cols-[1fr_auto] items-center border-b border-line bg-[rgba(217,116,63,0.04)] px-9 py-[22px] max-[600px]:gap-3 max-[600px]:px-5 max-[600px]:py-4 max-[440px]:grid-cols-1 max-[440px]:text-left">
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-t3">Early adopter pricing <b className="font-semibold text-coral">№ 2026-EA-001</b></div>
              <div className="inline-flex items-center gap-2.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-coral">
                <span className="h-2 w-2 rounded-full bg-coral shadow-[0_0_10px_var(--coral)]" />Limited time
              </div>
            </div>
            <div className="grid grid-cols-1 min-[880px]:grid-cols-[1.05fr_1fr]">
              <div className="relative border-line px-11 py-12 max-[600px]:px-[22px] max-[600px]:py-8 min-[880px]:border-r">
                <h3 className="m-0 mb-1.5 font-serif text-[28px] font-normal tracking-[-0.015em] text-t1 max-[600px]:text-2xl [&_em]:italic [&_em]:text-coral">Simple <em>pricing.</em></h3>
                <div className="mb-7 font-mono text-[10.5px] uppercase tracking-[0.16em] text-t3">Per user &nbsp;·&nbsp; billed monthly</div>

                <div className="grid grid-cols-1 gap-7 pt-2 min-[880px]:grid-cols-2">
                  <div>
                    <div className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.16em] text-t3">Early adopter</div>
                    <div className="mb-2.5 font-serif text-[64px] font-normal leading-[0.9] tracking-[-0.03em] text-t1 max-[600px]:text-[52px]"><em className="italic text-coral">$50</em><span className="ml-1 align-middle font-mono text-[13px] uppercase tracking-[0.10em] text-t3">/mo</span></div>
                  </div>
                  <div>
                    <div className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.16em] text-t3 line-through decoration-1">Standard</div>
                    <div className="mb-2.5 font-serif text-[64px] font-normal leading-[0.9] tracking-[-0.03em] text-t4 max-[600px]:text-[52px]"><span className="line-through decoration-[1.5px] decoration-[rgba(250,247,240,0.32)]">$200</span><span className="ml-1 align-middle font-mono text-[13px] uppercase tracking-[0.10em] text-t3">user/mo</span></div>
                  </div>
                </div>

                <div className="mt-9">
                  <p className="m-0 font-sans text-[13.5px] leading-[1.6] text-t3 [&_em]:font-serif [&_em]:text-[1.06em] [&_em]:italic [&_em]:text-t2">Lock in early adopter pricing today. <em>Held for the life of your subscription</em>. No annual price hikes, no surprise tiering.</p>
                </div>
              </div>

              <div className="bg-[rgba(217,116,63,0.03)] px-11 py-12 max-[600px]:px-[22px] max-[600px]:py-8">
                <div className="mb-[18px] font-mono text-[10.5px] uppercase tracking-[0.16em] text-t3">What&apos;s included</div>
                <ul className="m-0 mb-8 flex list-none flex-col gap-0 p-0">
                  {[
                    ["a.", <><em className="font-serif text-base italic text-coral-2">Tables</em> of contents &amp; authorities, generated</>],
                    ["b.", <><em className="font-serif text-base italic text-coral-2">Unlimited</em> case queries</>],
                    ["c.", <><em className="font-serif text-base italic text-coral-2">Automatic</em> time tracking &amp; billing export</>],
                    ["d.", <><em className="font-serif text-base italic text-coral-2">Unlimited</em> document uploads</>],
                    ["e.", <><em className="font-serif text-base italic text-coral-2">Matter-level</em> workspaces</>],
                    ["f.", <><em className="font-serif text-base italic text-coral-2">Future</em> features at competitive pricing</>],
                  ].map(([n, body], i) => (
                    <li key={i} className="grid grid-cols-[28px_1fr] items-baseline gap-3.5 border-b border-line px-1 py-3.5 text-[15px] leading-[1.4] text-t1 first:border-t">
                      <span className="font-mono text-[10.5px] font-semibold tracking-[0.10em] text-coral">{n}</span>
                      <span>{body}</span>
                    </li>
                  ))}
                </ul>
                <a href="/billing" className={`${btnPrimary} w-full justify-center`}>
                  Get started
                  <span className={`${arr} text-[18px]`}>→</span>
                </a>
                <a href="#waitlist" className="mt-3.5 block text-center font-mono text-[11px] uppercase tracking-[0.10em] text-t3 transition-colors duration-150 hover:text-coral">or join the waitlist</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="relative overflow-hidden border-t border-line pt-20 pb-[72px] text-center min-[600px]:pt-[100px] min-[600px]:pb-[88px] min-[760px]:pt-[150px] min-[760px]:pb-[130px]" id="waitlist">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_900px_540px_at_50%_60%,var(--coral-glow),transparent_70%)]" />
        <div className="relative z-[2] mx-auto max-w-[820px] px-5 min-[600px]:px-6 min-[760px]:px-9">
          <Orn className="reveal mb-7">
            <span className={`${mono} !text-coral`}>Early Access</span>
          </Orn>
          <h2 className={`reveal ${display} ${h2Size} mt-4 mb-[18px]`} style={{ ["--delay" as string]: "60ms" }}>Be <em>first</em> in line.</h2>
          <p className={`reveal ${lede} mx-auto mb-11 text-center`} style={{ ["--delay" as string]: "120ms" }}>
            Rolling out to a small group of attorneys and support staff.
            Join the waitlist and lock in <em>early access</em> pricing.
          </p>
          <WaitlistForm />
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-line pt-16 pb-10">
        <div className={wrap}>
          <div className="grid grid-cols-1 gap-7 border-b border-line pb-14 min-[440px]:grid-cols-2 min-[440px]:gap-9 min-[760px]:grid-cols-[1.5fr_1fr_1fr_1fr] min-[760px]:gap-14">
            <div>
              <Brand className="mb-[22px]" markClassName="h-[26px]" />
              <p className="max-w-[32ch] font-serif text-xl italic leading-[1.5] tracking-[-0.01em] text-t2">The AI counsel that runs entirely on your machine.</p>
            </div>
            {[
              ["Practice", [["Filings", "#features"], ["Matters", "#features"], ["Billing", "#features"]]],
              ["Company", [["The Doctrine", "#privacy"], ["Retainer", "#pricing"], ["Contact", "mailto:support@relay-law.com"]]],
              ["Get started", [["Early access", "#waitlist"], ["Join the waitlist", "#waitlist"]]],
            ].map(([heading, links]) => (
              <div key={heading as string}>
                <h5 className="m-0 mb-[18px] font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-coral">{heading as string}</h5>
                <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                  {(links as string[][]).map(([label, href]) => (
                    <li key={label}><a href={href} className="font-sans text-[14.5px] text-t2 transition-colors duration-150 hover:text-coral">{label}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 grid grid-cols-[auto_1fr_auto] items-center gap-7">
            <div className="col-span-full mt-9 flex items-center justify-between font-mono text-[12px] uppercase tracking-[0.10em] text-t3 max-[760px]:flex-col max-[760px]:items-start max-[760px]:gap-3">
              <span>© 2026 · Relay Legal Technologies, Inc.</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
