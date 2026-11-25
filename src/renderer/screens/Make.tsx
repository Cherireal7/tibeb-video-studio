import {useEffect, useRef, useState} from 'react';
import {go, media} from '../App';

type Line = {who: 'you' | 'agent' | 'step' | 'note'; text: string};
const clean = (e: unknown) => (e as Error).message.replace(/^Error invoking remote method '[^']+': Error: /, '');
const KEY = 'tibeb.make.agent';

/** Prompt a video: choose an agent, a project and a starting prompt; watch it work; get the file. */
export const Make = ({initial}: {initial: string}) => {
	const [agents, setAgents] = useState<AgentStatus[]>([]);
	const [agent, setAgent] = useState<'claude' | 'codex'>((localStorage.getItem(KEY) as 'claude' | 'codex') || 'claude');
	const [projects, setProjects] = useState<ProjectSummary[]>([]);
	const [project, setProject] = useState(initial);
	const [newName, setNewName] = useState('');
	const [presets, setPresets] = useState<Preset[]>([]);
	const [preset, setPreset] = useState('');
	const [text, setText] = useState('');
	const [lines, setLines] = useState<Line[]>([]);
	const [busy, setBusy] = useState(false);
	const [video, setVideo] = useState('');
	const [error, setError] = useState('');
	const [started, setStarted] = useState(0);
	const [now, setNow] = useState(0);
	const session = useRef('');
	const end = useRef<HTMLDivElement>(null);

	const loadProjects = () => window.tibeb.projects().then((p) => { setProjects(p); return p; });
	useEffect(() => {
		void window.tibeb.agents().then((a) => {
			setAgents(a.agents);
			const ready = a.agents.filter((x) => x.installed && x.signedIn).map((x) => x.id);
			if (ready.length && !ready.includes(agent)) setAgent(ready[0]);
		});
		void window.tibeb.presets().then(setPresets);
		void loadProjects().then((p) => { if (!project && p[0]) setProject(p[0].name); });
	}, []);
	useEffect(() => window.tibeb.onMake((e) => {
		if (e.type === 'text') setLines((l) => [...l, {who: 'agent', text: e.text}]);
		if (e.type === 'step') setLines((l) => [...l, {who: 'step', text: e.text}]);
		if (e.type === 'done') {
			session.current = e.session;
			if (e.note) setLines((l) => [...l, {who: 'note', text: e.note}]);
			if (e.video) setVideo(`${e.video}?t=${Date.now()}`);
			setBusy(false);
			void loadProjects();
		}
	}), []);
	useEffect(() => {
		void end.current?.scrollIntoView({block: 'end'});
	}, [lines]);
	useEffect(() => {
		if (!busy) return;
		const t = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(t);
	}, [busy]);

	const current = agents.find((a) => a.id === agent);
	const ready = Boolean(current?.installed && current.signedIn);
	const pick = (p: Preset) => {
		setPreset(p.id);
		setText(p.prompt);
	};
	const createProject = async () => {
		setError('');
		try {
			const made = await window.tibeb.createProject(newName.trim());
			await loadProjects();
			setProject(made.name);
			setNewName('');
		} catch (e) {
			setError(clean(e));
		}
	};
	const send = async (followUp = false) => {
		if (!text.trim() || busy || !project || !ready) return;
		setError('');
		if (!followUp) { session.current = ''; setLines([]); setVideo(''); }
		setLines((l) => [...l, {who: 'you', text: text.trim()}]);
		setBusy(true);
		setStarted(Date.now());
		setNow(Date.now());
		const prompt = text.trim();
		if (followUp) setText('');
		try {
			await window.tibeb.make({agent, project, prompt, session: followUp && agent === 'claude' ? session.current : ''});
		} catch (e) {
			setLines((l) => [...l, {who: 'note', text: clean(e)}]);
			setBusy(false);
		}
	};
	const minutes = Math.max(0, Math.floor((now - started) / 60000));
	const seconds = Math.max(0, Math.floor((now - started) / 1000) % 60);
	const file = video.split('?')[0];
	const ran = lines.length > 0;

	return (
		<section className="make">
			<div className="head"><h1>Make a video</h1><button onClick={() => go('guides')}>Guides and prompts</button></div>
			<div className="makegrid">
				<div className="makeleft">
					<h2>1 · Who makes it</h2>
					<div className="agents">
						{agents.map((a) => (
							<button key={a.id} className="card agent" aria-pressed={agent === a.id} disabled={busy} onClick={() => { setAgent(a.id); localStorage.setItem(KEY, a.id); }}>
								<strong>{a.label}</strong>
								<span className={a.installed && a.signedIn ? 'ok small' : 'bad small'}>{a.installed && a.signedIn ? 'Ready' : a.detail}</span>
								{a.fix ? <span className="dim small">{a.fix}</span> : <span className="dim small">{a.version}</span>}
							</button>
						))}
					</div>
					<h2>2 · Which project</h2>
					<div className="row">
						<select aria-label="Project" value={project} disabled={busy} onChange={(e) => setProject(e.target.value)}>
							{projects.length === 0 ? <option value="">No projects yet</option> : null}
							{projects.map((p) => <option key={p.name}>{p.name}</option>)}
						</select>
						<input aria-label="New project name" placeholder="or a new project name" value={newName} disabled={busy} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void createProject(); }} />
						<button disabled={!newName.trim() || busy} onClick={() => void createProject()}>Create</button>
					</div>
					{project ? <p className="dim small">Put pictures, logos, clips and notes in the project first (Projects → {project} → drop files). The agent uses what is there.</p> : null}
					<h2>3 · What to make</h2>
					<div className="chips presets">{presets.map((p) => <button key={p.id} className="chip" aria-selected={preset === p.id} title={p.summary} disabled={busy} onClick={() => pick(p)}>{p.title}</button>)}</div>
					{presets.find((p) => p.id === preset)?.needs ? <p className="dim small">Needs: {presets.find((p) => p.id === preset)?.needs}</p> : null}
					<textarea aria-label="Prompt" className="prompt" rows={ran ? 4 : 11} value={text} disabled={busy}
						placeholder={ran ? 'Notes for the next version: “the title comes in late”, “swap the second picture”…' : 'Describe the video, or pick a starting point above and fill in the [brackets].'}
						onChange={(e) => setText(e.target.value)} />
					{error ? <p className="error" role="alert">{error}</p> : null}
					<div className="row">
						{busy ? <button onClick={() => void window.tibeb.stopMake()}>Stop</button>
							: <button className="primary" disabled={!text.trim() || !project || !ready} onClick={() => void send(false)}>Make the video</button>}
						{!busy && ran && agent === 'claude' && session.current ? <button disabled={!text.trim()} onClick={() => void send(true)}>Send as notes on this version</button> : null}
						{busy ? <span className="dim small" aria-live="polite">Working · {minutes}:{String(seconds).padStart(2, '0')} · a video usually takes 10 to 25 minutes</span> : null}
					</div>
					<p className="dim small">A run lets {current?.label ?? 'the agent'} read and write files in your workspace and run commands on this Mac (rendering, FFmpeg). It uses your own {agent === 'claude' ? 'Claude' : 'ChatGPT'} plan. Paid tools are switched off for these runs.</p>
				</div>
				<div className="makeright">
					{video ? (
						<div className="result">
							<video key={video} src={media(file) + '?' + video.split('?')[1]} controls playsInline />
							<div className="row">
								<button className="primary" onClick={() => go(`deliver/${project}`)}>Check before posting</button>
								<button onClick={() => void window.tibeb.reveal(project, 'exports')}>Show the file</button>
								<button onClick={() => go(`project/${project}`)}>Open the project</button>
							</div>
							<p className="dim small">{file}</p>
						</div>
					) : null}
					<div className="chat makelog" aria-live="polite">
						{lines.length === 0 ? <p className="dim">The agent’s work appears here: what it reads, what it runs and what it says. When it finishes, the video plays above.</p>
							: lines.map((l, i) => <div key={i} className={`msg ${l.who === 'agent' ? 'claude' : l.who === 'step' ? 'tool' : l.who}`}>{l.text}</div>)}
						{busy ? <div className="msg note">Working…</div> : null}
						<div ref={end} />
					</div>
				</div>
			</div>
		</section>
	);
};
