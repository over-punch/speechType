// vite.webflow.config.ts — standalone minified IIFE bundle for Webflow Custom Code Embed.
// Produces a single self-contained browser global (window.SpeechType) with no module loader,
// no React, and no external dependencies — droppable into a Webflow embed via one <script> tag.
import { defineConfig } from 'vite'

export default defineConfig({
	build: {
		// Do not wipe dist/ — the library build (vite.config.ts) writes index.js/.cjs there too.
		emptyOutDir: false,
		lib: {
			entry: 'src/webflow/embed.ts',
			formats: ['iife'],
			// Exposes the module's exports (init, destroy, speak, stop, restart) as window.SpeechType.
			name: 'SpeechType',
			fileName: () => 'speechtype.webflow.min.js',
		},
		// The core imports no optional dependencies dynamically, so nothing needs to be marked
		// external here — the whole bundle is self-contained.
		minify: true,
	},
})
