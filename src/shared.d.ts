// Shapes passed between the main process and the page (kept in step with src/main/store.ts).
type ProjectFile = {file: string; kind: string; bytes: number; duration?: number; width?: number; height?: number};
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
		templates(): Promise<Template[]>;
		render(req: {project: string; template: string; format: string; name: string; alpha: boolean; props: unknown}): Promise<{file: string; config: string}>;
		onRenderProgress(cb: (p: {percent: number; line: string}) => void): () => void;
		doctor(): Promise<Doctor>;
		setEditor(editor: string): Promise<string>;
		startSession(): Promise<boolean>;
	};
}
