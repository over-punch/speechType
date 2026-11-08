// fontpick.mjs: how much wider does a line get when every character is an inline-block, in the site's own font
// (Merriweather) and in Source Serif 4? Also: inline spans (no box change), kerning off, ligatures off.
import { createRequire } from 'module'
import path from 'path'
const require = createRequire('/Users/quinn-keaveney/Desktop/GITs/type-tools/fitWidth/')
const { chromium } = require('playwright')
const DIR = path.dirname(new URL(import.meta.url).pathname)
const MW = '/Users/quinn-keaveney/Desktop/GITs/type-tools/shared/fonts/Merriweather.woff2'
const b = await chromium.launch(); const p = await b.newPage()
import('fs').then(f=>0)
const HTML=`<style>@font-face{font-family:SS;src:url(file://${DIR}/fonts/SourceSerif4.ttf)}@font-face{font-family:MW;src:url(file://${MW})}body{width:3000px}</style><div id=root></div>`
const fs=require('fs'); fs.writeFileSync(DIR+'/fontpick.html',HTML); await p.goto('file://'+DIR+'/fontpick.html')
await p.evaluate(() => Promise.all([document.fonts.load('32px SS'), document.fonts.load('32px MW')]))
const TEXTS = ['Read the terms before you sign.', 'AVATAR Toward WAVE office affluent', 'To finish, read the official terms first.', 'Yes, you can sign today. First read the official terms.', 'Every word spoken carries its own weight']
const r = await p.evaluate(TEXTS => {
	const out = []
	const w = (font, size, text, css, mode) => {
		const e = document.createElement('p'); e.style.cssText = `font:${size}px ${font};white-space:nowrap;margin:0;${css}`
		if (mode === 'text') e.textContent = text
		else for (const ch of text) { if (ch === ' ') { e.append(' '); continue } const s = document.createElement('span'); s.textContent = ch; if (mode === 'ib') s.style.display = 'inline-block'; e.append(s) }
		document.getElementById('root').append(e); const g = document.createRange(); g.selectNodeContents(e); return Math.round(g.getBoundingClientRect().width * 100) / 100
	}
	for (const font of ['MW', 'SS']) for (const size of [20, 32]) for (const t of TEXTS) {
		const n = w(font, size, t, '', 'text')
		out.push({ font, size, t, normal: n, inlineSpans: w(font, size, t, '', 'inline'), inlineBlock: w(font, size, t, '', 'ib'), kernNone: w(font, size, t, 'font-kerning:none', 'text'), kernLigaNone: w(font, size, t, 'font-kerning:none;font-variant-ligatures:none', 'text') })
	}
	return out
}, TEXTS)
for (const x of r) console.log(`${x.font} ${x.size}px "${x.t}": normal ${x.normal} | inline spans ${x.inlineSpans} | inline-block ${x.inlineBlock} (+${(100 * (x.inlineBlock / x.normal - 1)).toFixed(2)}%) | kerning none ${x.kernNone} | kern+liga none ${x.kernLigaNone}`)
await b.close()
