import {cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync} from 'node:fs';
import {basename, extname, join} from 'node:path';
import {isProjectName, safeJoin, workspaceDir} from './paths';

export type ProjectFile = {file: string; kind: string; bytes: number; duration?: number; width?: number; height?: number; license?: string; author?: string; source?: string};
export type ProjectSummary = {name: string; updated: string; counts: Record<string, number>; cover: string | null; goal: string; stage: string; inbox: number};
export type ProjectDetail = ProjectSummary & {files: ProjectFile[]; brief: string; prepared: string[]; hasPlan: boolean};
export type LibraryItem = {id: string; category: string; file: string; tags: string[]; usage: string; license?: string; seconds?: number; bpm?: number};

const IMAGE = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const readJson = <T>(path: string, fallback: T): T => {
	try {
		return JSON.parse(readFileSync(path, 'utf8')) as T;
	} catch {
		return fallback;
	}
};
const projectsDir = () => join(workspaceDir(), 'projects');
const projectDir = (name: string) => {
	if (!isProjectName(name)) throw new Error('not a valid project name');
	return safeJoin(projectsDir(), name);
};
const countFiles = (dir: string): number => {
	try {
		return readdirSync(dir, {withFileTypes: true}).filter((e) => !e.name.startsWith('.')).length;
	} catch {
		return 0;
	}
};

/** Where a project stands, from what exists on disk (no separate status to keep in sync). */
const stageOf = (dir: string, index: {has_plan?: boolean; has_edit?: boolean; prepared?: string[]; files?: ProjectFile[]}): string => {
	if (!existsSync(join(dir, 'project.json'))) return 'Not indexed';
	if (countFiles(join(dir, 'exports')) > 0) return 'Exported';
	if (index.has_edit) return 'Editing';
	if (index.has_plan) return 'Planned';
	if ((index.prepared ?? []).length > 0) return 'Prepared';
	if ((index.files ?? []).length > 0) return 'Material added';
	return 'Empty';
};

const describe = (name: string): ProjectDetail => {
	const dir = projectDir(name);
	const index = readJson<{updated?: string; counts?: Record<string, number>; files?: ProjectFile[]; prepared?: string[]; has_plan?: boolean; has_edit?: boolean}>(join(dir, 'project.json'), {});
	let brief = '';
	try {
		brief = readFileSync(join(dir, 'brief.md'), 'utf8');
	} catch {
		// no brief yet
	}
	const goal = (brief.match(/^- Goal of the video:[ \t]*(.+)$/m)?.[1] ?? '').trim();
	const files = index.files ?? [];
	const cover = files.find((f) => (f.kind === 'image' || f.kind === 'map') && IMAGE.has(extname(f.file).toLowerCase()))?.file ?? null;
	return {
		name, updated: index.updated ?? '', counts: index.counts ?? {}, cover: cover ? `projects/${name}/${cover}` : null, goal,
		stage: stageOf(dir, index), inbox: countFiles(join(dir, 'inbox')), files, brief, prepared: index.prepared ?? [], hasPlan: Boolean(index.has_plan),
	};
};

export const listProjects = (): ProjectSummary[] => {
	let names: string[] = [];
	try {
		names = readdirSync(projectsDir(), {withFileTypes: true}).filter((e) => e.isDirectory() && isProjectName(e.name)).map((e) => e.name);
	} catch {
		// no projects folder yet
	}
	return names.map((n) => {
		const {files: _f, brief: _b, prepared: _p, hasPlan: _h, ...summary} = describe(n);
		return summary;
	}).sort((a, b) => b.updated.localeCompare(a.updated) || a.name.localeCompare(b.name));
};

export const getProject = (name: string): ProjectDetail => describe(name);

export const projectPath = (name: string, sub = ''): string => safeJoin(projectDir(name), sub);

/** Copy files the user dropped onto the window into the project's inbox (never overwrites). */
export const copyToInbox = (name: string, sources: string[]): {copied: string[]; skipped: string[]} => {
	const inbox = join(projectDir(name), 'inbox');
	mkdirSync(inbox, {recursive: true});
	const copied: string[] = [], skipped: string[] = [];
	for (const src of sources.slice(0, 200)) {
		const target = join(inbox, basename(src));
		if (typeof src !== 'string' || !existsSync(src) || existsSync(target) || basename(src).startsWith('.')) {
			skipped.push(basename(String(src)));
			continue;
		}
		cpSync(src, target, {recursive: statSync(src).isDirectory(), errorOnExist: true, force: false});
		copied.push(basename(src));
	}
	return {copied, skipped};
};

const libraryDir = () => join(workspaceDir(), 'library');

export const getLibrary = (): {root: string; items: LibraryItem[]} => {
	const manifest = readJson<{items?: LibraryItem[]}>(join(libraryDir(), 'manifest.json'), {});
	return {root: libraryDir(), items: manifest.items ?? []};
};

/** Copy one library asset into projects/<name>/kit/<category>/ so the editor can import that folder. */
export const addToKit = (name: string, file: string): string => {
	const item = getLibrary().items.find((i) => i.file === file);
	if (!item) throw new Error('not in the library');
	const src = safeJoin(libraryDir(), item.file);
	const dir = join(projectDir(name), 'kit', item.category.replace(/[^a-z0-9-]/gi, '-'));
	mkdirSync(dir, {recursive: true});
	const target = join(dir, basename(src));
	if (!existsSync(target)) cpSync(src, target);
	return `kit/${basename(dir)}/${basename(src)}`;
};
