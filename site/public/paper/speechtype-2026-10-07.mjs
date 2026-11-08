// speechtype-before-after.mjs — the published @overpunch/speechtype 1.0.11 against 1.1.0, same markup, in Chromium.
// Speech is stubbed (nothing is spoken): the fake engine fires a word boundary for every word, as a real voice would.
// Records Chrome's accessibility tree (CDP), aria-hidden/live-region markup and what the live region announced.
// Usage: node speechtype-before-after.mjs
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
const require = createRequire('/Users/quinn-keaveney/Desktop/GITs/type-tools/fitWidth/')
const { chromium } = require('playwright')
const DIR = import.meta.dirname
fs.writeFileSync(path.join(DIR, 'page.html'), '<!doctype html><html lang="en"><meta charset="utf-8"><title>suite</title><body><main id="root"></main></body></html>')
const CASES = [['p', 'Read <a href="/terms">the terms</a> before you sign.'], ['h2', 'Chapter <a href="/one">one</a> begins']]
const b = await chromium.launch()
const out = { date: new Date().toISOString(), chromium: b.version(), versions: {} }
for (const v of ['old', 'new']) {
	const version = require(path.join(DIR, `node_modules/sp-${v}/package.json`)).version
	const page = await b.newPage()
	// Never let the page reach the real speech engine.
	await page.addInitScript(() => {
		window.__spoken = []
		const fake = { speaking: false, pending: false, paused: false, getVoices: () => [], cancel() { this.speaking = false }, pause() {}, resume() {}, addEventListener() {}, removeEventListener() {},
			speak(u) { this.speaking = true; window.__utterance = u; window.__spoken.push(u.text) } }
		Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true })
		window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text } }
	})
	await page.goto('file://' + path.join(DIR, 'page.html'))
	await page.addScriptTag({ path: path.join(DIR, `st-${v}.js`) })
	const cdp = await page.context().newCDPSession(page)
	await cdp.send('Accessibility.enable'); await cdp.send('DOM.enable')
	const res = {}
	let i = 0
	for (const [tag, inner] of CASES) {
		const id = 'c' + i++
		const r = await page.evaluate(async ([id, tag, inner]) => {
			const el = document.createElement(tag); el.id = id; el.innerHTML = inner
			document.getElementById('root').append(el)
			const announced = []
			const watch = new MutationObserver(() => document.querySelectorAll('[aria-live]').forEach((n) => { const t = n.textContent.trim(); if (t && announced.at(-1) !== t) announced.push(t) }))
			watch.observe(document.body, { subtree: true, childList: true, characterData: true })
			ST.startSpeechType(el, {})
			await new Promise((r) => setTimeout(r, 200))
			const u = window.__utterance
			// Fire a boundary at the start of every word of the spoken text.
			if (u?.onboundary) for (const m of u.text.matchAll(/\S+/g)) { u.onboundary({ name: 'word', charIndex: m.index, charLength: m[0].length }); await new Promise((r) => setTimeout(r, 30)) }
			await new Promise((r) => setTimeout(r, 100))
			watch.disconnect()
			return { html: el.outerHTML, spokenText: u?.text, ariaHidden: el.querySelectorAll('[aria-hidden="true"]').length, liveRegions: [...document.querySelectorAll('[aria-live]')].map((n) => ({ live: n.getAttribute('aria-live'), inside: el.contains(n), text: n.textContent })), announced,
				links: el.querySelectorAll('a[href]').length }
		}, [id, tag, inner])
		const { root } = await cdp.send('DOM.getDocument', { depth: 0 })
		const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#' + id })
		const { nodes } = await cdp.send('Accessibility.queryAXTree', { nodeId })
		r.chromeAX = nodes.filter((n) => !n.ignored && n.role?.value !== 'InlineTextBox').map((n) => `${n.role?.value}:${JSON.stringify(n.name?.value ?? '')}`)
		r.ariaSnapshot = await page.locator('#' + id).ariaSnapshot()
		res[tag] = r
	}
	out.versions[version] = res
	await page.close()
}
await b.close()
fs.writeFileSync(path.join(DIR, 'speechtype-before-after.json'), JSON.stringify(out, null, 1))
for (const [v, res] of Object.entries(out.versions)) for (const [tag, r] of Object.entries(res)) {
	console.log(`\n@overpunch/speechtype ${v} <${tag}>: links ${r.links}, aria-hidden ${r.ariaHidden}, live regions ${JSON.stringify(r.liveRegions.map((l) => l.live))}`)
	console.log('  Chrome AX:', r.chromeAX.join(' | ').slice(0, 400))
	console.log('  announced through the live region:', JSON.stringify(r.announced))
	console.log('  html:', r.html.slice(0, 330))
}
