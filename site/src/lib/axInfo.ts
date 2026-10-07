// axInfo — a small reading of what a piece of markup offers assistive technology: role, accessible name, tab stops and exposed text. Computed in the page for the split-text comparison; checked against Chrome's own tree (see /paper, Method).

/** Roles that ARIA 1.2 (section 5.2.8.6) says cannot be named by the author, so aria-label is prohibited on them. */
export const NAME_PROHIBITED = new Set(['caption', 'code', 'deletion', 'emphasis', 'generic', 'insertion', 'paragraph', 'presentation', 'strong', 'subscript', 'superscript'])

/** Roles whose name comes from their content when no label is given (the ones this demo can produce). */
const NAME_FROM_CONTENT = new Set(['link', 'heading', 'button'])

/** Implicit ARIA role of the handful of elements the demo renders (HTML-AAM), or the explicit role attribute. */
export function roleOf(el: Element): string {
	const explicit = el.getAttribute('role')?.trim().split(/\s+/)[0]
	if (explicit) return explicit
	const tag = el.tagName.toLowerCase()
	if (tag === 'p') return 'paragraph'
	if (/^h[1-6]$/.test(tag)) return 'heading'
	if (tag === 'a') return el.hasAttribute('href') ? 'link' : 'generic'
	if (tag === 'button') return 'button'
	if (tag === 'strong') return 'strong'
	if (tag === 'em') return 'emphasis'
	return 'generic'
}

/** Whether an element is hidden from assistive technology: aria-hidden="true", the hidden attribute, display none or visibility hidden. */
export function isAxHidden(el: Element): boolean {
	if (el.getAttribute('aria-hidden') === 'true' || el.hasAttribute('hidden')) return true
	const cs = getComputedStyle(el)
	return cs.display === 'none' || cs.visibility === 'hidden'
}

/** Whether an element or any ancestor up to (not including) root is hidden from assistive technology. */
export function isAxHiddenWithin(el: Element, root: Element): boolean {
	for (let e: Element | null = el; e && e !== root; e = e.parentElement) if (isAxHidden(e)) return true
	return false
}

/**
 * Text alternative from an element's content (AccName 1.2, step 2F): children's text in order, skipping hidden
 * nodes, taking a child's aria-label when it has one, and putting a space around any child that is not an
 * inline box (inline-block and block children are separate objects in the accessibility tree).
 */
function nameFromContent(node: Node): string {
	let out = ''
	node.childNodes.forEach((child) => {
		if (child.nodeType === Node.TEXT_NODE) { out += (child as Text).data; return }
		if (child.nodeType !== Node.ELEMENT_NODE) return
		const el = child as Element
		if (isAxHidden(el)) return
		const label = el.getAttribute('aria-label')?.trim()
		const part = label || nameFromContent(el)
		out += getComputedStyle(el).display === 'inline' ? part : ` ${part} `
	})
	return out
}

/** Collapse runs of white space and trim, as accessible names are reported. */
function flat(text: string): string {
	return text.replace(/\s+/g, ' ').trim()
}

/**
 * Accessible name of an element, for the cases this demo produces: aria-labelledby, then aria-label, then (for
 * links, headings and buttons) the content. Other roles have no name unless the author sets one. This returns
 * an author-set aria-label even on a role where ARIA prohibits naming: Chrome's accessibility tree does the
 * same. Use nameProhibited() to flag it.
 */
export function accessibleName(el: Element): string {
	const ids = el.getAttribute('aria-labelledby')?.trim()
	if (ids) {
		const text = ids.split(/\s+/).map((id) => el.ownerDocument.getElementById(id)).filter((n): n is HTMLElement => !!n).map((n) => n.getAttribute('aria-label')?.trim() || n.textContent || '').join(' ')
		if (flat(text)) return flat(text)
	}
	const label = el.getAttribute('aria-label')?.trim()
	if (label) return flat(label)
	return NAME_FROM_CONTENT.has(roleOf(el)) ? flat(nameFromContent(el)) : ''
}

/** Whether the element carries an author-set name on a role where ARIA 1.2 prohibits one. */
export function nameProhibited(el: Element): boolean {
	const named = !!(el.getAttribute('aria-label')?.trim() || el.getAttribute('aria-labelledby')?.trim())
	return named && NAME_PROHIBITED.has(roleOf(el))
}

/** A focusable link or button inside the host, with its computed name. */
export interface TabStop {
	role: string
	name: string
	/** Whether the element sits inside aria-hidden content while still taking keyboard focus. */
	insideHidden: boolean
}

/** Every element under host that takes keyboard focus in tab order (links with href, buttons, tabindex >= 0), in document order. */
export function tabStops(host: Element): TabStop[] {
	const out: TabStop[] = []
	host.querySelectorAll<HTMLElement>('a[href], button, [tabindex]').forEach((el) => {
		if (el.tabIndex < 0 || el.hasAttribute('disabled') || el.closest('[inert]')) return
		const cs = getComputedStyle(el)
		if (cs.display === 'none' || cs.visibility === 'hidden') return
		out.push({ role: roleOf(el), name: accessibleName(el), insideHidden: isAxHiddenWithin(el.parentElement ?? el, host) })
	})
	return out
}

/**
 * Whether the content on one side of a white-space node is inline text, so that Chrome keeps the space as its
 * own object: a text node, or an inline element whose nearest edge is (looked at recursively). A box such as
 * an inline-block, or nothing at all on that side, does not count.
 */
function inlineEdge(node: Node | null, side: 'start' | 'end'): boolean {
	if (!node) return false
	if (node.nodeType === Node.TEXT_NODE) return true
	if (node.nodeType !== Node.ELEMENT_NODE) return false
	const el = node as Element
	// Layout decides this, not aria-hidden: a space between two hidden inline spans is still kept.
	if (getComputedStyle(el).display !== 'inline') return false
	return inlineEdge(side === 'start' ? el.firstChild : el.lastChild, side)
}

/**
 * The text under host that is left in the accessibility tree: one entry per DOM text node that is not inside
 * hidden content (Chrome exposes each as its own static-text object). A white-space-only node is returned as
 * " " when it sits next to inline content (Chrome keeps it as an object) and dropped when it only separates
 * boxes such as inline-blocks (Chrome drops it).
 */
export function exposedText(host: Element): string[] {
	const out: string[] = []
	const walk = (node: Node) => {
		node.childNodes.forEach((child) => {
			if (child.nodeType === Node.TEXT_NODE) {
				const data = (child as Text).data
				if (/\S/.test(data)) out.push(flat(data))
				else if (data && (inlineEdge(child.previousSibling, 'end') || inlineEdge(child.nextSibling, 'start'))) out.push(' ')
				return
			}
			if (child.nodeType === Node.ELEMENT_NODE && !isAxHidden(child as Element)) walk(child)
		})
	}
	walk(host)
	return out
}
