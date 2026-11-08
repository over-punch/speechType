'use client'
import type { ReactNode } from 'react'
import { SCRIPT_NOTES } from '../../content/talkScript'
import { WIDTHS, MEASUREMENTS } from '../../content/measurements'
import { ShapingSpecimen } from './Figures'
import { A, Body, Card, CountUp, display, Frame, Reveal, Title, type Slide } from './engine'

export const TALK_TITLE = 'Keep the Text: Measuring What Split-Text Effects Cost'
export const TALK_CSS = `
@font-face{font-family:"Source Serif 4";src:url('/fonts/SourceSerif4.woff2') format('woff2');font-weight:200 900;font-display:swap}
@media(prefers-reduced-motion:reduce){[aria-roledescription="slide deck"] *,[aria-roledescription="slide deck"]{animation:none!important;transition:none!important}}
`
const SRC = {
	text: 'https://www.w3.org/TR/css-text-3/#boundary-shaping',
	aria: 'https://www.w3.org/TR/wai-aria-1.2/#namefromprohibited',
	gsap: 'https://gsap.com/docs/v3/Plugins/SplitText/',
	issue: 'https://github.com/greensock/GSAP/issues/642',
	highlight: 'https://www.w3.org/TR/css-highlight-api-1/',
}
function Pair({ children }: { children: ReactNode }) {
	return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>{children}</div>
}
function Note({ children }: { children: ReactNode }) { return <Body size={27}>{children}</Body> }
const arabic = MEASUREMENTS.browserCheck.arabic

export const SLIDES: Slide[] = [
	{
		id: 'open', tool: 'speechType', steps: 1, notes: SCRIPT_NOTES.open,
		footer: <><A href="/paper">Paper &amp; sources</A> · Quinn Keaveney · Vancouver</>,
		render: step => <Frame eyebrow="A browser experiment · November 2026"><Title a="Keep the Text: Measuring What Split-Text Effects Cost" size={88} /><Reveal at={1} step={step}><Body size={38}>Shaping. Semantics. Keyboard stops.</Body></Reveal></Frame>,
	},
	{
		id: 'compare', tool: 'fitWidth', steps: 1, notes: SCRIPT_NOTES.compare,
		footer: <><A href="/paper#method">Method</A> · Pinned versions; no latest-library census</>,
		render: step => <Frame eyebrow="Start with the original"><Title a="Compare three things" /><Reveal at={1} step={step}><div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 32 }}>{[['Shaping', 'Do letters still fit and join?'], ['Semantics', 'Is the link still named?'], ['Keyboard stops', 'What can Tab still reach?']].map(([a,b]) => <Card key={a}><p style={display(44)}>{a}</p><Note>{b}</Note></Card>)}</div></Reveal></Frame>,
	},
	{
		id: 'font', tool: 'opticalMargin', steps: 1, notes: SCRIPT_NOTES.font,
		footer: <><A href="/paper/data#historical">October 7 data</A> · 32 px · matching text, different fonts</>,
		render: step => <Frame eyebrow="Kerning and ligatures"><Title a="The font changes the cost" /><Pair>{WIDTHS.map(r => <div key={r.font} style={{ minWidth: 0, display: 'grid', gap: 16 }}><Note>Live illustration · {r.font} · 44 px</Note><ShapingSpecimen font={r.font} size={44} compact /><Reveal at={1} step={step}><Card style={{ padding: 24, gap: 8 }}><Note>Archived October 7 · 32 px · generated boxes</Note><p style={display(60)}>+<CountUp run={step >= 1} to={(r.boxes/r.unsplit-1)*100} decimals={1} />%</p></Card></Reveal></div>)}</Pair></Frame>,
	},
	{
		id: 'arabic', tool: 'ragtooth', steps: 1, notes: SCRIPT_NOTES.arabic,
		footer: <><A href="/paper/data#november">November 6 browser check</A> · System Arabic fallback · one phrase</>,
		render: step => <Frame eyebrow="Font-dependent evidence"><Title a="Joined letters come apart" /><Pair><div style={{ display: 'grid', gap: 16 }}><Note>Live illustration · system Arabic serif · 52 px</Note><ShapingSpecimen text={arabic.text} arabic size={52} compact /><Note>Generated character boxes, not the GSAP run.</Note></div><Reveal at={1} step={step}><Card><Note>Archived November 6 · GSAP 3.15.0<br />Characters · 32 px · system fallback</Note><p style={display(80)}>+<CountUp run={step >= 1} to={(arabic.gsapCharacters/arabic.unsplit-1)*100} decimals={1} />%</p><Note>196.2 → 261.1 px</Note><Note>Inline spans: 196.4 px</Note></Card></Reveal></Pair></Frame>,
	},
	{
		id: 'link', tool: 'hoverBoldly', steps: 1, notes: SCRIPT_NOTES.link,
		footer: <><A href={SRC.gsap}>GSAP documentation</A> · <A href="/paper/data#november">Chrome AX check</A></>,
		render: step => <Frame eyebrow="November 6 · Chrome tree observations"><Title a="The link is still there. Its name isn’t." size={90} /><Card style={{ padding: 28 }}><Body size={34}>Yes, you can sign today. First read <span style={{ textDecoration: 'underline' }}>the official terms</span>.</Body><Note>Original: one link stop · Chrome name: the official terms</Note></Card><Reveal at={1} step={step}><Pair><Card style={{ padding: 28 }}><Note>GSAP 3.15.0 · Characters / Words</Note><p style={display(42)}>Link stop retained</p><Note>Chrome name: empty</Note></Card><Card style={{ padding: 28 }}><Note>Our speechType 1.0.11</Note><p style={display(42)}>Link removed</p><Note>No link stop remains</Note></Card></Pair></Reveal></Frame>,
	},
	{
		id: 'ours', tool: 'speechType', steps: 1, notes: SCRIPT_NOTES.ours,
		footer: <><A href="/paper/data#historical">Published speechType packages · October 7 check</A></>,
		render: step => <Frame eyebrow="Our own regression"><Title a="Our old tool removed the link" /><Pair><Card><p style={display(54)}>1.0.11</p><Note>Link removed · hidden words · live-region writes</Note></Card><Reveal at={1} step={step}><Card><p style={display(54)}>1.1.0</p><Note>Link retained · no hidden words · no live region</Note></Card></Reveal></Pair><Note>These are markup and browser-tree results, not recorded announcements.</Note></Frame>,
	},
	{
		id: 'label', tool: 'vfClamp', steps: 1, notes: SCRIPT_NOTES.label,
		footer: <><A href={SRC.aria}>WAI-ARIA 1.2 · naming prohibited</A> · A heading is a different case</>,
		render: step => <Frame eyebrow="Role before attribute"><Title a="A label depends on the role" /><Card><p style={{ fontFamily: 'monospace', fontSize: 34 }}>&lt;p aria-label=&quot;…&quot;&gt; … &lt;/p&gt;</p><Note>paragraph / generic: author naming prohibited</Note></Card><Reveal at={1} step={step}><Body size={38}>Chrome exposes a name here. That doesn’t make the markup conforming.</Body></Reveal></Frame>,
	},
	{
		id: 'external', tool: 'steadyGray', steps: 1, notes: SCRIPT_NOTES.external,
		footer: <><A href={SRC.issue}>Adrian Roselli · GSAP issue 642</A> · February 5–8, 2026</>,
		render: step => <Frame eyebrow="External screen-reader evidence"><Title a="One external test, not a verdict" size={90} /><Card><p style={display(64)}>One labelled-div demo</p><Note>Adrian Roselli · February 2026<br />Two of eight tested pairings exposed its text</Note></Card><Reveal at={1} step={step}><Body size={36}>The issue asks for documentation changes about roles and ARIA.</Body></Reveal></Frame>,
	},
	{
		id: 'inline', tool: 'textBreath', steps: 1, notes: SCRIPT_NOTES.inline,
		footer: <><A href={SRC.text}>CSS Text 3 · shaping across boundaries</A> · <A href="/paper#inline-is-not-unsplit">Limits</A></>,
		render: step => <Frame eyebrow="Repair without a blanket promise"><Title a="Inline spans still have costs" /><Pair><Card><p style={display(48)}>Link kept</p><Note>Same inline formatting can preserve shaping</Note></Card><Reveal at={1} step={step}><Card><p style={display(48)}>More pieces</p><Note>Text objects multiply; emphasis can change width and rewrap lines</Note></Card></Reveal></Pair></Frame>,
	},
	{
		id: 'highlight', tool: 'fitFlush', steps: 1, notes: SCRIPT_NOTES.highlight,
		footer: <><A href={SRC.highlight}>CSS Custom Highlight API Level 1</A> · speechType 1.2.0 · opt-in</>,
		render: step => <Frame eyebrow="The least disruptive effect first"><Title a="Keep the sentence intact when you can" size={88} /><Card><p style={{ fontFamily: 'monospace', fontSize: 32 }}>{"CSS.highlights.set('reading', new Highlight(range))"}</p><Note>Styles a Range. No word wrappers needed.</Note></Card><Reveal at={1} step={step}><Body size={38}>This demo uses colour and background.<br />The API permits restricted painting properties;<br />not font weight, font size, or transforms.</Body></Reveal></Frame>,
	},
	{
		id: 'copy', tool: 'magnetType', steps: 1, notes: SCRIPT_NOTES.copy,
		footer: <><A href="/paper#moving-pieces-and-the-hidden-copy">Separate visible pieces from real text</A> · Check touch and focus behavior</>,
		render: step => <Frame eyebrow="For independently moving pieces"><Title a="A hidden copy needs its own checks" size={90} /><Pair><Card><p style={display(44)}>Check every Tab stop</p><Note>anime.js 4.5.0 accessible copy: two links, one unnamed (October 7)</Note></Card><Reveal at={1} step={step}><Card><p style={display(44)}>Still unresolved</p><Note>Duplicate text · selection · find · touch and focus checks</Note></Card></Reveal></Pair></Frame>,
	},
	{
		id: 'limits', tool: 'opszStepper', steps: 1, notes: SCRIPT_NOTES.limits,
		footer: <><A href="/paper#open-questions">Open questions</A> · No reader study or performance benchmark</>,
		render: step => <Frame eyebrow="Evidence boundaries"><Title a="What we measured; what we didn’t" size={90} /><Pair><Card><p style={display(44)}>Measured</p><Note>Rendered width · markup · Chrome roles and names · focusable links</Note></Card><Reveal at={1} step={step}><Card><p style={display(44)}>Not measured</p><Note>Screen-reader output · comprehension · touch behavior · speed</Note></Card></Reveal></Pair><Note>Also check contrast on your own colours. 1.2.0 opacity: 0.6; check the actual palette.</Note></Frame>,
	},
	{
		id: 'close', tool: 'opticalMargin', steps: 1, notes: SCRIPT_NOTES.close,
		footer: <><A href="/paper#recommendations">Checklist &amp; sources</A> · <A href="/#split">Operate the comparison</A></>,
		render: step => <Frame eyebrow="A practical test"><Title a="Compare before you ship" /><Body size={44}>Original → least disruptive effect → inspect during motion</Body><Reveal at={1} step={step}><Card><Body size={38}>Check shaping, link names, and Tab stops.<br />Then test the remaining questions with screen readers.</Body></Card></Reveal></Frame>,
	},
	{
		id: 'about', tool: 'speechType', steps: 1, notes: SCRIPT_NOTES.about,
		footer: <><A href="https://overpunch.com">Overpunch</A> · <A href="https://speechtype.vercel.app/paper">speechtype.vercel.app/paper</A></>,
		render: step => <Frame eyebrow="About"><Title a="We’re Overpunch" /><Body size={38}>15+ years building foundry websites. Typetin is in development.<br /><A href="https://speechtype.vercel.app/paper">speechtype.vercel.app/paper</A></Body><Reveal at={1} step={step}><div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>{[['Fit Width', 'https://fitwidth.com'], ['Hover Boldly', 'https://hoverboldly.com'], ['VF Clamp', 'https://vfclamp.com'], ['Speech Type', 'https://speechtype.vercel.app'], ['Code / integrations', 'https://github.com/over-punch/speechType'], ['Paper / methods', 'https://speechtype.vercel.app/paper']].map(([label,url]) => <Card key={label} style={{ padding: 24, gap: 8 }}><A href={url}>{label}</A><p style={{ fontSize: 20, color: 'var(--t-muted)', overflowWrap: 'anywhere' }}>{url.replace('https://','')}</p></Card>)}</div></Reveal></Frame>,
	},
]
