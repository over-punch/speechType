// Minimal stub satisfying the dist bundle's top-level "react" / "react/jsx-runtime"
// imports. Only the React wrapper (SpeechTypeText / useSpeechType) uses these; the
// vanilla prepareSpeechType / applySpeechType path exercised by the capture never
// calls them, so empty no-ops are enough to let the real bundle load in a plain page.
export const useEffect = () => {}
export const forwardRef = (fn) => fn
export const useRef = () => ({ current: null })
export const useImperativeHandle = () => {}
export const jsx = () => null
export const jsxs = () => null
export const Fragment = Symbol("Fragment")
export default {}
