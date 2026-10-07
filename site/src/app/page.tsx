import Demo from "@/components/Demo"
import SplitCompare from "@/components/SplitCompare"
import Hero from "@/components/Hero"
import CodeBlock from "@/components/CodeBlock"
import { version } from "../../../package.json"
import { version as siteVersion } from "../../package.json"
import SiteFooter from "../components/SiteFooter"
import PortsSection from "../components/PortsSection"

export default function Home() {
	return (
		<main className="flex flex-col items-center px-6 py-20 gap-24">

			{/* Hero */}
			<Hero
				eyebrow="speech-driven emphasis"
				title={[{ text: "Typography that" }, { text: "follows your voice.", italic: true, subtle: true }]}
				install="@overpunch/speechtype"
				github="https://github.com/over-punch/speechType"
				tech={["TypeScript", "Zero dependencies", "React + Vanilla JS"]}
			>
				<p className="text-base leading-relaxed max-w-lg">
					When a browser reads text aloud with speech synthesis, nothing on the page shows which word is being spoken. speechType listens to the Web Speech API’s boundary events and marks each word as it is spoken: by default with weight, optical size and spacing on a plain span around each word, or (next release) with a highlight that adds nothing to the page. The text stays real text either way: links keep their names, and the accessibility tree keeps the paragraph you wrote.
				</p>
			</Hero>

			{/* Demo */}
			<section id="demo" className="w-full max-w-2xl lg:max-w-5xl flex flex-col gap-4 scroll-mt-28 sm:scroll-mt-20">
				<h2 className="text-xs uppercase tracking-[0.18em] font-medium text-muted">Live demo — step with the Word slider or press Speak if supported</h2>
				<div className="rounded-xl -mx-6 px-6 sm:-mx-8 sm:px-8 py-8" style={{ background: "var(--panel)", overflow: 'hidden' }}>
					<Demo />
				</div>
			</section>

			{/* Split-text comparison */}
			<section id="split" className="w-full max-w-2xl lg:max-w-5xl flex flex-col gap-4 scroll-mt-28 sm:scroll-mt-20">
				<h2 className="text-xs uppercase tracking-[0.18em] font-medium text-muted">What splitting text costs — measured on this page</h2>
				<p className="text-sm leading-relaxed max-w-2xl">
					speechType has to put every word in its own span, and so does any effect that moves words or letters one at a time. Until version 1.1.0 it also hid those spans from screen readers, a mistake several of our tools made. Below, one sentence with a link is set three ways: as written, split by a published library (the real package, run in your browser), and wrapped in place the way speechType does it now. Each version reports its measured width and what it offers assistive technology.
				</p>
				<div className="rounded-xl -mx-6 px-6 sm:-mx-8 sm:px-8 py-8" style={{ background: "var(--panel)", overflow: 'hidden' }}>
					<SplitCompare />
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
						<p>The Web Speech API fires <code className="text-xs font-mono">boundary</code> events as each word begins. speechType maps the reported character index to the word and applies typographic emphasis (wider tracking, heavier weight, larger optical size) while dimming the other words. Not every voice sends word boundaries; with one that doesn&apos;t, the text is spoken and nothing is marked.</p>
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
						<CodeBlock code={`import { SpeechTypeText, startSpeechType } from '@overpunch/speechtype'
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
						<CodeBlock code={`import { startSpeechType } from '@overpunch/speechtype'

const el = document.querySelector('p')
const stop = startSpeechType(el, { rate: 0.9, activeWeight: 700 })

// Later — cancel speech and restore styles:
// stop()`} />
					</div>
					<div className="flex flex-col gap-3">
						<p className="text-muted">Hook — manual control with your own active index</p>
						<CodeBlock code={`import { useSpeechType } from '@overpunch/speechtype'
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
							<tbody className="text-muted zebra">
								<tr className="hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">activeTracking</td><td className="py-2 pr-6">0.06</td><td className="py-2">Letter-spacing on the active word in em.</td></tr>
								<tr className="hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">activeWeight</td><td className="py-2 pr-6">+300</td><td className="py-2">wght axis value on the active word. Unset: the word&apos;s own weight plus 300 (400 becomes 700).</td></tr>
								<tr className="hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">activeOpsz</td><td className="py-2 pr-6">×1.5</td><td className="py-2">opsz axis value on the active word. Unset: 1.5 times the word&apos;s own optical size.</td></tr>
								<tr className="hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">inactiveOpacity</td><td className="py-2 pr-6">0.45</td><td className="py-2">Opacity of words not currently spoken. Dimming lowers contrast while a word is active: at 0.45, black on white is 3.4:1, under WCAG AA. The next release defaults to 0.6 (5.7:1); set it yourself until then.</td></tr>
								<tr className="hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">transitionMs</td><td className="py-2 pr-6">80</td><td className="py-2">CSS transition duration in ms for style changes.</td></tr>
								<tr className="hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">mode</td><td className="py-2 pr-6">&apos;spans&apos;</td><td className="py-2">Next release, not on npm yet. &apos;highlight&apos; wraps nothing and paints the spoken word with the CSS Custom Highlight API (style it with ::highlight(speechtype)). Colour and background only; falls back to spans where the API is missing.</td></tr>
								<tr className="hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">rate</td><td className="py-2 pr-6">0.9</td><td className="py-2">Speech rate (0.1–10). Accepted by all paths; speech options (rate, pitch, volume) are silently ignored by SpeechTypeText and useSpeechType.</td></tr>
								<tr className="hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">pitch</td><td className="py-2 pr-6">1</td><td className="py-2">Speech pitch (0–2). Silently ignored by SpeechTypeText and useSpeechType.</td></tr>
								<tr className="hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">volume</td><td className="py-2 pr-6">1</td><td className="py-2">Speech volume (0–1). Silently ignored by SpeechTypeText and useSpeechType.</td></tr>
								<tr className="hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">onUnsupported</td><td className="py-2 pr-6">—</td><td className="py-2">Called when the browser does not support SpeechSynthesis.</td></tr>
								<tr className="hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">onError</td><td className="py-2 pr-6">—</td><td className="py-2">Called with the SpeechSynthesisErrorEvent if synthesis errors.</td></tr>
								<tr className="hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">as</td><td className="py-2 pr-6">&apos;p&apos;</td><td className="py-2">HTML element to render. (SpeechTypeText only)</td></tr>
							</tbody>
						</table>
					</div>
				</div>
			</section>

			{/* Limits */}
			<section className="w-full max-w-2xl lg:max-w-5xl flex flex-col gap-6">
				<h2 className="text-xs uppercase tracking-[0.18em] font-medium text-muted">Limits</h2>
				<ul className="text-sm leading-relaxed flex flex-col gap-3 max-w-2xl list-disc pl-5">
					<li>We have not tested speechType with a screen reader. What we checked is Chrome&apos;s accessibility tree, where names and roles match the unwrapped text. A span per word does split the text into more pieces in that tree, and a 2018 report found VoiceOver on iOS stopping at inline elements; the highlight mode avoids spans altogether.</li>
					<li>The default emphasis makes the spoken word heavier and wider, so lines can rewrap while it plays. The highlight mode can&apos;t move text, and can&apos;t change weight or size either.</li>
					<li>Dimming the other words lowers their contrast for as long as a word is active. The published default, 0.45, puts black-on-white text at 3.4:1, under the 4.5:1 that WCAG AA asks; the next release defaults to 0.6 (5.7:1). On softer colours you need more: the demo above shows the ratio for this page. Set <code className="text-xs font-mono">inactiveOpacity</code> to 1 for no dimming.</li>
					<li>Speech synthesis, its voices and its word-boundary events come from the browser and the operating system, and differ between them.</li>
				</ul>
			</section>

			<PortsSection npm="@overpunch/speechtype" bundle="speechtype" attr="data-speechtype" repo="over-punch/SpeechType" />

			<SiteFooter current="speechType" npmVersion={version} siteVersion={siteVersion} />

		</main>
	)
}
