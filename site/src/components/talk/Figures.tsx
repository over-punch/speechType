import type { CSSProperties } from 'react'
import { WIDTHS, MEASUREMENTS } from '../../content/measurements'

const range = (start: number) => ({ '--r': `entry ${start}% entry 100%` } as CSSProperties)

/** Actual font specimens, not outlines or simulated letter spacing. */
export function ShapingSpecimen({ text = 'AVATAR Toward WAVE office affluent', font = 'Source Serif 4', arabic = false, size = 32, compact = false }: { text?: string; font?: string; arabic?: boolean; size?: number; compact?: boolean }) {
	return <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 16, minWidth: 0 }}>
		<p className="sr-only">Specimen text: <span lang={arabic ? 'ar' : 'en'} dir={arabic ? 'rtl' : 'ltr'}>{text}</span></p>
		{['Intact text', 'Inline spans, matching styles', 'One inline-block per letter'].map((label, row) => compact && row === 1 ? null : <div key={label} className="fig-rise" style={range(10 + row * 20)}>
			<p style={{ fontSize: size < 40 ? 14 : 28, letterSpacing: '0.04em', color: 'var(--t-muted, var(--foreground-muted))', marginBottom: 6 }}>{label}</p>
			<div style={{ overflowX: 'auto', paddingBottom: 4 }}>
				<p aria-hidden="true" dir={arabic ? 'rtl' : 'ltr'} lang={arabic ? 'ar' : 'en'} style={{ width: 'max-content', fontFamily: arabic ? 'serif' : `"${font}", serif`, fontSize: size, fontWeight: 400, fontKerning: 'auto', fontVariantLigatures: 'normal', lineHeight: 1.5, whiteSpace: 'nowrap' }}>
					{row === 0 ? text : Array.from(text).map((ch, i) => ch === ' ' ? ' ' : <span key={i} style={{ display: row === 2 ? 'inline-block' : 'inline' }}>{ch}</span>)}
				</p>
			</div>
		</div>)}
	</div>
}

export function WidthFigure() {
	return <div className="fig rounded-xl p-6" style={{ background: 'var(--panel)' }}>
		<p className="text-xs tracking-[0.18em] uppercase text-muted mb-5">October 7 · character boxes · 32 px</p>
		{WIDTHS.map((r, i) => <div key={r.font} className="mb-5 fig-rise" style={range(i * 20)}>
			<p>{r.font}: {r.unsplit.toFixed(2)} → {r.boxes.toFixed(2)} px</p>
			<div className="fig-grow mt-2 h-4 rounded" style={{ width: `${(r.boxes / r.unsplit - 1) * 1000}%`, background: 'var(--foreground)', ...range(i * 20) }} />
			<p className="text-sm text-muted mt-2">+{((r.boxes / r.unsplit - 1) * 100).toFixed(2)}%; inline spans: {r.inline.toFixed(2)} px</p>
		</div>)}
		<figcaption className="text-sm text-muted">Same line: AVATAR Toward WAVE office affluent. Bars use a common 0–10% scale. Historical fontpick run, not a new benchmark. <a href="/paper/data#historical" className="underline">Raw measurements and method</a>.</figcaption>
	</div>
}

export function FontFigure() {
	return <div className="fig rounded-xl p-6" style={{ background: 'var(--panel)' }}>
		<ShapingSpecimen />
		<figcaption className="text-sm text-muted mt-6">Live Source Serif 4 at 32 px, weight 400, default kerning and ligatures. Live generated spans illustrate shaping; they are not the archived measurement harness. The current WOFF2 and archived TTF builds have not been established as binary-equivalent, so these samples do not reproduce the archived widths. Matching inline formatting allows shaping across boundaries. <a className="underline" href="https://www.w3.org/TR/css-text-3/#boundary-shaping">CSS Text 3</a>.</figcaption>
	</div>
}

export function ArabicFigure() {
	const r = MEASUREMENTS.browserCheck.arabic
	return <div className="fig rounded-xl p-6" style={{ background: 'var(--panel)' }}>
		<ShapingSpecimen text={r.text} arabic />
		<figcaption className="text-sm text-muted mt-6">Arabic specimen: intact, inline spans, then independent character boxes. Uses your system’s Arabic serif fallback. November 6 browser check: {r.unsplit} → {r.gsapCharacters} px with GSAP Characters (+{((r.gsapCharacters / r.unsplit - 1) * 100).toFixed(1)}%); inline spans {r.inlineCharacters} px. The live boxes are generated spans, not the archived GSAP call. These archived 32 px values aren’t a live measurement of this figure. <a className="underline" href="/paper/data#november">Browser record</a>.</figcaption>
	</div>
}

export function SemanticsFigure() {
	return <div className="fig rounded-xl p-6" style={{ background: 'var(--panel)' }}>
		{[
			['Intact sentence', '1 link · name: the official terms'],
			['GSAP Characters or Words', '1 link · empty accessible name in Chrome'],
			['speechType 1.0.11', 'Link removed'],
			['Wrapping in place', '1 link · name: the official terms'],
		].map(([label, value], i) => <div key={label} className="fig-rise py-3" style={range(i * 15)}><p>{label}</p><p className="text-sm text-muted">{value}</p></div>)}
		<figcaption className="text-sm text-muted mt-4">November 6 local comparison of the default sentence. Link names checked against Chrome’s accessibility tree; not a report of speech output. <a className="underline" href="/paper/data#november">Evidence</a>.</figcaption>
	</div>
}
