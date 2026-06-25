// OG image for speechtype.vercel.app — generated at build time via next/og
import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const alt = 'speechType — Per-word typographic emphasis synced to speech'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
	const interLight = await readFile(join(process.cwd(), 'public/fonts/inter-300.woff'))
	return new ImageResponse(
		(
			<div style={{ background: '#aefcad', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '72px 80px', fontFamily: 'Inter, sans-serif' }}>
				{/* Eyebrow label */}
				<span style={{ fontSize: 13, letterSpacing: '0.18em', color: '#435243', textTransform: 'uppercase' }}>speechtype</span>
				{/* Word-emphasis preview + headline */}
				<div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
					<div style={{ display: 'flex', gap: 24, alignItems: 'baseline', marginBottom: 20 }}>
						{['Each', 'spoken', 'word', 'emphasised.'].map((word, i) => (
							<span
								key={i}
								style={{
									fontSize: i === 1 ? 82 : 62,
									fontWeight: i === 1 ? 700 : 300,
									letterSpacing: i === 1 ? '0.06em' : '0em',
									color: i === 1 ? '#112b12' : '#435243',
									lineHeight: 1,
								}}
							>
								{word}
							</span>
						))}
					</div>
					<div style={{ fontSize: 76, color: '#435243', lineHeight: 1.06, fontWeight: 300 }}>
						Synced to speech.
					</div>
				</div>
				{/* Footer */}
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
					<div style={{ fontSize: 14, color: '#435243', letterSpacing: '0.04em', display: 'flex', gap: 20 }}>
						<span>TypeScript</span><span style={{ opacity: 0.4 }}>·</span>
						<span>Web Speech API</span><span style={{ opacity: 0.4 }}>·</span>
						<span>React + Vanilla JS</span>
					</div>
					<div style={{ fontSize: 13, color: '#606d60', letterSpacing: '0.04em' }}>speechtype.vercel.app</div>
				</div>
			</div>
		),
		{ ...size, fonts: [{ name: 'Inter', data: interLight, style: 'normal', weight: 300 }] },
	)
}
