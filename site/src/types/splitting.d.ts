// Types for the parts of Splitting 1.1.0 (which ships none) that the split-text comparison uses.
declare module 'splitting' {
	/** One split target and the pieces made from it. */
	interface SplittingResult {
		el: Element
		chars?: HTMLElement[]
		words?: HTMLElement[]
	}
	/** Split the target's text by the named plugin ("chars" or "words"). */
	export default function Splitting(options: { target: Element | string; by?: string }): SplittingResult[]
}
