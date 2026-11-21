import {execFile} from 'node:child_process';
import {existsSync} from 'node:fs';
import {engineBin, workspaceDir} from './paths';

/** Run one engine command (argument array, no shell) and parse its JSON output. */
export const engine = <T = unknown>(args: string[], timeoutMs = 120_000): Promise<T> =>
	new Promise((resolvePromise, reject) => {
		const bin = engineBin();
		if (!existsSync(bin)) {
			reject(new Error(`The engine is not installed (${bin}). See resolve-assist's README.`));
			return;
		}
		execFile(bin, args, {timeout: timeoutMs, maxBuffer: 32 * 1024 * 1024, env: {...process.env, RESOLVE_ASSIST_OUTPUT: workspaceDir()}}, (err, stdout, stderr) => {
			const start = stdout.indexOf('{');
			if (start >= 0) {
				try {
					resolvePromise(JSON.parse(stdout.slice(start)) as T);
					return;
				} catch {
					// fall through to the error below
				}
			}
			reject(new Error((stderr || err?.message || 'the engine returned nothing').trim().split('\n').slice(-3).join(' ')));
		});
	});
