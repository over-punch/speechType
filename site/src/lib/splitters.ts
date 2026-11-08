// splitters — runs one element through a published text-splitting library (the real package, pinned in package.json) or through a plain in-place wrapper, and returns the pieces it made. Used by the split-text comparison.

import { prepareSpeechType } from '@overpunch/speechtype'

/** What the text is split into. */
export type Unit = 'chars' | 'words'

/** The published libraries the comparison can run. */
export type LibraryId = 'gsap' | 'splittype' | 'splitting' | 'anime' | 'stold'

/** A library the comparison can run: its name, exact version, the call made for each unit and what it documents about accessibility. */
export interface Library {
	id: LibraryId
	name: string
	version: string
	/** The call made, as shown to the reader. */
	call: Record<Unit, string>
	/** One line on what the library does about accessibility by default (from its source, see /paper). */
	does: string
}

/** The libraries, in the order shown. Versions match site/package.json exactly. */
export const LIBRARIES: Library[] = [
	{
		id: 'gsap', name: 'GSAP SplitText', version: '3.15.0',
		call: { chars: 'SplitText.create(el, { type: "chars,words" })', words: 'SplitText.create(el, { type: "words" })' },
		does: 'Default aria: "auto": copies the text into aria-label on the element and puts aria-hidden on every piece.',
	},
	{
		id: 'anime', name: 'anime.js splitText', version: '4.5.0',
		call: { chars: 'splitText(el, { words: true, chars: true })', words: 'splitText(el, { words: true })' },
		does: 'Default accessible: true: keeps a visually hidden copy of the original markup and puts aria-hidden on every piece.',
	},
	{
		id: 'splittype', name: 'SplitType', version: '0.3.4',
		call: { chars: 'new SplitType(el, { types: "words,chars" })', words: 'new SplitType(el, { types: "words" })' },
		does: 'Adds no ARIA attributes.',
	},
	{
		id: 'splitting', name: 'Splitting', version: '1.1.0',
		call: { chars: 'Splitting({ target: el, by: "chars" })', words: 'Splitting({ target: el, by: "words" })' },
		does: 'Adds no ARIA attributes. Run here with its own splitting.css, which makes each piece an inline-block.',
	},
	{
		id: 'stold', name: 'speechType', version: '1.0.11',
		call: { chars: 'prepareSpeechType(el)  // splits words only', words: 'prepareSpeechType(el)' },
		does: 'Our own tool before we fixed it (the last release before 1.1.0, run from npm). It rebuilt the element from its text, so the link is gone, and put aria-hidden on every word. While speaking it wrote each word into a live region, one at a time, on top of the audio. It only ever split words.',
	},
]

/** Split el with a published library and return the visible pieces in order. */
export async function splitWithLibrary(el: HTMLElement, id: LibraryId, unit: Unit): Promise<HTMLElement[]> {
	if (id === 'gsap') {
		const [{ gsap }, { SplitText }] = await Promise.all([import('gsap'), import('gsap/SplitText')])
		gsap.registerPlugin(SplitText)
		const split = SplitText.create(el, { type: unit === 'chars' ? 'chars,words' : 'words' })
		return (unit === 'chars' ? split.chars : split.words) as HTMLElement[]
	}
	if (id === 'anime') {
		const { splitText } = await import('animejs')
		const split = splitText(el, unit === 'chars' ? { words: true, chars: true } : { words: true })
		return (unit === 'chars' ? split.chars : split.words) as HTMLElement[]
	}
	if (id === 'splittype') {
		const { default: SplitType } = await import('split-type')
		const split = new SplitType(el, { types: unit === 'chars' ? 'words,chars' : 'words' })
		return ((unit === 'chars' ? split.chars : split.words) ?? []) as HTMLElement[]
	}
	if (id === 'stold') {
		// The published 1.0.11, installed under an alias beside the current build.
		const old = await import('speechtype-old')
		return old.prepareSpeechType(el, { transitionMs: 0 })
	}
	const { default: Splitting } = await import('splitting')
	const [result] = Splitting({ target: el, by: unit })
	return ((unit === 'chars' ? result.chars : result.words) ?? []) as HTMLElement[]
}

/** User-perceived characters of a string (grapheme clusters), so emoji sequences and conjuncts stay whole. */
export function graphemes(text: string): string[] {
	if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
		return Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text), (s) => s.segment)
	}
	return Array.from(text)
}

/** How the wrapped-in-place pieces are laid out. */
export type KeptDisplay = 'inline' | 'inline-block' | 'hidden-copy'

/** Inline style that hides an element visually while leaving it in the accessibility tree. */
const VISUALLY_HIDDEN = 'position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;user-select:none;-webkit-user-select:none;'

/**
 * Wrap each character or word of el in a plain <span>, in place: every element inside (links included) stays
 * where it is and no ARIA attribute is added to it. White space stays as text between the spans.
 * - "inline": the spans are ordinary inline spans, nothing is hidden.
 * - "inline-block": each span becomes its own box, which transforms need.
 * - "hidden-copy": inline-block spans again, but each run of text also stays whole beside them, visually hidden,
 *   and the boxes are aria-hidden. The real text sits inside the same element as before, so a link keeps one
 *   tab stop and its name.
 */
export function wrapInPlace(el: HTMLElement, unit: Unit, display: KeptDisplay): HTMLElement[] {
	// Words kept inline are exactly what speechType writes, so let the library do it.
	if (unit === 'words' && display === 'inline') return prepareSpeechType(el, { transitionMs: 0 })
	const pieces: HTMLElement[] = []
	const walk = (node: Node) => {
		Array.from(node.childNodes).forEach((child) => {
			if (child.nodeType === Node.ELEMENT_NODE) { walk(child); return }
			if (child.nodeType !== Node.TEXT_NODE) return
			const data = (child as Text).data
			if (!/\S/.test(data)) return
			const fragment = document.createDocumentFragment()
			/** Where the pieces go: straight into the page, or into an aria-hidden holder beside the real text. */
			let target: Node = fragment
			if (display === 'hidden-copy') {
				const real = document.createElement('span')
				real.className = 'kept-real'
				real.style.cssText = VISUALLY_HIDDEN
				real.textContent = data
				const holder = document.createElement('span')
				holder.className = 'kept-visual'
				holder.setAttribute('aria-hidden', 'true')
				fragment.append(real, holder)
				target = holder
			}
			for (const token of data.split(/(\s+)/)) {
				if (!token) continue
				if (/^\s+$/.test(token)) { target.appendChild(document.createTextNode(token)); continue }
				for (const piece of unit === 'chars' ? graphemes(token) : [token]) {
					const span = document.createElement('span')
					span.className = 'kept-piece'
					span.textContent = piece
					if (display !== 'inline') span.style.display = 'inline-block'
					target.appendChild(span)
					pieces.push(span)
				}
			}
			child.parentNode?.replaceChild(fragment, child)
		})
	}
	walk(el)
	return pieces
}
