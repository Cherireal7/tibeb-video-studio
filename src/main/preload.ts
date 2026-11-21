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
	doctor: () => call('setup:doctor'),
	setEditor: (editor: string) => call('setup:setEditor', editor),
	startSession: () => call('session:start'),
});
