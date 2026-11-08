"use client"

// SplitCompare — one sentence with a link, three ways: unsplit, split by a published library, and wrapped in place. Shows each version's measured width and what it offers assistive technology, read from the live page.
import { useCallback, useEffect, useRef, useState } from "react"
import { applySpeechType, prepareSpeechType, removeSpeechType } from "@overpunch/speechtype"
import "splitting/dist/splitting.css"
import { useClientValue } from "@/lib/clientValue"
import { accessibleName, exposedText, isAxHidden, isAxHiddenWithin, nameProhibited, roleOf, tabStops } from "@/lib/axInfo"
import type { TabStop } from "@/lib/axInfo"
import { LIBRARIES, graphemes, splitWithLibrary, wrapInPlace } from "@/lib/splitters"
import type { KeptDisplay, LibraryId, Unit } from "@/lib/splitters"

/** Sentences offered as presets. Square brackets mark the linked words. */
const PRESETS: { id: string; label: string; text: string; lang?: string; linkLang?: string }[] = [
	{ id: "sentence", label: "A sentence with a link", text: "Yes, you can sign today. First read [the official terms]." },
	{ id: "kerning", label: "Kerning pairs and ligatures", text: "AVATAR [Toward] WAVE office affluent" },
	{ id: "clusters", label: "Emoji and Devanagari", text: "Family \u{1F469}‍\u{1F469}‍\u{1F467} says [नमस्ते] today", linkLang: "hi" },
	{ id: "arabic", label: "Arabic (joined letters)", text: "مرحبا [بالعالم] اليوم", lang: "ar" },
]

/** Longest sentence the input accepts (characters). */
const MAX_TEXT = 90

/** Host elements the sentence can be set in. */
const HOSTS = ["p", "h2", "div"] as const
type HostTag = (typeof HOSTS)[number]

/** The three versions shown. */
type RowId = "plain" | "split" | "kept"
const ROWS: RowId[] = ["plain", "split", "kept"]

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

/** Chrome stops building a name from content after this many objects (kMaxDescendantsForTextAlternativeComputation in Chromium's ax_node_object.cc). */
const CHROME_NAME_OBJECTS = 100

/** Name of the CSS custom highlight the unsplit row uses (styled in globals.css). */
const HIGHLIGHT = "split-demo"

/** What one version of the sentence measures and exposes. */
interface Facts {
	/** Width of the line in CSS px, at rest */
	width: number
	/** Widest the line gets while speechType emphasises one word (the wrapped row when it is speechType's own spans), else null */
	activeWidth: number | null
	/** Unsplit row only: the line's width with font-kerning: none, and with ligatures off as well */
	kernOff: number | null
	kernLigaOff: number | null
	/** Elements under the host beyond the ones the author wrote */
	addedElements: number
	ariaHidden: number
	/** aria-label on the host, or null */
	hostLabel: string | null
	hostRole: string
	hostName: string
	hostNameProhibited: boolean
	stops: TabStop[]
	/** Text objects left in the tree; " " is a space kept as its own object */
	exposed: string[]
	/** Links the author wrote that are still in the page */
	links: number
	/** Pieces the splitter made (0 for the unsplit row) */
	pieces: number
	/** User-perceived characters in the rendered sentence, white space excluded */
	letters: number
	/** Pieces that are only part of a user-perceived character */
	brokenLetters: string[]
	pieceDisplay: string
	/** Objects Chrome walks to build a name from this element's content: text objects, boxes and links */
	axObjects: number
	/** Whether the name comes from content and there are more objects than Chrome reads for a name */
	nameCapped: boolean
	html: string
}

/** Turn "Read [the terms] first." into text nodes and a link, without parsing it as HTML. Brackets that don't pair up, or hold no words, stay as text. */
function fill(host: HTMLElement, text: string): void {
	text.split(/(\[[^\[\]]*\])/).forEach((part) => {
		if (!part) return
		// A pair of brackets with nothing but space inside is not a link: it stays as typed.
		const linked = /^\[[^\[\]]*[^\[\]\s][^\[\]]*\]$/.test(part)
		if (!linked) { host.appendChild(document.createTextNode(part)); return }
		const a = document.createElement("a")
		a.href = "#split"
		a.textContent = part.slice(1, -1)
		host.appendChild(a)
	})
}

/** Width of a copy of the unsplit line with extra CSS, measured in place and removed again. */
function widthWith(host: HTMLElement, css: Partial<CSSStyleDeclaration>): number {
	const copy = host.cloneNode(true) as HTMLElement
	Object.assign(copy.style, css, { position: "absolute", visibility: "hidden", left: "0", top: "0" })
	host.parentElement?.appendChild(copy)
	const width = copy.getBoundingClientRect().width
	copy.remove()
	return width
}

/** Read one version's facts from the page. `rendered` is the sentence as the unsplit row shows it. */
function read(id: RowId, host: HTMLElement, pieces: HTMLElement[], unit: Unit, authored: number, rendered: string): Facts {
	const letters = graphemes(rendered.replace(/\s/g, ""))
	// A piece is broken when it is not one whole user-perceived character of the sentence.
	const whole = new Set(letters)
	const brokenLetters = unit === "chars" ? pieces.map((p) => p.textContent ?? "").filter((t) => t.length > 0 && graphemes(t).length === 1 && !whole.has(t)) : []
	const html = host.outerHTML
	const width = host.getBoundingClientRect().width
	// speechType's own word spans: step its real emphasis through every word and keep the widest line.
	let activeWidth: number | null = null
	if (id === "kept" && pieces[0]?.classList.contains("st-word")) {
		activeWidth = width
		pieces.forEach((_, i) => {
			applySpeechType(host, i, { transitionMs: 0 })
			activeWidth = Math.max(activeWidth ?? 0, host.getBoundingClientRect().width)
		})
		applySpeechType(host, -1)
	}
	const exposed = exposedText(host)
	// What Chrome counts on the way to a name: every text object, every element that is its own box, every link.
	let boxes = 0
	host.querySelectorAll("*").forEach((el) => {
		if (isAxHiddenWithin(el, host) || isAxHidden(el)) return
		if (el.matches("a[href]") || getComputedStyle(el).display !== "inline") boxes++
	})
	const axObjects = exposed.length + boxes
	return {
		axObjects,
		nameCapped: roleOf(host) === "heading" && !host.getAttribute("aria-label") && axObjects > CHROME_NAME_OBJECTS,
		width,
		activeWidth,
		kernOff: id === "plain" ? widthWith(host, { fontKerning: "none" }) : null,
		kernLigaOff: id === "plain" ? widthWith(host, { fontKerning: "none", fontVariantLigatures: "none" }) : null,
		addedElements: host.querySelectorAll("*").length - Math.min(authored, host.querySelectorAll("a[href]").length),
		ariaHidden: host.querySelectorAll('[aria-hidden="true"]').length,
		hostLabel: host.getAttribute("aria-label"),
		hostRole: roleOf(host),
		hostName: accessibleName(host),
		hostNameProhibited: nameProhibited(host),
		stops: tabStops(host),
		exposed,
		links: Math.min(authored, host.querySelectorAll("a[href]").length),
		pieces: pieces.length,
		letters: letters.length,
		brokenLetters,
		pieceDisplay: pieces[0] ? getComputedStyle(pieces[0]).display : "",
		html: html.length > 1400 ? `${html.slice(0, 1400)} …` : html,
	}
}

/** "1 piece", "3 pieces". */
function count(n: number, one: string, many = `${one}s`): string {
	return `${n} ${n === 1 ? one : many}`
}

/** A short list of the text objects that carry letters, e.g. “Read”, “the terms” (+24 more). */
function runs(list: string[], max = 4): string {
	const lettered = list.filter((t) => t !== " ")
	if (!lettered.length) return "none"
	// U+2068/U+2069 isolate each run, so right-to-left text doesn't reorder the quotes and commas around it.
	const shown = lettered.slice(0, max).map((t) => `“\u2068${t}\u2069”`).join(", ")
	return lettered.length > max ? `${shown} (+${lettered.length - max} more)` : shown
}

/** The names of the tab stops, e.g. “the terms”, (no name). */
function stopNames(stops: TabStop[]): string {
	if (!stops.length) return "none"
	return stops.map((s) => (s.name ? `“\u2068${s.name}\u2069”` : "(no name)")).join(", ")
}

/** A signed width difference: "+13.4 px (+1.9%)". */
function delta(width: number, base: number): string {
	const d = width - base
	const sign = d >= 0 ? "+" : "−"
	return `${sign}${Math.abs(d).toFixed(1)} px (${sign}${Math.abs((d / base) * 100).toFixed(1)}%)`
}

/** What changed from the unsplit row, each as one plain sentence about what a person meets. */
function meaning(f: Facts, plain: Facts, unit: Unit, tag: string): string[] {
	const out: string[] = []
	const same = (a: string, b: string) => a.replace(/\s/g, "") === b.replace(/\s/g, "")
	const nameless = f.stops.filter((s) => !s.name).length
	if (f.links < plain.links) out.push(`The link is gone. Its words are still drawn, but there is nothing to follow, by mouse, keyboard or screen reader.`)
	if (f.stops.length > plain.stops.length) out.push(`One link has become ${f.stops.length} tab stops${nameless ? `, and the extra one has no name` : ""}: a keyboard user presses Tab ${f.stops.length} times to get past it.`)
	else if (nameless) out.push(`A link stays focusable but has an empty accessible name in the browser. This page does not measure what a screen reader announces.`)
	const spelled = f.stops.find((s, i) => s.name && plain.stops[i] && s.name !== plain.stops[i].name && same(s.name, plain.stops[i].name))
	if (spelled) out.push(`The link’s name is now separate letters (“\u2068${spelled.name}\u2069”), which a screen reader may read one letter at a time.`)
	if (f.hostNameProhibited) out.push(`The sentence now exists only as an aria-label on a <${tag}>. ARIA doesn’t allow a name there, so whether it is read depends on the screen reader: in the test quoted below, of a <div>, two of eight read it.`)
	else if (f.hostName !== plain.hostName && same(f.hostName, plain.hostName)) out.push(`The heading’s name is now separate letters.`)
	else if (f.hostLabel !== null && plain.hostLabel === null) out.push(`The heading’s words are carried by an aria-label, which a heading is allowed to have. Text set this way isn’t reliably translated by the browser.`)
	const lettered = f.exposed.filter((t) => t !== " ")
	if (lettered.length === 0 && f.hostLabel === null) out.push(`None of the text is left in the page for a screen reader: every piece is hidden.`)
	else if (f.exposed.length > plain.exposed.length) out.push(`The same words, in ${f.exposed.length} text objects instead of ${plain.exposed.length}. Whether a screen reader pauses or stops between them isn’t something this page can tell.`)
	const wider = f.width - plain.width
	if (wider >= 0.5) {
		const boxes = f.pieceDisplay !== "" && f.pieceDisplay !== "inline"
		if (!boxes) out.push(`The line is ${wider.toFixed(1)} px wider.`)
		else if (unit === "words") out.push(`The line is ${wider.toFixed(1)} px wider: each word is its own box, so nothing kerns across the spaces.`)
		else if (plain.kernLigaOff !== null && f.width - plain.kernLigaOff > 1) out.push(`The line is ${wider.toFixed(1)} px wider: each letter is shaped alone. That is wider even than the unsplit line with kerning and ligatures switched off (${plain.kernLigaOff.toFixed(1)} px), because letters that should join or stack have come apart.`)
		else out.push(`The line is ${wider.toFixed(1)} px wider: each letter is shaped alone, so nothing kerns or joins${plain.kernLigaOff !== null ? `. It matches the unsplit line with kerning and ligatures switched off (${plain.kernLigaOff.toFixed(1)} px)` : ""}.`)
	}
	if (f.activeWidth !== null && f.activeWidth - plain.width >= 0.5) out.push(`While a word is emphasised the line grows by up to ${(f.activeWidth - plain.width).toFixed(1)} px (the word is heavier and wider), so the text after it moves and a line can rewrap.`)
	if (f.brokenLetters.length) out.push(`${count(f.brokenLetters.length, "character was", "characters were")} cut into parts that can’t be drawn on their own.`)
	return out
}

/** Costs a row has that this page doesn't measure, stated so they aren't missed. */
function unmeasured(id: RowId, lib: LibraryId, unit: Unit, keptDisplay: KeptDisplay, links: number): string {
	if (id === "plain") return "This demo highlights colour and background. The API supports a restricted set of painting properties, including text decoration and text shadow where supported; it cannot change font weight, font size or transforms, and it marks nothing in the markup, so the page has no record of which word is current. It hasn’t been tried with a screen reader."
	if (id === "split") {
		if (lib === "stold") return "While speaking, 1.0.11 also wrote each word into a live region. That could compete with the audio, depending on the screen reader. This page doesn’t start speech, so those announcements are not measured."
		if (lib === "anime") return "anime.js’s hidden copy puts the words in the page twice (find-in-page and copying can meet both)." + (links > 0 ? " The real link is clipped to one pixel, so its focus ring may be hard to locate." : " This sentence has no link to compare.")
		return "Not measured here: what each screen reader does with this markup."
	}
	if (keptDisplay === "hidden-copy") return "Costs not measured here: the words are in the page twice (the real ones can’t be selected, so copying gives them once, but find-in-page can meet both); the letters you see are hidden from assistive technology and the ones it reads are clipped to one pixel, which may behave differently under touch exploration or a focus highlight. No screen reader has been tried on it. It is the riskiest of the three."
	if (keptDisplay === "inline-block") return "Not measured here: what a screen reader does with one box per piece."
	return unit === "words"
		? "Not measured here: what a screen reader does with one object per word, or with aria-current moving from word to word."
		: "Not measured here: what a screen reader does with one object per letter."
}

/** Split-text comparison: unsplit, split by a library, and wrapped in place. */
export default function SplitCompare() {
	const [text, setText] = useState(PRESETS[0].text)
	const [tag, setTag] = useState<HostTag>("p")
	const [unit, setUnit] = useState<Unit>("chars")
	const [lib, setLib] = useState<LibraryId>("gsap")
	const [keptDisplay, setKeptDisplay] = useState<KeptDisplay>("inline")
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
		for (const id of ROWS) {
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
	/** Whether the sentence has anything to split. */
	const hasText = /[^\[\]\s]/.test(text)

	useEffect(() => {
		let stale = false
		/** Build the three versions, run the splitters, then measure once layout has settled. */
		const run = async () => {
			try {
				await document.fonts.load('32px "Source Serif 4"')
				if (stale) return
				// Nothing to split: clear the lines and the readings.
				if (!/[^\[\]\s]/.test(text)) {
					stopEffects()
					live.current = { plain: null, split: null, kept: null }
					for (const id of ROWS) mounts.current[id]?.replaceChildren()
					setError("")
					setFacts(null)
					return
				}
				const made = {} as Record<RowId, { host: HTMLElement; pieces: HTMLElement[] }>
				for (const id of ROWS) {
					const mount = mounts.current[id]
					if (!mount) return
					if (id === "plain") stopEffects()
					const host = document.createElement(tag)
					host.className = "split-host"
					host.style.fontKerning = kerning
					// Let the text set its own direction, and name the language of the presets that aren't English.
					host.dir = "auto"
					const preset = PRESETS.find((p) => p.text === text)
					if (preset?.lang) host.lang = preset.lang
					fill(host, text)
					if (preset?.linkLang) host.querySelectorAll("a").forEach((a) => { a.lang = preset.linkLang ?? "" })
					mount.replaceChildren(host)
					made[id] = { host, pieces: [] }
				}
				const authored = made.plain.host.querySelectorAll("a[href]").length
				const rendered = made.plain.host.textContent ?? ""
				// speechType 1.0.11 rebuilt the element with innerHTML, so typed markup became real elements (fixed in 1.1.0). Don't feed it any.
				if (lib === "stold" && /[<&]/.test(text)) throw new Error("speechType 1.0.11 turned typed text into HTML, a bug fixed in 1.1.0, so this page won’t run it on a sentence containing < or &. Pick another library or remove those characters.")
				made.split.pieces = await splitWithLibrary(made.split.host, lib, unit)
				if (stale) return
				made.kept.pieces = wrapInPlace(made.kept.host, unit, keptDisplay)
				await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
				if (stale) return
				live.current = made
				setError("")
				setFacts({
					plain: read("plain", made.plain.host, [], unit, authored, rendered),
					split: read("split", made.split.host, made.split.pieces, unit, authored, rendered),
					kept: read("kept", made.kept.host, made.kept.pieces, unit, authored, rendered),
				})
			} catch (e) {
				if (stale) return
				// Don't leave the last sentence's readings under a sentence that wasn't run.
				stopEffects()
				live.current = { plain: null, split: null, kept: null }
				for (const id of ROWS) mounts.current[id]?.replaceChildren()
				setFacts(null)
				setError(e instanceof Error ? e.message : String(e))
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
	const keptTitle = keptDisplay === "inline" ? "Wrapped in place, inline" : keptDisplay === "inline-block" ? "Wrapped in place, inline-block" : "Wrapped in place, boxes beside the real text"
	const keptSub = keptDisplay === "hidden-copy"
		? "For effects that move pieces. Each run of text stays whole and visually hidden inside its own element; the boxes that get animated sit beside it and are aria-hidden. Because the real text never leaves the link, the link keeps one tab stop and its name. The boxes still lose their kerning."
		: keptDisplay === "inline-block"
			? "The same spans, each made an inline-block so it can be moved or rotated. No ARIA attributes. The letters are still real text, but each is now its own box."
			: unit === "words"
				? "speechType’s own prepareSpeechType(): a plain span around each word (this page runs the local build; 1.1.0 is the dated published wrapping comparison, and highlight mode shipped in 1.2.0). Nothing is hidden and no aria-label is added. The one attribute it writes is aria-current on the word being emphasised."
				: "A plain span around each character, nothing else: no ARIA attributes. (speechType itself wraps words; this is the same idea per character.)"
	const columns: { id: RowId; title: string; sub: string }[] = [
		{ id: "plain", title: "Unsplit", sub: "The sentence as written. Its button runs speechType’s highlight mode (available as an opt-in mode in 1.2.0): it paints each word with the CSS Custom Highlight API and adds nothing to the page. This demo uses colour and background; the API permits restricted painting properties, subject to browser support, not font weight, font size or transforms." },
		{ id: "split", title: `Split by ${library.name} ${library.version}`, sub: library.does },
		{ id: "kept", title: keptTitle, sub: keptSub },
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
						className="text-xs px-3 py-1.5 rounded-2xl border text-left max-w-full"
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

			<div className="text-xs text-muted" style={{ lineHeight: 1.7 }} data-glossary>
<p><strong>The words used here.</strong> A <em>screen reader</em> presents interface and document information through speech and/or braille; its users may also have usable vision. It uses information exposed through the browser’s <em>accessibility tree</em>, rather than simply reading pixels. In that list each thing has a <em>role</em> (paragraph, link, heading) and may have a <em>name</em> (for a link, its words). A <em>tab stop</em> is a place the Tab key lands. <em>aria-hidden</em> removes something from that list; <em>aria-label</em> gives something a name by hand. An <em>inline-block</em> is a piece of text made into its own small box, which is what lets an animation move it. <em>Kerning</em> adjusts spacing between particular glyph pairs, bringing them closer or farther apart. A <em>ligature</em> replaces a character sequence with a glyph, which need not be a joined shape. Cursive joining supplies contextual connected forms. These shaping operations depend on context and formatting boundaries.</p>
			</div>

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
							<button key={p.id} type="button" aria-pressed={text === p.text} onClick={() => setText(p.text)} className="text-xs px-3 py-1.5 rounded-2xl border text-left max-w-full" style={{ borderColor: "currentColor", background: text === p.text ? "var(--btn-bg)" : "transparent", fontWeight: text === p.text ? 600 : 400 }}>
								{p.label}
							</button>
						))}
						<span className="text-xs text-muted">{text.length} of {MAX_TEXT} characters</span>
					</div>
				</div>
				{group("Split by", lib, LIBRARIES.map((l) => ({ value: l.id, label: `${l.name} ${l.version}${l.id === "stold" ? " (ours, before the fix)" : ""}` })), setLib)}
				{group("Split into", unit, [{ value: "chars", label: "Characters" }, { value: "words", label: "Words" }], setUnit)}
				{group("Element", tag, HOSTS.map((h) => ({ value: h, label: `<${h}>` })), setTag)}
				{group("Wrapped-in-place pieces", keptDisplay, [{ value: "inline", label: "Inline spans (colour, weight)" }, { value: "inline-block", label: "Inline-block (can move)" }, { value: "hidden-copy", label: "Inline-block beside the real text (can move)" }], setKeptDisplay)}
				{group("font-kerning on all three", kerning, [{ value: "auto", label: "auto (the browser default)" }, { value: "none", label: "none (what GSAP and SplitType suggest)" }], setKerning)}
			</div>

			{error && <p role="alert" className="text-sm font-medium">Not run: {error}</p>}

			{/* The three rendered lines, left edges aligned, with a rule where the unsplit line ends */}
			<div className="rounded-lg p-5 overflow-x-auto" style={{ background: "color-mix(in oklch, var(--foreground) 4%, transparent)", border: "1px solid color-mix(in oklch, var(--foreground) 12%, transparent)" }}>
				<div className="flex flex-col gap-4" style={{ width: "max-content", minWidth: "100%" }}>
					{columns.map((c) => (
						<div key={c.id} className="flex flex-col gap-1" data-line={c.id}>
							<div className="flex flex-wrap items-center gap-x-3 gap-y-1 sticky left-0" style={{ width: "min(100%, calc(100vw - 6rem))" }}>
								<span className="text-xs uppercase tracking-[0.12em] text-muted">{c.title}</span>
								<button type="button" onClick={() => play(c.id)} disabled={!hasText || (c.id === "plain" && !canHighlight)} className="text-xs px-2.5 py-1 rounded-full border disabled:opacity-60" style={{ borderColor: "currentColor" }}>
									{c.id === "plain" ? (canHighlight ? "Highlight each word without splitting" : "Custom highlights aren’t supported in this browser") : "Play an effect on the pieces"}
								</button>
							</div>
							{/* The rule sits inside each line's own box, so it never crosses the labels or buttons. */}
							<div className="relative">
								{plain && <div aria-hidden="true" data-guide className="absolute top-0 bottom-0" style={{ left: plain.width, borderLeft: "1px dashed color-mix(in oklch, var(--foreground) 55%, transparent)" }} />}
								<div ref={(n) => { mounts.current[c.id] = n }} className="split-mount" />
							</div>
						</div>
					))}
				</div>
				<p className="text-xs text-muted mt-4" style={{ lineHeight: 1.7 }}>
					The dashed rule marks where the unsplit line ends. Set in Source Serif 4; emoji, Devanagari and Arabic come from your system’s fonts. The effect is a fade; pieces that are boxes also rise, because a transform (moving, turning or scaling a piece) does nothing to an inline span. The one exception is words wrapped inline, which are speechType’s own spans: their button plays its real emphasis, a heavier, wider word. Where the link’s underline breaks up, that is the split as well: an underline isn’t drawn across inline-block pieces.
				</p>
			</div>

			{/* Facts, side by side */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
				{columns.map((c) => {
					const f = facts?.[c.id]
					const said = f && plain && c.id !== "plain" ? meaning(f, plain, unit, tag) : []
					const spaces = f ? f.exposed.filter((t) => t === " ").length : 0
					return (
						<section key={c.id} data-row={c.id} aria-label={c.title} className="rounded-lg p-4 flex flex-col gap-3 text-sm" style={{ border: "1px solid color-mix(in oklch, var(--foreground) 18%, transparent)" }}>
							<div className="flex flex-col gap-1">
								<h3 className="font-semibold text-base">{c.title}</h3>
								<p className="text-xs text-muted" style={{ lineHeight: 1.6 }}>{c.sub}</p>
								{c.id === "split" && <p className="text-xs font-mono text-muted" style={{ overflowWrap: "anywhere" }}>{library.call[unit]}</p>}
							</div>
							{f && plain ? (
								<dl className="flex flex-col gap-3">
									{c.id !== "plain" && (
										<div data-fact="changed">
											<dt className="text-xs uppercase tracking-[0.1em] text-muted">What changed, in plain words</dt>
											<dd>
												{said.length ? (
													<ul className="list-disc pl-4 flex flex-col gap-1 font-medium">{said.map((line) => <li key={line}>{line}</li>)}</ul>
												) : "Width, names and tab stops match within the measurement tolerance. Compare the structure and text-object counts below as well."}
											</dd>
										</div>
									)}
									<div data-fact="width">
										<dt className="text-xs uppercase tracking-[0.1em] text-muted">Line width</dt>
										<dd className="tabular-nums">
											{f.width.toFixed(1)} px
											{c.id !== "plain" && <> · {delta(f.width, plain.width)}</>}
											{f.activeWidth !== null && <span className="block" data-fact-active>While one word is emphasised: up to {f.activeWidth.toFixed(1)} px · {delta(f.activeWidth, plain.width)}</span>}
											{f.kernOff !== null && f.kernLigaOff !== null && (
												<span className="block text-xs text-muted mt-1" data-fact-shaping>
													The same unsplit line with kerning off: {f.kernOff.toFixed(1)} px. With kerning and ligatures off: {f.kernLigaOff.toFixed(1)} px.
												</span>
											)}
										</dd>
									</div>
									<div data-fact="markup">
										<dt className="text-xs uppercase tracking-[0.1em] text-muted">Added to the page</dt>
										<dd>
											{count(f.addedElements, "element")}
											{f.pieces > 0 && <> ({count(f.pieces, "piece")}, display: {f.pieceDisplay})</>}
											; aria-hidden on {f.ariaHidden}
											; aria-label on the &lt;{tag}&gt;: {f.hostLabel === null ? "no" : "yes"}
										</dd>
									</div>
									<div data-fact="host">
										<dt className="text-xs uppercase tracking-[0.1em] text-muted">The &lt;{tag}&gt;: role and name</dt>
										<dd>
											{f.hostRole}, {f.hostName ? <>named “<bdi>{f.hostName}</bdi>”</> : "no name"}
											{f.hostNameProhibited && <strong className="block mt-1">ARIA 1.2 prohibits a name on the {f.hostRole} role. Chrome exposes it anyway; screen readers differ (below).</strong>}
											{f.nameCapped && <span className="block mt-1 text-xs text-muted" data-name-capped>Chrome’s own tree cuts this name short: it stops building a name from content after 100 objects, and this element has {f.axObjects}.</span>}
										</dd>
									</div>
									<div data-fact="stops">
										<dt className="text-xs uppercase tracking-[0.1em] text-muted">Tab stops and their names</dt>
										<dd>{f.stops.length}: {stopNames(f.stops)}</dd>
									</div>
									<div data-fact="exposed">
										<dt className="text-xs uppercase tracking-[0.1em] text-muted">Text left in the accessibility tree</dt>
										<dd>{count(f.exposed.length, "text object")} outside aria-hidden{spaces > 0 && <> ({f.exposed.length - spaces} with letters, {count(spaces, "space")})</>}: {runs(f.exposed)}</dd>
									</div>
									{unit === "chars" && c.id !== "plain" && f.pieces > 0 && (
										<div data-fact="letters">
											<dt className="text-xs uppercase tracking-[0.1em] text-muted">Characters kept whole</dt>
											<dd>
												{count(f.letters, "character")} became {count(f.pieces, "piece")}
												{f.pieces < f.letters && lib === "stold" && c.id === "split" && <> (this version splits words, not characters)</>}
												{f.brokenLetters.length > 0 && <strong className="block mt-1">{count(f.brokenLetters.length, "piece is", "pieces are")} only part of a character.</strong>}
											</dd>
										</div>
									)}
									<div data-fact="unmeasured">
										<dt className="text-xs uppercase tracking-[0.1em] text-muted">What this page can’t measure</dt>
										<dd className="text-xs" style={{ lineHeight: 1.6 }}>{unmeasured(c.id, lib, unit, keptDisplay, plain?.links ?? 0)}</dd>
									</div>
									<details>
										<summary className="text-xs text-muted cursor-pointer">Show the markup</summary>
										<pre className="text-xs mt-2 whitespace-pre-wrap" style={{ overflowWrap: "anywhere" }}><code>{f.html}</code></pre>
									</details>
								</dl>
							) : (
								<p className="text-sm font-medium" data-empty>{error ? "Nothing to show for this sentence." : hasText ? "Measuring…" : "Type a sentence above to compare (the box is empty)."}</p>
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
					<a href="https://github.com/greensock/GSAP/issues/642" className="underline">GSAP issue 642</a>, 5 February 2026). Two did. His table covers that one demo on a &lt;div&gt;; a heading may be named, so a split &lt;h2&gt; is a different case. It is the only published test of this pattern we found, and we looked in the libraries’ own issue trackers, not everywhere.
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
				<p><strong>How to read this.</strong> Roles, names, tab stops and text objects are computed in your browser from the live markup, following the accessible-name rules (AccName 1.2). They describe what the page offers assistive technology, not what any screen reader says. The original sweep checked 1,603 states / 4,809 column readings and found 198 NBSP name mismatches (90 plain, 90 kept, 18 split). After preserving NBSP, a rebuilt-site check covered 91 states / 273 column readings and still found six host-name spacing mismatches, all in anime.js heading cases. These computed names remain approximations, not verified browser-tree equivalents; inspect Chrome’s tree independently. See the <a href="/paper/data#november" className="underline">dated status and method</a>. One known difference: Chrome stops building a name from content after 100 objects, so a heading split into inline-block characters (the first preset is long enough) gets a shorter name in Chrome than the full one shown here. Widths are measured from the rendered lines, so they change with your browser, zoom and fonts.</p>
				<p><strong>More pieces is not the same as broken.</strong> Ordinary inline wrapping keeps the words and link names in our browser checks, but adds text objects. Making each character an independent box can change the names too. Whether a screen reader runs the pieces together is something this page can’t tell: <a href="https://axesslab.com/text-splitting/" className="underline">a 2018 report from a VoiceOver user</a> found iOS stopping at each inline element inside a link. The unsplit row, anime.js’s hidden copy and “boxes beside the real text” keep a copy of the sentence in its original pieces.</p>
				<p><strong>Limits.</strong> One font and one line. What splitting into letters costs depends on the text and the chosen library. The kerning-pair and joined-script presets can change substantially; use the live width readings for your selected state. Splitting by words usually costs less width, although GSAP’s link can still lose its name. A plain inline span keeps shaping across its boundary while the formatting allows it: changing weight or size can require separate shaping. Motion+ splitText is not included in this live comparison.</p>
			</div>
		</div>
	)
}
