import {useEffect, useRef, useState} from 'react';
import {go} from '../App';

type Line = {who: 'you' | 'claude' | 'tool' | 'note'; text: string};
const IDEAS = ['What is in this project and what is missing?', 'Suggest three ways to open this video.', 'Find two free pictures that fit and add them.', 'Write a 30-second script from the brief.'];
const clean = (e: unknown) => (e as Error).message.replace(/^Error invoking remote method '[^']+': Error: /, '');

/** The conversation itself. `context` adds the editor's state to each request; `before` runs first (e.g. save). */
export const Chat = ({project, ideas = IDEAS, context, before, compact}: {project: string; ideas?: string[]; context?: () => string; before?: () => Promise<void>; compact?: boolean}) => {
	const [lines, setLines] = useState<Line[]>([]);
	const [text, setText] = useState('');
	const [busy, setBusy] = useState(false);
	const session = useRef('');
	const end = useRef<HTMLDivElement>(null);
	useEffect(() => window.tibeb.onAssistant((e) => {
		if (e.type === 'text') setLines((l) => [...l, {who: 'claude', text: e.text}]);
		if (e.type === 'tool') setLines((l) => (l[l.length - 1]?.who === 'tool' ? [...l.slice(0, -1), {who: 'tool', text: `${l[l.length - 1].text}, ${e.name}`}] : [...l, {who: 'tool', text: e.name}]));
		if (e.type === 'done') {
			session.current = e.session;
			if (e.note) setLines((l) => [...l, {who: 'note', text: e.note}]);
			setBusy(false);
		}
	}), []);
	useEffect(() => {
		void window.tibeb.stopAssistant();
		session.current = '';
		setLines([]);
		setBusy(false);
	}, [project]);
	useEffect(() => {
		void end.current?.scrollIntoView({block: 'end'}); // newer browsers return a promise here; an effect must not return it
	}, [lines]);
	const send = async (prompt: string) => {
		if (!prompt.trim() || busy || !project) return;
		setLines((l) => [...l, {who: 'you', text: prompt.trim()}]);
		setText('');
		setBusy(true);
		try {
			await before?.();
			await window.tibeb.ask(project, prompt.trim(), session.current, context?.());
		} catch (e) {
			setLines((l) => [...l, {who: 'note', text: clean(e)}]);
			setBusy(false);
		}
	};
	return (
		<div className={`chatbox${compact ? ' compact' : ''}`}>
			<div className="chat" aria-live="polite">
				{lines.length === 0 ? (
					<div className="intro">
						<p className="dim">{compact ? 'Ask Claude to change this timeline or the project. Changes appear here at once and can be undone.' : 'Ask Claude to work on this project. It uses your Claude Code sign-in, reads the project’s brief and files, and can use the studio’s tools (pictures, narration, captions, kits, hand-off). It cannot run shell commands from here.'}</p>
						<div className="chips">{ideas.map((i) => <button key={i} className="chip" onClick={() => void send(i)}>{i}</button>)}</div>
					</div>
				) : lines.map((l, i) => <div key={i} className={`msg ${l.who}`}>{l.who === 'tool' ? `Used: ${l.text}` : l.text}</div>)}
				{busy ? <div className="msg note">Working…</div> : null}
				<div ref={end} />
			</div>
			<form className="ask" onSubmit={(e) => { e.preventDefault(); void send(text); }}>
				<textarea aria-label="Message" rows={2} value={text} placeholder={compact ? '“Make the title bigger and move it up”, “cut the pictures on the beat”…' : 'Ask for something specific: “caption the clip in footage”, “make a kit with a soft click and calm music”…'}
					onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(text); } }} />
				{busy ? <button type="button" onClick={() => void window.tibeb.stopAssistant()}>Stop</button> : <button className="primary" disabled={!text.trim() || !project}>Send</button>}
			</form>
		</div>
	);
};

/** A conversation with Claude Code about one project, using the studio's tools. */
export const Assistant = ({initial}: {initial: string}) => {
	const [projects, setProjects] = useState<ProjectSummary[]>([]);
	const [project, setProject] = useState(initial);
	const [round, setRound] = useState(0);
	useEffect(() => {
		void window.tibeb.projects().then((p) => { setProjects(p); if (!project && p[0]) setProject(p[0].name); });
	}, []);
	return (
		<section className="assistant">
			<div className="head">
				<div className="row"><h1>Assistant</h1>
					<select aria-label="Project" value={project} onChange={(e) => { setProject(e.target.value); go(`assistant/${e.target.value}`); }}>{projects.map((p) => <option key={p.name}>{p.name}</option>)}</select></div>
				<button onClick={() => { void window.tibeb.stopAssistant(); setRound(round + 1); }}>New conversation</button>
			</div>
			<Chat key={round} project={project} />
		</section>
	);
};
