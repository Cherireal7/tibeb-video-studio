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
	balance: (project: string, src: string, time: number) => call('media:balance', project, src, time),
	peaks: (project: string, src: string, beats: boolean) => call('media:peaks', project, src, beats),
	loadEdit: (project: string) => call('edit:load', project),
	saveEdit: (project: string, doc: unknown) => call('edit:save', project, doc),
	exportEdit: (project: string, format: string, name: string) => call('edit:export', project, format, name),
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
