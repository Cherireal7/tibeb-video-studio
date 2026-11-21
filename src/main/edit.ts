import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {linkProjectMedia, projectSlug} from './motion';
import {getProject, projectPath} from './store';

export type EditClip = {id: string; start: number; length: number; kind: string; [key: string]: unknown};
export type EditTrack = {id: string; name: string; kind: 'video' | 'text' | 'audio'; muted?: boolean; clips: EditClip[]};
export type EditDoc = {version: 1; duration: number; background: string; credit?: string; tracks: EditTrack[]};

const media = (kind: 'video' | 'image', id: string, src: string, start: number, length: number): EditClip =>
	({id, start, length, kind, src, in: 0, volume: 1, fit: 'cover', scale: 1, x: 0, y: 0, opacity: 1, zoom: kind === 'image' ? 0.08 : 0});
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
		picture.push(media('image', `v${picture.length + 1}`, prefix + f.file, t, 3));
		t += 3;
	}
	const voice = p.files.filter((x) => x.kind === 'voice' && /\.(wav|mp3|m4a)$/i.test(x.file)).slice(0, 1);
	const music = p.files.filter((x) => x.kind === 'music' && /\.(wav|mp3|m4a)$/i.test(x.file)).slice(0, 1);
	const duration = Math.max(5, Math.round(Math.max(t, voice[0]?.duration ?? 0) * 10) / 10);
	return {
		version: 1, duration, background: '#101014',
		tracks: [
			{id: 'text', name: 'Text', kind: 'text', clips: [{id: 't1', start: 0.3, length: Math.min(3, duration - 0.5), kind: 'text', text: project, style: 'headline', motion: 'rise', size: 8, color: '#FFFFFF', accent: '#FB7A3C', x: 50, y: 22, align: 'center'}]},
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
		return {doc, created: false, slug: projectSlug(project)};
	}
	const doc = defaultEdit(project);
	linkProjectMedia(project, doc);
	return {doc, created: true, slug: projectSlug(project)};
};

export const saveEdit = (project: string, doc: unknown): boolean => {
	if (!looksLikeEdit(doc) || JSON.stringify(doc).length > 4_000_000) throw new Error('not a valid timeline');
	linkProjectMedia(project, doc);
	writeFileSync(projectPath(project, 'edit.json'), JSON.stringify(doc, null, 1));
	return true;
};
