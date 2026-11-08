import '../talk.css'
import '../../components/talk/reading.css'
import Prose, { slug } from '../../components/talk/Prose'
import ReadingHeader from '../../components/talk/ReadingHeader'
import { ArabicFigure, FontFigure, SemanticsFigure, WidthFigure } from '../../components/talk/Figures'
import { PAPER_MD } from '../../content/paper'
import { talkMetadata } from '../../content/talkMeta'
export const metadata = talkMetadata('/paper', 'paper')
const FIGURES = { widths: <WidthFigure />, font: <FontFigure />, arabic: <ArabicFigure />, semantics: <SemanticsFigure /> }
const SECTIONS = PAPER_MD.split('\n').filter(line => line.startsWith('## ')).map(line => line.slice(3))
export default function PaperPage() {
	return <main className="reading flex flex-col items-center px-6 py-20 gap-12">
		<ReadingHeader kind="Paper" />
		<nav aria-label="Paper contents" className="w-full max-w-2xl"><ol className="flex flex-col gap-2 text-sm text-muted">{SECTIONS.map(s => <li key={s}><a className="underline" href={`#${slug(s)}`}>{s}</a></li>)}</ol></nav>
		<article className="paper-prose w-full max-w-2xl flex flex-col gap-5"><Prose source={PAPER_MD} figures={FIGURES} /></article>
		<footer className="max-w-2xl w-full text-sm text-muted">Quinn Keaveney · Overpunch · <a className="underline" href="/paper/keep-the-text.md" download>Download Markdown</a>. This paper and the presentation are separate reading formats.</footer>
	</main>
}
