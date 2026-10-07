"use client"

// SplitCompare — one sentence with a link, three ways: unsplit, split by a published library, and wrapped in place. Shows each version's measured width and what it offers assistive technology, read from the live page.
import { useCallback, useEffect, useRef, useState } from "react"
import { applySpeechType, prepareSpeechType, removeSpeechType } from "@overpunch/speechtype"
import "splitting/dist/splitting.css"
import { useClientValue } from "@/lib/clientValue"
import { accessibleName, exposedText, nameProhibited, roleOf, tabStops } from "@/lib/axInfo"
import type { TabStop } from "@/lib/axInfo"
import { LIBRARIES, graphemes, splitWithLibrary, wrapInPlace } from "@/lib/splitters"
import type { LibraryId, Unit } from "@/lib/splitters"

/** Sentences offered as presets. Square brackets mark the linked words. */
const PRESETS: { id: string; label: string; text: string }[] = [
	{ id: "sentence", label: "A sentence with a link", text: "Yes, you can sign today. First read [the official terms]." },
	{ id: "kerning", label: "Kerning pairs and ligatures", text: "AVATAR [Toward] WAVE office affluent" },
	{ id: "clusters", label: "Emoji and Devanagari", text: "Family \u{1F469}‍\u{1F469}‍\u{1F467} says [नमस्ते] today" },
	{ id: "arabic", label: "Arabic (joined letters)", text: "مرحبا [بالعالم] اليوم" },
]

/** Longest sentence the input accepts (characters). */
const MAX_TEXT = 90

/** Host elements the sentence can be set in. */
const HOSTS = ["p", "h2", "div"] as const
type HostTag = (typeof HOSTS)[number]

/** The three versions shown. */
type RowId = "plain" | "split" | "kept"

/** Adrian Roselli's screen-reader results for GSAP's SplitText demo (a div with aria-label and aria-hidden pieces), GSAP issue 642, 5 February 2026. */
const ROSELLI: [string, boolean][] = [
	["NVDA / Firefox", true],
	["JAWS / Chrome", false],
	["Narrator / Edge", false],
	["VoiceOver macOS / Safari", false],
	["Orca / Firefox", false],
	["TalkBack / Chrome", true],
	["TalkBack / Firefox", false],
	["VoiceOver iPadOS / Safari", false],
]

/** What one version of the sentence measures and exposes. */
interface Facts {
	/** Width of the line in CSS px */
	width: number
	/** Elements under the host beyond the ones the author wrote */
	addedElements: number
	ariaHidden: number
	/** aria-label on the host, or null */
	hostLabel: string | null
	hostRole: string
	hostName: string
	hostNameProhibited: boolean
	stops: TabStop[]
	exposed: string[]
	/** Pieces the splitter made (0 for the unsplit row) */
	pieces: number
	/** User-perceived characters in the sentence, white space excluded */
	letters: number
	/** Pieces that are only part of a user-perceived character */
	brokenLetters: string[]
	pieceDisplay: string
	html: string
}

/** Turn "Read [the terms] first." into text nodes and a link, without parsing it as HTML. */
function fill(host: HTMLElement, text: string): void {
	text.split(/(\[[^\]]*\])/).forEach((part) => {
		if (!part) return
		const linked = /^\[[^\]]*\]$/.test(part)
		if (!linked) { host.appendChild(document.createTextNode(part)); return }
		const a = document.createElement("a")
		a.href = "#split"
		a.textContent = part.slice(1, -1)
		host.appendChild(a)
	})
}

/** Read one version's facts from the page. */
function read(host: HTMLElement, pieces: HTMLElement[], unit: Unit, authored: number, text: string): Facts {
	const letters = graphemes(text.replace(/[\[\]\s]/g, ""))
	// A piece is broken when it is not one whole user-perceived character of the sentence.
	const whole = new Set(letters)
	const brokenLetters = unit === "chars" ? pieces.map((p) => p.textContent ?? "").filter((t) => !whole.has(t)) : []
	const html = host.outerHTML
	return {
		width: host.getBoundingClientRect().width,
		addedElements: host.querySelectorAll("*").length - authored,
		ariaHidden: host.querySelectorAll('[aria-hidden="true"]').length,
		hostLabel: host.getAttribute("aria-label"),
		hostRole: roleOf(host),
		hostName: accessibleName(host),
		hostNameProhibited: nameProhibited(host),
		stops: tabStops(host),
		exposed: exposedText(host),
		pieces: pieces.length,
		letters: letters.length,
		brokenLetters,
		pieceDisplay: pieces[0] ? getComputedStyle(pieces[0]).display : "",
		html: html.length > 1400 ? `${html.slice(0, 1400)} …` : html,
	}
}

/** A short list of text runs, e.g. “Read”, “the terms” (+24 more). */
function runs(list: string[], max = 4): string {
	if (!list.length) return "none"
	const shown = list.slice(0, max).map((t) => `“${t}”`).join(", ")
	return list.length > max ? `${shown} (+${list.length - max} more)` : shown
}

/** The names of the tab stops, e.g. “the terms”, (no name). */
function stopNames(stops: TabStop[]): string {
	if (!stops.length) return "none"
	return stops.map((s) => (s.name ? `“${s.name}”` : "(no name)")).join(", ")
}

/** Which measured facts differ from the unsplit row, in words. */
function changes(f: Facts, plain: Facts): string[] {
	const out: string[] = []
	if (Math.abs(f.width - plain.width) >= 0.5) out.push("line width")
	if (f.hostName !== plain.hostName) out.push(f.hostNameProhibited ? "the element has a name ARIA prohibits" : "the element’s name")
	if (stopNames(f.stops) !== stopNames(plain.stops)) out.push(f.stops.length !== plain.stops.length ? "number of tab stops" : "link name")
	if (f.exposed.join("\u0001") !== plain.exposed.join("\u0001")) {
		out.push(f.exposed.length === 0 ? "no text left in the accessibility tree" : f.exposed.join("").replace(/\s/g, "") === plain.exposed.join("").replace(/\s/g, "") ? `the same text, in ${f.exposed.length} pieces instead of ${plain.exposed.length}` : `the text in the accessibility tree (${f.exposed.length} pieces instead of ${plain.exposed.length})`)
	}
	if (f.brokenLetters.length) out.push("characters broken apart")
	return out
}

/** Name of the CSS custom highlight the unsplit row uses (styled in globals.css). */
const HIGHLIGHT = "split-demo"

/** Split-text comparison: unsplit, split by a library, and wrapped in place. */
export default function SplitCompare() {
	const [text, setText] = useState(PRESETS[0].text)
	const [tag, setTag] = useState<HostTag>("p")
	const [unit, setUnit] = useState<Unit>("chars")
	const [lib, setLib] = useState<LibraryId>("gsap")
	const [keptDisplay, setKeptDisplay] = useState<"inline" | "inline-block">("inline")
	const [kerning, setKerning] = useState<"auto" | "none">("auto")
	const [facts, setFacts] = useState<Record<RowId, Facts> | null>(null)
	const [error, setError] = useState("")

	/** Containers the three hosts are built into (outside React's control, because the libraries rewrite them). */
	const mounts = useRef<Record<RowId, HTMLDivElement | null>>({ plain: null, split: null, kept: null })
	/** The live hosts and their pieces, for the effect buttons. */
	const live = useRef<Record<RowId, { host: HTMLElement; pieces: HTMLElement[] } | null>>({ plain: null, split: null, kept: null })
	/** Timers of each version's running word-by-word effect. */
	const timers = useRef<Record<RowId, ReturnType<typeof setTimeout>[]>>({ plain: [], split: [], kept: [] })

	/** Stop every running effect and take the unsplit row's highlight (and speechType's state) off the old elements. */
	const stopEffects = useCallback(() => {
		for (const id of ["plain", "split", "kept"] as RowId[]) {
			timers.current[id].forEach(clearTimeout)
			timers.current[id] = []
			const row = live.current[id]
			// Only the unsplit row is handed to speechType after it is measured; the wrapped row is rebuilt anyway.
			if (row && id === "plain") removeSpeechType(row.host)
		}
	}, [])

	const library = LIBRARIES.find((l) => l.id === lib) ?? LIBRARIES[0]
	/** Whether this browser has the CSS Custom Highlight API (true during server rendering). */
	const canHighlight = useClientValue(() => "highlights" in CSS && typeof Highlight !== "undefined", true)

	useEffect(() => {
		let stale = false
		/** Build the three versions, run the splitters, then measure once layout has settled. */
		const run = async () => {
			try {
				await document.fonts.load('32px "Source Serif 4"')
				if (stale) return
				// Nothing to split: clear the lines and the readings.
				if (!text.replace(/[\[\]\s]/g, "")) {
					stopEffects()
					live.current = { plain: null, split: null, kept: null }
					for (const id of ["plain", "split", "kept"] as RowId[]) mounts.current[id]?.replaceChildren()
					setError("")
					setFacts(null)
					return
				}
				const made = {} as Record<RowId, { host: HTMLElement; pieces: HTMLElement[] }>
				for (const id of ["plain", "split", "kept"] as RowId[]) {
					const mount = mounts.current[id]
					if (!mount) return
					if (id === "plain") stopEffects()
					const host = document.createElement(tag)
					host.className = "split-host"
					host.style.fontKerning = kerning
					fill(host, text)
					mount.replaceChildren(host)
					made[id] = { host, pieces: [] }
				}
				const authored = made.plain.host.querySelectorAll("*").length
				made.split.pieces = await splitWithLibrary(made.split.host, lib, unit)
				if (stale) return
				made.kept.pieces = wrapInPlace(made.kept.host, unit, keptDisplay)
				await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
				if (stale) return
				live.current = made
				setError("")
				setFacts({
					plain: read(made.plain.host, [], unit, authored, text),
					split: read(made.split.host, made.split.pieces, unit, authored, text),
					kept: read(made.kept.host, made.kept.pieces, unit, authored, text),
				})
			} catch (e) {
				if (!stale) setError(e instanceof Error ? e.message : String(e))
			}
		}
		run()
		return () => { stale = true }
	}, [text, tag, unit, lib, keptDisplay, kerning, stopEffects])

	// Leave no timers or highlight behind when the section unmounts.
	useEffect(() => stopEffects, [stopEffects])

	/** Play a simple staggered effect on one version's pieces. */
	const play = useCallback((id: RowId) => {
		const row = live.current[id]
		if (!row) return
		timers.current[id].forEach(clearTimeout)
		timers.current[id] = []
		// The unsplit row: paint each word with the CSS Custom Highlight API. Nothing is added to the page.
		if (id === "plain") {
			if (!("highlights" in CSS)) return
			// speechType's highlight mode: words are recorded as ranges, the element is not touched.
			prepareSpeechType(row.host, { mode: "highlight", highlightName: HIGHLIGHT })
			const words = (row.host.textContent ?? "").trim().split(/\s+/).filter(Boolean).length
			timers.current.plain = Array.from({ length: words }, (_, i) => setTimeout(() => applySpeechType(row.host, i), i * 260))
			timers.current.plain.push(setTimeout(() => applySpeechType(row.host, -1), words * 260))
			return
		}
		if (!row.pieces.length) return
		const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches
		// Words kept inline are speechType's own spans: step its real emphasis through them.
		if (id === "kept" && row.pieces[0].classList.contains("st-word")) {
			timers.current.kept = row.pieces.map((_, i) => setTimeout(() => applySpeechType(row.host, i, { transitionMs: 0 }), i * 260))
			timers.current.kept.push(setTimeout(() => applySpeechType(row.host, -1), row.pieces.length * 260))
			return
		}
		// Transforms only apply to boxes, not to inline spans.
		const boxed = getComputedStyle(row.pieces[0]).display !== "inline"
		const step = unit === "chars" ? 28 : 110
		row.pieces.forEach((piece, i) => {
			piece.animate(
				[{ opacity: 0.12, transform: boxed && !still ? "translateY(0.4em)" : "none" }, { opacity: 1, transform: "none" }],
				{ duration: 420, delay: i * step, easing: "ease-out", fill: "backwards" },
			)
		})
	}, [unit])

	const plain = facts?.plain
	const columns: { id: RowId; title: string; sub: string }[] = [
		{ id: "plain", title: "Unsplit", sub: "The sentence as written. Its button runs speechType’s highlight mode (in the repository, not on npm yet): it paints each word with the CSS Custom Highlight API and adds nothing to the page. Highlights can change colour and background, not weight, size or position." },
		{ id: "split", title: `Split by ${library.name} ${library.version}`, sub: library.does },
		{
			id: "kept",
			title: keptDisplay === "inline" ? "Wrapped in place, inline" : "Wrapped in place, inline-block",
			sub: unit === "words" && keptDisplay === "inline"
				? "speechType 1.1.0’s own prepareSpeechType(): a plain span around each word. No ARIA attributes."
				: keptDisplay === "inline"
					? "A plain span around each character, nothing else. No ARIA attributes. (speechType itself wraps words; this is the same idea per character.)"
					: "The same spans, each made an inline-block so it can be moved or rotated. No ARIA attributes.",
		},
	]

	/** A group of toggle buttons. */
	const group = <T extends string>(label: string, value: T, options: { value: T; label: string }[], set: (v: T) => void) => (
		<div className="flex flex-col gap-2" role="group" aria-label={label}>
			<span className="text-xs uppercase tracking-[0.12em] text-muted">{label}</span>
			<div className="flex flex-wrap gap-2">
				{options.map((o) => (
					<button
						key={o.value}
						type="button"
						aria-pressed={value === o.value}
						onClick={() => set(o.value)}
						className="text-xs px-3 py-1.5 rounded-full border"
						style={{ borderColor: "currentColor", background: value === o.value ? "var(--btn-bg)" : "transparent", fontWeight: value === o.value ? 600 : 400 }}
					>
						{o.label}
					</button>
				))}
			</div>
		</div>
	)

	return (
		<div className="w-full flex flex-col gap-8" data-split-compare>

			{/* Controls */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
				<div className="flex flex-col gap-2 sm:col-span-2">
					<label htmlFor="split-text" className="text-xs uppercase tracking-[0.12em] text-muted">Sentence (square brackets mark the link)</label>
					<input
						id="split-text"
						type="text"
						value={text}
						maxLength={MAX_TEXT}
						onChange={(e) => setText(e.target.value)}
						className="w-full rounded-md border px-3 py-2 text-sm bg-transparent"
						style={{ borderColor: "color-mix(in oklch, var(--foreground) 35%, transparent)" }}
					/>
					<div className="flex flex-wrap gap-2 items-center">
						{PRESETS.map((p) => (
							<button key={p.id} type="button" aria-pressed={text === p.text} onClick={() => setText(p.text)} className="text-xs px-3 py-1.5 rounded-full border" style={{ borderColor: "currentColor", background: text === p.text ? "var(--btn-bg)" : "transparent", fontWeight: text === p.text ? 600 : 400 }}>
								{p.label}
							</button>
						))}
						<span className="text-xs text-muted">{text.length} of {MAX_TEXT} characters</span>
					</div>
				</div>
				{group("Library", lib, LIBRARIES.map((l) => ({ value: l.id, label: `${l.name} ${l.version}` })), setLib)}
				{group("Split into", unit, [{ value: "chars", label: "Characters" }, { value: "words", label: "Words" }], setUnit)}
				{group("Element", tag, HOSTS.map((h) => ({ value: h, label: `<${h}>` })), setTag)}
				{group("Wrapped-in-place pieces", keptDisplay, [{ value: "inline", label: "Inline spans" }, { value: "inline-block", label: "Inline-block (needed for transforms)" }], setKeptDisplay)}
				{group("font-kerning on all three", kerning, [{ value: "auto", label: "auto (the browser default)" }, { value: "none", label: "none (what GSAP and SplitType suggest)" }], setKerning)}
			</div>

			{error && <p role="alert" className="text-sm">The splitter threw an error: {error}</p>}

			{/* The three rendered lines, left edges aligned, with a rule where the unsplit line ends */}
			<div className="rounded-lg p-5 overflow-x-auto" style={{ background: "color-mix(in oklch, var(--foreground) 4%, transparent)", border: "1px solid color-mix(in oklch, var(--foreground) 12%, transparent)" }}>
				<div className="relative flex flex-col gap-4" style={{ width: "max-content", minWidth: "100%" }}>
					{plain && (
						<div aria-hidden="true" data-guide className="absolute top-0 bottom-0" style={{ left: plain.width, borderLeft: "1px dashed color-mix(in oklch, var(--foreground) 55%, transparent)" }} />
					)}
					{columns.map((c) => (
						<div key={c.id} className="flex flex-col gap-1" data-line={c.id}>
							<div className="flex flex-wrap items-center gap-3">
								<span className="text-xs uppercase tracking-[0.12em] text-muted">{c.title}</span>
								<button type="button" onClick={() => play(c.id)} disabled={c.id === "plain" && !canHighlight} className="text-xs px-2.5 py-1 rounded-full border disabled:opacity-60" style={{ borderColor: "currentColor" }}>
									{c.id === "plain" ? (canHighlight ? "Highlight each word without splitting" : "Custom highlights aren’t supported in this browser") : "Play an effect on the pieces"}
								</button>
							</div>
							<div ref={(n) => { mounts.current[c.id] = n }} className="split-mount" />
						</div>
					))}
				</div>
				<p className="text-xs text-muted mt-4" style={{ lineHeight: 1.7 }}>
					The dashed rule marks where the unsplit line ends. Set in Source Serif 4; emoji, Devanagari and Arabic come from your system’s fonts. The effect is a fade; pieces that are boxes also rise, because a transform does nothing to an inline span. Where the link’s underline breaks up, that is the split as well: an underline isn’t drawn across inline-block pieces.
				</p>
			</div>

			{/* Facts, side by side */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
				{columns.map((c) => {
					const f = facts?.[c.id]
					const diff = f && plain && c.id !== "plain" ? changes(f, plain) : []
					const dw = f && plain ? f.width - plain.width : 0
					return (
						<section key={c.id} data-row={c.id} aria-label={c.title} className="rounded-lg p-4 flex flex-col gap-3 text-sm" style={{ border: "1px solid color-mix(in oklch, var(--foreground) 18%, transparent)" }}>
							<div className="flex flex-col gap-1">
								<h3 className="font-semibold text-base">{c.title}</h3>
								<p className="text-xs text-muted" style={{ lineHeight: 1.6 }}>{c.sub}</p>
								{c.id === "split" && <p className="text-xs font-mono text-muted" style={{ overflowWrap: "anywhere" }}>{library.call[unit]}</p>}
							</div>
							{f && plain ? (
								<dl className="flex flex-col gap-3">
									<div data-fact="width">
										<dt className="text-xs uppercase tracking-[0.1em] text-muted">Line width</dt>
										<dd className="tabular-nums">
											{f.width.toFixed(1)} px
											{c.id !== "plain" && <> · {dw >= 0 ? "+" : "−"}{Math.abs(dw).toFixed(1)} px ({dw >= 0 ? "+" : "−"}{Math.abs((dw / plain.width) * 100).toFixed(1)}%)</>}
										</dd>
									</div>
									<div data-fact="markup">
										<dt className="text-xs uppercase tracking-[0.1em] text-muted">Added to the page</dt>
										<dd>
											{f.addedElements} element{f.addedElements === 1 ? "" : "s"}
											{f.pieces > 0 && <> ({f.pieces} piece{f.pieces === 1 ? "" : "s"}, display: {f.pieceDisplay})</>}
											; aria-hidden on {f.ariaHidden}
											; aria-label on the &lt;{tag}&gt;: {f.hostLabel === null ? "no" : "yes"}
										</dd>
									</div>
									<div data-fact="host">
										<dt className="text-xs uppercase tracking-[0.1em] text-muted">The &lt;{tag}&gt;: role and name</dt>
										<dd>
											{f.hostRole}, {f.hostName ? <>named “{f.hostName}”</> : "no name"}
											{f.hostNameProhibited && <strong className="block mt-1">ARIA 1.2 prohibits a name on the {f.hostRole} role. Chrome exposes it anyway; screen readers differ (below).</strong>}
										</dd>
									</div>
									<div data-fact="stops">
										<dt className="text-xs uppercase tracking-[0.1em] text-muted">Tab stops and their names</dt>
										<dd>{f.stops.length}: {stopNames(f.stops)}</dd>
									</div>
									<div data-fact="exposed">
										<dt className="text-xs uppercase tracking-[0.1em] text-muted">Text left in the accessibility tree</dt>
										<dd>{f.exposed.length} piece{f.exposed.length === 1 ? "" : "s"} of text outside aria-hidden: {runs(f.exposed)}</dd>
									</div>
									{unit === "chars" && c.id !== "plain" && (
										<div data-fact="letters">
											<dt className="text-xs uppercase tracking-[0.1em] text-muted">Characters kept whole</dt>
											<dd>
												{f.letters} characters became {f.pieces} pieces
												{f.brokenLetters.length > 0 && <strong className="block mt-1">{f.brokenLetters.length} piece{f.brokenLetters.length === 1 ? " is" : "s are"} only part of a character.</strong>}
											</dd>
										</div>
									)}
									{c.id !== "plain" && (
										<div data-fact="changed">
											<dt className="text-xs uppercase tracking-[0.1em] text-muted">Changed from unsplit</dt>
											<dd>{diff.length ? <strong>{diff.join("; ")}</strong> : "Nothing this panel measures (width within half a pixel)."}</dd>
										</div>
									)}
									<details>
										<summary className="text-xs text-muted cursor-pointer">Show the markup</summary>
										<pre className="text-xs mt-2 whitespace-pre-wrap" style={{ overflowWrap: "anywhere" }}><code>{f.html}</code></pre>
									</details>
								</dl>
							) : (
								<p className="text-xs text-muted">{text.replace(/[\[\]\s]/g, "") ? "Measuring…" : "Type a sentence to compare."}</p>
							)}
						</section>
					)
				})}
			</div>

			{/* Outside evidence: real screen readers */}
			<div className="rounded-lg p-4 flex flex-col gap-3 text-sm" data-roselli style={{ border: "1px solid color-mix(in oklch, var(--foreground) 18%, transparent)" }}>
				<h3 className="font-semibold text-base">What screen readers did with the aria-label pattern (not our test)</h3>
				<p className="text-xs text-muted" style={{ lineHeight: 1.7 }}>
					We ran no screen reader. Adrian Roselli did: he tested GSAP’s own SplitText demo, a &lt;div&gt; with an aria-label and aria-hidden pieces, in eight screen reader and browser pairings and reported which ones exposed the text (
					<a href="https://github.com/greensock/GSAP/issues/642" className="underline">GSAP issue 642</a>, 5 February 2026). Two did. His table covers that one demo on a &lt;div&gt;; a heading may be named, so a split &lt;h2&gt; is a different case.
				</p>
				<ul className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
					{ROSELLI.map(([pair, works]) => (
						<li key={pair} className="rounded-md px-2 py-1.5" style={{ border: "1px solid color-mix(in oklch, var(--foreground) 14%, transparent)", fontWeight: works ? 600 : 400 }}>
							{pair}: {works ? "yes" : "no"}
						</li>
					))}
				</ul>
			</div>

			<div className="text-xs text-muted flex flex-col gap-2" style={{ lineHeight: 1.7 }}>
				<p><strong>How to read this.</strong> Roles, names, tab stops and exposed text are computed in your browser from the live markup, following the accessible-name rules (AccName 1.2). They describe what the page offers assistive technology, not what any screen reader says. We checked every reading against Chrome’s own accessibility tree across the presets and settings; the counts are in the <a href="/paper#method" className="underline">paper’s method section</a>. One known difference: Chrome stops building a name from content after 100 objects, so a long heading split into inline-block characters gets a shorter name in Chrome than the full one shown here. Widths are measured from the rendered lines, so they change with your browser, zoom and fonts.</p>
				<p><strong>More pieces is not the same as broken.</strong> Wrapped in place, the words are all still there and the names are right, but the text now sits in many small pieces. Chrome reports them one after another on the same line. Whether a screen reader runs them together is something this page can’t tell: a 2018 report from a VoiceOver user found iOS stopping at each inline element inside a link. The only rows that hand over the sentence in its original pieces are the unsplit one and anime.js’s hidden copy.</p>
				<p><strong>Limits.</strong> One font and one line. Kerning and ligature loss depends on the text: an ordinary sentence here gains about 1 to 2%, the line built from kerning pairs about 6%. Splitting by words costs almost no width in any of these libraries. A plain inline span keeps the shaping only while the pieces share one style: change a piece’s weight or size and the browser shapes it separately. Motion+ splitText is a paid product and isn’t run here; the paper reports what its published build did.</p>
			</div>
		</div>
	)
}
