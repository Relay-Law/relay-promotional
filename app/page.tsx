"use client";

import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";

/* ─── shared Tailwind class recipes ─── */
const WRAP = "mx-auto w-full max-w-[1240px] px-[var(--pad)]";
const EYEBROW =
	"font-sans text-[11px] font-medium tracking-[0.2em] uppercase text-ac";
const KICKER = "h-0.5 w-10 bg-ac";
const BTN_BASE =
	"inline-flex items-center gap-3 font-sans text-[11px] font-medium tracking-[0.16em] uppercase rounded-[2px] border border-coral bg-coral text-white transition-[background-color,color,transform] duration-200 hover:bg-transparent hover:text-coral hover:-translate-y-px disabled:opacity-70 disabled:cursor-default";
const BTN = `${BTN_BASE} px-6 py-[15px]`;
const BTN_GHOST =
	"inline-flex items-center gap-2.5 font-sans text-[11px] font-medium tracking-[0.16em] uppercase px-[22px] py-[15px] rounded-[2px] border border-cream-30 text-cream transition-[border-color] duration-200 hover:border-cream";
const ARR = "font-display italic";

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

	const linkCls = `transition-colors duration-200 ${
		solid ? "text-ink-65 hover:text-ink" : "text-cream-45 hover:text-cream"
	}`;
	const numCls = "font-display italic normal-case mr-[7px]";

	return (
		<nav
			ref={navRef}
			className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between py-[20px] px-[var(--pad)] border-b transition-[background-color,border-color,box-shadow,color] duration-[250ms] ${
				solid
					? "text-ink border-line bg-[rgba(250,245,232,0.92)] backdrop-blur-[12px] backdrop-saturate-[1.4] shadow-[0_4px_24px_rgba(27,20,13,0.08)]"
					: "text-cream border-transparent bg-transparent"
			}`}
		>
			<a href="#top" className="relative block leading-none">
				<img
					src="/relay-logos/white_relay.svg"
					alt="Relay"
					className={`h-[26px] w-auto block transition-opacity duration-[250ms] ${
						solid ? "opacity-0" : "opacity-100"
					}`}
				/>
				<img
					src="/relay-logos/black_relay.svg"
					alt="Relay"
					className={`absolute left-0 top-0 h-[26px] w-auto block transition-opacity duration-[250ms] ${
						solid ? "opacity-100" : "opacity-0"
					}`}
				/>
			</a>
			<div className="hidden min-[881px]:flex gap-[30px] items-center font-sans text-[11px] tracking-[0.16em] uppercase font-medium">
				<a href="#features" className={linkCls}>
					<span className={numCls} style={{ color: "var(--coral)" }}>
						i.
					</span>
					Practice
				</a>
				<a href="#privacy" className={linkCls}>
					<span className={numCls} style={{ color: "#7fa8d4" }}>
						ii.
					</span>
					Doctrine
				</a>
				<a href="#pricing" className={linkCls}>
					<span className={numCls} style={{ color: "#86b598" }}>
						iii.
					</span>
					Retainer
				</a>
				<a href="#waitlist" className={linkCls}>
					<span className={numCls} style={{ color: "#c79bc3" }}>
						iv.
					</span>
					Access
				</a>
			</div>
			<a
				href="#waitlist"
				className={`font-sans text-[11px] font-medium tracking-[0.16em] uppercase px-4 py-[9px] rounded-[2px] border transition-[border-color,color] duration-200 ${
					solid
						? "text-ink border-line hover:border-ink-65"
						: "text-cream border-cream-30 hover:border-cream"
				}`}
			>
				Join the Waitlist
			</a>
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
		<form
			className="reveal flex gap-3 max-w-[520px] mt-2 flex-wrap"
			onSubmit={handleSubmit}
			noValidate
		>
			<input
				type="email"
				className="flex-1 min-w-[220px] bg-[rgba(243,236,220,0.06)] border border-cream-30 rounded-[2px] text-cream px-4 py-[15px] font-sans text-[15px] placeholder:text-cream-45 focus:outline-none focus:border-coral"
				placeholder={
					sent ? "You're on the list — see you soon." : "you@yourfirm.com"
				}
				aria-label="Email address"
				value={email}
				onChange={(e) => setEmail(e.target.value)}
				disabled={sent}
			/>
			<button
				className={`${BTN_BASE} px-6 py-[14px]`}
				type="submit"
				disabled={loading || sent}
			>
				{sent ? (
					"On the list"
				) : loading ? (
					"Joining…"
				) : (
					<>
						Join <span className={ARR}>→</span>
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
					<span className="font-display italic text-[24px] text-ink-65 px-[30px] tracking-[-0.01em]">
						{item.text}
					</span>
					<span className="px-[4px] text-[20px]" style={{ color: item.dot }}>
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
		<div
			className="relative border-y border-line overflow-hidden py-6"
			ref={containerRef}
			aria-hidden="true"
		>
			<div
				className="absolute invisible pointer-events-none flex whitespace-nowrap"
				ref={measureRef}
				aria-hidden="true"
			>
				<TickerSequence />
			</div>
			<div className="flex w-max animate-[marquee_138s_linear_infinite] will-change-transform">
				<div className="flex shrink-0 items-center whitespace-nowrap">
					{track}
				</div>
				<div
					className="flex shrink-0 items-center whitespace-nowrap"
					aria-hidden="true"
				>
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
		return (
			<img
				className="w-full h-auto max-h-[80vh] object-contain rounded-[6px] block"
				src={src}
				alt={alt}
			/>
		);
	}
	return (
		<div
			className="relative w-full aspect-[4/3] max-h-[56vh] rounded-[6px] border-[1.5px] border-dashed [border-color:color-mix(in_srgb,var(--ac)_55%,transparent)] bg-[repeating-linear-gradient(-45deg,transparent_0_16px,color-mix(in_srgb,var(--ac)_5%,transparent)_16px_32px)] flex flex-col items-center justify-center gap-2.5 text-center p-6"
			role="img"
			aria-label={alt}
		>
			<span className="font-sans text-[10px] font-medium tracking-[0.2em] uppercase text-ac border [border-color:color-mix(in_srgb,var(--ac)_40%,transparent)] px-2.5 py-1 rounded-[3px]">
				Image
			</span>
			<span className="font-display italic text-[clamp(17px,1.6vw,22px)] text-ink-65 max-w-[26ch] leading-[1.3]">
				{label}
			</span>
			<span className="font-sans text-[11px] text-ink-30 tracking-[0.04em]">
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
		<div key="text" className="w-full md:basis-[28%] md:grow-0 md:shrink">
			<div className="flex items-start gap-[18px] mb-[26px]">
				<div className="font-display italic text-[64px] leading-[0.8] text-ac">
					{num}
				</div>
				<div className="border-t-2 border-ac pt-3">
					<div className="font-sans text-[11px] font-medium tracking-[0.18em] uppercase text-ac">
						{book}
					</div>
					<div className="font-sans text-[11px] font-medium tracking-[0.12em] uppercase text-ink-45 mt-1.5">
						{tag}
					</div>
				</div>
			</div>
			<h2 className="font-display font-[340] text-[clamp(30px,3.6vw,50px)] leading-[0.98] tracking-[-0.025em] m-0 mb-[22px] text-ink [&_em]:italic [&_em]:text-ac">
				{title}
			</h2>
			<p className="text-[16.5px] text-ink-65 max-w-[46ch] m-0">{lead}</p>
			<ul className="rl-hl list-none mt-[26px] p-0 border-t border-line">
				{items.map(([n, body], i) => (
					<li
						key={i}
						className="grid grid-cols-[34px_1fr] gap-[14px] py-[13px] px-[2px] border-b border-line text-[14.5px] text-ink-65"
					>
						<span className="font-display italic text-[15px] text-ac pt-px">
							{n}
						</span>
						<span>{body}</span>
					</li>
				))}
			</ul>
		</div>
	);
	const media = (
		<div key="media" className="w-full md:flex-1">
			<BookImage {...img} />
		</div>
	);
	return (
		<article
			className="rl-bookcard bg-card border border-line rounded-[10px] shadow-[0_34px_70px_-34px_rgba(27,20,13,0.4)] flex items-center justify-center p-[clamp(22px,4vw,60px)] overflow-hidden"
			style={{ ...ac(accent), ["--i" as string]: index, zIndex: total - index }}
		>
			<div className="w-full max-w-[1600px] flex flex-col md:flex-row gap-[clamp(30px,4.5vw,72px)] items-center">
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
					<b>Citation verification</b> flags subsequent history against the
					offline reporter snapshot bundled with Relay.
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
					<b>Argument review</b> gives an even-handed read on which points carry
					weight — computed entirely on your machine.
				</>,
			],
		],
		img: {
			label: "Citation check · Thorngate v. Meridian",
			alt: "Relay flagging a superseded authority in a brief's table of authorities",
			src: "/showcase/citation.png",
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
					<b>Trigger rules</b> — incoming mail, new filings, and calendar dates
					set a workflow in motion.
				</>,
			],
			[
				"ii.",
				<>
					<b>Local execution</b> — every automation fires on your own machine.
					Nothing about the matter leaves to run a rule.
				</>,
			],
			[
				"iii.",
				<>
					<b>You set the leash</b> — auto-send the routine, hold the sensitive
					for review. Each step is yours to gate.
				</>,
			],
		],
		img: {
			label: "Automation · client intake",
			alt: "A Relay automation drafting a reply and holding it for sign-off",
			src: "/showcase/automations.png",
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
					<b>Activity capture</b> matches documents, windows, and correspondence
					to the right matter.
				</>,
			],
			[
				"ii.",
				<>
					<b>Review before export</b> — every entry is yours to confirm, edit,
					or set aside.
				</>,
			],
			[
				"iii.",
				<>
					<b>Clean handoff</b> to Clio, PracticePanther, or a tidy spreadsheet.
				</>,
			],
		],
		img: {
			label: "Time entries · this week",
			alt: "Relay's drafted time entries for the week, ready to bill",
			src: "/showcase/logtime.png",
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
					&ldquo;bill my morning,&rdquo; &ldquo;reply to Calloway.&rdquo; No
					syntax, no menus to memorize.
				</>,
			],
			[
				"ii.",
				<>
					<b>Every tool, one place</b> — filings, automations, and billing all
					answer to the same prompt. The chat picks which one to run, and chains
					them when a request needs several.
				</>,
			],
			[
				"iii.",
				<>
					<b>Grounded and local</b> — it reads the matter in front of you and
					acts on your machine. Answers point back to the files they came from,
					and nothing leaves the office.
				</>,
			],
		],
		img: {
			label: "Chat · ask Relay",
			alt: "The Relay chat running a citation check and a billing entry from one request",
			src: "/showcase/allinthechat.png",
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
					<b>One shelf</b> — every matter and document gathered in a single
					browsable view, sorted the way you actually work.
				</>,
			],
			[
				"ii.",
				<>
					<b>Hop between files</b> — jump from a brief to its exhibits to the
					client&apos;s last email without losing your place. Recent and related
					are always a keystroke away.
				</>,
			],
			[
				"iii.",
				<>
					<b>Always at hand</b> — the whole library lives on your machine, so
					search and open are instant and nothing ever leaves the office.
				</>,
			],
		],
		img: {
			label: "Library · all matters",
			alt: "The Relay library showing every matter and document in one view",
			src: "/showcase/homepage.png",
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
					<b>Shared workspace</b> — the same chats, documents, and matters, open
					to everyone you bring on.
				</>,
			],
			[
				"ii.",
				<>
					<b>One server, many seats</b> — partners, associates, and staff all
					work from the single machine in your office, in step with each other.
				</>,
			],
			[
				"iii.",
				<>
					<b>Local by default</b> — collaboration without the cloud. Nothing
					leaves the building to be shared.
				</>,
			],
		],
		img: {
			label: "Team · shared workspace",
			alt: "A firm's shared chats and documents in sync across every seat",
			src: "/showcase/sharing.png",
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
					<b>Dates from your documents</b> — upload a filing or an order and
					Relay pulls the deadlines, hearings, and response dates straight onto
					your calendar.
				</>,
			],
			[
				"ii.",
				<>
					<b>Nothing slips</b> — every task and court date in one view, with
					reminders well before anything comes due.
				</>,
			],
			[
				"iii.",
				<>
					<b>On your machine</b> — the whole docket lives locally. Your schedule
					never leaves the office.
				</>,
			],
		],
		img: {
			label: "Calendar · upcoming deadlines",
			alt: "The Relay calendar with deadlines pulled from uploaded filings",
			src: "/showcase/calendar.png",
		},
	},
];

/* ═══════════════════════════════ Page ═══════════════════════════════ */
/* ─── Pricing tiers (hardware, one-time) ─── */
const TIERS = [
	{
		name: "Basic",
		price: "$1,000",
		body: "For solo practices and light caseloads. Runs Relay's core models comfortably for everyday drafting, checking, and billing.",
	},
	{
		name: "Moderate",
		price: "$2,000",
		body: "For small firms and steady dockets. Stronger models, faster answers, and more headroom across seats.",
	},
	{
		name: "Expert",
		price: "$5,000",
		body: "For heavy workloads and demanding matters. Relay's most capable models at full speed, with room for the whole firm.",
	},
];

export default function Home() {
	const heroRef = useRef<HTMLElement>(null);
	useScrollReveal();

	return (
		<div className="rl">
			<Nav heroRef={heroRef} />
			<header
				className="relative min-h-[95svh] flex flex-col justify-end bg-[#2a211a] overflow-hidden"
				id="top"
				ref={heroRef}
			>
				<div
					className="absolute inset-0 z-0 bg-[#2a211a] bg-[url(/hero.jpg)] bg-cover bg-[center_38%] [filter:saturate(0.86)_brightness(0.92)]"
					aria-hidden="true"
				/>
				<div
					className="absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(20,14,7,0.32)_0%,rgba(20,14,7,0.06)_32%,rgba(20,14,7,0.2)_58%,rgba(15,9,4,0.82)_100%)]"
					aria-hidden="true"
				/>
				<div className="relative z-[2] w-full pb-[clamp(48px,10vw,120px)]">
					<div className={WRAP}>
						<h1 className="reveal font-display font-[340] text-cream m-0 leading-[0.92] tracking-[-0.025em] text-[clamp(46px,9.4vw,140px)] max-w-[15ch]">
							Legal specialized AI that <em className="rl-hero-mark">never</em>
							<br />
							leaves your office.
						</h1>
						<div className="reveal mt-6 flex items-center gap-4 font-sans text-[11.5px] font-medium tracking-[0.16em] uppercase text-cream-45">
							<span className="w-[42px] h-px bg-cream-30" />A local-first AI for
							the practice of law
						</div>
						<p className="reveal mt-[26px] max-w-[50ch] text-[17px] leading-[1.62] text-[rgba(243,236,220,0.74)]">
							Unlike many other AI tools, Relay runs entirely on your own
							hardware; no cloud, no external servers, no worries. All the
							benefits of AI, without the security risks. Additionally, the
							system is easy to set up, quick to use, and actually powerful.
						</p>
						<div className="reveal mt-[34px] flex flex-wrap gap-4 items-center">
							<a href="#waitlist" className={BTN}>
								Join the waitlist <span className={ARR}>→</span>
							</a>
							<a href="#privacy" className={BTN_GHOST}>
								Read the doctrine
							</a>
						</div>
					</div>
				</div>
			</header>

			{/* ── PREMISE ── */}
			<section className="py-[clamp(80px,11vw,120px)]">
				<div className={`${WRAP} reveal`}>
					<div className={`${KICKER} mb-6`} />
					<div className={`block mb-7 ${EYEBROW}`}>
						§ 001 &nbsp;·&nbsp; Premise
					</div>
					<p className="font-display font-[340] italic text-[clamp(26px,4.4vw,52px)] leading-[1.18] tracking-[-0.02em] max-w-[20ch] m-0 text-ink">
						Your most privileged work, on the one machine you{" "}
						<em className="text-coral">control.</em>
					</p>
					<p className="mt-[34px] max-w-[58ch] text-[17px] leading-[1.66] text-ink-65">
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
			<section
				className="py-[clamp(96px,12vw,128px)] border-t border-line"
				id="practice"
			>
				<div className={WRAP}>
					<div className="reveal max-w-[820px] mb-[54px]">
						<div className={`${KICKER} mb-6`} />
						<span className={EYEBROW}>§ &nbsp; Of Practice</span>
						<h2 className="font-display font-[340] text-[clamp(34px,5.2vw,72px)] leading-[0.98] tracking-[-0.025em] mt-5 mb-0 text-ink [&_em]:italic [&_em]:text-coral">
							Built for how lawyers <em>actually work.</em>
						</h2>
						<p className="mt-[30px] max-w-[56ch] text-[17px] leading-[1.66] text-ink-65">
							However your practice is shaped, the rule holds: the work stays in
							your office.
						</p>
					</div>
					<div className="max-w-[980px]">
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
								className={`reveal grid grid-cols-[minmax(150px,220px)_1fr] gap-10 py-[30px] border-t border-line items-baseline max-[640px]:grid-cols-1 max-[640px]:gap-[14px]${
									i === list.length - 1 ? " border-b" : ""
								}`}
								style={ac(color)}
							>
								<div className="font-display italic text-[46px] leading-[0.82] text-ac">
									{num}
									<small className="block mt-3 font-sans not-italic text-[10.5px] font-medium tracking-[0.18em] uppercase text-ink-45">
										{label}
									</small>
								</div>
								<p className="m-0 font-display font-[360] italic text-[clamp(20px,2.4vw,28px)] leading-[1.32] tracking-[-0.015em] text-ink">
									{quote}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ── PRIVACY DOCTRINE ── */}
			<section
				className="sec-dark py-[clamp(96px,12vw,128px)] border-t border-line"
				id="privacy"
			>
				<div className={WRAP}>
					<div className="reveal max-w-[760px] mb-16">
						<div className={`${KICKER} mb-6`} />
						<span className={EYEBROW}>§ &nbsp; The Privacy Doctrine</span>
						<h2 className="font-display font-[340] text-[clamp(36px,5.4vw,76px)] leading-[0.98] tracking-[-0.025em] mt-5 text-ink">
							<em className="italic text-coral">We never see anything.</em>
							<br />
							<span className="text-ink-45">By design, not by policy.</span>
						</h2>
					</div>
					<div className="max-w-[920px]">
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
								className={`reveal grid grid-cols-[minmax(120px,150px)_1fr] gap-10 py-[30px] border-t border-line max-[640px]:grid-cols-1 max-[640px]:gap-[14px]${
									i === list.length - 1 ? " border-b" : ""
								}`}
								style={ac(color as string)}
							>
								<div className="font-display italic text-[52px] leading-[0.85] text-ac">
									{num}
									<small className="block mt-2.5 font-sans not-italic text-[10.5px] font-medium tracking-[0.2em] uppercase text-ink-30">
										{tag}
									</small>
								</div>
								<div>
									<h4 className="font-display font-[360] text-[27px] leading-[1.12] tracking-[-0.015em] m-0 mb-3 text-ink [&_em]:italic [&_em]:text-ac">
										{head}
									</h4>
									<p className="rl-hl m-0 max-w-[60ch] text-[15.5px] leading-[1.6] text-ink-65">
										{body}
									</p>
								</div>
							</div>
						))}
					</div>
					<div className="reveal text-center mt-14 font-display italic text-[clamp(26px,3.4vw,40px)] text-ink tracking-[-0.02em]">
						Enforced in code, not in a contract.
					</div>
				</div>
			</section>

			{/* ── PRICING ── */}
			<section
				className="py-[clamp(96px,12vw,128px)] border-t border-line"
				id="pricing"
			>
				<div className={WRAP}>
					<div
						className="reveal max-w-[760px] mx-auto mb-14 text-center"
						style={ac("var(--gold)")}
					>
						<div className={`${KICKER} mx-auto mb-6`} />
						<span className={EYEBROW}>§ &nbsp; The Retainer</span>
						<h2 className="font-display font-[340] text-[clamp(34px,5vw,68px)] leading-[0.98] tracking-[-0.025em] mt-[18px] text-ink">
							One machine, one rate.{" "}
							<em className="italic text-coral">No usage games.</em>
						</h2>
						<p className="mt-7 max-w-[62ch] mx-auto text-[16.5px] leading-[1.62] text-ink-65">
							Tired of secretive pricing structures designed to confuse
							you? So are we. Relay is a one-time machine purchase plus a
							flat monthly rate per user — all laid out right here. A
							fair price for an amazing tool, plain and simple.
						</p>
					</div>

					<div className="reveal grid grid-cols-[repeat(3,1fr)] max-w-[980px] mx-auto border-y border-line max-[880px]:grid-cols-1">
						{TIERS.map((t) => (
							<div
								key={t.name}
								className="px-7 py-8 border-l border-line first:border-l-0 first:pl-0 last:pr-0 max-[880px]:border-l-0 max-[880px]:px-0 max-[880px]:border-t max-[880px]:first:border-t-0"
							>
								<span className="font-sans text-[10.5px] font-medium tracking-[0.2em] uppercase text-coral">
									{t.name}
								</span>
								<div className="font-display italic font-[330] text-[clamp(40px,5vw,56px)] leading-[0.9] tracking-[-0.03em] text-ink mt-5">
									{t.price}
								</div>
								<span className="block font-sans text-[10.5px] font-medium tracking-[0.14em] uppercase text-ink-45 mt-2.5">
									one-time · hardware
								</span>
								<p className="mt-4 text-[14px] leading-[1.6] text-ink-65">{t.body}</p>
							</div>
						))}
					</div>
					<p className="reveal mt-[22px] max-w-[980px] mx-auto text-[13.5px] leading-[1.6] text-ink-45">
						Already own a capable machine?{" "}
						<a
							href="mailto:support@relay-law.com"
							className="text-ink-65 underline underline-offset-[3px] transition-colors duration-200 hover:text-coral"
						>
							Contact us
						</a>{" "}
						— if the specs qualify, a one-time $300 covers the software.
					</p>

					<div className="reveal text-center mt-[clamp(72px,9vw,110px)]">
						<span className="inline-flex items-center gap-2.5 font-sans text-[11px] font-medium tracking-[0.18em] uppercase text-ink border border-line rounded-full px-[18px] py-[9px]">
							<span className="w-[7px] h-[7px] rounded-full bg-coral" />
							Early adopter pricing
						</span>
						<div className="flex items-baseline justify-center gap-[clamp(16px,3.4vw,34px)] mt-[34px] flex-wrap">
							<span className="font-display italic font-[340] text-[clamp(34px,5vw,58px)] leading-[0.8] text-ink-30 line-through decoration-2 decoration-coral">
								$150
							</span>
							<span className="font-display font-[330] italic text-[clamp(96px,14vw,176px)] leading-[0.78] tracking-[-0.04em] text-coral">
								$50
							</span>
						</div>
						<div className="font-sans text-[13px] font-medium tracking-[0.08em] uppercase text-ink-45 mt-5">
							per user · per month
						</div>
						<p className="max-w-[54ch] mx-auto mt-[26px] text-[15px] leading-[1.62] text-ink-65 [&_strong]:text-ink [&_strong]:font-medium">
							For a limited time only, we&apos;re offering a discounted
							rate for early adopters. Lock in <strong>$50 per user</strong>{" "}
							per month for a year during the early-adopter phase, then{" "}
							<strong>$150</strong> once it closes.
						</p>
					</div>

					<div className="reveal mt-12 flex justify-center items-center gap-[22px] flex-wrap">
						<a href="#waitlist" className={BTN}>
							Join the waitlist <span className={ARR}>→</span>
						</a>
						<a
							href="/billing"
							className="font-sans text-[11px] font-medium tracking-[0.1em] uppercase text-ink-45 transition-colors duration-200 hover:text-coral"
						>
							or get started today
						</a>
					</div>
				</div>
			</section>

			{/* ── FINAL CTA ── */}
			<section
				className="relative min-h-[78vh] flex items-center bg-[#241c16] overflow-hidden"
				id="waitlist"
			>
				<div
					className="absolute inset-0 z-0 bg-[#241c16] bg-[url(/cta.jpg)] bg-cover bg-[center_50%] [filter:saturate(0.82)_brightness(0.78)]"
					aria-hidden="true"
				/>
				<div
					className="absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(15,9,4,0.55),rgba(15,9,4,0.8))]"
					aria-hidden="true"
				/>
				<div className="relative z-[2] w-full">
					<div className={WRAP}>
						<div className={`reveal ${KICKER} mb-6`} />
						<span className="reveal font-sans text-[11px] font-medium tracking-[0.2em] uppercase text-cream-45">
							§ &nbsp; Early Access
						</span>
						<h2 className="reveal font-display font-[330] text-[clamp(40px,6vw,92px)] leading-[0.96] tracking-[-0.025em] text-cream mt-5 mb-[26px] max-w-[14ch]">
							Be <em className="italic text-coral">first</em> in line.
						</h2>
						<WaitlistForm />
					</div>
				</div>
			</section>

			{/* ── FOOTER ── */}
			<footer className="bg-paper pt-[88px] pb-10 border-t border-line">
				<div className={WRAP}>
					<div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-10 pb-16">
						<div className="col-span-2 min-w-[240px]">
							<a href="#top" className="relative block leading-none">
								<img
									src="/relay-logos/black_relay.svg"
									alt="Relay"
									style={{ height: 26, width: "auto", display: "block" }}
								/>
							</a>
							<p className="font-display italic text-[19px] leading-[1.5] text-ink-65 max-w-[30ch] mt-3.5">
								The AI counsel that runs entirely on your machine.
							</p>
						</div>
						<div style={ac("var(--coral)")}>
							<h5 className="font-sans text-[10.5px] font-medium tracking-[0.16em] uppercase text-ac m-0 mb-4">
								Practice
							</h5>
							<a
								href="#features"
								className="block text-[14.5px] text-ink-65 py-[5px] transition-colors duration-200 hover:text-ink"
							>
								Filings
							</a>
							<a
								href="#features"
								className="block text-[14.5px] text-ink-65 py-[5px] transition-colors duration-200 hover:text-ink"
							>
								Automations
							</a>
							<a
								href="#features"
								className="block text-[14.5px] text-ink-65 py-[5px] transition-colors duration-200 hover:text-ink"
							>
								Billing
							</a>
						</div>
						<div style={ac("var(--blue)")}>
							<h5 className="font-sans text-[10.5px] font-medium tracking-[0.16em] uppercase text-ac m-0 mb-4">
								Company
							</h5>
							<a
								href="#practice"
								className="block text-[14.5px] text-ink-65 py-[5px] transition-colors duration-200 hover:text-ink"
							>
								Practice fit
							</a>
							<a
								href="#privacy"
								className="block text-[14.5px] text-ink-65 py-[5px] transition-colors duration-200 hover:text-ink"
							>
								The Doctrine
							</a>
							<a
								href="#pricing"
								className="block text-[14.5px] text-ink-65 py-[5px] transition-colors duration-200 hover:text-ink"
							>
								Retainer
							</a>
							<a
								href="mailto:support@relay-law.com"
								className="block text-[14.5px] text-ink-65 py-[5px] transition-colors duration-200 hover:text-ink"
							>
								Contact
							</a>
						</div>
						<div style={ac("var(--green)")}>
							<h5 className="font-sans text-[10.5px] font-medium tracking-[0.16em] uppercase text-ac m-0 mb-4">
								Get started
							</h5>
							<a
								href="#waitlist"
								className="block text-[14.5px] text-ink-65 py-[5px] transition-colors duration-200 hover:text-ink"
							>
								Early access
							</a>
							<a
								href="#waitlist"
								className="block text-[14.5px] text-ink-65 py-[5px] transition-colors duration-200 hover:text-ink"
							>
								Join the waitlist
							</a>
						</div>
					</div>

					<div
						className="font-display font-[330] italic text-[clamp(80px,24vw,300px)] leading-[0.78] tracking-[-0.04em] text-ink pt-10 pb-2"
						aria-hidden="true"
					>
						Relay
					</div>

					<div className="flex justify-between flex-wrap gap-3.5 border-t border-line pt-[26px] font-sans text-[11px] font-medium tracking-[0.1em] uppercase text-ink-45">
						<span>© 2026 · Relay Legal Technologies, Inc.</span>
						<span>Local-first · Bar-compliant by default</span>
					</div>
				</div>
			</footer>
		</div>
	);
}
