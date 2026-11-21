import {type ChildProcess, spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {workspaceDir} from './paths';

export type AssistantEvent =
	| {type: 'text'; text: string}
	| {type: 'tool'; name: string}
	| {type: 'done'; session: string; ok: boolean; note: string};

// What the assistant may use from this panel: the studio's own tools and files in the workspace.
// No shell, no network tools. Anything else is refused by Claude Code in this mode.
const TOOLS = ['mcp__resolve-assist', 'Read', 'Glob', 'Grep', 'Edit', 'Write'];

let current: ChildProcess | null = null;

export const stopAssistant = () => {
	current?.kill('SIGTERM');
	current = null;
};

/**
 * One turn with Claude Code in print mode, in the workspace folder (so it reads the same guide as a
 * terminal session). `session` continues an earlier conversation. Output is streamed as events.
 */
export const askAssistant = (project: string, prompt: string, session: string, emit: (e: AssistantEvent) => void): Promise<void> =>
	new Promise((resolvePromise, reject) => {
		if (current) return reject(new Error('The assistant is still answering. Stop it first.'));
		const direct = join(homedir(), '.local', 'bin', 'claude');
		const context = `You are helping inside the Tibeb app. Current project: "${project}" in projects/${project}/. `
			+ 'Read its brief.md and project.json before anything else and follow the workspace guide. The person sees your reply in a narrow panel: answer briefly in plain sentences, '
			+ 'say exactly which files you changed, and stop to ask before anything that costs money or cannot be undone. Changes to edit.json appear in the Edit screen when it is reopened.';
		const args = ['-p', prompt, '--output-format', 'stream-json', '--verbose', '--allowedTools', ...TOOLS, '--append-system-prompt', context, ...(session ? ['--resume', session] : [])];
		// The binary is started directly when found; otherwise a login shell locates it. Arguments are never pasted into a command string.
		const child = existsSync(direct) ? spawn(direct, args, {cwd: workspaceDir()}) : spawn('/bin/zsh', ['-ilc', 'exec claude "$@"', '--', ...args], {cwd: workspaceDir()});
		current = child;
		let buffer = '', sessionId = session, finished = false, errors = '';
		child.stdout.on('data', (chunk: Buffer) => {
			buffer += chunk.toString();
			let nl: number;
			while ((nl = buffer.indexOf('\n')) >= 0) {
				const line = buffer.slice(0, nl).trim();
				buffer = buffer.slice(nl + 1);
				if (!line) continue;
				try {
					const m = JSON.parse(line) as {type?: string; session_id?: string; subtype?: string; result?: string; is_error?: boolean; message?: {content?: {type: string; text?: string; name?: string}[]}};
					if (m.session_id) sessionId = m.session_id;
					if (m.type === 'assistant') {
						for (const block of m.message?.content ?? []) {
							if (block.type === 'text' && block.text) emit({type: 'text', text: block.text});
							if (block.type === 'tool_use' && block.name) emit({type: 'tool', name: block.name.replace(/^mcp__resolve-assist__/, '')});
						}
					}
					if (m.type === 'result') {
						finished = true;
						emit({type: 'done', session: sessionId, ok: !m.is_error, note: m.is_error ? String(m.result ?? 'The assistant stopped with an error.').slice(0, 300) : ''});
					}
				} catch {
					// not a JSON line: ignore
				}
			}
		});
		child.stderr.on('data', (c: Buffer) => { errors = (errors + c.toString()).slice(-600); });
		child.on('error', (e) => { current = null; reject(e); });
		child.on('close', (code) => {
			current = null;
			if (!finished) emit({type: 'done', session: sessionId, ok: false, note: code === null ? 'Stopped.' : errors.trim().split('\n').pop() || `Claude Code ended (code ${code}). Is it installed and signed in?`});
			resolvePromise();
		});
	});
