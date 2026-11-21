import {BrowserWindow, app, ipcMain, net, protocol, session, shell} from 'electron';
import {spawn} from 'node:child_process';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {engine} from './engine';
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
		width: 1440, height: 920, minWidth: 980, minHeight: 640, backgroundColor: '#131217', title: 'Tibeb', show: !shotsArg,
		titleBarStyle: 'hiddenInset',
		webPreferences: {preload: join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, nodeIntegration: false},
	});
	// Nothing in the app navigates away or opens windows; links go to the system browser.
	win.webContents.setWindowOpenHandler(({url}) => {
		if (url.startsWith('https://')) void shell.openExternal(url);
		return {action: 'deny'};
	});
	win.webContents.on('will-navigate', (e) => e.preventDefault());
	void win.loadFile(join(__dirname, '..', 'renderer', 'index.html'));
	return win;
};

/** `electron . --shots=<dir>`: save a picture of each screen and quit (used to check the UI). */
const takeShots = async (win: BrowserWindow, dir: string) => {
	mkdirSync(dir, {recursive: true});
	const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
	await wait(1500);
	const first = listProjects()[0]?.name ?? '';
	for (const [name, hash] of [['projects', '#projects'], ['project', `#project/${encodeURIComponent(first)}`], ['library', '#library'], ['setup', '#setup']]) {
		await win.webContents.executeJavaScript(`location.hash = ${JSON.stringify(hash)}`);
		await wait(name === 'setup' ? 5000 : 2200);
		writeFileSync(join(dir, `${name}.png`), (await win.webContents.capturePage()).toPNG());
	}
	app.quit();
};

void app.whenReady().then(() => {
	protocol.handle('media', (request) => {
		try {
			const url = new URL(request.url);
			const file = safeJoin(workspaceDir(), decodeURIComponent(url.pathname).replace(/^\/+/, ''));
			return net.fetch(pathToFileURL(file).toString(), {headers: request.headers});
		} catch {
			return new Response('not found', {status: 404});
		}
	});
	session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
		callback({responseHeaders: {...details.responseHeaders,
			'Content-Security-Policy': ["default-src 'self'; img-src 'self' media: data:; media-src media:; font-src 'self' media:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'"]}});
	});
	registerIpc();
	const win = createWindow();
	if (shotsArg) void takeShots(win, shotsArg.slice('--shots='.length));
});
app.on('window-all-closed', () => app.quit());
