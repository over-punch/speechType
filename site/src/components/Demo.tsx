"use client"

// Interactive demo: Speak button or manual word slider drives per-word typographic emphasis
import { useState, useEffect, useRef, useDeferredValue } from "react"
import { useClientValue } from "@/lib/clientValue"
import { SpeechTypeText, startSpeechType } from "@overpunch/speechtype"
import type { SpeechTypeOptions } from "@overpunch/speechtype"

/** Sample paragraph about voice, speech, and the act of reading */
const SAMPLE = "Every word spoken carries its own weight — a breath of meaning that arrives, lingers, and fades. To read aloud is to make language visible in time, each syllable a footprint left in the air. The voice knows where it is. The page does not."

/** The words of the sample that are a link in the demo (a link has to survive the word-wrapping), and the text either side */
const SAMPLE_LINK = "read aloud"
const SAMPLE_BEFORE = SAMPLE.slice(0, SAMPLE.indexOf(SAMPLE_LINK))
const SAMPLE_AFTER = SAMPLE.slice(SAMPLE.indexOf(SAMPLE_LINK) + SAMPLE_LINK.length)

/** Words derived from the sample text for the manual word slider */
const WORDS = SAMPLE.split(/\s+/)

/** Id of the demo paragraph (read by the contrast readout). */
const PARA_ID = 'readalong-text'

/** WCAG AA contrast ratio for body text. */
const AA = 4.5

/**
 * Contrast ratio (WCAG 2) of the paragraph's text, dimmed to the given opacity, against what is painted behind
 * it. Colours are resolved by painting them on a canvas, so oklch tokens and translucent layers are handled.
 *
 * @param para    - The demo paragraph
 * @param opacity - Opacity of the dimmed words (0–1)
 */
function dimmedContrast(para: HTMLElement, opacity: number): number | null {
	const canvas = document.createElement('canvas')
	canvas.width = canvas.height = 1
	const ctx = canvas.getContext('2d', { willReadFrequently: true })
	if (!ctx) return null
	// Paint every background from the page down to the paragraph, back to front.
	const layers: string[] = []
	for (let el: HTMLElement | null = para; el; el = el.parentElement) layers.unshift(getComputedStyle(el).backgroundColor)
	layers.forEach((colour) => { ctx.fillStyle = colour; ctx.fillRect(0, 0, 1, 1) })
	const behind = ctx.getImageData(0, 0, 1, 1).data
	ctx.globalAlpha = opacity
	ctx.fillStyle = getComputedStyle(para).color
	ctx.fillRect(0, 0, 1, 1)
	const text = ctx.getImageData(0, 0, 1, 1).data
	const luminance = (c: Uint8ClampedArray) => {
		const f = (v: number) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4 }
		return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2])
	}
	const [hi, lo] = [luminance(behind), luminance(text)].sort((a, b) => b - a)
	return (hi + 0.05) / (lo + 0.05)
}

/** Interactive demo for speechType */
export default function Demo() {
	// Manual word index for the slider (React-controlled)
	const [activeWordIndex, setActiveWordIndex] = useState(-1)

	// Speech synthesis state
	const [speaking, setSpeaking] = useState(false)
	// Read during render via useSyncExternalStore — true during SSR so the demo UI is
	// server-rendered, then the real capability once hydrated.
	const supported = useClientValue(() => 'speechSynthesis' in window, true)

	// Deferred option values for smooth slider interaction
	const [activeWeight, setActiveWeight] = useState(700)
	// 0.75 keeps the dimmed words above 4.5:1 on this page's colours (the readout under the slider shows the ratio)
	const [inactiveOpacity, setInactiveOpacity] = useState(0.75)
	const [rate, setRate] = useState(0.9)
	const [transitionMs, setTransitionMs] = useState(80)
	// How the spoken word is marked: restyled spans, or a CSS custom highlight with no spans at all
	const [mode, setMode] = useState<'spans' | 'highlight'>('spans')
	// Whether this browser has the CSS Custom Highlight API (true during server rendering)
	const canHighlight = useClientValue(() => 'highlights' in CSS && typeof Highlight !== 'undefined', true)

	const deferredWeight = useDeferredValue(activeWeight)
	const deferredOpacity = useDeferredValue(inactiveOpacity)
	const deferredTransition = useDeferredValue(transitionMs)

	// Ref to the paragraph element for imperative startSpeechType calls
	const paraRef = useRef<HTMLParagraphElement>(null)

	// Stop function ref — holds the cleanup returned by startSpeechType
	const stopRef = useRef<(() => void) | null>(null)

	// Poll interval ref — stored so the interval can be cleared on unmount
	const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

	// Aria-live announcement text for screen readers
	const [announcement, setAnnouncement] = useState('')

	// Detect SpeechSynthesis support on mount; clear poll interval on unmount
	useEffect(() => {
		return () => {
			if (pollRef.current !== null) {
				clearInterval(pollRef.current)
				pollRef.current = null
			}
		}
	}, [])

	// Cancel speech when rate changes while speaking (rate change takes effect on next speak)
	useEffect(() => {
		if (speaking) {
			handleStop()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [rate])

	/** Options passed to both the React component (manual mode) and startSpeechType (speech mode) */
	const options: SpeechTypeOptions = {
		activeWeight: deferredWeight,
		activeOpsz: 24,
		activeTracking: 0.06,
		inactiveOpacity: deferredOpacity,
		transitionMs: deferredTransition,
		mode,
		rate,
	}

	/** Start speech synthesis — drives emphasis imperatively via startSpeechType.
	 *  IMPORTANT: this function must be called directly from a user-gesture handler
	 *  (onClick, onKeyDown, etc.) — iOS Safari blocks SpeechSynthesis when speak()
	 *  is deferred to a timeout or async callback. */
	function handleSpeak() {
		const el = paraRef.current
		if (!el) return

		// Clear any existing poll before starting a new one
		if (pollRef.current !== null) {
			clearInterval(pollRef.current)
			pollRef.current = null
		}

		// Reset manual slider so React state doesn't fight the imperative emphasis
		setActiveWordIndex(-1)
		setSpeaking(true)
		setAnnouncement('Speech started')

		stopRef.current = startSpeechType(el, {
			...options,
			rate,
		})

		// Detect when speech ends (utterance onend fires internally, but we also watch)
		// Poll speechSynthesis.speaking — simple and reliable across browsers
		pollRef.current = setInterval(() => {
			if (!window.speechSynthesis.speaking) {
				clearInterval(pollRef.current!)
				pollRef.current = null
				setSpeaking(false)
				setActiveWordIndex(-1)
				setAnnouncement('Speech ended')
			}
		}, 200)
	}

	/** Stop speech synthesis and clear the poll interval */
	function handleStop() {
		if (pollRef.current !== null) {
			clearInterval(pollRef.current)
			pollRef.current = null
		}
		stopRef.current?.()
		stopRef.current = null
		setSpeaking(false)
		setActiveWordIndex(-1)
		setAnnouncement('Speech stopped')
	}

	// Contrast of the dimmed words on this page (client only: it reads computed colours)
	const dimRatio = useClientValue(() => {
		const para = document.getElementById(PARA_ID)
		const ratio = para ? dimmedContrast(para, inactiveOpacity) : null
		return ratio === null ? null : Math.round(ratio * 10) / 10
	}, null)

	// Determine which word text to show next to the slider value
	const currentWordText = activeWordIndex >= 0 && activeWordIndex < WORDS.length
		? WORDS[activeWordIndex]
		: '—'

	return (
		<div className="w-full flex flex-col gap-8">

			{/* Screen-reader live region — announces speech start/stop events */}
			<div aria-live="polite" aria-atomic="true" className="sr-only">
				{announcement}
			</div>

			{/* Browser support notice */}
			{!supported && (
				<p className="text-xs text-muted italic">
					Your browser does not support the Web Speech API. Use the Word slider below to step through the demo manually.
				</p>
			)}

			{/* Controls grid */}
			<div className="flex flex-col gap-5">

				{/* Speak / Stop button */}
				{supported && (
					<div className="flex items-center gap-4">
						<button
							onClick={speaking ? handleStop : handleSpeak}
							aria-pressed={speaking}
							aria-label={speaking ? 'Stop speech synthesis' : 'Speak paragraph aloud using speech synthesis'}
							title={speaking ? 'Stop speech synthesis and reset emphasis' : 'Read the paragraph aloud using speech synthesis — each word is emphasised as it is spoken'}
							className="flex items-center gap-2 text-sm px-4 py-2 rounded-full border transition-all"
							style={{
								borderColor: 'currentColor',
								opacity: 1,
								background: speaking ? 'var(--btn-bg)' : 'transparent',
							}}
						>
							<span aria-hidden="true">{speaking ? '◼' : '▶'}</span>
							<span>{speaking ? 'Stop' : 'Speak'}</span>
						</button>
						{speaking && (
							<span className="text-xs text-muted italic">Speaking…</span>
						)}
					</div>
				)}

				{/* How the word is marked */}
				<div className="flex flex-col gap-2" role="group" aria-label="How the spoken word is marked">
					<span className="text-xs uppercase tracking-[0.12em] text-muted">Mark the spoken word with</span>
					<div className="flex flex-wrap gap-2">
						{([['spans', 'Type: weight, size and spacing (a span per word)'], ['highlight', 'A highlight (no spans; next release)']] as const).map(([value, label]) => (
							<button
								key={value}
								type="button"
								aria-pressed={mode === value}
								disabled={value === 'highlight' && !canHighlight}
								onClick={() => { if (speaking) handleStop(); setActiveWordIndex(-1); setMode(value) }}
								className="text-xs px-3 py-1.5 rounded-full border disabled:opacity-60"
								style={{ borderColor: 'currentColor', background: mode === value ? 'var(--btn-bg)' : 'transparent', fontWeight: mode === value ? 600 : 400 }}
							>
								{label}
							</button>
						))}
					</div>
					<p className="text-xs text-muted" style={{ lineHeight: 1.7 }}>
						{mode === 'spans'
							? 'Each word sits in its own plain span: nothing is hidden and no label is added. The spoken word gets heavier, larger in optical size and wider, and carries aria-current, the one attribute speechType writes. The extra width moves the words after it, and at some column widths a line rewraps while it plays.'
							: canHighlight
								? 'Nothing is added to the paragraph. The spoken word is painted with the CSS Custom Highlight API, which can change colour and background only, so the text never moves. The weight, opacity and transition sliders do nothing in this mode. In the repository; not on npm yet.'
								: 'This browser has no CSS Custom Highlight API, so the highlight mode isn’t available here.'}
					</p>
				</div>

				{/* Manual word slider */}
				<div className="flex flex-col gap-1">
					<div className="flex justify-between text-xs uppercase tracking-[0.12em] text-muted">
						<span>Word</span>
						<span className="tabular-nums italic normal-case">{speaking ? 'following the speech' : currentWordText}</span>
					</div>
					<input
						type="range"
						min={-1}
						max={WORDS.length - 1}
						step={1}
						value={activeWordIndex}
						aria-label="Word (manual step through spoken words)"
						aria-valuetext={activeWordIndex >= 0 ? `Word ${activeWordIndex + 1} of ${WORDS.length}: ${currentWordText}` : 'No word marked'}
						title="Step through words one at a time — each word is emphasised as if it were being spoken aloud"
						onChange={e => {
							if (speaking) handleStop()
							setActiveWordIndex(Number(e.target.value))
						}}
						onTouchStart={e => e.stopPropagation()}
						style={{ touchAction: 'none' }}
					/>
				</div>

				{/* Active weight slider */}
				<div className="flex flex-col gap-1">
					<div className="flex justify-between text-xs uppercase tracking-[0.12em] text-muted">
						<span>Active weight</span>
						<span className="tabular-nums">{activeWeight}</span>
					</div>
					<input
						type="range"
						min={300}
						max={900}
						step={50}
						value={activeWeight}
						aria-label="Active word weight (wght axis value)"
						disabled={mode === 'highlight'}
						title="Font weight applied to the spoken word — higher values make the active word bolder and more prominent"
						onChange={e => setActiveWeight(Number(e.target.value))}
						onTouchStart={e => e.stopPropagation()}
						style={{ touchAction: 'none' }}
					/>
				</div>

				{/* Inactive opacity slider */}
				<div className="flex flex-col gap-1">
					<div className="flex justify-between text-xs uppercase tracking-[0.12em] text-muted">
						<span>Inactive opacity</span>
						<span className="tabular-nums">{inactiveOpacity.toFixed(2)}</span>
					</div>
					<input
						type="range"
						min={0}
						max={1}
						step={0.05}
						value={inactiveOpacity}
						aria-label="Inactive word opacity"
						disabled={mode === 'highlight'}
						title="Opacity of words that are not currently being spoken — lower values create stronger contrast between the active word and the rest"
						onChange={e => setInactiveOpacity(Number(e.target.value))}
						onTouchStart={e => e.stopPropagation()}
						style={{ touchAction: 'none' }}
					/>
				<p className="text-xs text-muted" data-dim-contrast>
							{mode === 'highlight'
								? 'Nothing is dimmed in highlight mode, and the weight and transition sliders don’t apply.'
								: dimRatio === null
								? 'Dimming lowers the contrast of the words not being spoken.'
								: `Dimmed words on this page: ${dimRatio.toFixed(1)}:1. ${dimRatio >= AA ? 'That clears' : 'That is under'} the ${AA}:1 that WCAG AA asks of body text. The published default is 0.45; the next release’s is 0.6.`}
						</p>
					</div>

				{/* Rate slider */}
				<div className="flex flex-col gap-1">
					<div className="flex justify-between text-xs uppercase tracking-[0.12em] text-muted">
						<span>Rate</span>
						<span className="tabular-nums">{rate.toFixed(1)}×</span>
					</div>
					<input
						type="range"
						min={0.5}
						max={2}
						step={0.1}
						value={rate}
						aria-label="Speech rate (0.5 = slow, 2.0 = fast)"
						title="Speed at which the paragraph is read aloud — slower rates give the typography more time on each word"
						onChange={e => setRate(Number(e.target.value))}
						onTouchStart={e => e.stopPropagation()}
						style={{ touchAction: 'none' }}
					/>
				</div>

				{/* Transition slider */}
				<div className="flex flex-col gap-1">
					<div className="flex justify-between text-xs uppercase tracking-[0.12em] text-muted">
						<span>Transition</span>
						<span className="tabular-nums">{transitionMs}ms</span>
					</div>
					<input
						type="range"
						min={0}
						max={300}
						step={20}
						value={transitionMs}
						aria-label="Style transition duration in milliseconds"
						disabled={mode === 'highlight'}
						title="How long the font-weight and opacity transition takes when emphasis moves from one word to the next — 0ms is instant, 300ms is a smooth fade"
						onChange={e => setTransitionMs(Number(e.target.value))}
						onTouchStart={e => e.stopPropagation()}
						style={{ touchAction: 'none' }}
					/>
				</div>
			</div>

			{/* Demo paragraph */}
			<div
				className="rounded-lg p-6 flex flex-col gap-4"
				style={{ background: 'color-mix(in oklch, var(--foreground) 4%, transparent)', border: '1px solid color-mix(in oklch, var(--foreground) 12%, transparent)' }}
			>
				<SpeechTypeText
					ref={paraRef}
					activeWordIndex={activeWordIndex}
					as="p"
					id={PARA_ID}
					{...options}
					style={{
						fontFamily: 'var(--font-merriweather), serif',
						fontSize: 'clamp(1rem, 2.5vw, 1.35rem)',
						lineHeight: 1.8,
						margin: 0,
					}}
				>
					{SAMPLE_BEFORE}<a href="#split" style={{ textDecoration: 'underline' }}>{SAMPLE_LINK}</a>{SAMPLE_AFTER}
				</SpeechTypeText>
			</div>

			<p className="text-xs text-muted italic" style={{ lineHeight: "1.8" }}>
				Press Speak to hear the paragraph read aloud by your browser’s speech synthesis, with each word marked as it is spoken, or use the Word slider to step through by hand. “read aloud” is a real link: it stays a link, with its name, in both modes. Meant for read-along reading aids, language learning and teleprompters. It is not a screen reader and doesn’t replace one.
			</p>
		</div>
	)
}
