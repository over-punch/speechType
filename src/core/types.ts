// speechType/src/core/types.ts — options interface for the speechType tool

/**
 * CSS class names injected by speechType.
 * Only `word` ('st-word') is used — there are no st-active or st-inactive classes.
 * Emphasis is applied via inline styles (fontVariationSettings, letterSpacing, opacity),
 * not via class toggles.
 */
export const SPEECH_CLASSES = {
	word: 'st-word',
} as const

/**
 * Options controlling how speechType emphasises spoken words.
 *
 * @remarks
 * Visual options (activeTracking, activeWeight, activeOpsz, inactiveOpacity, transitionMs)
 * are used by prepareSpeechType and applySpeechType.
 * Speech options (rate, pitch, volume) are only used by startSpeechType and are ignored
 * by applySpeechType, useSpeechType, and SpeechTypeText.
 *
 * activeWeight and activeOpsz are written directly into font-variation-settings. Ensure
 * the values are within the wght/opsz axis ranges supported by your font — out-of-range
 * values may cause some engines to silently ignore the entire declaration.
 *
 * inactiveOpacity: dimming lowers contrast for as long as a word is active. The default of 0.6 keeps
 * black on white at 5.7:1 (WCAG AA asks for 4.5:1); colours with less contrast to start with need a
 * higher value, or 1 for no dimming. Check the result against your own colours.
 */
export interface SpeechTypeOptions {
	/** Letter-spacing on the active (currently spoken) word in em. Default: 0.06 */
	activeTracking?: number
	/**
	 * wght axis value on the active word. Default: the word's own weight plus 300 (400 → 700), capped at 1000.
	 * Must be within the font's supported wght axis range (e.g. 100–900 for most variable fonts).
	 */
	activeWeight?: number
	/**
	 * opsz axis value on the active word. Default: 1.5× the word's own optical size (its font size in px).
	 * Must be within the font's supported opsz axis range (e.g. 6–72 for many variable fonts).
	 */
	activeOpsz?: number
	/**
	 * Opacity of inactive (not currently spoken) words. Default: 0.6 (it was 0.45 up to 1.1.0, which put
	 * black-on-white text at 3.4:1, under WCAG AA's 4.5:1). Set 1 for no dimming.
	 */
	inactiveOpacity?: number
	/** CSS transition duration in ms for style changes. Default: 80 */
	transitionMs?: number
	/**
	 * How the spoken word is marked. Default: 'spans'.
	 * - 'spans': each word is wrapped in a span and restyled (weight, optical size, tracking, opacity).
	 * - 'highlight': nothing is wrapped and the element's markup is not touched. The spoken word is painted
	 *   with the CSS Custom Highlight API; style it with `::highlight(speechtype) { … }`. Highlights can only
	 *   change colour, background, text decoration and text shadow, so the visual options above do nothing
	 *   and the text never reflows. In this mode applySpeechType's index is the word's number.
	 *   Falls back to 'spans' (with a console warning) where the API is missing.
	 */
	mode?: 'spans' | 'highlight'
	/** Name of the custom highlight in 'highlight' mode. Default: 'speechtype' */
	highlightName?: string
	/** Speech rate (0.1–10). Used only by startSpeechType. Default: 0.9 */
	rate?: number
	/** Speech pitch (0–2). Used only by startSpeechType. Default: 1 */
	pitch?: number
	/** Speech volume (0–1). Used only by startSpeechType. Default: 1 */
	volume?: number
	/**
	 * Called when speech synthesis is unavailable in the current browser.
	 * Used only by startSpeechType.
	 */
	/**
	 * Language of the speech (BCP 47, e.g. 'ja'). Default: the element's own `lang` (nearest ancestor),
	 * else the document's. A voice for that language is chosen when the browser has one.
	 */
	lang?: string
	/** Voice to use: a SpeechSynthesisVoice, or a voice name / voiceURI. Default: the language's voice. */
	voice?: SpeechSynthesisVoice | string
	/** Called when a run ends: speech finished, stopped, cancelled by a newer run, or failed (after onError). */
	onEnd?: () => void
	onUnsupported?: () => void
	/**
	 * Called when a real speech error occurs (any error code other than "interrupted",
	 * which is a normal cancellation). Receives the SpeechSynthesisErrorEvent.
	 * Used only by startSpeechType.
	 */
	onError?: (event: SpeechSynthesisErrorEvent) => void
}
