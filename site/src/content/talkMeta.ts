import type { Metadata } from 'next'
export const TALK_TITLE = 'Keep the Text: Measuring What Split-Text Effects Cost'
export const DESCRIPTION = 'A browser experiment comparing font shaping, document semantics and keyboard link stops. Browser-tree evidence does not replace screen-reader testing.'
export function talkMetadata(path: string, kind: string): Metadata {
	return {
		title: `${TALK_TITLE} — ${kind} | speechType`, description: DESCRIPTION,
		alternates: { canonical: `https://speechtype.vercel.app${path}` },
		openGraph: { title: `${TALK_TITLE} — ${kind}`, description: DESCRIPTION, url: `https://speechtype.vercel.app${path}`, siteName: 'speechType', type: kind === 'talk' ? 'website' : 'article' },
		twitter: { card: 'summary_large_image', title: TALK_TITLE, description: DESCRIPTION },
	}
}
