// libs-2026-10-07.mjs: re-run of libs.mjs after the reboot. Runs the same markup through five text-splitting
// libraries (each with its own defaults, and again asked for characters) and records, per case: the host's ARIA
// attributes, Chrome's accessibility tree for that element (CDP Accessibility.getPartialAXTree), Playwright's
// spec-following aria snapshot, every focusable element with Chrome's computed name, the pieces and their
// computed display, and the text's width before and after. Writes libs.out.json (full) and prints a summary.
// Usage: node libs-2026-10-07.mjs   (bundles from fetch-libs.sh and fonts/SourceSerif4.ttf must sit beside it)
import { createRequire } from 'module'
import fs from 'fs'
import path from 'path'

const require = createRequire('/Users/quinn-keaveney/Desktop/GITs/type-tools/fitWidth/')
const { chromium } = require('playwright')
const DIR = path.dirname(new URL(import.meta.url).pathname)
const FONT = path.join(DIR, 'fonts/SourceSerif4.ttf')
const html = `<!doctype html><html lang="en"><meta charset=utf-8><title>libtest</title><style>@font-face{font-family:SS;src:url(file://${FONT})}body{font:32px SS;width:1100px}</style>
<div id=root></div></html>`
fs.writeFileSync(path.join(DIR, 'page.html'), html)

/** Each case: [id, tag, innerHTML]. */
const CASES = [
	['para', 'p', 'Read <a href="/terms">the terms</a> before you sign.'],
	['head', 'h1', 'Chapter <a href="/one">one</a> begins'],
	['btn', 'button', 'Save draft'],
	['div', 'div', 'A plain div of text'],
	['uni', 'p', 'Family \u{1F469}‍\u{1F469}‍\u{1F467} and नमस्ते'],
	['shape', 'p', 'AVATAR Toward WAVE office affluent'],
]

/** Library runs: bundle files, then the split call. "default" is the call with no options. */
const LIBS = {
	'none': null,
	'gsap@3.15.0 SplitText (default)': ['gsap.js', 'gsap-split.js', 'el=>{gsap.registerPlugin(SplitText);SplitText.create(el)}'],
	'gsap@3.15.0 SplitText (type chars,words)': ['gsap.js', 'gsap-split.js', 'el=>{gsap.registerPlugin(SplitText);SplitText.create(el,{type:"chars,words"})}'],
	'gsap@3.15.0 SplitText (type words)': ['gsap.js', 'gsap-split.js', 'el=>{gsap.registerPlugin(SplitText);SplitText.create(el,{type:"words"})}'],
	'split-type@0.3.4 (default)': ['splittype.js', 'el=>{new SplitType(el)}'],
	'split-type@0.3.4 (types words,chars)': ['splittype.js', 'el=>{new SplitType(el,{types:"words,chars"})}'],
	'splitting@1.1.0 (default, no CSS)': ['splitting.js', 'el=>{Splitting({target:el})}'],
	'splitting@1.1.0 (default + its splitting.css rule .char{display:inline-block})': ['splitting.js', 'el=>{if(!document.getElementById("spcss")){const s=document.createElement("style");s.id="spcss";s.textContent=".splitting .word,.splitting .char{display:inline-block}";document.head.append(s)}Splitting({target:el})}'],
	'motion-plus-dom@3.0.0 splitText (default)': ['motion.js', 'mpd.js', 'el=>{MotionPlus.splitText(el)}'],
	'animejs@4.5.0 splitText (default)': ['anime.js', 'el=>{anime.splitText(el)}'],
	'animejs@4.5.0 splitText (words+chars)': ['anime.js', 'el=>{anime.splitText(el,{words:true,chars:true})}'],
	'animejs@4.5.0 splitText (words+chars, accessible:false)': ['anime.js', 'el=>{anime.splitText(el,{words:true,chars:true,accessible:false})}'],
}

/** Flatten a CDP AX node list to "role:name" strings, skipping ignored nodes and inline text boxes. */
function flat(nodes) {
	return nodes.filter(n => !n.ignored && n.role?.value !== 'InlineTextBox').map(n => `${n.role?.value}:${JSON.stringify(n.name?.value ?? '')}`)
}

const b = await chromium.launch()
const out = { meta: { date: new Date().toISOString(), chromium: b.version(), playwright: require('playwright/package.json').version } }
for (const [lib, spec] of Object.entries(LIBS)) {
	const p = await b.newPage()
	const errors = []
	p.on('pageerror', e => errors.push(e.message))
	await p.goto('file://' + path.join(DIR, 'page.html'))
	await p.evaluate(() => document.fonts.load('32px SS'))
	if (spec) for (const f of spec.slice(0, -1)) await p.addScriptTag({ path: path.join(DIR, f) })
	const cdp = await p.context().newCDPSession(p)
	await cdp.send('Accessibility.enable'); await cdp.send('DOM.enable')
	const res = {}
	for (const [id, tag, inner] of CASES) {
		await p.evaluate(([id, tag, inner]) => {
			const e = document.createElement(tag); e.id = id; e.innerHTML = inner
			document.getElementById('root').append(e)
			const r = document.createRange(); r.selectNodeContents(e)
			window['tw_' + id] = r.getBoundingClientRect().width
		}, [id, tag, inner])
		if (spec) { try { await p.evaluate(`(${spec.at(-1)})(document.getElementById('${id}'))`) } catch (e) { res[id] = { error: e.message.split('\n')[0] }; continue } }
		await p.waitForTimeout(60)
		const snap = await p.locator('#' + id).ariaSnapshot()
		const dom = await p.evaluate(id => {
			const e = document.getElementById(id)
			const r = document.createRange(); r.selectNodeContents(e)
			const leaf = [...e.querySelectorAll('span,div')].filter(s => !s.querySelector('span,div') && s.textContent.trim())
			const visLeaf = leaf.filter(s => { const c = getComputedStyle(s); return !(c.position === 'absolute' && (c.clip !== 'auto' || c.clipPath !== 'none')) && !s.closest('[style*="clip"]') })
			const first = visLeaf[0]
			return {
				hostAttrs: [...e.attributes].filter(a => a.name.startsWith('aria') || a.name === 'role').map(a => a.name + '=' + a.value),
				html: e.outerHTML.length > 1500 ? e.outerHTML.slice(0, 1500) + '…' : e.outerHTML,
				links: e.querySelectorAll('a[href]').length,
				linksInsideAriaHidden: [...e.querySelectorAll('a[href]')].filter(a => a.closest('[aria-hidden="true"]')).length,
				ariaHiddenCount: e.querySelectorAll('[aria-hidden="true"]').length,
				pieces: visLeaf.map(s => s.textContent),
				pieceDisplay: first ? getComputedStyle(first).display : null,
				pieceVerticalAlign: first ? getComputedStyle(first).verticalAlign : null,
				textWidth: Math.round(r.getBoundingClientRect().width * 10) / 10,
				origTextWidth: Math.round(window['tw_' + id] * 10) / 10,
			}
		}, id)
		// Chrome's own tree for this element and everything under it.
		const { root } = await cdp.send('DOM.getDocument', { depth: 0 })
		const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#' + id })
		const { nodes } = await cdp.send('Accessibility.queryAXTree', { nodeId })
		// Focusable links/buttons under the case and Chrome's computed name for each.
		const focusables = []
		const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: `#${id} a[href], button#${id}` })
		for (const n of nodeIds) {
			const ax = await cdp.send('Accessibility.getPartialAXTree', { nodeId: n, fetchRelatives: false })
			const self = ax.nodes[0]
			focusables.push({ role: self.role?.value, name: self.name?.value ?? '', ignored: self.ignored, ignoredReasons: self.ignoredReasons?.map(r => r.name) })
		}
		res[id] = { ariaSnapshot: snap, chromeAX: flat(nodes), focusables, ...dom }
	}
	res.errors = errors
	out[lib] = res
	await p.close()
}
await b.close()
fs.writeFileSync(path.join(DIR, 'libs.out.json'), JSON.stringify(out, null, 1))
console.log(JSON.stringify(out.meta))
for (const [lib, r] of Object.entries(out)) {
	if (lib === 'meta') continue
	console.log('\n#####', lib, r.errors.length ? 'PAGE ERRORS ' + JSON.stringify(r.errors) : '')
	for (const [k, v] of Object.entries(r)) {
		if (k === 'errors') continue
		if (v.error) { console.log(` [${k}] ERROR ${v.error}`); continue }
		console.log(` [${k}] host=${v.hostAttrs.join(',') || '-'} ariaHidden=${v.ariaHiddenCount} links=${v.links} (in aria-hidden: ${v.linksInsideAriaHidden}) focusables=${JSON.stringify(v.focusables.map(f => f.role + ':' + f.name + (f.ignored ? ' IGNORED' : '')))} pieceDisplay=${v.pieceDisplay}/${v.pieceVerticalAlign} width ${v.origTextWidth}->${v.textWidth}`)
		console.log(`      chromeAX: ${v.chromeAX.join(' | ').slice(0, 900)}`)
		console.log(`      ariaSnapshot: ${JSON.stringify(v.ariaSnapshot).slice(0, 500)}`)
		if (['uni', 'shape'].includes(k)) console.log(`      pieces(${v.pieces.length}): ${JSON.stringify(v.pieces)}`)
	}
}
