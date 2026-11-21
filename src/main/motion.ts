import {spawn} from 'node:child_process';
import {copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {basename, join} from 'node:path';
import {readConfig} from './paths';
import {projectPath} from './store';

export type Template = {id: string; formats: string[]; inputs: unknown; examples: {file: string; name: string; format: string; alpha: boolean; props: unknown}[]};
export type RenderRequest = {project: string; template: string; format: string; name: string; alpha: boolean; props: unknown};

export const motionDir = (): string => readConfig().motion || join(homedir(), 'Documents', 'Github', 'motion-studio');

/** Templates come from Motion Studio's exported list (`npm run templates` there refreshes it). */
export const getTemplates = (): Template[] => {
	try {
		return (JSON.parse(readFileSync(join(motionDir(), 'presets', 'templates.json'), 'utf8')) as {templates: Template[]}).templates;
	} catch {
		return [];
	}
};

let running = false;

/**
 * Render one template into a project. The config is saved in the project (renders/<name>.json) so the
 * same video can be rendered again or adjusted later; the result is copied to exports/.
 */
export const render = (req: RenderRequest, onProgress: (p: {percent: number; line: string}) => void): Promise<{file: string; config: string}> =>
	new Promise((resolvePromise, reject) => {
		const template = getTemplates().find((t) => t.id === req.template);
		if (!template) return reject(new Error('unknown template'));
		if (!template.formats.includes(req.format)) return reject(new Error(`${req.template} supports ${template.formats.join(', ')}`));
		if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,59}$/.test(req.name)) return reject(new Error('Name the render with letters, numbers, - or _ (no spaces).'));
		if (running) return reject(new Error('A render is already running. Wait for it to finish.'));
		const dir = projectPath(req.project, 'renders');
		mkdirSync(dir, {recursive: true});
		const config = join(dir, `${req.name}.json`);
		writeFileSync(config, JSON.stringify({template: req.template, format: req.format, name: req.name, alpha: req.alpha, props: req.props}, null, 2));
		running = true;
		// A login shell finds `node` the same way the terminal does; arguments are passed as "$@", never pasted into the command.
		const child = spawn('/bin/zsh', ['-ilc', 'exec node "$@"', '--', 'scripts/render.mjs', config, '--format', req.format], {cwd: motionDir()});
		let tail = '';
		const feed = (chunk: Buffer) => {
			for (const line of chunk.toString().split(/[\r\n]+/).filter(Boolean)) {
				tail = (tail + '\n' + line).split('\n').slice(-12).join('\n');
				const m = line.match(/(\d+)\s*\/\s*(\d+)/);
				onProgress({percent: m && Number(m[2]) > 0 ? Math.min(100, Math.round((Number(m[1]) / Number(m[2])) * 100)) : -1, line: line.slice(0, 160)});
			}
		};
		child.stdout.on('data', feed);
		child.stderr.on('data', feed);
		child.on('error', (e) => {
			running = false;
			reject(e);
		});
		child.on('close', (code) => {
			running = false;
			const out = join(motionDir(), 'out', `${req.name}-${req.format}${req.alpha ? '.mov' : '.mp4'}`);
			if (code !== 0 || !existsSync(out)) return reject(new Error(tail.split('\n').filter((l) => /error|invalid|expected|unknown|missing/i.test(l)).slice(-3).join(' · ') || `The render stopped (code ${code}).`));
			const exportsDir = projectPath(req.project, 'exports');
			mkdirSync(exportsDir, {recursive: true});
			copyFileSync(out, join(exportsDir, basename(out)));
			resolvePromise({file: `projects/${req.project}/exports/${basename(out)}`, config: `renders/${req.name}.json`});
		});
	});
