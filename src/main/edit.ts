import {createHash} from 'node:crypto';
import {type FSWatcher, existsSync, readFileSync, readdirSync, watch, writeFileSync} from 'node:fs';
import {linkProjectMedia, projectSlug} from './motion';
import {getProject, projectPath} from './store';

export type EditClip = {id: string; start: number; length: number; kind: string; [key: string]: unknown};
export type EditTrack = {id: string; name: string; kind: 'video' | 'text' | 'audio'; muted?: boolean; clips: EditClip[]};
export type EditDoc = {version: 1; duration: number; background: string; paper?: string; credit?: string; tracks: EditTrack[]};

// Pictures start as taped cut-outs on paper (the editorial look); footage fills the frame.
const media = (kind: 'video' | 'image', id: string, src: string, start: number, length: number, n = 0): EditClip =>
	({id, start, length, kind, src, in: 0, volume: 1, fit: 'cover', scale: 1, x: 0, y: kind === 'image' ? -8 : 0, opacity: 1, zoom: 0,
		...(kind === 'image' ? {frame: 'tape', frameWidth: 72, rotate: n % 2 ? 3 : -3} : {})});
const audio = (id: string, src: string, length: number, volume: number): EditClip =>
	({id, start: 0, length, kind: 'audio', src, in: 0, volume, fadeIn: 0.3, fadeOut: 1});

/** A first cut from what is in the project: footage and stills in a row, voice and music underneath. */
export const defaultEdit = (project: string): EditDoc => {
	const p = getProject(project);
	const prefix = `projects/${projectSlug(project)}/`;
	let t = 0;
	const picture: EditClip[] = [];
	for (const f of p.files.filter((x) => x.kind === 'video')) {
		const len = Math.max(1, Math.min(f.duration ?? 5, 60));
		picture.push(media('video', `v${picture.length + 1}`, prefix + f.file, t, len));
		t += len;
	}
	for (const f of p.files.filter((x) => (x.kind === 'image' || x.kind === 'map') && /\.(png|jpe?g|webp)$/i.test(x.file))) {
		picture.push(media('image', `v${picture.length + 1}`, prefix + f.file, t, 3, picture.length));
		t += 3;
	}
	const voice = p.files.filter((x) => x.kind === 'voice' && /\.(wav|mp3|m4a)$/i.test(x.file)).slice(0, 1);
	const music = p.files.filter((x) => x.kind === 'music' && /\.(wav|mp3|m4a)$/i.test(x.file)).slice(0, 1);
	const duration = Math.max(5, Math.round(Math.max(t, voice[0]?.duration ?? 0) * 10) / 10);
	return {
		version: 1, duration, background: '#EFEAE0', paper: 'light',
		tracks: [
			{id: 'text', name: 'Text', kind: 'text', clips: [{id: 't1', start: 0.3, length: Math.min(3, duration - 0.5), kind: 'text', text: project, style: 'editorial', motion: 'rise', size: 8, color: '#16150F', accent: '#F5C451', x: 50, y: 14, align: 'center'}]},
			{id: 'video', name: 'Video', kind: 'video', clips: picture},
			{id: 'voice', name: 'Voice', kind: 'audio', clips: voice.map((f, i) => audio(`n${i + 1}`, prefix + f.file, Math.min(duration, f.duration ?? duration), 1))},
			{id: 'music', name: 'Music', kind: 'audio', clips: music.map((f, i) => audio(`m${i + 1}`, prefix + f.file, duration, 0.35))},
			{id: 'sfx', name: 'SFX', kind: 'audio', clips: []},
		],
	};
};

/** Shape check only; the page validates against Motion Studio's schema before it saves or exports. */
const looksLikeEdit = (doc: unknown): doc is EditDoc => {
	const d = doc as EditDoc;
	return Boolean(d) && d.version === 1 && typeof d.duration === 'number' && d.duration > 0 && d.duration <= 3600 && typeof d.background === 'string'
		&& Array.isArray(d.tracks) && d.tracks.length > 0 && d.tracks.length <= 24
		&& d.tracks.every((t) => typeof t.id === 'string' && Array.isArray(t.clips) && t.clips.length <= 400
			&& t.clips.every((c) => typeof c.id === 'string' && typeof c.start === 'number' && typeof c.length === 'number'));
};

export const loadEdit = (project: string): {doc: EditDoc; created: boolean; slug: string} => {
	const file = projectPath(project, 'edit.json');
	if (existsSync(file)) {
		const doc = JSON.parse(readFileSync(file, 'utf8')) as unknown;
		if (!looksLikeEdit(doc)) throw new Error('edit.json in this project is not a timeline this version understands');
		linkProjectMedia(project, doc);
		ours.set(project, hash(readFileSync(file, 'utf8')));
		return {doc, created: false, slug: projectSlug(project)};
	}
	const doc = defaultEdit(project);
	linkProjectMedia(project, doc);
	return {doc, created: true, slug: projectSlug(project)};
};

const ours = new Map<string, string>(); // project -> hash of what this app last wrote or loaded
const hash = (text: string) => createHash('sha1').update(text).digest('hex');

export const saveEdit = (project: string, doc: unknown): boolean => {
	if (!looksLikeEdit(doc) || JSON.stringify(doc).length > 4_000_000) throw new Error('not a valid timeline');
	linkProjectMedia(project, doc);
	const text = JSON.stringify(doc, null, 1);
	ours.set(project, hash(text));
	writeFileSync(projectPath(project, 'edit.json'), text);
	return true;
};

let watcher: FSWatcher | null = null;

/** Tell the page when edit.json is changed by something other than this app (assistant, terminal). One project at a time. */
export const watchEdit = (project: string, onChange: () => void): void => {
	watcher?.close();
	watcher = null;
	const dir = projectPath(project, '');
	let timer: NodeJS.Timeout | undefined;
	watcher = watch(dir, (_event, file) => {
		if (file !== 'edit.json') return;
		clearTimeout(timer);
		timer = setTimeout(() => {
			try {
				const now = hash(readFileSync(projectPath(project, 'edit.json'), 'utf8'));
				if (now !== ours.get(project)) {
					ours.set(project, now);
					onChange();
				}
			} catch {
				// file mid-write or removed: the next event will catch up
			}
		}, 350);
	});
};

export type Narration = {name: string; audio: string; duration: number; words: {text: string; start: number; end: number; cue: number}[]};

/** Narrations made for a project (prep/*.narration.json, or the older narration-*.json): audio path plus word timings. */
export const listNarrations = (project: string): Narration[] => {
	const dir = projectPath(project, 'prep');
	const prefix = `projects/${projectSlug(project)}/`;
	const out: Narration[] = [];
	let names: string[] = [];
	try {
		names = readdirSync(dir).filter((f) => /narration.*\.json$/.test(f));
	} catch {
		return out;
	}
	for (const f of names) {
		try {
			const d = JSON.parse(readFileSync(projectPath(project, `prep/${f}`), 'utf8')) as {audio?: string; duration?: number; words?: {text: string; start: number; end: number; line?: number; cue?: number}[]};
			const name = f.replace(/\.narration\.json$|\.json$/g, '');
			const wav = d.audio ? `voice/${d.audio.split('/').pop()}` : `voice/${name}.wav`;
			if (!d.words?.length || !existsSync(projectPath(project, wav))) continue;
			out.push({name, audio: prefix + wav, duration: d.duration ?? d.words[d.words.length - 1].end + 1,
				words: d.words.map((w) => ({text: String(w.text).slice(0, 40), start: w.start, end: w.end, cue: w.cue ?? w.line ?? 0}))});
		} catch {
			// not a narration file we understand
		}
	}
	return out;
};
