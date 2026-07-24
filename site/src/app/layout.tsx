import type { Metadata } from "next"
import "./globals.css"
import localFont from "next/font/local"
import SiteHeader from "../components/SiteHeader"

// Use locally-hosted Inter to avoid the Google Fonts CDN round-trip
const inter = localFont({ src: "../../public/fonts/inter-300.woff", variable: "--font-sans", weight: "300" })

export const metadata: Metadata = {
	title: "speechType — Typographic emphasis synced to speech",
	icons: { icon: "/icon.svg", shortcut: "/icon.svg", apple: "/icon.svg" },
	description: "speechType highlights each spoken word with typographic emphasis as it is spoken — wider tracking, heavier weight, larger optical size — synced to Web Speech API boundary events. Zero dependencies.",
	keywords: ["typography", "speech synthesis", "web speech api", "text to speech", "tts", "karaoke", "accessibility", "a11y", "language learning", "teleprompter", "variable font", "wght", "opsz", "letter-spacing", "TypeScript", "npm", "react"],
	openGraph: {
		title: "speechType — Typographic emphasis synced to speech",
		description: "Per-word typographic emphasis synced to Web Speech API boundary events. Each spoken word receives wider tracking, heavier weight, and larger optical size.",
		url: "https://speechtype.vercel.app",
		siteName: "speechType",
		type: "website",
		images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: "Example sentence with one word rendered bolder and tracked out, synced to speech" }],
	},
	twitter: {
		card: "summary_large_image",
		title: "speechType — Typographic emphasis synced to speech",
		description: "Per-word typographic emphasis synced to Web Speech API boundary events. Each spoken word receives wider tracking, heavier weight, and larger optical size.",
		images: ["/opengraph-image.png"],
	},
	metadataBase: new URL("https://speechtype.vercel.app"),
	alternates: { canonical: "https://speechtype.vercel.app" },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en" className={`h-full antialiased ${inter.variable}`}>
			<body className="min-h-full flex flex-col">
				<SiteHeader current="speechType" githubUrl="https://github.com/Liiift-Studio/speechType" />{children}</body>
		</html>
	)
}
