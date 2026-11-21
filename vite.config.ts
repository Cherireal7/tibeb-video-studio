import react from '@vitejs/plugin-react';
import {homedir} from 'node:os';
import {join, resolve} from 'node:path';
import {defineConfig} from 'vite';

// The editor previews with the very components Motion Studio renders with: its source is imported
// directly (@motion/...), and shared packages are forced to one copy so React and Remotion are not doubled.
const motion = process.env.TIBEB_MOTION || join(homedir(), 'Documents', 'Github', 'motion-studio');

export default defineConfig({
	root: 'src/renderer',
	base: './',
	plugins: [react()],
	resolve: {
		alias: {'@motion': resolve(motion, 'src')},
		dedupe: ['react', 'react-dom', 'remotion', '@remotion/player', '@remotion/fonts', '@remotion/zod-types', 'zod'],
	},
	server: {fs: {allow: ['.', motion]}},
	build: {outDir: '../../dist/renderer', emptyOutDir: true, chunkSizeWarningLimit: 4000},
});
