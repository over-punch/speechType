// speechType README capture harness — reproducible.
// Serves scripts/ + dist/ + the variable font over HTTP, drives the REAL
// applySpeechType frame-by-frame to simulate a Web Speech API read-along, captures
// PNG frames with Playwright, and stitches them into assets/speechtype-demo.gif via ffmpeg.
//
// Usage: node scripts/capture.mjs   (from the package root)
// Requires: playwright (chromium), ffmpeg on PATH.

import { createServer } from "node:http"
import { readFile } from "node:fs/promises"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { dirname, join, extname } from "node:path"
import { mkdtempSync, writeFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { chromium } from "playwright"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")

// Map request paths to files on disk.
const MIME = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".woff2": "font/woff2" }
function resolve(urlPath) {
	if (urlPath === "/" || urlPath === "/capture.html") return join(__dirname, "capture.html")
	if (urlPath === "/stub-react.mjs") return join(__dirname, "stub-react.mjs")
	if (urlPath === "/Merriweather.woff2") return join(ROOT, "site", "public", "fonts", "Merriweather.woff2")
	if (urlPath.startsWith("/dist/")) return join(ROOT, urlPath.slice(1))
	return null
}

const server = createServer(async (req, res) => {
	const file = resolve(req.url.split("?")[0])
	if (!file) { res.writeHead(404); res.end("not found"); return }
	try {
		const buf = await readFile(file)
		res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" })
		res.end(buf)
	} catch {
		res.writeHead(404); res.end("not found")
	}
})

await new Promise((r) => server.listen(0, r))
const port = server.address().port
const url = `http://127.0.0.1:${port}/capture.html`

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1100, height: 460 }, deviceScaleFactor: 2 })
await page.goto(url, { waitUntil: "networkidle" })
await page.evaluate(() => window.__ready)
await page.waitForTimeout(250) // settle the variable font

const wordCount = await page.evaluate(() => window.__wordCount)
const card = page.locator("#card")

const frameDir = mkdtempSync(join(tmpdir(), "speechtype-frames-"))
const frames = []
let f = 0

async function shoot() {
	const p = join(frameDir, `frame-${String(f).padStart(3, "0")}.png`)
	await card.screenshot({ path: p, omitBackground: true })
	frames.push(p)
	f++
}

// Opening beat: neutral text (no active word) for a moment.
await page.evaluate(() => window.__step(-1))
await page.waitForTimeout(150)
await shoot(); await shoot()

// Read along: emphasise each word in turn, one frame per word (the 120ms
// transition resolves within the 9fps frame interval).
for (let i = 0; i < wordCount; i++) {
	await page.evaluate((idx) => window.__step(idx), i)
	await page.waitForTimeout(150) // let the 120ms transition land
	await shoot()
}

// Closing beat: clear emphasis, hold.
await page.evaluate(() => window.__step(-1))
await page.waitForTimeout(150)
await shoot(); await shoot(); await shoot()

await browser.close()
server.close()

// Stitch frames → GIF. ~9fps (110ms/frame) reads naturally for a read-along.
const out = join(ROOT, "assets", "speechtype-demo.gif")
const palette = join(frameDir, "palette.png")
const fps = 9
const filters = `fps=${fps},scale=720:-1:flags=lanczos`

let r = spawnSync("ffmpeg", ["-y", "-framerate", String(fps), "-i", join(frameDir, "frame-%03d.png"),
	"-vf", `${filters},palettegen=stats_mode=full`, palette], { stdio: "inherit" })
if (r.status !== 0) { console.error("palettegen failed"); process.exit(1) }

r = spawnSync("ffmpeg", ["-y", "-framerate", String(fps), "-i", join(frameDir, "frame-%03d.png"),
	"-i", palette, "-lavfi", `${filters} [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=3`,
	"-loop", "0", out], { stdio: "inherit" })
if (r.status !== 0) { console.error("gif encode failed"); process.exit(1) }

rmSync(frameDir, { recursive: true, force: true })
console.log(`Wrote ${out} (${frames.length} frames, ${wordCount} words)`)
