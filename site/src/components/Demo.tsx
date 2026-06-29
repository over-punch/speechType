"use client"

// Interactive demo: Speak button or manual word slider drives per-word typographic emphasis
import { useState, useEffect, useRef, useDeferredValue } from "react"
import { SpeechTypeText, startSpeechType } from "@liiift-studio/speechtype"
import type { SpeechTypeOptions } from "@liiift-studio/speechtype"

/** Sample paragraph about voice, speech, and the act of reading */
const SAMPLE = "Every word spoken carries its own weight — a breath of meaning that arrives, lingers, and fades. To read aloud is to make language visible in time, each syllable a footprint left in the air. The voice knows where it is. The page does not."

/** Words derived from the sample text for the manual word slider */
const WORDS = SAMPLE.split(/\s+/)

/** Interactive demo for speechType */
export default function Demo() {
	// Manual word index for the slider (React-controlled)
	const [activeWordIndex, setActiveWordIndex] = useState(-1)

	// Speech synthesis state
	const [speaking, setSpeaking] = useState(false)
	const [supported, setSupported] = useState(true)

	// Deferred option values for smooth slider interaction
	const [activeWeight, setActiveWeight] = useState(700)
	const [inactiveOpacity, setInactiveOpacity] = useState(0.45)
	const [rate, setRate] = useState(0.9)
	const [transitionMs, setTransitionMs] = useState(80)

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
		setSupported('speechSynthesis' in window)
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
							<span className="text-xs text-muted italic">Listening…</span>
						)}
					</div>
				)}

				{/* Manual word slider */}
				<div className="flex flex-col gap-1">
					<div className="flex justify-between text-xs uppercase tracking-[0.12em] text-muted">
						<span>Word</span>
						<span className="tabular-nums italic normal-case">{currentWordText}</span>
					</div>
					<input
						type="range"
						min={-1}
						max={WORDS.length - 1}
						step={1}
						value={activeWordIndex}
						aria-label="Word (manual step through spoken words)"
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
						title="Opacity of words that are not currently being spoken — lower values create stronger contrast between the active word and the rest"
						onChange={e => setInactiveOpacity(Number(e.target.value))}
						onTouchStart={e => e.stopPropagation()}
						style={{ touchAction: 'none' }}
					/>
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
					{...options}
					style={{
						fontFamily: 'var(--font-merriweather), serif',
						fontSize: 'clamp(1rem, 2.5vw, 1.35rem)',
						lineHeight: 1.8,
						margin: 0,
					}}
				>
					{SAMPLE}
				</SpeechTypeText>
			</div>

			<p className="text-xs text-muted italic" style={{ lineHeight: "1.8" }}>
				Press Speak to hear the paragraph read aloud — each word is emphasised as it is spoken. Use the Word slider to step through manually. Useful for accessibility tools, language learning, teleprompters, and any interface where voice and text need to stay connected.
			</p>
		</div>
	)
}
