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
 * inactiveOpacity: ensure the resulting contrast ratio remains at least 4.5:1 against
 * your background colour to meet WCAG AA. The default of 0.45 may fail this threshold
 * depending on your foreground/background pairing.
 */
export interface SpeechTypeOptions {
	/** Letter-spacing on the active (currently spoken) word in em. Default: 0.06 */
	activeTracking?: number
	/**
	 * wght axis value on the active word. Default: 700.
	 * Must be within the font's supported wght axis range (e.g. 100–900 for most variable fonts).
	 */
	activeWeight?: number
	/**
	 * opsz axis value on the active word. Default: 24.
	 * Must be within the font's supported opsz axis range (e.g. 6–72 for many variable fonts).
	 */
	activeOpsz?: number
	/**
	 * Opacity of inactive (not currently spoken) words. Default: 0.45.
	 * Values below ~0.5 may reduce contrast below WCAG AA (4.5:1) depending on your colours.
	 * Minimum recommended value: 0.3.
	 */
	inactiveOpacity?: number
	/** CSS transition duration in ms for style changes. Default: 80 */
	transitionMs?: number
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
