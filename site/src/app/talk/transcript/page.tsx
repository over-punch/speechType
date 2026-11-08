import type { ReactNode } from 'react'
import Link from 'next/link'
import '../../talk.css'
import '../../../components/talk/reading.css'
import ReadingHeader from '../../../components/talk/ReadingHeader'
import { SCRIPT, spoken } from '../../../content/talkScript'
import { talkMetadata } from '../../../content/talkMeta'
export const metadata = talkMetadata('/talk/transcript', 'transcript')
function delivery(text: string): ReactNode[] {
	return spoken(text).split(/(\s\/\/\s|\s\/\s|\*[^*]+\*)/).map((part, i) => {
		if (part === ' / ' || part === ' // ') return <span key={i} aria-hidden="true" className="text-muted">{part}</span>
		if (/^\*[^*]+\*$/.test(part)) return <em key={i}>{part.slice(1,-1)}</em>
		return part
	})
}
export default function TranscriptPage() {
	return <main className="reading flex flex-col items-center px-6 py-20 gap-12">
		<ReadingHeader kind="Transcript" />
		<p className="w-full max-w-2xl text-sm text-muted">Delivery marks: / short pause; // longer beat. Builds run automatically; one forward click advances one slide. Internal build cues are omitted here. This is a script, not a transcript of a recorded performance.</p>
		<article className="w-full max-w-2xl flex flex-col gap-10">{SCRIPT.map((entry,i) => <section className="paper-reveal flex flex-col gap-4" key={entry.id}>
			<h2 className="text-lg"><Link className="underline text-muted mr-3" href={`/talk#${i+1}`} aria-label={`Slide ${i+1}`}>{String(i+1).padStart(2,'0')}</Link>{entry.label}</h2>
			<p className="text-base lg:text-lg leading-relaxed">{delivery(entry.text)}</p>
		</section>)}</article>
	</main>
}
