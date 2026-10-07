// splitters — runs one element through a published text-splitting library (the real package, pinned in package.json) or through a plain in-place wrapper, and returns the pieces it made. Used by the split-text comparison.

import { prepareSpeechType } from '@overpunch/speechtype'

/** What the text is split into. */
export type Unit = 'chars' | 'words'

/** The published libraries the comparison can run. */
export type LibraryId = 'gsap' | 'splittype' | 'splitting' | 'anime'

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

/**
 * Wrap each character or word of el in a plain <span>, in place: every element inside (links included) stays
 * where it is, nothing is hidden and no ARIA attribute is added. White space stays as text between the spans.
 * With display "inline-block" each span becomes its own box, which transforms need.
 */
export function wrapInPlace(el: HTMLElement, unit: Unit, display: 'inline' | 'inline-block'): HTMLElement[] {
	// Words kept inline are exactly what speechType writes, so let the library do it.
	if (unit === 'words' && display === 'inline') return prepareSpeechType(el, { transitionMs: 0 })
	const pieces: HTMLElement[] = []
	const walk = (node: Node) => {
		Array.from(node.childNodes).forEach((child) => {
			if (child.nodeType === Node.ELEMENT_NODE) { walk(child); return }
			if (child.nodeType !== Node.TEXT_NODE) return
			const fragment = document.createDocumentFragment()
			for (const token of (child as Text).data.split(/(\s+)/)) {
				if (!token) continue
				if (/^\s+$/.test(token)) { fragment.appendChild(document.createTextNode(token)); continue }
				for (const piece of unit === 'chars' ? graphemes(token) : [token]) {
					const span = document.createElement('span')
					span.className = 'kept-piece'
					span.textContent = piece
					if (display === 'inline-block') span.style.display = 'inline-block'
					fragment.appendChild(span)
					pieces.push(span)
				}
			}
			child.parentNode?.replaceChild(fragment, child)
		})
	}
	walk(el)
	return pieces
}
