import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {safeJoin} from './paths';

export type Preset = {id: string; title: string; summary: string; needs: string; prompt: string};
export type Guide = {id: string; title: string};

/** The kit ships with the app: prompt presets, guides and skills, as plain files in kit/. */
export const kitDir = (): string => join(__dirname, '..', '..', 'kit');

/** `---` front matter with simple `key: value` lines, then the body. */
export const parseFront = (text: string): {meta: Record<string, string>; body: string} => {
	const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
	if (!m) return {meta: {}, body: text};
	const meta: Record<string, string> = {};
	for (const line of m[1].split('\n')) {
		const i = line.indexOf(':');
		if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
	}
	return {meta, body: m[2].trim()};
};

const files = (sub: string): string[] => {
	try {
		return readdirSync(join(kitDir(), sub)).filter((f) => f.endsWith('.md')).sort();
	} catch {
		return [];
	}
};

export const listPresets = (): Preset[] => files('prompts').map((f) => {
	const {meta, body} = parseFront(readFileSync(join(kitDir(), 'prompts', f), 'utf8'));
	return {id: f.replace(/\.md$/, ''), title: meta.title || f, summary: meta.summary || '', needs: meta.needs || '', prompt: body};
});

export const listGuides = (): Guide[] => files('guides').map((f) => {
	const text = readFileSync(join(kitDir(), 'guides', f), 'utf8');
	return {id: f.replace(/\.md$/, ''), title: text.match(/^#\s+(.+)$/m)?.[1] ?? f};
});

export const readGuide = (id: string): string => {
	if (!/^[a-z0-9-]{1,60}$/.test(id)) throw new Error('no such guide');
	const path = safeJoin(join(kitDir(), 'guides'), `${id}.md`);
	if (!existsSync(path)) throw new Error('no such guide');
	return readFileSync(path, 'utf8');
};
