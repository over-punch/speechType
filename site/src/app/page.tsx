import Demo from "@/components/Demo"
import CopyInstall from "@/components/CopyInstall"
import CodeBlock from "@/components/CodeBlock"
import ToolDirectory from "@/components/ToolDirectory"
import { version } from "../../../package.json"
import { version as siteVersion } from "../../package.json"
import SiteFooter from "../components/SiteFooter"
import { MagnetChar } from "@liiift-studio/magnettype"

export default function Home() {
	return (
		<main className="flex flex-col items-center px-6 py-20 gap-24">

			{/* Hero */}
			<section className="w-full max-w-2xl lg:max-w-5xl flex flex-col gap-6">
				<div className="flex flex-col gap-2">
					<p className="text-xs uppercase tracking-[0.18em] font-medium text-muted">speechtype</p>
					<h1 className="text-4xl lg:text-8xl xl:text-9xl" style={{ fontFamily: "var(--font-merriweather), serif", fontVariationSettings: '"wght" 300, "opsz" 144', lineHeight: "1.05em" }}>
						<MagnetChar as="span" minWeight={300} maxWeight={800} spreadRadius={220} fixedAxes={{ opsz: 144 }}>Typography that</MagnetChar><br />
						<MagnetChar as="span" minWeight={300} maxWeight={800} spreadRadius={220} fixedAxes={{ opsz: 144 }} style={{ color: "var(--foreground-subtle)", fontStyle: "italic" }}>follows your voice.</MagnetChar>
					</h1>
				</div>
				<div className="flex items-center gap-4">
					<CopyInstall />
					<a href="https://github.com/Liiift-Studio/SpeechType" className="text-sm text-muted hover:text-foreground transition-colors">GitHub ↗</a>
				</div>
				<div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted tracking-wide">
					<span>TypeScript</span><span aria-hidden="true">·</span><span>Zero dependencies</span><span aria-hidden="true">·</span><span>React + Vanilla JS</span>
				</div>
				<p className="text-base leading-relaxed max-w-lg">
					When text is read aloud via speech synthesis, there is no visual indicator of which word is being spoken — the connection between audio and typography is severed. speechType wraps words in spans and listens to Web Speech API boundary events, applying typographic emphasis to each word as it is spoken.
				</p>
			</section>

			{/* Demo */}
			<section className="w-full max-w-2xl lg:max-w-5xl flex flex-col gap-4">
				<h2 className="text-xs uppercase tracking-[0.18em] font-medium text-muted">Live demo — step with the Word slider or press Speak if supported</h2>
				<div className="rounded-xl -mx-8 px-8 py-8" style={{ background: "rgba(0,0,0,0.25)", overflow: 'hidden' }}>
					<Demo />
				</div>
			</section>

			{/* Explanation */}
			<section className="w-full max-w-2xl lg:max-w-5xl flex flex-col gap-6">
				<h2 className="text-xs uppercase tracking-[0.18em] font-medium text-muted">How it works</h2>
				<div className="prose-grid grid grid-cols-1 sm:grid-cols-2 gap-12 text-sm leading-relaxed">
					<div className="flex flex-col gap-3">
						<p className="font-semibold text-base">The audio-text gap</p>
						<p>When the browser speaks text via <code className="text-xs font-mono">SpeechSynthesisUtterance</code>, words are heard but not seen. There is no CSS property that tracks synthesis progress — the visual and the auditory are decoupled by design. speechType closes that gap.</p>
					</div>
					<div className="flex flex-col gap-3">
						<p className="font-semibold text-base">Boundary events drive emphasis</p>
						<p>The Web Speech API fires <code className="text-xs font-mono">boundary</code> events as each word begins. speechType maps the reported character index to the correct word span and applies typographic emphasis — wider tracking, heavier weight, larger optical size — while dimming all other words.</p>
					</div>
					<div className="flex flex-col gap-3">
						<p className="font-semibold text-base">Imperative for performance</p>
						<p>During active speech, <code className="text-xs font-mono">startSpeechType</code> handles each boundary event directly — updating span styles without touching React state or triggering re-renders. The boundary event fires, the span style changes, and the frame is painted. No scheduling, no batching delay.</p>
					</div>
					<div className="flex flex-col gap-3">
						<p className="font-semibold text-base">React or vanilla JS</p>
						<p><code className="text-xs font-mono">SpeechTypeText</code> and <code className="text-xs font-mono">useSpeechType</code> manage span preparation and React-driven emphasis. <code className="text-xs font-mono">startSpeechType</code> is the vanilla JS entry point — it wraps, speaks, and syncs, returning a stop function.</p>
					</div>
				</div>
			</section>

			{/* Usage */}
			<section className="w-full max-w-2xl lg:max-w-5xl flex flex-col gap-6">
				<div className="flex items-baseline gap-4">
					<h2 className="text-xs uppercase tracking-[0.18em] font-medium text-muted">Usage</h2>
					<p className="text-xs text-muted tracking-wide">TypeScript + React · Vanilla JS</p>
				</div>
				<div className="flex flex-col gap-8 text-sm">
					<div className="flex flex-col gap-3">
						<p className="text-muted">Drop-in component</p>
						<CodeBlock code={`import { SpeechTypeText, startSpeechType } from '@liiift-studio/speechtype'
import { useRef, useState } from 'react'

// Drive activeWordIndex via startSpeechType or your own state
const [activeWordIndex, setActiveWordIndex] = useState(-1)
const ref = useRef<HTMLParagraphElement>(null)

// startSpeechType updates the spans imperatively during speech:
<SpeechTypeText ref={ref} activeWordIndex={activeWordIndex}>
  The voice knows where it is. The page does not.
</SpeechTypeText>`} />
					</div>
					<div className="flex flex-col gap-3">
						<p className="text-muted">Start speech synthesis and sync emphasis</p>
						<CodeBlock code={`import { startSpeechType } from '@liiift-studio/speechtype'

const el = document.querySelector('p')
const stop = startSpeechType(el, { rate: 0.9, activeWeight: 700 })

// Later — cancel speech and restore styles:
// stop()`} />
					</div>
					<div className="flex flex-col gap-3">
						<p className="text-muted">Hook — manual control with your own active index</p>
						<CodeBlock code={`import { useSpeechType } from '@liiift-studio/speechtype'
import { useRef } from 'react'

// Inside a React component:
const ref = useRef(null)
useSpeechType(ref, activeWordIndex, { inactiveOpacity: 0.4 })
return <p ref={ref}>Every word spoken carries its own weight.</p>`} />
					</div>
					<div className="flex flex-col gap-3">
						<p className="text-muted">Options</p>
						<table className="w-full text-xs" aria-label="SpeechTypeOptions API reference">
							<thead><tr className="text-subtle text-left"><th className="pb-2 pr-6 font-normal">Option</th><th className="pb-2 pr-6 font-normal">Default</th><th className="pb-2 font-normal">Description</th></tr></thead>
							<tbody className="text-muted">
								<tr className="border-t border-foreground/10 hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">activeTracking</td><td className="py-2 pr-6">0.06</td><td className="py-2">Letter-spacing on the active word in em.</td></tr>
								<tr className="border-t border-foreground/10 hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">activeWeight</td><td className="py-2 pr-6">700</td><td className="py-2">wght axis value on the active word.</td></tr>
								<tr className="border-t border-foreground/10 hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">activeOpsz</td><td className="py-2 pr-6">24</td><td className="py-2">opsz axis value on the active word.</td></tr>
								<tr className="border-t border-foreground/10 hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">inactiveOpacity</td><td className="py-2 pr-6">0.45</td><td className="py-2">Opacity of words not currently spoken.</td></tr>
								<tr className="border-t border-foreground/10 hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">transitionMs</td><td className="py-2 pr-6">80</td><td className="py-2">CSS transition duration in ms for style changes.</td></tr>
								<tr className="border-t border-foreground/10 hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">rate</td><td className="py-2 pr-6">0.9</td><td className="py-2">Speech rate (0.1–10). Accepted by all paths; speech options (rate, pitch, volume) are silently ignored by SpeechTypeText and useSpeechType.</td></tr>
								<tr className="border-t border-foreground/10 hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">pitch</td><td className="py-2 pr-6">1</td><td className="py-2">Speech pitch (0–2). Silently ignored by SpeechTypeText and useSpeechType.</td></tr>
								<tr className="border-t border-foreground/10 hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">volume</td><td className="py-2 pr-6">1</td><td className="py-2">Speech volume (0–1). Silently ignored by SpeechTypeText and useSpeechType.</td></tr>
								<tr className="border-t border-foreground/10 hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">onUnsupported</td><td className="py-2 pr-6">—</td><td className="py-2">Called when the browser does not support SpeechSynthesis.</td></tr>
								<tr className="border-t border-foreground/10 hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">onError</td><td className="py-2 pr-6">—</td><td className="py-2">Called with the SpeechSynthesisErrorEvent if synthesis errors.</td></tr>
								<tr className="border-t border-foreground/10 hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">as</td><td className="py-2 pr-6">&apos;p&apos;</td><td className="py-2">HTML element to render. (SpeechTypeText only)</td></tr>
							</tbody>
						</table>
					</div>
				</div>
			</section>

			<SiteFooter current="speechType" npmVersion={version} siteVersion={siteVersion} />

		</main>
	)
}
