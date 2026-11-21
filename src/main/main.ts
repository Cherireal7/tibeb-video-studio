import {BrowserWindow, app, ipcMain, net, protocol, session, shell} from 'electron';
import {spawn} from 'node:child_process';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {askAssistant, stopAssistant} from './assistant';
import {loadEdit, saveEdit} from './edit';
import {engine} from './engine';
import {getTemplates, motionDir, projectSlug, render, type RenderRequest} from './motion';
import {isProjectName, readConfig, safeJoin, workspaceDir} from './paths';
import {addToKit, copyToInbox, getLibrary, getProject, listProjects, projectPath} from './store';


const EDITORS = ['resolve', 'capcut', 'none'];
const shotsArg = process.argv.find((a) => a.startsWith('--shots='));

// media://workspace/<relative path> serves files from the workspace only (library, projects).
protocol.registerSchemesAsPrivileged([{scheme: 'media', privileges: {standard: true, secure: true, supportFetchAPI: true, stream: true}}]);

const need = (ok: boolean, message: string) => {
	if (!ok) throw new Error(message);
};

const registerIpc = () => {
	ipcMain.handle('projects:list', () => listProjects());
	ipcMain.handle('projects:get', (_e, name: unknown) => {
		need(isProjectName(name), 'not a valid project name');
		return getProject(name as string);
	});
	ipcMain.handle('projects:create', async (_e, name: unknown) => {
		need(isProjectName(name), 'Use letters, numbers, spaces, - or _ (up to 60 characters).');
		await engine(['new-project', name as string]);
		await engine(['intake', name as string]);
		return getProject(name as string);
	});
	ipcMain.handle('projects:intake', async (_e, name: unknown) => {
		need(isProjectName(name), 'not a valid project name');
		const res = await engine<{moved: string[]; left_in_inbox: string[]}>(['intake', name as string], 600_000);
		return {moved: res.moved, left: res.left_in_inbox, project: getProject(name as string)};
	});
	ipcMain.handle('projects:drop', async (_e, name: unknown, files: unknown) => {
		need(isProjectName(name) && Array.isArray(files) && files.every((f) => typeof f === 'string'), 'bad request');
		const copied = copyToInbox(name as string, files as string[]);
		const res = await engine<{moved: string[]; left_in_inbox: string[]}>(['intake', name as string], 600_000);
		return {...copied, moved: res.moved, left: res.left_in_inbox, project: getProject(name as string)};
	});
	ipcMain.handle('projects:reveal', (_e, name: unknown, sub: unknown) => {
		need(isProjectName(name) && typeof sub === 'string', 'bad request');
		return shell.openPath(projectPath(name as string, sub as string));
	});
	ipcMain.handle('library:get', () => getLibrary());
	ipcMain.handle('library:addToKit', (_e, name: unknown, file: unknown) => {
		need(isProjectName(name) && typeof file === 'string', 'bad request');
		return addToKit(name as string, file as string);
	});
	ipcMain.handle('voice:narrate', async (_e, req: unknown) => {
		const r = req as {project?: unknown; text?: unknown; name?: unknown; voice?: unknown; provider?: unknown};
		need(isProjectName(r?.project) && typeof r.text === 'string' && r.text.trim().length > 0 && r.text.length <= 12000, 'Write a script first (up to 12,000 characters).');
		need(typeof r.name === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(r.name), 'Name it with letters, numbers, - or _.');
		need(r.provider === 'edge' || r.provider === 'say', 'bad voice source');
		need(r.voice === '' || (typeof r.voice === 'string' && /^[A-Za-z][A-Za-z ()-]{0,60}$/.test(r.voice)), 'bad voice name');
		const dir = projectPath(r.project as string, 'docs');
		mkdirSync(dir, {recursive: true});
		const script = join(dir, `${r.name}.script.txt`);
		writeFileSync(script, r.text as string);
		const args = ['narrate', r.project as string, script, '--name', r.name as string, '--provider', r.provider as string];
		if (r.voice) args.push('--voice', r.voice as string);
		const res = await engine<{duration: number; cues: Record<string, number>; word_count: number; voice: string; note: string}>(args, 900_000);
		return {...res, file: `projects/${r.project as string}/voice/${r.name as string}.wav`, project: getProject(r.project as string)};
	});
	ipcMain.handle('commons:search', async (_e, query: unknown) => {
		need(typeof query === 'string' && query.trim().length > 1 && query.length <= 200, 'Type a few search words.');
		return (await engine<{results: unknown[]}>(['commons', query as string], 120_000)).results;
	});
	ipcMain.handle('commons:add', async (_e, name: unknown, title: unknown) => {
		need(isProjectName(name) && typeof title === 'string' && title.length <= 300, 'bad request');
		const res = await engine<{file: string; license: string; notes: string[]}>(['commons', title as string, '--add', name as string], 180_000);
		return {...res, project: getProject(name as string)};
	});
	ipcMain.handle('media:peaks', async (_e, name: unknown, src: unknown, beats: unknown) => {
		need(isProjectName(name) && typeof src === 'string', 'bad request');
		const prefix = `projects/${projectSlug(name as string)}/`;
		need((src as string).startsWith(prefix), 'not a file of this project');
		return engine(['peaks', projectPath(name as string, (src as string).slice(prefix.length)), '--per-second', '40', ...(beats ? ['--beats'] : [])], 300_000);
	});
	ipcMain.handle('media:balance', async (_e, name: unknown, src: unknown, time: unknown) => {
		need(isProjectName(name) && typeof src === 'string' && typeof time === 'number' && time >= 0 && time < 36000, 'bad request');
		const prefix = `projects/${projectSlug(name as string)}/`;
		need((src as string).startsWith(prefix), 'not a file of this project');
		const file = projectPath(name as string, (src as string).slice(prefix.length));
		const res = await engine<{cdl: {slope: number[]; notes: string[]}}>(['balance', file, ...(/\.(mp4|mov|m4v|webm|mkv)$/i.test(file) ? ['--time', String(time)] : [])], 120_000);
		return {balance: res.cdl.slope.map((v) => Math.round(Math.min(5, Math.max(0.2, v)) * 1000) / 1000), notes: res.cdl.notes};
	});
	ipcMain.handle('edit:load', (_e, name: unknown) => {
		need(isProjectName(name), 'not a valid project name');
		return loadEdit(name as string);
	});
	ipcMain.handle('edit:save', (_e, name: unknown, doc: unknown) => {
		need(isProjectName(name), 'not a valid project name');
		return saveEdit(name as string, doc);
	});
	ipcMain.handle('edit:export', async (e, name: unknown, format: unknown, file: unknown) => {
		need(isProjectName(name) && typeof format === 'string' && typeof file === 'string', 'bad request');
		const {doc} = loadEdit(name as string);
		const done = await render({project: name as string, template: 'Timeline', format: format as string, name: file as string, alpha: false, props: doc}, (p) => e.sender.send('create:progress', p));
		await engine(['intake', name as string]).catch(() => undefined);
		return done;
	});
	ipcMain.handle('edit:handoff', async (_e, name: unknown, format: unknown) => {
		need(isProjectName(name) && (format === '9x16' || format === '16x9'), 'bad request');
		const res = await engine<{counts: Record<string, number>; notes: string[]; files: number}>(['handoff', name as string, '--format', format as string, '--motion-dir', motionDir()], 3_600_000);
		void shell.openPath(projectPath(name as string, 'handoff'));
		return res;
	});
	// Experimental: a real CapCut project from the edit (hand-off first, then the draft writer in the engine).
	ipcMain.handle('capcut:create', async (_e, name: unknown, format: unknown) => {
		need(isProjectName(name) && (format === '9x16' || format === '16x9'), 'bad request');
		await engine(['handoff', name as string, '--format', format as string, '--motion-dir', motionDir()], 3_600_000);
		const res = await engine<{name: string; editable_titles: number; next: string}>(['capcut-draft', name as string], 600_000);
		spawn('open', ['-a', 'CapCut'], {detached: true, stdio: 'ignore'}).unref();
		return res;
	});
	ipcMain.handle('capcut:pull', async (_e, name: unknown, apply: unknown) => {
		need(isProjectName(name), 'not a valid project name');
		const {drafts} = await engine<{drafts: {name: string; project: string}[]}>(['capcut-list']);
		const draft = drafts.find((d) => d.project === name);
		need(Boolean(draft), 'No CapCut project was made from this edit yet. Use “Open in CapCut” first.');
		return engine(['capcut-pull', draft!.name, ...(apply ? ['--apply'] : [])], 120_000);
	});
	// Recording through OBS (the engine talks to OBS's WebSocket; the password stays in its own file).
	ipcMain.handle('obs:status', () => engine(['obs-status'], 20_000));
	ipcMain.handle('obs:scenes', () => engine(['obs-scenes'], 20_000));
	ipcMain.handle('obs:start', (_e, scene: unknown) => {
		need(scene === '' || (typeof scene === 'string' && scene.length <= 120), 'bad scene name');
		return engine(['obs-record', ...(scene ? ['--scene', scene as string] : [])], 30_000);
	});
	ipcMain.handle('obs:stop', async (_e, name: unknown) => {
		need(name === '' || isProjectName(name), 'not a valid project name');
		const res = await engine<{file?: string; seconds?: number; library_file?: string}>(['obs-stop'], 180_000);
		if (name && res.file) {
			copyToInbox(name as string, [res.file]);
			await engine(['intake', name as string], 600_000);
		}
		return {...res, addedTo: name && res.file ? name : ''};
	});
	ipcMain.handle('deliver:check', (_e, name: unknown, file: unknown) => {
		need(isProjectName(name) && typeof file === 'string' && file.startsWith('exports/'), 'bad request');
		return engine(['delivery-check', projectPath(name as string, file as string)], 900_000);
	});
	ipcMain.handle('deliver:credits', (_e, name: unknown) => {
		need(isProjectName(name), 'not a valid project name');
		try {
			return readFileSync(projectPath(name as string, 'CREDITS.md'), 'utf8');
		} catch {
			return '';
		}
	});
	ipcMain.handle('assistant:ask', async (e, name: unknown, prompt: unknown, session: unknown) => {
		need(isProjectName(name) && typeof prompt === 'string' && prompt.trim().length > 0 && prompt.length <= 8000, 'Write a request first.');
		need(session === '' || (typeof session === 'string' && /^[A-Za-z0-9-]{8,80}$/.test(session)), 'bad conversation id');
		await askAssistant(name as string, prompt as string, session as string, (ev) => e.sender.send('assistant:event', ev));
		return true;
	});
	ipcMain.handle('assistant:stop', () => {
		stopAssistant();
		return true;
	});
	ipcMain.handle('create:templates', () => getTemplates());
	ipcMain.handle('create:render', async (e, req: unknown) => {
		const r = req as Partial<RenderRequest>;
		need(isProjectName(r?.project) && typeof r.template === 'string' && typeof r.format === 'string' && typeof r.name === 'string' && typeof r.props === 'object' && r.props !== null, 'bad request');
		const done = await render({project: r.project as string, template: r.template as string, format: r.format as string, name: r.name as string, alpha: Boolean(r.alpha), props: r.props},
			(p) => e.sender.send('create:progress', p));
		await engine(['intake', r.project as string]).catch(() => undefined);
		return done;
	});
	ipcMain.handle('setup:doctor', async () => ({...(await engine<object>(['doctor', '--json'])), workspace: workspaceDir()}));
	ipcMain.handle('setup:setEditor', (_e, editor: unknown) => {
		need(typeof editor === 'string' && EDITORS.includes(editor), 'editor must be resolve, capcut or none');
		const dir = join(homedir(), '.config', 'studio');
		mkdirSync(dir, {recursive: true});
		const file = join(dir, 'config');
		let lines: string[] = [];
		try {
			lines = readFileSync(file, 'utf8').split('\n').filter((l) => l && !l.startsWith('editor='));
		} catch {
			// first time
		}
		writeFileSync(file, [...lines, `editor=${editor}`].join('\n') + '\n');
		return readConfig().editor;
	});
	// Opens a Terminal window running the launcher (your editor + Claude in the workspace).
	ipcMain.handle('session:start', () => {
		spawn('open', ['-a', 'Terminal', join(homedir(), '.local', 'bin', 'tibeb')], {detached: true, stdio: 'ignore'}).unref();
		return true;
	});
};

const createWindow = () => {
	const win = new BrowserWindow({
		width: 1440, height: 920, minWidth: 980, minHeight: 640, backgroundColor: '#131217', title: 'Tibeb', show: !shotsArg && !process.argv.some((x) => x.startsWith('--render-test=') || x.startsWith('--tools-test=') || x.startsWith('--edit-test=') || x.startsWith('--assistant-test=')),
		titleBarStyle: 'hiddenInset',
		webPreferences: {preload: join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, nodeIntegration: false},
	});
	// Nothing in the app navigates away or opens windows; links go to the system browser.
	win.webContents.setWindowOpenHandler(({url}) => {
		if (url.startsWith('https://')) void shell.openExternal(url);
		return {action: 'deny'};
	});
	win.webContents.on('will-navigate', (e) => e.preventDefault());
	void win.loadURL('media://app/index.html');
	return win;
};

/** `electron . --shots=<dir>`: save a picture of each screen and quit (used to check the UI). */
const takeShots = async (win: BrowserWindow, dir: string) => {
	mkdirSync(dir, {recursive: true});
	const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
	await wait(1500);
	const first = listProjects()[0]?.name ?? '';
	for (const [name, hash] of [['projects', '#projects'], ['assistant', `#assistant/${encodeURIComponent(first)}`], ['record', '#record'], ['deliver', `#deliver/${encodeURIComponent(first)}`], ['edit', `#edit/${encodeURIComponent(first)}`], ['create', '#create/PathStory'], ['project', `#project/${encodeURIComponent(first)}`], ['library', '#library'], ['setup', '#setup']]) {
		await win.webContents.executeJavaScript(`location.hash = ${JSON.stringify(hash)}`);
		await wait(name === 'setup' ? 5000 : name === 'edit' ? 6000 : 2200);
		writeFileSync(join(dir, `${name}.png`), (await win.webContents.capturePage()).toPNG());
		if (name === 'edit') { // select the first picture clip so the inspector with the colour tools is captured too
			await win.webContents.executeJavaScript(`(() => { const c = document.querySelectorAll('.lane')[2]?.querySelector('.clip'); if (c) { const r = c.getBoundingClientRect();
				c.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, clientX: r.left + 10, clientY: r.top + 5, pointerId: 1}));
				c.dispatchEvent(new PointerEvent('pointerup', {bubbles: true, clientX: r.left + 10, clientY: r.top + 5, pointerId: 1})); } })()`);
			await wait(900);
			writeFileSync(join(dir, 'edit-clip.png'), (await win.webContents.capturePage()).toPNG());
		}
	}
	app.quit();
};

/** `electron . --render-test=<project>`: render the first PathStory example through the page's own API, print the result, quit. */
const renderTest = async (win: BrowserWindow, project: string) => {
	await new Promise((r) => setTimeout(r, 1500));
	const result = await win.webContents.executeJavaScript(`(async () => {
		try {
			const t = (await window.tibeb.templates()).find((x) => x.id === 'PathStory');
			await window.tibeb.createProject(${JSON.stringify(project)});
			const done = await window.tibeb.render({project: ${JSON.stringify(project)}, template: t.id, format: '9x16', name: 'app-render-test', alpha: false, props: t.examples[0].props});
			return 'OK ' + JSON.stringify(done);
		} catch (e) { return 'FAILED ' + e.message; }
	})()`);
	console.log(result);
	app.quit();
};

/** `electron . --tools-test=<project>`: exercise narration and the picture finder through the page, save a picture, quit. */
const toolsTest = async (win: BrowserWindow, project: string) => {
	const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
	await wait(1500);
	const result = await win.webContents.executeJavaScript(`(async () => {
		try {
			await window.tibeb.createProject(${JSON.stringify(project)});
			const n = await window.tibeb.narrate({project: ${JSON.stringify(project)}, text: 'A short {mark}test of the narration.', name: 'app-test', voice: '', provider: 'say'});
			const found = await window.tibeb.commonsSearch('Wartburg Lutherstube');
			location.hash = 'project/' + encodeURIComponent(${JSON.stringify(project)});
			await new Promise((r) => setTimeout(r, 1200));
			[...document.querySelectorAll('button')].find((b) => b.textContent === 'Find real pictures').click();
			await new Promise((r) => setTimeout(r, 300));
			const input = document.querySelector('.tool input');
			Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Wartburg Lutherstube');
			input.dispatchEvent(new Event('input', {bubbles: true}));
			await new Promise((r) => setTimeout(r, 200));
			document.querySelector('.tool form').requestSubmit();
			await new Promise((r) => setTimeout(r, 9000));
			return 'OK narration ' + n.duration + 's cues ' + JSON.stringify(n.cues) + ' | commons ' + found.length + ' results, first: ' + found[0].license;
		} catch (e) { return 'FAILED ' + e.message; }
	})()`);
	mkdirSync('docs/app', {recursive: true});
	writeFileSync('docs/app/project-tools.png', (await win.webContents.capturePage()).toPNG());
	console.log(result);
	app.quit();
};

/** `electron . --edit-test=<project>`: build a small project, open its first cut, save it and export it through the page. */
const editTest = async (win: BrowserWindow, project: string) => {
	const {copyFileSync} = await import('node:fs');
	await engine(['new-project', project]);
	const lib = join(workspaceDir(), 'library');
	for (const f of ['backgrounds/mesh-aurora-9x16.png', 'backgrounds/grainy-coral-9x16.png', 'music/chill-house-30s.wav']) copyFileSync(join(lib, f), join(projectPath(project, 'inbox'), f.split('/')[1]));
	await engine(['intake', project]);
	await new Promise((r) => setTimeout(r, 1500));
	const result = await win.webContents.executeJavaScript(`(async () => {
		try {
			const {doc, created} = await window.tibeb.loadEdit(${JSON.stringify(project)});
			doc.duration = 6;
			await window.tibeb.saveEdit(${JSON.stringify(project)}, doc);
			const again = await window.tibeb.loadEdit(${JSON.stringify(project)});
			const bal = await window.tibeb.balance(${JSON.stringify(project)}, doc.tracks[1].clips[0].src, 0);
			const pk = await window.tibeb.peaks(${JSON.stringify(project)}, doc.tracks[3].clips[0].src, true);
			doc.tracks[1].clips[0].look = 'golden-hour'; doc.tracks[1].clips[0].balance = bal.balance;
			await window.tibeb.saveEdit(${JSON.stringify(project)}, doc);
			doc.tracks[3].duck = {under: 'voice', amount: 0.3};
			await window.tibeb.saveEdit(${JSON.stringify(project)}, doc);
			const ho = await window.tibeb.handoff(${JSON.stringify(project)}, '9x16');
			const done = await window.tibeb.exportEdit(${JSON.stringify(project)}, '9x16', 'edit-test');
			return 'OK created=' + created + ' reloaded=' + !again.created + ' clips=' + doc.tracks.map((t) => t.id + ':' + t.clips.length).join(',') + ' handoff=' + JSON.stringify(ho.counts) + ' balance=' + JSON.stringify(bal.balance) + ' peaks=' + pk.peaks.length + ' bpm=' + pk.bpm + ' ' + done.file;
		} catch (e) { return 'FAILED ' + e.message; }
	})()`);
	console.log(result);
	app.quit();
};

/** `electron . --assistant-test=<project>`: one short question through the Assistant path, print what came back. */
const assistantTest = async (win: BrowserWindow, project: string) => {
	await new Promise((r) => setTimeout(r, 1500));
	const result = await win.webContents.executeJavaScript(`(async () => {
		const events = [];
		const off = window.tibeb.onAssistant((e) => events.push(e));
		try {
			await window.tibeb.ask(${JSON.stringify(project)}, 'Without using any tools, reply with the single word: ready', '');
			off();
			return 'OK ' + JSON.stringify(events.map((e) => e.type === 'text' ? {t: e.text.slice(0, 60)} : e.type === 'done' ? {done: e.ok, note: e.note, session: Boolean(e.session)} : e));
		} catch (e) { return 'FAILED ' + e.message; }
	})()`);
	console.log(result);
	app.quit();
};

void app.whenReady().then(() => {
	protocol.handle('media', (request) => {
		try {
			const url = new URL(request.url);
			// media://app/…            the app's own page and scripts
			// media://app/_motion/…    Motion Studio's public folder (fonts, sounds, linked project media)
			// media://workspace/…      the workspace (library, projects)
			let path = decodeURIComponent(url.pathname).replace(/^\/+/, '');
			let root = workspaceDir();
			if (url.hostname === 'app') {
				const motion = path.startsWith('_motion/');
				root = motion ? join(motionDir(), 'public') : join(__dirname, '..', 'renderer');
				path = motion ? path.slice('_motion/'.length) : path || 'index.html';
			}
			const file = safeJoin(root, path);
			return net.fetch(pathToFileURL(file).toString(), {headers: request.headers});
		} catch {
			return new Response('not found', {status: 404});
		}
	});
	session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
		callback({responseHeaders: {...details.responseHeaders,
			'Content-Security-Policy': ["default-src 'self'; img-src 'self' media: data: https://upload.wikimedia.org https://thumb.wikimedia.org; media-src media: data: blob:; font-src 'self' media:; style-src 'self' 'unsafe-inline'; script-src 'self' 'wasm-unsafe-eval'; connect-src media:; object-src 'none'; base-uri 'none'"]}});
	});
	registerIpc();
	const win = createWindow();
	if (shotsArg) void takeShots(win, shotsArg.slice('--shots='.length));
	const et = process.argv.find((x) => x.startsWith('--edit-test='));
	if (et) void editTest(win, et.slice('--edit-test='.length));
	const at = process.argv.find((x) => x.startsWith('--assistant-test='));
	if (at) void assistantTest(win, at.slice('--assistant-test='.length));
	const tt = process.argv.find((x) => x.startsWith('--tools-test='));
	if (tt) void toolsTest(win, tt.slice('--tools-test='.length));
	const rt = process.argv.find((x) => x.startsWith('--render-test='));
	if (rt) void renderTest(win, rt.slice('--render-test='.length));
});
app.on('window-all-closed', () => app.quit());
