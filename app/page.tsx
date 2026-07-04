"use client";

import { useEffect, useState } from "react";

/* ─── Scroll reveal (toggles .reveal → .in via IntersectionObserver) ─── */
function useScrollReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/* ─── small inline-style helpers for the mock panels ─── */
const ruled = { lineHeight: "34px" } as React.CSSProperties;
const lineMuted: React.CSSProperties = { fontSize: 14, color: "var(--ink-65)", lineHeight: "34px" };
const lineInk: React.CSSProperties = { fontSize: "14.5px", color: "var(--ink)", lineHeight: "34px" };
const serifLine: React.CSSProperties = { fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 15, color: "var(--ink)" };
const labelMini: React.CSSProperties = {
  fontFamily: "var(--sans)", fontSize: 10, fontWeight: 500, letterSpacing: ".18em",
  textTransform: "uppercase", color: "var(--ac)", lineHeight: "34px",
};
const statusLine: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 10, fontFamily: "var(--sans)",
  fontSize: 12, color: "var(--ink-45)", lineHeight: "34px", marginTop: 6,
};
const greenDot: React.CSSProperties = { width: 7, height: 7, borderRadius: "50%", background: "var(--green)", display: "block" };
const rowBetween: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, lineHeight: "34px" };
const ac = (color: string) => ({ ["--ac" as string]: color }) as React.CSSProperties;

/* ─── Waitlist form (posts to /api/waitlist) ─── */
function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const val = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return;
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
  }

  return (
    <form className="rl-form reveal" onSubmit={handleSubmit} noValidate>
      <input
        type="email"
        placeholder={sent ? "You're on the list — see you soon." : "you@yourfirm.com"}
        aria-label="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={sent}
      />
      <button className="rl-btn" type="submit" disabled={loading || sent}>
        {sent ? "On the list" : loading ? "Joining…" : <>Join <span className="arr">→</span></>}
      </button>
    </form>
  );
}

/* ─── Book / feature row ─── */
function Book({
  accent, num, book, tag, title, titleEm, lead, items, panel, panelFirst, divider,
}: {
  accent: string;
  num: string;
  book: string;
  tag: string;
  title: React.ReactNode;
  titleEm: string;
  lead: string;
  items: [string, React.ReactNode][];
  panel: React.ReactNode;
  panelFirst?: boolean;
  divider?: boolean;
}) {
  const text = (
    <div className="reveal" key="text">
      <div className="rl-book-head">
        <div className="rl-book-num">{num}</div>
        <div className="rl-book-meta">
          <div className="bk">{book}</div>
          <div className="tg">{tag}</div>
        </div>
      </div>
      <h2 className="rl-h2">
        {title} <em>{titleEm}</em>
      </h2>
      <p className="rl-lead">{lead}</p>
      <ul className="rl-list">
        {items.map(([n, body], i) => (
          <li key={i}>
            <span className="mk">{n}</span>
            <span>{body}</span>
          </li>
        ))}
      </ul>
    </div>
  );
  const media = (
    <div className="reveal" key="media">
      {panel}
    </div>
  );
  return (
    <div className={`rl-feature${divider ? " div" : ""}`} style={ac(accent)}>
      <div className="rl-wrap">
        <div className="rl-feature-grid">{panelFirst ? [media, text] : [text, media]}</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════ Page ═══════════════════════════════ */
export default function Home() {
  useScrollReveal();

  return (
    <div className="rl">
      {/* ── HERO ── */}
      <header className="rl-hero" id="top">
        <div className="rl-hero-img" aria-hidden="true" />
        <div className="rl-hero-scrim" aria-hidden="true" />

        <nav className="rl-nav">
          <a href="#top" className="rl-brand"><img src="/relay-logos/white_relay.svg" alt="Relay" style={{ height: 26, width: "auto", display: "block" }} /></a>
          <div className="rl-nav-links">
            <a href="#features"><span className="rl-num" style={{ color: "var(--coral)" }}>i.</span>Practice</a>
            <a href="#privacy"><span className="rl-num" style={{ color: "#7fa8d4" }}>ii.</span>Doctrine</a>
            <a href="#pricing"><span className="rl-num" style={{ color: "#86b598" }}>iii.</span>Retainer</a>
            <a href="#waitlist"><span className="rl-num" style={{ color: "#c79bc3" }}>iv.</span>Access</a>
          </div>
          <a href="#waitlist" className="rl-nav-cta">Join the Waitlist</a>
        </nav>

        <div className="rl-hero-inner">
          <div className="rl-wrap">
            <h1 className="rl-h1 reveal">
              Counsel that <em>never</em>
              <br />leaves your machine.
            </h1>
            <div className="rl-sub reveal">
              <span className="bar" />A local-first AI for the practice of law
            </div>
            <p className="rl-hero-p reveal">
              Drafting, billing, and the routine work in between — handled by an assistant that
              runs entirely on the computer in your office. Privileged work that never touches a
              server, a cloud, or anyone else&apos;s hands.
            </p>
            <div className="rl-hero-actions reveal">
              <a href="#waitlist" className="rl-btn">Join the waitlist <span className="arr">→</span></a>
              <a href="#privacy" className="rl-btn-ghost">Read the doctrine</a>
            </div>
          </div>
        </div>
      </header>

      {/* ── PREMISE ── */}
      <section className="rl-premise">
        <div className="rl-wrap reveal">
          <div className="rl-kicker" />
          <div className="rl-eyebrow" style={{ marginBottom: 28, display: "block" }}>§ 001 &nbsp;·&nbsp; Premise</div>
          <p className="rl-premise-quote">
            Your most privileged work, on the one machine you <em>control.</em>
          </p>
          <p className="rl-premise-body">
            Relay was built for lawyers who treat confidentiality as a duty, not a default setting.
            Every brief it checks, every file it reads, every hour it records — it does on hardware
            you own, behind your own door.
          </p>
        </div>
      </section>

      {/* ── TICKER ── */}
      <div className="rl-ticker" aria-hidden="true">
        <div className="rl-ticker-row">
          {[0, 1].map((dup) => (
            <span key={dup} style={{ display: "inline-flex", alignItems: "center" }}>
              <span className="t">Local-first.</span><span className="d" style={{ color: "var(--coral)" }}>·</span>
              <span className="t">No cloud, ever.</span><span className="d" style={{ color: "var(--blue)" }}>·</span>
              <span className="t">Privileged by design.</span><span className="d" style={{ color: "var(--green)" }}>·</span>
              <span className="t">Runs on your hardware.</span><span className="d" style={{ color: "var(--plum)" }}>·</span>
              <span className="t">Discovery-safe.</span><span className="d" style={{ color: "var(--gold)" }}>·</span>
              <span className="t">Air-gapped capable.</span><span className="d" style={{ color: "var(--coral)" }}>·</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── FEATURES ── */}
      <section id="features">
        {/* Book I — Filings (coral) */}
        <Book
          accent="var(--coral)"
          num="I."
          book="Book I · Of Filings"
          tag="Smart filing"
          title="File with"
          titleEm="confidence."
          lead="Check every citation, build tables of contents and authorities in seconds, and weigh the strength of an argument before opposing counsel does — all without leaving your draft."
          items={[
            ["i.", <><b>Citation verification</b> flags subsequent history against the offline reporter snapshot bundled with Relay.</>],
            ["ii.", <><b>One-click tables</b> of authorities and contents, in your firm&apos;s house style. Exports to Word with formatting intact.</>],
            ["iii.", <><b>Argument review</b> gives an even-handed read on which points carry weight — computed entirely on your machine.</>],
          ]}
          panel={
            <div className="rl-panel">
              <div className="rl-panel-margin" aria-hidden="true" />
              <div className="rl-panel-head">
                <span className="rl-panel-tag"><span className="dot" />Citation check</span>
                <span className="rl-panel-sub">Thorngate v. Meridian</span>
              </div>
              <div className="rl-panel-body">
                <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 16, color: "var(--ink)", ...ruled }}>Brief in Support — Table of Authorities</div>
                <div style={lineMuted}>1.&nbsp;&nbsp;Calloway v. State, 210 Ill. 2d 44</div>
                <div style={rowBetween}>
                  <span style={{ ...serifLine, fontSize: "14.5px" }}>2.&nbsp;&nbsp;Meridian Capital v. Thorngate, 412 F.3d 88</span>
                  <span className="rl-badge">Superseded</span>
                </div>
                <div style={lineMuted}>3.&nbsp;&nbsp;In re Wexler Trust, 88 Cal. App. 4th 12</div>
                <div style={statusLine}><span style={greenDot} />98 of 99 authorities verified — 1 needs attention</div>
              </div>
            </div>
          }
        />

        {/* Book II — Automations (blue) · panel first */}
        <Book
          accent="var(--blue)"
          divider
          panelFirst
          num="II."
          book="Book II · Of Routine"
          tag="Automations"
          title="Work that runs"
          titleEm="itself."
          lead="Set a rule once and let it hold the line. When a client's email lands, Relay can draft the reply, pull the right document, and queue it for your sign-off — or send it on its own. The routine handles itself; the judgment stays yours."
          items={[
            ["i.", <><b>Trigger rules</b> — incoming mail, new filings, and calendar dates set a workflow in motion.</>],
            ["ii.", <><b>Local execution</b> — every automation fires on your own machine. Nothing about the matter leaves to run a rule.</>],
            ["iii.", <><b>You set the leash</b> — auto-send the routine, hold the sensitive for review. Each step is yours to gate.</>],
          ]}
          panel={
            <div className="rl-panel">
              <div className="rl-panel-margin" aria-hidden="true" />
              <div className="rl-panel-head">
                <span className="rl-panel-tag"><span className="dot" />Automation</span>
                <span className="rl-panel-sub">Client intake</span>
              </div>
              <div className="rl-panel-body">
                <div style={labelMini}>When</div>
                <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 16, color: "var(--ink)", ...ruled }}>an email arrives from a client on an open matter</div>
                <div style={{ ...labelMini, marginTop: 4 }}>Then</div>
                <div style={lineInk}>1.&nbsp;&nbsp;Draft a reply in your voice</div>
                <div style={lineInk}>2.&nbsp;&nbsp;Attach the latest filing from the matter</div>
                <div style={rowBetween}>
                  <span style={{ fontSize: "14.5px", color: "var(--ink)" }}>3.&nbsp;&nbsp;Hold for your sign-off</span>
                  <span className="rl-badge">Review</span>
                </div>
                <div style={statusLine}><span style={greenDot} />Runs on your machine — 14 automations active</div>
              </div>
            </div>
          }
        />

        {/* Book III — Billing (green) */}
        <Book
          accent="var(--green)"
          divider
          num="III."
          book="Book III · Of Hours"
          tag="Billing"
          title="Recover the hours"
          titleEm="you lost."
          lead="Relay follows your work across matters — quietly and locally — and drafts accurate time entries in the background. Review them on your schedule and bill with a clear conscience."
          items={[
            ["i.", <><b>Activity capture</b> matches documents, windows, and correspondence to the right matter.</>],
            ["ii.", <><b>Review before export</b> — every entry is yours to confirm, edit, or set aside.</>],
            ["iii.", <><b>Clean handoff</b> to Clio, PracticePanther, or a tidy spreadsheet.</>],
          ]}
          panel={
            <div className="rl-panel">
              <div className="rl-panel-margin" aria-hidden="true" />
              <div className="rl-panel-head">
                <span className="rl-panel-tag"><span className="dot" />Time entries</span>
                <span className="rl-panel-sub">This week</span>
              </div>
              <div className="rl-panel-body">
                {[
                  ["Calloway — review production", "1.4 h"],
                  ["Thorngate — draft reply brief", "2.1 h"],
                  ["Wexler — client correspondence", "0.6 h"],
                ].map(([matter, hrs]) => (
                  <div key={matter} style={rowBetween}>
                    <span style={serifLine}>{matter}</span>
                    <span style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-65)" }}>{hrs}</span>
                  </div>
                ))}
                <div style={{ ...rowBetween, marginTop: 8, borderTop: "1px solid var(--line)", paddingTop: 8 }}>
                  <span style={{ fontFamily: "var(--sans)", fontSize: 11, fontWeight: 500, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--ink-45)" }}>Ready to bill</span>
                  <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 26, color: "var(--green)" }}>4.1 h</span>
                </div>
              </div>
            </div>
          }
        />
      </section>

      {/* ── PRACTICE FIT ── */}
      <section className="rl-practice" id="practice">
        <div className="rl-wrap">
          <div className="rl-practice-head reveal">
            <div className="rl-kicker" />
            <span className="rl-eyebrow">§ &nbsp; Of Practice</span>
            <h2 className="rl-practice-h2">Built for how lawyers <em>actually work.</em></h2>
            <p className="rl-practice-intro">
              However your practice is shaped, the rule holds: the work stays in your office.
              A few of the people Relay was built for.
            </p>
          </div>
          <div className="rl-rows">
            {[
              ["var(--coral)", "I.", "Litigators", "Build and check tables of authorities — and catch a bad citation before it ever reaches the court."],
              ["var(--blue)", "II.", "Solo & small firms", "Automate the back-office busywork that usually has no one left to delegate it to."],
              ["var(--green)", "III.", "Billing-conscious practices", "Stop losing revenue to untracked time, with capture that runs quietly in the background."],
              ["var(--plum)", "IV.", "High-volume inboxes", "Set an automation once, and routine mail gets handled the moment it arrives."],
              ["var(--gold)", "V.", "Confidentiality on the line", "Get all of the above — without a single file ever leaving your office."],
            ].map(([color, num, label, quote], i, list) => (
              <div key={num} className={`rl-row reveal${i === list.length - 1 ? " last" : ""}`} style={ac(color)}>
                <div className="rl-row-num">{num}<small>{label}</small></div>
                <p className="rl-row-q">{quote}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRIVACY DOCTRINE ── */}
      <section className="rl-privacy" id="privacy">
        <div className="rl-wrap">
          <div className="rl-privacy-head reveal">
            <div className="rl-kicker" />
            <span className="rl-eyebrow">§ &nbsp; The Privacy Doctrine</span>
            <h2 className="rl-privacy-h2">
              <em>We never see anything.</em>
              <br />
              <span className="mut">By design, not by policy.</span>
            </h2>
          </div>
          <div className="rl-doctrine">
            {[
              ["var(--coral)", "I.", "Building", <>Your data stays in your <em>building.</em></>, <>Nothing about a client matter is ever sent to an outside AI provider. Every inference runs on the computer in your office. <strong>You can confirm it yourself.</strong></>],
              ["var(--blue)", "II.", "Privilege", <>Confidentiality you can <em>defend.</em></>, <>The architecture maps cleanly to ABA Model Rule 1.6 and its state analogues. If a client asks where their information goes, the answer is simple: <strong>nowhere.</strong></>],
              ["var(--green)", "III.", "Training", <>No training on your <em>files.</em></>, <>Your work product is never used to train, tune, or evaluate anyone&apos;s model. <strong>Any diagnostics are opt-in, anonymous, and limited to crash reports.</strong></>],
              ["var(--plum)", "IV.", "Control", <>You hold the <em>keys.</em></>, <>Access lives with your firm, not a vendor&apos;s servers. There is no private mode to remember to switch on — <strong>the privacy is simply the product.</strong></>],
            ].map(([color, num, tag, head, body], i, list) => (
              <div key={i} className={`rl-drow reveal${i === list.length - 1 ? " last" : ""}`} style={ac(color as string)}>
                <div className="rl-dnum">{num}<small>{tag}</small></div>
                <div>
                  <h4 className="rl-dhead">{head}</h4>
                  <p className="rl-dbody">{body}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="rl-seal reveal">Enforced in code, not in a contract.</div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="rl-pricing" id="pricing">
        <div className="rl-wrap">
          <div className="rl-pricing-head reveal" style={ac("var(--gold)")}>
            <div className="rl-kicker center" />
            <span className="rl-eyebrow">§ &nbsp; The Retainer</span>
            <h2 className="rl-price-h2">One price. <em>No usage games.</em></h2>
          </div>

          <div className="rl-price-figure reveal">
            <div className="rl-price-amounts">
              <span className="rl-price-was">$149</span>
              <span className="rl-price-now">$50</span>
            </div>
            <div className="rl-price-unit">per user · per month</div>
          </div>

          <ul className="rl-price-list reveal">
            {[
              ["var(--coral)", "a.", <><em>Document</em> editing — tables, citations &amp; drafting</>],
              ["var(--blue)", "b.", <><em>Automations</em> that run on their own</>],
              ["var(--green)", "c.", <><em>Automatic</em> billing capture &amp; export</>],
              ["var(--plum)", "d.", <><em>No</em> per-query metering, ever</>],
              ["var(--gold)", "e.", <><em>Runs</em> on your firm&apos;s own hardware</>],
              ["var(--coral)", "f.", <><em>Future</em> features at the same fair price</>],
            ].map(([color, ix, body], i) => (
              <li key={i}>
                <span className="ix" style={{ color: color as string }}>{ix}</span>
                <span>{body}</span>
              </li>
            ))}
          </ul>

          <div className="rl-price-cta reveal">
            <a href="/billing" className="rl-btn">Get started <span className="arr">→</span></a>
            <a href="#waitlist" className="rl-price-alt">or join the waitlist</a>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="rl-final" id="waitlist">
        <div className="rl-final-img" aria-hidden="true" />
        <div className="rl-final-scrim" aria-hidden="true" />
        <div className="rl-final-inner">
          <div className="rl-wrap">
            <div className="rl-kicker reveal" />
            <span className="rl-eyebrow reveal">§ &nbsp; Early Access</span>
            <h2 className="reveal">Be <em>first</em> in line.</h2>
            <WaitlistForm />
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="rl-footer">
        <div className="rl-wrap">
          <div className="rl-foot-cols">
            <div className="rl-foot-lead">
              <a href="#top" className="rl-brand"><img src="/relay-logos/black_relay.svg" alt="Relay" style={{ height: 26, width: "auto", display: "block" }} /></a>
              <p>The AI counsel that runs entirely on your machine.</p>
            </div>
            <div className="rl-foot-col" style={ac("var(--coral)")}>
              <h5>Practice</h5>
              <a href="#features">Filings</a>
              <a href="#features">Automations</a>
              <a href="#features">Billing</a>
            </div>
            <div className="rl-foot-col" style={ac("var(--blue)")}>
              <h5>Company</h5>
              <a href="#practice">Practice fit</a>
              <a href="#privacy">The Doctrine</a>
              <a href="#pricing">Retainer</a>
              <a href="mailto:support@relay-law.com">Contact</a>
            </div>
            <div className="rl-foot-col" style={ac("var(--green)")}>
              <h5>Get started</h5>
              <a href="#waitlist">Early access</a>
              <a href="#waitlist">Join the waitlist</a>
            </div>
          </div>

          <div className="rl-footbase">
            <span>© 2026 · Relay Legal Technologies, Inc.</span>
            <span>Local-first · Bar-compliant by default</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
