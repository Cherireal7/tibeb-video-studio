import {type ChildProcess, execFileSync, spawn} from 'node:child_process';
import {existsSync, readFileSync, readdirSync, statSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {readConfig, workspaceDir} from './paths';

export type AgentId = 'claude' | 'codex';
export type AgentStatus = {id: AgentId; label: string; installed: boolean; path: string; version: string; signedIn: boolean; detail: string; fix: string};
export type MakeEvent =
	| {type: 'text'; text: string}
	| {type: 'step'; text: string}
	| {type: 'done'; ok: boolean; note: string; video: string; session: string};
export type MakeRequest = {agent: AgentId; project: string; prompt: string; session?: string};

export const framesDir = (): string => readConfig().frames || join(homedir(), 'Documents', 'Github', 'hyperframes-studio');
export const creditLine = (): string => {
	const c = readConfig().credit;
	return c === undefined ? 'Edit by Cheri' : c.trim();
};

/** Where a program is: the usual folders first, then whatever the person's login shell finds. */
const which = (name: string): string => {
	for (const dir of [join(homedir(), '.local', 'bin'), '/opt/homebrew/bin', '/usr/local/bin']) {
		if (existsSync(join(dir, name))) return join(dir, name);
	}
	try {
		return execFileSync('/bin/zsh', ['-ilc', `command -v ${name}`], {encoding: 'utf8', timeout: 8000}).trim().split('\n').pop() ?? '';
	} catch {
		return '';
	}
};
const version = (bin: string): string => {
	try {
		return execFileSync(bin, ['--version'], {encoding: 'utf8', timeout: 8000}).trim().split('\n')[0].slice(0, 60);
	} catch {
		return '';
	}
};

/** Codex keeps its sign-in in CODEX_HOME: ~/.codex, a folder named in the config, or a Doxa Code account. */
export const codexHome = (): string => {
	const named = readConfig().codex_home;
	if (named && existsSync(join(named, 'auth.json'))) return named;
	const plain = join(homedir(), '.codex');
	if (existsSync(join(plain, 'auth.json'))) return plain;
	const doxa = join(homedir(), 'Library', 'Application Support', 'Doxa Code', 'accounts', 'codex');
	try {
		for (const d of readdirSync(doxa)) if (existsSync(join(doxa, d, 'auth.json'))) return join(doxa, d);
	} catch {
		// Doxa Code is not installed
	}
	return '';
};

const claudeSignedIn = (): boolean => {
	try {
		const cfg = JSON.parse(readFileSync(join(homedir(), '.claude.json'), 'utf8')) as {oauthAccount?: unknown; primaryApiKey?: unknown};
		return Boolean(cfg.oauthAccount || cfg.primaryApiKey);
	} catch {
		return Boolean(process.env.ANTHROPIC_API_KEY);
	}
};

export const agentStatus = (): AgentStatus[] => {
	const claude = which('claude');
	const codex = which('codex');
	const home = codexHome();
	return [
		{id: 'claude', label: 'Claude Code', installed: Boolean(claude), path: claude, version: claude ? version(claude) : '', signedIn: Boolean(claude) && claudeSignedIn(),
			detail: !claude ? 'not installed' : claudeSignedIn() ? 'installed and signed in' : 'installed, not signed in',
			fix: !claude ? 'Install: curl -fsSL https://claude.ai/install.sh | bash' : claudeSignedIn() ? '' : 'Open a terminal, type claude, then /login'},
		{id: 'codex', label: 'Codex (ChatGPT)', installed: Boolean(codex), path: codex, version: codex ? version(codex) : '', signedIn: Boolean(codex) && Boolean(home),
			detail: !codex ? 'not installed' : home ? `installed and signed in (${home.replace(homedir(), '~')})` : 'installed, not signed in',
			fix: !codex ? 'Install: npm install -g @openai/codex' : home ? '' : 'Open a terminal and type: codex login'},
	];
};

/** What every Make run is told, whatever the agent: where things are, what "done" means, and what is off limits. */
export const makeBrief = (project: string): string => {
	const credit = creditLine();
	return [
		`You are running inside the Tibeb app. The person pressed "Make" and is watching a log, not a terminal: nobody can answer questions, so decide and build.`,
		`Project: "${project}", folder projects/${project}/ in this workspace. Read its brief.md and project.json first, and use the material in it.`,
		`Start with the "cutroom" skill and its style.md, and plan the sound first with the "beat-grid" skill (studio grid). Skip the "wait for approval" steps this once: write the storyboard into the project's brief.md under "Decisions and progress" and carry on.`,
		`Build the picture as a HyperFrames project in ${framesDir()}/projects/<slug> (vertical 1080x1920, 60 fps), check stills, render, and copy the final file to projects/${project}/exports/<slug>-9x16.mp4.`,
		credit ? `The video ends with the credit "${credit}".` : 'No end credit on this video.',
		`Free and local only: no Higgsfield, ElevenLabs or any paid or signed-in service. Use the pictures and files already in the project; real pictures may come from Wikimedia Commons through the studio's tool.`,
		`Verify the file you made (frame count, a few frames, delivery-check) and report honestly what was and was not checked.`,
		`End your last message with one line: VIDEO: <absolute path of the mp4>, or VIDEO: none if you could not finish, followed by one sentence saying why.`,
	].join(' ');
};

export const claudeArgs = (prompt: string, project: string, session = ''): string[] => [
	'-p', prompt, '--output-format', 'stream-json', '--verbose', '--permission-mode', 'acceptEdits',
	'--allowedTools', 'Bash', 'Read', 'Glob', 'Grep', 'Edit', 'Write', 'Skill', 'mcp__resolve-assist',
	'--add-dir', framesDir(), '--append-system-prompt', makeBrief(project), ...(session ? ['--resume', session] : []),
];

export const codexArgs = (prompt: string, project: string): string[] => [
	'exec', '--json', '--skip-git-repo-check', '-C', workspaceDir(), '--add-dir', framesDir(), '-s', 'workspace-write',
	'-c', 'sandbox_workspace_write.network_access=true', `${makeBrief(project)}\n\nThe request: ${prompt}`,
];

/** The newest video in the project's exports written since `since`, or what the agent named on its VIDEO: line. */
export const findVideo = (project: string, since: number, said: string): string => {
	const named = said.match(/VIDEO:\s*(\/[^\n`"']+\.(?:mp4|mov))/i)?.[1]?.trim();
	const dir = join(workspaceDir(), 'projects', project, 'exports');
	if (named && existsSync(named) && named.startsWith(dir)) return `projects/${project}/exports/${named.slice(dir.length + 1)}`;
	let best = '', bestTime = since;
	try {
		for (const f of readdirSync(dir)) {
			if (!/\.(mp4|mov)$/i.test(f)) continue;
			const t = statSync(join(dir, f)).mtimeMs;
			if (t >= bestTime) { best = f; bestTime = t; }
		}
	} catch {
		// no exports folder yet
	}
	return best ? `projects/${project}/exports/${best}` : '';
};

type ClaudeLine = {type?: string; subtype?: string; error?: unknown; attempt?: number; retryAttempt?: number; session_id?: string; result?: string; is_error?: boolean; message?: {content?: {type: string; text?: string; name?: string; input?: {command?: string; description?: string; file_path?: string; skill?: string}}[]}};
type CodexLine = {type?: string; thread_id?: string; message?: string; error?: {message?: string}; item?: {type?: string; text?: string; command?: string; changes?: {path?: string}[]; message?: string}};

/** One line of an agent's JSON stream, as events for the page. Unknown lines are ignored. */
export const readLine = (agent: AgentId, line: string): {events: MakeEvent[]; session?: string; finished?: {ok: boolean; note: string}} => {
	const events: MakeEvent[] = [];
	let parsed: unknown;
	try {
		parsed = JSON.parse(line);
	} catch {
		return {events};
	}
	const short = (s: string) => s.replace(/\s+/g, ' ').trim().slice(0, 140);
	if (agent === 'claude') {
		const m = parsed as ClaudeLine;
		if (m.type === 'assistant') {
			for (const b of m.message?.content ?? []) {
				if (b.type === 'text' && b.text) events.push({type: 'text', text: b.text});
				if (b.type === 'tool_use' && b.name) {
					const what = b.input?.description || b.input?.command || b.input?.file_path || b.input?.skill || '';
					events.push({type: 'step', text: short(`${b.name.replace(/^mcp__resolve-assist__/, 'studio: ')}${what ? ` · ${what}` : ''}`)});
				}
			}
		}
		if (m.type === 'system' && /api_(error|retry)/.test(m.subtype ?? '')) {
			// the agent retries by itself; the person should see why nothing is moving
			events.push({type: 'step', text: `waiting · no connection to the agent's service, retrying${m.retryAttempt ?? m.attempt ? ` (attempt ${m.retryAttempt ?? m.attempt})` : ''}`});
		}
		if (m.type === 'result') return {events, session: m.session_id, finished: {ok: !m.is_error, note: m.is_error ? String(m.result ?? 'Claude Code stopped with an error.').slice(0, 300) : ''}};
		return {events, session: m.session_id};
	}
	const m = parsed as CodexLine;
	if (m.type === 'thread.started') return {events, session: m.thread_id};
	if (m.type === 'item.completed' && m.item) {
		if (m.item.type === 'agent_message' && m.item.text) events.push({type: 'text', text: m.item.text});
		if (m.item.type === 'command_execution' && m.item.command) events.push({type: 'step', text: short(`shell · ${m.item.command}`)});
		if (m.item.type === 'file_change') events.push({type: 'step', text: short(`files · ${(m.item.changes ?? []).map((c) => c.path?.split('/').pop()).filter(Boolean).join(', ')}`)});
		if (m.item.type === 'error' && m.item.message) events.push({type: 'step', text: short(`note · ${m.item.message}`)});
	}
	if (m.type === 'turn.completed') return {events, finished: {ok: true, note: ''}};
	if (m.type === 'turn.failed' || m.type === 'error') return {events, finished: {ok: false, note: String(m.error?.message ?? m.message ?? 'Codex stopped with an error.').slice(0, 300)}};
	return {events};
};

let current: ChildProcess | null = null;
export const stopMake = () => {
	current?.kill('SIGTERM');
	current = null;
};

/** Run one request with the chosen agent in the workspace and stream what it does. One run at a time. */
export const runMake = (req: MakeRequest, emit: (e: MakeEvent) => void): Promise<void> =>
	new Promise((resolvePromise, reject) => {
		if (current) return reject(new Error('A video is still being made. Stop it first.'));
		const status = agentStatus().find((a) => a.id === req.agent);
		if (!status?.installed) return reject(new Error(`${status?.label ?? req.agent} is not installed. ${status?.fix ?? ''}`));
		if (!status.signedIn) return reject(new Error(`${status.label} is not signed in. ${status.fix}`));
		const started = Date.now();
		const args = req.agent === 'claude' ? claudeArgs(req.prompt, req.project, req.session) : codexArgs(req.prompt, req.project);
		const env = {...process.env, ...(req.agent === 'codex' ? {CODEX_HOME: codexHome()} : {}), PATH: `${join(homedir(), '.local', 'bin')}:/opt/homebrew/bin:/usr/local/bin:${process.env.PATH ?? ''}`};
		// Arguments are passed as a list, never pasted into a command string. stdin is closed so the agent does not wait for input.
		const child = spawn(status.path, args, {cwd: workspaceDir(), env, stdio: ['ignore', 'pipe', 'pipe']});
		current = child;
		let buffer = '', session = req.session ?? '', said = '', errors = '';
		let finished: {ok: boolean; note: string} | null = null;
		child.stdout.on('data', (chunk: Buffer) => {
			buffer += chunk.toString();
			let nl: number;
			while ((nl = buffer.indexOf('\n')) >= 0) {
				const line = buffer.slice(0, nl).trim();
				buffer = buffer.slice(nl + 1);
				if (!line) continue;
				const got = readLine(req.agent, line);
				if (got.session) session = got.session;
				if (got.finished) finished = got.finished;
				for (const e of got.events) {
					if (e.type === 'text') said = (said + '\n' + e.text).slice(-4000);
					emit(e);
				}
			}
		});
		child.stderr.on('data', (c: Buffer) => { errors = (errors + c.toString()).slice(-800); });
		child.on('error', (e) => { current = null; reject(e); });
		child.on('close', (code) => {
			current = null;
			const video = findVideo(req.project, started, said);
			const stopped = code === null;
			const note = finished?.note || (finished ? '' : stopped ? 'Stopped.' : errors.trim().split('\n').pop() || `${status.label} ended early (code ${code}).`);
			emit({type: 'done', ok: Boolean(finished?.ok) && Boolean(video), note: note || (video ? '' : 'The agent finished without a video in the project’s exports folder. Read its last message above.'), video, session});
			resolvePromise();
		});
	});
