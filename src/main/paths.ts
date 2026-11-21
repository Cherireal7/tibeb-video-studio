import {existsSync, readFileSync, realpathSync} from 'node:fs';
import {homedir} from 'node:os';
import {join, resolve, sep} from 'node:path';

/** Settings shared with the `tibeb` launcher: ~/.config/studio/config (key=value lines). */
export const readConfig = (): Record<string, string> => {
	const out: Record<string, string> = {};
	try {
		for (const line of readFileSync(join(homedir(), '.config', 'studio', 'config'), 'utf8').split('\n')) {
			const i = line.indexOf('=');
			if (i > 0) out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
		}
	} catch {
		// no config yet: defaults apply
	}
	return out;
};

export const workspaceDir = (): string =>
	process.env.RESOLVE_ASSIST_OUTPUT || readConfig().workspace || join(homedir(), 'Documents', 'resolve-assist');

export const engineBin = (): string =>
	join(readConfig().assist || join(homedir(), 'Documents', 'Github', 'resolve-assist'), '.venv', 'bin', 'resolve-assist');

/** Project names are folder names: letters, numbers, spaces, - and _ only. */
export const isProjectName = (name: unknown): name is string =>
	typeof name === 'string' && /^[A-Za-z0-9][A-Za-z0-9 _-]{0,59}$/.test(name);

/**
 * Join `rel` under `root` and refuse anything that escapes it (.., absolute paths, symlinks out).
 * Every file the app reads or serves goes through here.
 */
export const safeJoin = (root: string, rel: string): string => {
	if (typeof rel !== 'string' || rel.includes('\0')) throw new Error('bad path');
	const base = resolve(root);
	const full = resolve(base, rel);
	if (full !== base && !full.startsWith(base + sep)) throw new Error('path leaves the workspace');
	if (existsSync(full)) {
		const real = realpathSync(full);
		const realBase = realpathSync(base);
		if (real !== realBase && !real.startsWith(realBase + sep)) throw new Error('path leaves the workspace');
	}
	return full;
};
