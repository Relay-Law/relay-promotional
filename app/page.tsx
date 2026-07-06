"use client";

import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";

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
			{ rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
		);
		document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
		return () => io.disconnect();
	}, []);
}

/* ─── Sticky nav (transparent over hero, solid over content) ─── */
function Nav({ heroRef }: { heroRef: React.RefObject<HTMLElement | null> }) {
	const navRef = useRef<HTMLElement>(null);
	const [solid, setSolid] = useState(false);

	useEffect(() => {
		const hero = heroRef.current;
		const nav = navRef.current;
		if (!hero || !nav) return;

		const update = () => {
			setSolid(hero.getBoundingClientRect().bottom <= nav.offsetHeight);
			document.documentElement.style.setProperty(
				"--rl-nav-h",
				`${nav.offsetHeight}px`,
			);
		};

		update();
		const ro = new ResizeObserver(update);
		ro.observe(nav);
		window.addEventListener("scroll", update, { passive: true });
		window.addEventListener("resize", update);
		return () => {
			ro.disconnect();
			window.removeEventListener("scroll", update);
			window.removeEventListener("resize", update);
		};
	}, [heroRef]);

	return (
		<nav ref={navRef} className={`rl-nav${solid ? " is-solid" : ""}`}>
			<a href="#top" className="rl-brand">
				<img src="/relay-logos/white_relay.svg" alt="Relay" className="rl-brand-logo rl-brand-logo--light" />
				<img src="/relay-logos/black_relay.svg" alt="Relay" className="rl-brand-logo rl-brand-logo--dark" />
			</a>
			<div className="rl-nav-links">
				<a href="#features"><span className="rl-num" style={{ color: "var(--coral)" }}>i.</span>Practice</a>
				<a href="#privacy"><span className="rl-num" style={{ color: "#7fa8d4" }}>ii.</span>Doctrine</a>
				<a href="#pricing"><span className="rl-num" style={{ color: "#86b598" }}>iii.</span>Retainer</a>
				<a href="#waitlist"><span className="rl-num" style={{ color: "#c79bc3" }}>iv.</span>Access</a>
			</div>
			<a href="#waitlist" className="rl-nav-cta">Join the Waitlist</a>
		</nav>
	);
}

/* ─── per-section accent helper ─── */
const ac = (color: string) =>
	({ ["--ac" as string]: color }) as React.CSSProperties;

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
				placeholder={
					sent ? "You're on the list — see you soon." : "you@yourfirm.com"
				}
				aria-label="Email address"
				value={email}
				onChange={(e) => setEmail(e.target.value)}
				disabled={sent}
			/>
			<button className="rl-btn" type="submit" disabled={loading || sent}>
				{sent ? (
					"On the list"
				) : loading ? (
					"Joining…"
				) : (
					<>
						Join <span className="arr">→</span>
					</>
				)}
			</button>
		</form>
	);
}

const TICKER_ITEMS = [
	{ text: "Local-first.", dot: "var(--coral)" },
	{ text: "No cloud, ever.", dot: "var(--blue)" },
	{ text: "Privileged by design.", dot: "var(--green)" },
	{ text: "Runs on your hardware.", dot: "var(--plum)" },
	{ text: "Discovery-safe.", dot: "var(--gold)" },
	{ text: "Air-gapped capable.", dot: "var(--coral)" },
] as const;

function TickerSequence() {
	return (
		<>
			{TICKER_ITEMS.map((item) => (
				<Fragment key={item.text}>
					<span className="t">{item.text}</span>
					<span className="d" style={{ color: item.dot }}>
						·
					</span>
				</Fragment>
			))}
		</>
	);
}

function Ticker() {
	const containerRef = useRef<HTMLDivElement>(null);
	const measureRef = useRef<HTMLDivElement>(null);
	const [repeat, setRepeat] = useState(1);

	useLayoutEffect(() => {
		const container = containerRef.current;
		const measure = measureRef.current;
		if (!container || !measure) return;

		const update = () => {
			const seqWidth = measure.scrollWidth;
			const containerWidth = container.offsetWidth;
			if (seqWidth <= 0) return;
			setRepeat(Math.max(1, Math.ceil(containerWidth / seqWidth)));
		};

		update();
		const ro = new ResizeObserver(update);
		ro.observe(container);
		ro.observe(measure);
		return () => ro.disconnect();
	}, []);

	const track = Array.from({ length: repeat }, (_, i) => (
		<Fragment key={i}>
			<TickerSequence />
		</Fragment>
	));

	return (
		<div className="rl-ticker" ref={containerRef} aria-hidden="true">
			<div className="rl-ticker-measure" ref={measureRef} aria-hidden="true">
				<TickerSequence />
			</div>
			<div className="rl-ticker-inner">
				<div className="rl-ticker-track">{track}</div>
				<div className="rl-ticker-track" aria-hidden="true">
					{track}
				</div>
			</div>
		</div>
	);
}

/* ─── Book image (placeholder template until the real assets exist) ─── */
function BookImage({
	src,
	alt,
	label,
}: {
	src?: string;
	alt: string;
	label: string;
}) {
	if (src) {
		return <img className="rl-book-img" src={src} alt={alt} />;
	}
	return (
		<div className="rl-imgph" role="img" aria-label={alt}>
			<span className="tag">Image</span>
			<span className="lbl">{label}</span>
			<span className="note">
				Template — drop the asset in /public/books and pass src
			</span>
		</div>
	);
}

/* ─── Book / feature card (one card in the stacked deck) ─── */
type BookDef = {
	accent: string;
	num: string;
	book: string;
	tag: string;
	title: React.ReactNode;
	lead: string;
	items: [string, React.ReactNode][];
	img: { label: string; alt: string; src?: string };
	panelFirst?: boolean;
};

function Book({
	accent,
	num,
	book,
	tag,
	title,
	lead,
	items,
	img,
	panelFirst,
	index,
	total,
}: BookDef & { index: number; total: number }) {
	const text = (
		<div key="text">
			<div className="rl-book-head">
				<div className="rl-book-num">{num}</div>
				<div className="rl-book-meta">
					<div className="bk">{book}</div>
					<div className="tg">{tag}</div>
				</div>
			</div>
			<h2 className="rl-h2">{title}</h2>
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
	const media = <BookImage key="media" {...img} />;
	return (
		<article
			className="rl-bookcard"
			style={{ ...ac(accent), ["--i" as string]: index, zIndex: total - index }}
		>
			<div className="rl-bookcard-grid">
				{panelFirst ? [media, text] : [text, media]}
			</div>
		</article>
	);
}

/* ─── Deck: pins the viewport while scroll slides each card off left ───
   The wrapper is (n × 100vh) tall; the stage is sticky. Scroll progress
   maps to --t on the stage, and each card derives its own exit/enter
   from --t in CSS (see .rl-bookcard in globals.css). On small/short
   screens and for reduced motion, CSS falls back to a plain stack. */
function BookDeck({ books }: { books: BookDef[] }) {
	const wrapRef = useRef<HTMLDivElement>(null);
	const stageRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const wrap = wrapRef.current;
		const stage = stageRef.current;
		if (!wrap || !stage) return;
		let raf = 0;
		const update = () => {
			raf = 0;
			const span = wrap.offsetHeight - window.innerHeight;
			if (span <= 0) return;
			const p = Math.min(
				Math.max(-wrap.getBoundingClientRect().top / span, 0),
				1,
			);
			stage.style.setProperty("--t", (p * (books.length - 1)).toFixed(4));
		};
		const onScroll = () => {
			if (!raf) raf = requestAnimationFrame(update);
		};
		update();
		window.addEventListener("scroll", onScroll, { passive: true });
		window.addEventListener("resize", onScroll);
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener("scroll", onScroll);
			window.removeEventListener("resize", onScroll);
		};
	}, [books.length]);

	return (
		<div
			className="rl-deck"
			ref={wrapRef}
			style={{ ["--n" as string]: books.length }}
		>
			<div className="rl-deck-stage" ref={stageRef}>
				{books.map((b, i) => (
					<Book key={b.num} {...b} index={i} total={books.length} />
				))}
			</div>
		</div>
	);
}

const BOOKS: BookDef[] = [
	{
		accent: "var(--coral)",
		num: "I.",
		book: "Book I · Of Filings",
		tag: "Smart filing",
		title: (
			<>
				<em>File</em> with confidence.
			</>
		),
		lead: "Check every citation, build tables of contents and authorities in seconds, and weigh the strength of an argument before opposing counsel does — all without leaving your draft.",
		items: [
			[
				"i.",
				<>
					<b>Citation verification</b> flags subsequent history against
					the offline reporter snapshot bundled with Relay.
				</>,
			],
			[
				"ii.",
				<>
					<b>One-click tables</b> of authorities and contents, in your
					firm&apos;s house style. Exports to Word with formatting intact.
				</>,
			],
			[
				"iii.",
				<>
					<b>Argument review</b> gives an even-handed read on which
					points carry weight — computed entirely on your machine.
				</>,
			],
		],
		img: {
			label: "Citation check · Thorngate v. Meridian",
			alt: "Relay flagging a superseded authority in a brief's table of authorities",
		},
	},
	{
		accent: "var(--blue)",
		num: "II.",
		book: "Book II · Of Routine",
		tag: "Automations",
		panelFirst: true,
		title: (
			<>
				Work that runs <em>itself.</em>
			</>
		),
		lead: "Set a rule once and let it hold the line. When a client's email lands, Relay can draft the reply, pull the right document, and queue it for your sign-off — or send it on its own. The routine handles itself; the judgment stays yours.",
		items: [
			[
				"i.",
				<>
					<b>Trigger rules</b> — incoming mail, new filings, and calendar
					dates set a workflow in motion.
				</>,
			],
			[
				"ii.",
				<>
					<b>Local execution</b> — every automation fires on your own
					machine. Nothing about the matter leaves to run a rule.
				</>,
			],
			[
				"iii.",
				<>
					<b>You set the leash</b> — auto-send the routine, hold the
					sensitive for review. Each step is yours to gate.
				</>,
			],
		],
		img: {
			label: "Automation · client intake",
			alt: "A Relay automation drafting a reply and holding it for sign-off",
		},
	},
	{
		accent: "var(--green)",
		num: "III.",
		book: "Book III · Of Hours",
		tag: "Billing",
		title: (
			<>
				Recover the hours <em>you lost.</em>
			</>
		),
		lead: "Relay follows your work across matters — quietly and locally — and drafts accurate time entries in the background. Review them on your schedule and bill with a clear conscience.",
		items: [
			[
				"i.",
				<>
					<b>Activity capture</b> matches documents, windows, and
					correspondence to the right matter.
				</>,
			],
			[
				"ii.",
				<>
					<b>Review before export</b> — every entry is yours to confirm,
					edit, or set aside.
				</>,
			],
			[
				"iii.",
				<>
					<b>Clean handoff</b> to Clio, PracticePanther, or a tidy
					spreadsheet.
				</>,
			],
		],
		img: {
			label: "Time entries · this week",
			alt: "Relay's drafted time entries for the week, ready to bill",
		},
	},
	{
		accent: "var(--plum)",
		num: "IV.",
		book: "Book IV · Of Conversation",
		tag: "The chat",
		panelFirst: true,
		title: (
			<>
				Just <em>ask,</em> and it&apos;s done.
			</>
		),
		lead: "Everything Relay can do answers to a single chat. Check a citation, draft a reply, start an automation, pull an hour back onto the books — in the plain English you'd use with an associate. The power sits underneath; the surface is one line you type.",
		items: [
			[
				"i.",
				<>
					<b>Natural language</b> — &ldquo;cite-check this brief,&rdquo;
					&ldquo;bill my morning,&rdquo; &ldquo;reply to Calloway.&rdquo;
					No syntax, no menus to memorize.
				</>,
			],
			[
				"ii.",
				<>
					<b>Every tool, one place</b> — filings, automations, and
					billing all answer to the same prompt. The chat picks which one
					to run, and chains them when a request needs several.
				</>,
			],
			[
				"iii.",
				<>
					<b>Grounded and local</b> — it reads the matter in front of you
					and acts on your machine. Answers point back to the files they
					came from, and nothing leaves the office.
				</>,
			],
		],
		img: {
			label: "Chat · ask Relay",
			alt: "The Relay chat running a citation check and a billing entry from one request",
		},
	},
	{
		accent: "var(--gold)",
		num: "V.",
		book: "Book V · Of the Library",
		tag: "The library",
		title: (
			<>
				All your work, <em>in one place.</em>
			</>
		),
		lead: "Every matter, draft, and exhibit laid out in a single view — no folders to dig through, no window to hunt for. See the whole of your practice at a glance, and move between files the moment you think of them.",
		items: [
			[
				"i.",
				<>
					<b>One shelf</b> — every matter and document gathered in a
					single browsable view, sorted the way you actually work.
				</>,
			],
			[
				"ii.",
				<>
					<b>Hop between files</b> — jump from a brief to its exhibits to
					the client&apos;s last email without losing your place. Recent
					and related are always a keystroke away.
				</>,
			],
			[
				"iii.",
				<>
					<b>Always at hand</b> — the whole library lives on your
					machine, so search and open are instant and nothing ever leaves
					the office.
				</>,
			],
		],
		img: {
			label: "Library · all matters",
			alt: "The Relay library showing every matter and document in one view",
		},
	},
	{
		accent: "var(--coral)",
		num: "VI.",
		book: "Book VI · Of the Firm",
		tag: "The team",
		panelFirst: true,
		title: (
			<>
				Your whole team, <em>one server.</em>
			</>
		),
		lead: "The same machine that runs your practice runs your firm's. Chats, documents, and matters are shared across every seat, so partners, associates, and staff all work from one source of truth — and it still never leaves the building.",
		items: [
			[
				"i.",
				<>
					<b>Shared workspace</b> — the same chats, documents, and
					matters, open to everyone you bring on.
				</>,
			],
			[
				"ii.",
				<>
					<b>One server, many seats</b> — partners, associates, and staff
					all work from the single machine in your office, in step with
					each other.
				</>,
			],
			[
				"iii.",
				<>
					<b>Local by default</b> — collaboration without the cloud.
					Nothing leaves the building to be shared.
				</>,
			],
		],
		img: {
			label: "Team · shared workspace",
			alt: "A firm's shared chats and documents in sync across every seat",
		},
	},
	{
		accent: "var(--blue)",
		num: "VII.",
		book: "Book VII · Of the Calendar",
		tag: "The calendar",
		title: (
			<>
				Never miss a <em>deadline.</em>
			</>
		),
		lead: "Every task and court date in one place, so nothing slips. Relay reads the documents you upload and lifts the important dates out for you — filing deadlines, hearings, statutes of limitation — onto a single calendar that keeps you ahead of what's due.",
		items: [
			[
				"i.",
				<>
					<b>Dates from your documents</b> — upload a filing or an order
					and Relay pulls the deadlines, hearings, and response dates
					straight onto your calendar.
				</>,
			],
			[
				"ii.",
				<>
					<b>Nothing slips</b> — every task and court date in one view,
					with reminders well before anything comes due.
				</>,
			],
			[
				"iii.",
				<>
					<b>On your machine</b> — the whole docket lives locally. Your
					schedule never leaves the office.
				</>,
			],
		],
		img: {
			label: "Calendar · upcoming deadlines",
			alt: "The Relay calendar with deadlines pulled from uploaded filings",
		},
	},
];

/* ═══════════════════════════════ Page ═══════════════════════════════ */
export default function Home() {
	const heroRef = useRef<HTMLElement>(null);
	useScrollReveal();

	return (
		<div className="rl">
			<Nav heroRef={heroRef} />
			<header className="rl-hero" id="top" ref={heroRef}>
				<div className="rl-hero-img" aria-hidden="true" />
				<div className="rl-hero-scrim" aria-hidden="true" />
				<div className="rl-hero-inner">
					<div className="rl-wrap">
						<h1 className="rl-h1 reveal">
							Counsel that <em>never</em>
							<br />
							leaves your machine.
						</h1>
						<div className="rl-sub reveal">
							<span className="bar" />A local-first AI for the practice of law
						</div>
						<p className="rl-hero-p reveal">
							Unlike many other AI tools, Relay runs entirely on your own
							hardware; no cloud, no external servers, no worries. All the
							benefits of AI, without the security risks. Additionally, the
							system is easy to set up, quick to use, and actually powerful.
						</p>
						<div className="rl-hero-actions reveal">
							<a href="#waitlist" className="rl-btn">
								Join the waitlist <span className="arr">→</span>
							</a>
							<a href="#privacy" className="rl-btn-ghost">
								Read the doctrine
							</a>
						</div>
					</div>
				</div>
			</header>

			{/* ── PREMISE ── */}
			<section className="rl-premise">
				<div className="rl-wrap reveal">
					<div className="rl-kicker" />
					<div
						className="rl-eyebrow"
						style={{ marginBottom: 28, display: "block" }}
					>
						§ 001 &nbsp;·&nbsp; Premise
					</div>
					<p className="rl-premise-quote">
						Your most privileged work, on the one machine you <em>control.</em>
					</p>
					<p className="rl-premise-body">
						Relay was built for lawyers who treat confidentiality as a duty, not
						a default setting. Every brief it checks, every file it reads, every
						hour it records — it does on hardware you own, behind your own door.
					</p>
				</div>
			</section>

			{/* ── TICKER ── */}
			<Ticker />

			{/* ── FEATURES ── */}
			<section id="features">
				<BookDeck books={BOOKS} />
			</section>

			{/* ── PRACTICE FIT ── */}
			<section className="rl-practice" id="practice">
				<div className="rl-wrap">
					<div className="rl-practice-head reveal">
						<div className="rl-kicker" />
						<span className="rl-eyebrow">§ &nbsp; Of Practice</span>
						<h2 className="rl-practice-h2">
							Built for how lawyers <em>actually work.</em>
						</h2>
						<p className="rl-practice-intro">
							However your practice is shaped, the rule holds: the work stays in
							your office.
						</p>
					</div>
					<div className="rl-rows">
						{[
							[
								"var(--coral)",
								"I.",
								"Litigators",
								"Build and check tables of authorities — and catch a bad citation before it ever reaches the court.",
							],
							[
								"var(--blue)",
								"II.",
								"Solo & small firms",
								"Automate the back-office busywork that usually has no one left to delegate it to.",
							],
							[
								"var(--green)",
								"III.",
								"Billing-conscious practices",
								"Stop losing revenue to untracked time, with capture that runs quietly in the background.",
							],
							[
								"var(--plum)",
								"IV.",
								"High-volume inboxes",
								"Set an automation once, and routine mail gets handled the moment it arrives.",
							],
							[
								"var(--gold)",
								"V.",
								"Confidentiality on the line",
								"Get all of the above — without a single file ever leaving your office.",
							],
						].map(([color, num, label, quote], i, list) => (
							<div
								key={num}
								className={`rl-row reveal${i === list.length - 1 ? " last" : ""}`}
								style={ac(color)}
							>
								<div className="rl-row-num">
									{num}
									<small>{label}</small>
								</div>
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
							[
								"var(--coral)",
								"I.",
								"Building",
								<>
									Your data stays in your <em>building.</em>
								</>,
								<>
									Nothing about a client matter is ever sent to an outside AI
									provider. Every inference runs on the computer in your office.{" "}
									<strong>You can confirm it yourself.</strong>
								</>,
							],
							[
								"var(--blue)",
								"II.",
								"Privilege",
								<>
									Confidentiality you can <em>defend.</em>
								</>,
								<>
									The architecture maps cleanly to ABA Model Rule 1.6 and its
									state analogues. If a client asks where their information
									goes, the answer is simple: <strong>nowhere.</strong>
								</>,
							],
							[
								"var(--green)",
								"III.",
								"Training",
								<>
									No training on your <em>files.</em>
								</>,
								<>
									Your work product is never used to train, tune, or evaluate
									anyone&apos;s model.{" "}
									<strong>
										Any diagnostics are opt-in, anonymous, and limited to crash
										reports.
									</strong>
								</>,
							],
							[
								"var(--plum)",
								"IV.",
								"Control",
								<>
									You hold the <em>keys.</em>
								</>,
								<>
									Access lives with your firm, not a vendor&apos;s servers.
									There is no private mode to remember to switch on —{" "}
									<strong>the privacy is simply the product.</strong>
								</>,
							],
						].map(([color, num, tag, head, body], i, list) => (
							<div
								key={i}
								className={`rl-drow reveal${i === list.length - 1 ? " last" : ""}`}
								style={ac(color as string)}
							>
								<div className="rl-dnum">
									{num}
									<small>{tag}</small>
								</div>
								<div>
									<h4 className="rl-dhead">{head}</h4>
									<p className="rl-dbody">{body}</p>
								</div>
							</div>
						))}
					</div>
					<div className="rl-seal reveal">
						Enforced in code, not in a contract.
					</div>
				</div>
			</section>

			{/* ── PRICING ── */}
			<section className="rl-pricing" id="pricing">
				<div className="rl-wrap">
					<div className="rl-pricing-head reveal" style={ac("var(--gold)")}>
						<div className="rl-kicker center" />
						<span className="rl-eyebrow">§ &nbsp; The Retainer</span>
						<h2 className="rl-price-h2">
							One price. <em>No usage games.</em>
						</h2>
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
							[
								"var(--coral)",
								"a.",
								<>
									<em>Document</em> editing — tables, citations &amp; drafting
								</>,
							],
							[
								"var(--blue)",
								"b.",
								<>
									<em>Automations</em> that run on their own
								</>,
							],
							[
								"var(--green)",
								"c.",
								<>
									<em>Automatic</em> billing capture &amp; export
								</>,
							],
							[
								"var(--plum)",
								"d.",
								<>
									<em>No</em> per-query metering, ever
								</>,
							],
							[
								"var(--gold)",
								"e.",
								<>
									<em>Runs</em> on your firm&apos;s own hardware
								</>,
							],
							[
								"var(--coral)",
								"f.",
								<>
									<em>Future</em> features at the same fair price
								</>,
							],
						].map(([color, ix, body], i) => (
							<li key={i}>
								<span className="ix" style={{ color: color as string }}>
									{ix}
								</span>
								<span>{body}</span>
							</li>
						))}
					</ul>

					<div className="rl-price-cta reveal">
						<a href="/billing" className="rl-btn">
							Get started <span className="arr">→</span>
						</a>
						<a href="#waitlist" className="rl-price-alt">
							or join the waitlist
						</a>
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
							<h2 className="reveal">
								Be <em>first</em> in line.
							</h2>
							<WaitlistForm />
					</div>
				</div>
			</section>

			{/* ── FOOTER ── */}
			<footer className="rl-footer">
				<div className="rl-wrap">
					<div className="rl-foot-cols">
						<div className="rl-foot-lead">
							<a href="#top" className="rl-brand">
								<img
									src="/relay-logos/black_relay.svg"
									alt="Relay"
									style={{ height: 26, width: "auto", display: "block" }}
								/>
							</a>
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

					<div className="rl-footmark" aria-hidden="true">
						Relay
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
