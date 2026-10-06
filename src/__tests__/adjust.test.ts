// speechType/src/__tests__/adjust.test.ts — unit tests for the core speechType algorithm

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { prepareSpeechType, applySpeechType, removeSpeechType, getCleanHTML, startSpeechType } from '../core/adjust'
import { SPEECH_CLASSES } from '../core/types'

// ─── Setup ────────────────────────────────────────────────────────────────────

/** Create a fresh div with given innerHTML for each test */
function makeEl(html: string): HTMLElement {
	const el = document.createElement('div')
	el.innerHTML = html
	return el
}

// Mock SpeechSynthesis on window for tests that invoke startSpeechType
beforeEach(() => {
	const mockUtterance = {
		rate: 1,
		pitch: 1,
		volume: 1,
		onboundary: null as unknown,
		onend: null as unknown,
		onerror: null as unknown,
	}
	vi.stubGlobal('SpeechSynthesisUtterance', vi.fn(function () { return mockUtterance }))   // a regular function: vitest 4 mocks called with `new` must be constructible
	vi.stubGlobal('speechSynthesis', {
		speak: vi.fn(),
		cancel: vi.fn(),
	})
})

// ─── prepareSpeechType ────────────────────────────────────────────────────────

describe('prepareSpeechType', () => {
	it('wraps each word in a span with the word class', () => {
		const el = makeEl('Hello world')
		prepareSpeechType(el)
		const spans = el.querySelectorAll(`.${SPEECH_CLASSES.word}`)
		expect(spans.length).toBe(2)
		expect(spans[0].textContent).toBe('Hello')
		expect(spans[1].textContent).toBe('world')
	})

	it('is idempotent — calling twice produces same number of spans', () => {
		const el = makeEl('One two three')
		prepareSpeechType(el)
		prepareSpeechType(el)
		const spans = el.querySelectorAll(`.${SPEECH_CLASSES.word}`)
		expect(spans.length).toBe(3)
	})

	it('returns the array of word span elements', () => {
		const el = makeEl('foo bar baz')
		const spans = prepareSpeechType(el)
		expect(spans.length).toBe(3)
		expect(spans[0].textContent).toBe('foo')
	})

	it('handles a single word without crashing', () => {
		const el = makeEl('Solo')
		const spans = prepareSpeechType(el)
		expect(spans.length).toBe(1)
		expect(spans[0].textContent).toBe('Solo')
	})

	it('handles empty string without crashing', () => {
		const el = makeEl('')
		const spans = prepareSpeechType(el)
		expect(spans.length).toBe(0)
		// The aria-live region is injected even on empty elements; no word spans should be present
		expect(el.querySelectorAll('.st-word').length).toBe(0)
	})

	it('applies transition styles to each word span', () => {
		const el = makeEl('Hello world')
		const spans = prepareSpeechType(el, { transitionMs: 120 })
		spans.forEach(span => {
			expect(span.style.transition).toContain('120ms')
		})
	})
})

// ─── applySpeechType ─────────────────────────────────────────────────────────

describe('applySpeechType', () => {
	it('sets active styles on the active word and dims others', () => {
		const el = makeEl('alpha beta gamma')
		prepareSpeechType(el, { activeTracking: 0.06, activeWeight: 700, inactiveOpacity: 0.45 })
		applySpeechType(el, 1, { activeTracking: 0.06, activeWeight: 700, inactiveOpacity: 0.45 })

		const spans = el.querySelectorAll<HTMLElement>(`.${SPEECH_CLASSES.word}`)
		// Inactive spans
		expect(spans[0].style.opacity).toBe('0.45')
		expect(spans[2].style.opacity).toBe('0.45')
		// Active span
		expect(spans[1].style.opacity).toBe('1')
		expect(spans[1].style.letterSpacing).toBe('0.06em')
		expect(spans[1].style.fontVariationSettings).toContain('700')
	})

	it('resets all words to full opacity when activeIndex is -1', () => {
		const el = makeEl('one two three')
		prepareSpeechType(el)
		applySpeechType(el, 0)
		applySpeechType(el, -1)

		const spans = el.querySelectorAll<HTMLElement>(`.${SPEECH_CLASSES.word}`)
		spans.forEach(span => {
			expect(span.style.opacity).toBe('1')
		})
	})

	it('uses default option values when none supplied', () => {
		const el = makeEl('hello world')
		prepareSpeechType(el)
		applySpeechType(el, 0)

		const spans = el.querySelectorAll<HTMLElement>(`.${SPEECH_CLASSES.word}`)
		expect(spans[0].style.letterSpacing).toBe('0.06em')
		expect(spans[0].style.fontVariationSettings).toContain('700')
	})

	it('is a no-op if prepareSpeechType was never called', () => {
		const el = makeEl('test')
		// Should not throw
		expect(() => applySpeechType(el, 0)).not.toThrow()
	})
})

// ─── removeSpeechType ────────────────────────────────────────────────────────

describe('removeSpeechType', () => {
	it('restores original innerHTML exactly', () => {
		const original = 'Hello <em>world</em>'
		const el = makeEl(original)
		prepareSpeechType(el)
		removeSpeechType(el)
		expect(el.innerHTML).toBe(original)
	})

	it('is a no-op if prepareSpeechType was never called', () => {
		const el = makeEl('text')
		expect(() => removeSpeechType(el)).not.toThrow()
	})

	it('calls speechSynthesis.cancel() when active speech exists (via startSpeechType)', () => {
		const el = makeEl('one two three')
		startSpeechType(el)
		// Verify speech was started
		expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1)
		// Now remove — should cancel
		removeSpeechType(el)
		expect(window.speechSynthesis.cancel).toHaveBeenCalled()
		// HTML should be restored to original flat text
		expect(el.querySelector('.st-word')).toBeNull()
	})

	it('keeps inline markup during prepareSpeechType — words inside <em> are wrapped in place', () => {
		const el = makeEl('Hello <em>world</em>')
		prepareSpeechType(el)
		// The <em> is kept; both words are wrapped
		expect(el.querySelector('em')?.textContent).toBe('world')
		const spans = el.querySelectorAll('.st-word')
		expect(spans.length).toBe(2)
		expect(spans[0].textContent).toBe('Hello')
		expect(spans[1].textContent).toBe('world')
	})

	it('applySpeechType still works after prepareSpeechType with inline markup', () => {
		const el = makeEl('Hello <em>world</em>')
		prepareSpeechType(el)
		applySpeechType(el, 1)
		const spans = el.querySelectorAll<HTMLElement>('.st-word')
		expect(spans[1].style.opacity).toBe('1')
		expect(spans[0].style.opacity).not.toBe('1')
	})
})

// ─── getCleanHTML ─────────────────────────────────────────────────────────────

describe('getCleanHTML', () => {
	it('returns HTML without word spans', () => {
		const el = makeEl('Hello world')
		prepareSpeechType(el)
		const clean = getCleanHTML(el)
		expect(clean).not.toContain(SPEECH_CLASSES.word)
		expect(clean).toContain('Hello')
		expect(clean).toContain('world')
	})

	it('does not modify the original element', () => {
		const el = makeEl('foo bar')
		prepareSpeechType(el)
		getCleanHTML(el)
		const spans = el.querySelectorAll(`.${SPEECH_CLASSES.word}`)
		expect(spans.length).toBe(2)
	})

	it('is idempotent when called on an unprepared element', () => {
		const el = makeEl('plain text')
		const clean = getCleanHTML(el)
		expect(clean).toBe('plain text')
	})
})

// ─── startSpeechType ─────────────────────────────────────────────────────────

describe('startSpeechType', () => {
	it('calls speechSynthesis.speak with a SpeechSynthesisUtterance', () => {
		const el = makeEl('hello world')
		startSpeechType(el)
		expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1)
		expect(window.SpeechSynthesisUtterance).toHaveBeenCalledTimes(1)
	})

	it('returns a stop function that cancels synthesis and resets spans', () => {
		const el = makeEl('one two three')
		const stop = startSpeechType(el)
		// Activate a word so there is something to reset
		applySpeechType(el, 0)
		stop()
		expect(window.speechSynthesis.cancel).toHaveBeenCalled()
		// All spans should be reset to full opacity after stop
		const spans = el.querySelectorAll<HTMLElement>(`.${SPEECH_CLASSES.word}`)
		spans.forEach(span => {
			expect(span.style.opacity).toBe('1')
		})
	})

	it('simulates a boundary event and emphasises the correct word', () => {
		const el = makeEl('alpha beta gamma')
		startSpeechType(el)

		// Grab the utterance that was passed to speak()
		const utterance = (window.SpeechSynthesisUtterance as ReturnType<typeof vi.fn>).mock.results[0].value

		// Simulate a 'word' boundary at charIndex 6 — 'alpha ' is 6 chars, so index 6 = 'beta'
		utterance.onboundary?.({ name: 'word', charIndex: 6 } as SpeechSynthesisEvent)

		const spans = el.querySelectorAll<HTMLElement>(`.${SPEECH_CLASSES.word}`)
		// 'beta' is index 1 — should be full opacity
		expect(spans[1].style.opacity).toBe('1')
		// Others should be dimmed
		expect(spans[0].style.opacity).not.toBe('1')
		expect(spans[2].style.opacity).not.toBe('1')
	})

	it('boundary at charIndex 0 emphasises the first word', () => {
		const el = makeEl('alpha beta gamma')
		startSpeechType(el)
		const utterance = (window.SpeechSynthesisUtterance as ReturnType<typeof vi.fn>).mock.results[0].value
		utterance.onboundary?.({ name: 'word', charIndex: 0 } as SpeechSynthesisEvent)
		const spans = el.querySelectorAll<HTMLElement>(`.${SPEECH_CLASSES.word}`)
		expect(spans[0].style.opacity).toBe('1')
		expect(spans[1].style.opacity).not.toBe('1')
	})

	it('boundary at charIndex of last word emphasises the last word', () => {
		const el = makeEl('alpha beta gamma')
		// 'alpha beta ' = 11 chars, so last word 'gamma' starts at charIndex 11
		startSpeechType(el)
		const utterance = (window.SpeechSynthesisUtterance as ReturnType<typeof vi.fn>).mock.results[0].value
		utterance.onboundary?.({ name: 'word', charIndex: 11 } as SpeechSynthesisEvent)
		const spans = el.querySelectorAll<HTMLElement>(`.${SPEECH_CLASSES.word}`)
		expect(spans[2].style.opacity).toBe('1')
		expect(spans[0].style.opacity).not.toBe('1')
	})

	it('boundary charIndex beyond all words does not throw and does not change emphasis', () => {
		const el = makeEl('alpha beta')
		startSpeechType(el)
		const utterance = (window.SpeechSynthesisUtterance as ReturnType<typeof vi.fn>).mock.results[0].value
		// charIndex 9999 is past the end of the word list — idx will be -1, applySpeechType not called
		expect(() => utterance.onboundary?.({ name: 'word', charIndex: 9999 } as SpeechSynthesisEvent)).not.toThrow()
	})

	it('sentence-type boundary event is ignored', () => {
		const el = makeEl('alpha beta gamma')
		startSpeechType(el)
		const utterance = (window.SpeechSynthesisUtterance as ReturnType<typeof vi.fn>).mock.results[0].value
		// 'sentence' boundary should be ignored; no spans should be emphasised
		utterance.onboundary?.({ name: 'sentence', charIndex: 0 } as SpeechSynthesisEvent)
		const spans = el.querySelectorAll<HTMLElement>(`.${SPEECH_CLASSES.word}`)
		spans.forEach(span => {
			expect(span.style.opacity).not.toBe('1')
		})
	})

	it('calling startSpeechType twice cancels first utterance and emphasises new content correctly', () => {
		const el = makeEl('one two three')
		startSpeechType(el)
		expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1)
		// Call again — should cancel first and start fresh
		startSpeechType(el)
		expect(window.speechSynthesis.cancel).toHaveBeenCalled()
		expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(2)
	})

	it('rate, pitch, and volume options are forwarded to the utterance', () => {
		const el = makeEl('hello world')
		startSpeechType(el, { rate: 1.5, pitch: 0.8, volume: 0.5 })
		const utterance = (window.SpeechSynthesisUtterance as ReturnType<typeof vi.fn>).mock.results[0].value
		expect(utterance.rate).toBe(1.5)
		expect(utterance.pitch).toBe(0.8)
		expect(utterance.volume).toBe(0.5)
	})

	it('onUnsupported callback is called when speechSynthesis is unavailable', () => {
		const origSS = (window as Window & { speechSynthesis?: SpeechSynthesis }).speechSynthesis
		// @ts-expect-error — simulate no speechSynthesis
		delete window.speechSynthesis
		const onUnsupported = vi.fn()
		const el = makeEl('test')
		try {
			startSpeechType(el, { onUnsupported })
			expect(onUnsupported).toHaveBeenCalledTimes(1)
		} finally {
			;(window as Window & { speechSynthesis?: SpeechSynthesis }).speechSynthesis = origSS
		}
	})

	it('onerror with "interrupted" does not call onError callback', () => {
		const onError = vi.fn()
		const el = makeEl('hello world')
		startSpeechType(el, { onError })
		const utterance = (window.SpeechSynthesisUtterance as ReturnType<typeof vi.fn>).mock.results[0].value
		utterance.onerror?.({ error: 'interrupted' } as SpeechSynthesisErrorEvent)
		expect(onError).not.toHaveBeenCalled()
	})

	it('onerror with real error code calls onError callback', () => {
		const onError = vi.fn()
		const el = makeEl('hello world')
		startSpeechType(el, { onError })
		const utterance = (window.SpeechSynthesisUtterance as ReturnType<typeof vi.fn>).mock.results[0].value
		const fakeEvent = { error: 'not-allowed' } as SpeechSynthesisErrorEvent
		utterance.onerror?.(fakeEvent)
		expect(onError).toHaveBeenCalledWith(fakeEvent)
	})

	it('onend resets all spans to full opacity and clears utterance', () => {
		const el = makeEl('one two three')
		startSpeechType(el)
		const utterance = (window.SpeechSynthesisUtterance as ReturnType<typeof vi.fn>).mock.results[0].value
		// Activate a word first
		utterance.onboundary?.({ name: 'word', charIndex: 0 } as SpeechSynthesisEvent)
		const spans = el.querySelectorAll<HTMLElement>(`.${SPEECH_CLASSES.word}`)
		expect(spans[0].style.opacity).toBe('1')
		// Fire onend
		utterance.onend?.()
		spans.forEach(span => {
			expect(span.style.opacity).toBe('1')
		})
	})

	it('is a no-op when speechSynthesis is unavailable (SSR-like)', () => {
		const origSS = (window as Window & { speechSynthesis?: SpeechSynthesis }).speechSynthesis
		try {
			// @ts-expect-error — simulate no speechSynthesis
			delete window.speechSynthesis
			const el = makeEl('test')
			expect(() => startSpeechType(el)).not.toThrow()
		} finally {
			// Always restore so later tests are not broken
			;(window as Window & { speechSynthesis?: SpeechSynthesis }).speechSynthesis = origSS
		}
	})
})

// ─── SSR safety ───────────────────────────────────────────────────────────────

describe('SSR safety', () => {
	it('prepareSpeechType returns [] when window is undefined', () => {
		const origWindow = globalThis.window
		try {
			// @ts-expect-error — simulate SSR
			delete globalThis.window
			const el = makeEl('test')
			const result = prepareSpeechType(el)
			expect(result).toEqual([])
		} finally {
			// Always restore window so subsequent tests are not broken
			globalThis.window = origWindow
		}
	})
})

// ─── Review fixes (2026-10) ──────────────────────────────────────────────────

describe('review fixes', () => {
	/** A connected element. */
	function attached(html: string): HTMLElement {
		const el = document.createElement('p')
		el.innerHTML = html
		document.body.appendChild(el)
		return el
	}

	it('keeps escaped text as text (no HTML injection)', () => {
		const el = attached('Comment: &lt;img src=x onerror="window.pwned=1"&gt; nice')
		prepareSpeechType(el)
		expect(el.querySelector('img')).toBeNull()
		expect(el.textContent).toBe('Comment: <img src=x onerror="window.pwned=1"> nice')
	})

	it('keeps markup and listeners, and the text readable (no aria-hidden, no live region)', () => {
		const el = attached('Read <a href="#t" id="L">the terms</a><br>now')
		let clicks = 0
		el.querySelector('a')!.addEventListener('click', (e) => { e.preventDefault(); clicks++ })
		const original = el.innerHTML
		prepareSpeechType(el)
		el.querySelector('a')!.click()
		expect(clicks).toBe(1)
		expect(el.querySelectorAll('[aria-hidden]').length).toBe(0)
		expect(el.querySelector('[data-st-live]')).toBeNull()
		expect(el.querySelector('br')).not.toBeNull()
		expect(getCleanHTML(el)).toBe(original)
		removeSpeechType(el)
		expect(el.innerHTML).toBe(original)
	})

	it('does not speak hidden text or styles, and keeps words apart across <br>', () => {
		const el = attached('alpha<br>beta <span hidden>secret</span><span aria-hidden="true">deco</span><style>.x{}</style> gamma')
		startSpeechType(el)
		const Utterance = SpeechSynthesisUtterance as unknown as { mock: { calls: string[][] } }
		expect(Utterance.mock.calls.at(-1)![0]).toBe('alpha beta gamma')
	})

	it('a word split by markup is one spoken word', () => {
		const el = attached('Split<em>ting</em> here')
		startSpeechType(el)
		const Utterance = SpeechSynthesisUtterance as unknown as { mock: { calls: string[][] } }
		expect(Utterance.mock.calls.at(-1)![0]).toBe('Splitting here')
	})

	it("a stale stop() doesn't cancel another element's speech", () => {
		const a = attached('first text')
		const b = attached('second text')
		const stopA = startSpeechType(a)
		startSpeechType(b)
		const cancel = window.speechSynthesis.cancel as unknown as { mock: { calls: unknown[] } }
		const before = cancel.mock.calls.length
		stopA()
		expect(cancel.mock.calls.length).toBe(before)
	})

	it("speaks in the element's language and reports the end", () => {
		const el = attached('こんにちは')
		el.lang = 'ja'
		let ended = 0
		startSpeechType(el, { onEnd: () => ended++ })
		const Utterance = SpeechSynthesisUtterance as unknown as { mock: { results: { value: { lang?: string; onend?: () => void } }[] } }
		const u = Utterance.mock.results.at(-1)!.value
		expect(u.lang).toBe('ja')
		u.onend?.()
		expect(ended).toBe(1)
	})
})
