// Shapes passed between the main process and the page (kept in step with src/main/store.ts).
type ProjectFile = {file: string; kind: string; bytes: number; duration?: number; width?: number; height?: number; license?: string; author?: string; source?: string};
type CommonsResult = {title: string; source: string; license: string; author: string; thumb: string; free: boolean; share_alike: boolean; attribution: boolean; width?: number; height?: number};
type NarrationResult = {duration: number; cues: Record<string, number>; word_count: number; voice: string; note: string; file: string; project: ProjectDetail};
type ProjectSummary = {name: string; updated: string; counts: Record<string, number>; cover: string | null; goal: string; stage: string; inbox: number};
type ProjectDetail = ProjectSummary & {files: ProjectFile[]; brief: string; prepared: string[]; hasPlan: boolean};
type LibraryItem = {id: string; category: string; file: string; tags: string[]; usage: string; license?: string; seconds?: number; bpm?: number};
type JsonSchema = {type?: string | string[]; properties?: Record<string, JsonSchema>; required?: string[]; items?: JsonSchema; enum?: unknown[]; description?: string;
	minimum?: number; maximum?: number; maxLength?: number; minItems?: number; maxItems?: number; anyOf?: JsonSchema[]; oneOf?: JsonSchema[]; const?: unknown; default?: unknown};
type Template = {id: string; formats: string[]; inputs: JsonSchema | null; examples: {file: string; name: string; format: string; alpha: boolean; props: Record<string, unknown>}[]};
type DoctorCheck = {check: string; ok: boolean; detail: string; fix?: string};
type Doctor = {ready: boolean; editor: string; checks: DoctorCheck[]; workspace: string};
type IntakeResult = {moved: string[]; left: string[]; project: ProjectDetail; copied?: string[]; skipped?: string[]};

interface Window {
	tibeb: {
		projects(): Promise<ProjectSummary[]>;
		project(name: string): Promise<ProjectDetail>;
		createProject(name: string): Promise<ProjectDetail>;
		intake(name: string): Promise<IntakeResult>;
		dropFiles(name: string, files: File[]): Promise<IntakeResult>;
		reveal(name: string, sub: string): Promise<string>;
		library(): Promise<{root: string; items: LibraryItem[]}>;
		addToKit(name: string, file: string): Promise<string>;
		narrate(req: {project: string; text: string; name: string; voice: string; provider: 'edge' | 'say'}): Promise<NarrationResult>;
		commonsSearch(query: string): Promise<CommonsResult[]>;
		commonsAdd(name: string, title: string): Promise<{file: string; license: string; notes: string[]; project: ProjectDetail}>;
		balance(project: string, src: string, time: number): Promise<{balance: number[]; notes: string[]}>;
		peaks(project: string, src: string, beats: boolean): Promise<Peaks>;
		loadEdit(project: string): Promise<{doc: EditDoc; created: boolean; slug: string}>;
		saveEdit(project: string, doc: EditDoc): Promise<boolean>;
		handoff(project: string, format: string): Promise<{counts: Record<string, number>; notes: string[]; files: number}>;
		exportEdit(project: string, format: string, name: string): Promise<{file: string; config: string}>;
		templates(): Promise<Template[]>;
		render(req: {project: string; template: string; format: string; name: string; alpha: boolean; props: unknown}): Promise<{file: string; config: string}>;
		onRenderProgress(cb: (p: {percent: number; line: string}) => void): () => void;
		doctor(): Promise<Doctor>;
		setEditor(editor: string): Promise<string>;
		startSession(): Promise<boolean>;
	};
}

// Motion Studio source is imported by path alias; it is type-checked in its own repo.
declare module '@motion/*';
type Peaks = {duration: number; per_second: number; peaks: number[]; bpm?: number; beats?: number[]; downbeats?: number[]};
type EditClip = {id: string; start: number; length: number; kind: 'video' | 'image' | 'text' | 'audio'; [key: string]: unknown};
type EditTrack = {id: string; name: string; kind: 'video' | 'text' | 'audio'; muted?: boolean; duck?: {under: string; amount: number; ranges?: [number, number][]}; clips: EditClip[]};
type EditDoc = {version: 1; duration: number; background: string; credit?: string; tracks: EditTrack[]};
