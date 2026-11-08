import Link from 'next/link'
import { TALK_TITLE, DESCRIPTION } from '../../content/talkMeta'
export default function ReadingHeader({ kind }: { kind: string }) {
	return <header className="w-full max-w-2xl flex flex-col gap-6">
		<p className="text-xs uppercase tracking-[0.18em] text-muted load-rise">{kind} · November 2026</p>
		<h1 className="reading-title load-rise">{TALK_TITLE}</h1>
		<p className="text-muted leading-relaxed load-rise">{DESCRIPTION}</p>
		<nav aria-label="Talk and research" className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted load-rise">
			<Link className="underline" href="/talk">Slides</Link><Link className="underline" href="/paper">Paper</Link><Link className="underline" href="/paper/data">Data &amp; methods</Link><Link className="underline" href="/talk/transcript">Transcript</Link><Link className="underline" href="/#split">Live comparison</Link>
			<a className="underline" href="/paper/keep-the-text.pdf" download>Paper PDF</a>
		</nav>
	</header>
}
