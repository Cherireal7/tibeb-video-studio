import {contextBridge, ipcRenderer, webUtils} from 'electron';

// The only bridge between the page and the system: a fixed list of calls, nothing generic.
const call = (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args);
contextBridge.exposeInMainWorld('tibeb', {
	projects: () => call('projects:list'),
	project: (name: string) => call('projects:get', name),
	createProject: (name: string) => call('projects:create', name),
	intake: (name: string) => call('projects:intake', name),
	dropFiles: (name: string, files: File[]) => call('projects:drop', name, files.map((f) => webUtils.getPathForFile(f)).filter(Boolean)),
	reveal: (name: string, sub: string) => call('projects:reveal', name, sub),
	library: () => call('library:get'),
	addToKit: (name: string, file: string) => call('library:addToKit', name, file),
	narrate: (req: unknown) => call('voice:narrate', req),
	commonsSearch: (query: string) => call('commons:search', query),
	commonsAdd: (name: string, title: string) => call('commons:add', name, title),
	cutout: (name: string, file: string, fillBlack: boolean) => call('picture:cutout', name, file, fillBlack),
	balance: (project: string, src: string, time: number) => call('media:balance', project, src, time),
	peaks: (project: string, src: string, beats: boolean) => call('media:peaks', project, src, beats),
	narrations: (project: string) => call('edit:narrations', project),
	loadEdit: (project: string) => call('edit:load', project),
	saveEdit: (project: string, doc: unknown) => call('edit:save', project, doc),
	capcutCreate: (project: string, format: string) => call('capcut:create', project, format),
	capcutPull: (project: string, apply: boolean) => call('capcut:pull', project, apply),
	handoff: (project: string, format: string) => call('edit:handoff', project, format),
	exportEdit: (project: string, format: string, name: string) => call('edit:export', project, format, name),
	obsStatus: () => call('obs:status'),
	obsScenes: () => call('obs:scenes'),
	obsStart: (scene: string) => call('obs:start', scene),
	obsStop: (project: string) => call('obs:stop', project),
	deliveryCheck: (project: string, file: string) => call('deliver:check', project, file),
	credits: (project: string) => call('deliver:credits', project),
	ask: (project: string, prompt: string, session: string, extra?: string) => call('assistant:ask', project, prompt, session, extra),
	watchEdit: (project: string) => call('edit:watch', project),
	onEditExternal: (cb: (project: string) => void) => {
		const fn = (_e: unknown, p: string) => cb(p);
		ipcRenderer.on('edit:external', fn);
		return () => ipcRenderer.removeListener('edit:external', fn);
	},
	stopAssistant: () => call('assistant:stop'),
	onAssistant: (cb: (e: unknown) => void) => {
		const fn = (_e: unknown, ev: unknown) => cb(ev);
		ipcRenderer.on('assistant:event', fn);
		return () => ipcRenderer.removeListener('assistant:event', fn);
	},
	agents: () => call('agents:status'),
	make: (req: unknown) => call('make:run', req),
	stopMake: () => call('make:stop'),
	onMake: (cb: (e: unknown) => void) => {
		const fn = (_e: unknown, ev: unknown) => cb(ev);
		ipcRenderer.on('make:event', fn);
		return () => ipcRenderer.removeListener('make:event', fn);
	},
	presets: () => call('kit:presets'),
	guides: () => call('kit:guides'),
	guide: (id: string) => call('kit:guide', id),
	templates: () => call('create:templates'),
	render: (req: unknown) => call('create:render', req),
	onRenderProgress: (cb: (p: {percent: number; line: string}) => void) => {
		const fn = (_e: unknown, p: {percent: number; line: string}) => cb(p);
		ipcRenderer.on('create:progress', fn);
		return () => ipcRenderer.removeListener('create:progress', fn);
	},
	doctor: () => call('setup:doctor'),
	setEditor: (editor: string) => call('setup:setEditor', editor),
	startSession: () => call('session:start'),
});
