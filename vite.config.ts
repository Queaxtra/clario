import { enhancedImages } from '@sveltejs/enhanced-img';
import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';

// transformers.js always points onnxruntime's wasm at the jsdelivr CDN, so the
// ~26 MB copy Vite would else bundle is dead weight and breaks the Cloudflare
// Pages 25 MiB per file limit. Drop it from the emitted assets.
function dropUnusedOrtWasm(): Plugin {
	return {
		name: 'clario-drop-ort-wasm',
		generateBundle(_options, bundle) {
			for (const fileName of Object.keys(bundle)) {
				if (/ort-wasm-.*\.wasm$/.test(fileName)) delete bundle[fileName];
			}
		}
	};
}

export default defineConfig({
	worker: {
		format: 'es'
	},
	optimizeDeps: {
		// keep transformers.js unbundled so its wasm/worker asset URLs stay intact
		exclude: ['@huggingface/transformers', 'onnxruntime-web']
	},
	plugins: [
		dropUnusedOrtWasm(),
		enhancedImages(),
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries.
				// Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// Cloudflare Pages adapter: SSR shell and the /api/image proxy become Pages Functions
			adapter: adapter()
		})
	]
});
