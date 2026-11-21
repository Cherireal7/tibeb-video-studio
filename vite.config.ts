import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';

// The renderer is a plain static bundle loaded from disk by Electron (no dev server needed to run it).
export default defineConfig({
	root: 'src/renderer',
	base: './',
	plugins: [react()],
	build: {outDir: '../../dist/renderer', emptyOutDir: true},
});
