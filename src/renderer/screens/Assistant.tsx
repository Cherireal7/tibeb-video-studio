import {useEffect, useRef, useState} from 'react';
import {go} from '../App';

type Line = {who: 'you' | 'claude' | 'tool' | 'note'; text: string};
const IDEAS = ['What is in this project and what is missing?', 'Suggest three ways to open this video.', 'Find two free pictures that fit and add them.', 'Write a 30-second script from the brief.'];
const clean = (e: unknown) => (e as Error).message.replace(/^Error invoking remote method '[^']+': Error: /, '');

/** A conversation with Claude Code about one project, using the studio's tools. */
export const Assistant = ({initial}: {initial: string}) => {
	const [projects, setProjects] = useState<ProjectSummary[]>([]);
	const [project, setProject] = useState(initial);
	const [lines, setLines] = useState<Line[]>([]);
	const [text, setText] = useState('');
	const [busy, setBusy] = useState(false);
	const session = useRef('');
	const end = useRef<HTMLDivElement>(null);
	useEffect(() => {
		void window.tibeb.projects().then((p) => { setProjects(p); if (!project && p[0]) setProject(p[0].name); });
		return window.tibeb.onAssistant((e) => {
			if (e.type === 'text') setLines((l) => [...l, {who: 'claude', text: e.text}]);
			if (e.type === 'tool') setLines((l) => (l[l.length - 1]?.who === 'tool' ? [...l.slice(0, -1), {who: 'tool', text: `${l[l.length - 1].text}, ${e.name}`}] : [...l, {who: 'tool', text: e.name}]));
			if (e.type === 'done') {
				session.current = e.session;
				if (e.note) setLines((l) => [...l, {who: 'note', text: e.note}]);
				setBusy(false);
			}
		});
	}, []);
	useEffect(() => end.current?.scrollIntoView({block: 'end'}), [lines]);
	const send = async (prompt: string) => {
		if (!prompt.trim() || busy || !project) return;
		setLines((l) => [...l, {who: 'you', text: prompt.trim()}]);
		setText('');
		setBusy(true);
		try {
			await window.tibeb.ask(project, prompt.trim(), session.current);
		} catch (e) {
			setLines((l) => [...l, {who: 'note', text: clean(e)}]);
			setBusy(false);
		}
	};
	const reset = () => {
		void window.tibeb.stopAssistant();
		session.current = '';
		setLines([]);
		setBusy(false);
	};
	return (
		<section className="assistant">
			<div className="head">
				<div className="row"><h1>Assistant</h1>
					<select aria-label="Project" value={project} onChange={(e) => { setProject(e.target.value); go(`assistant/${e.target.value}`); reset(); }}>{projects.map((p) => <option key={p.name}>{p.name}</option>)}</select></div>
				<button onClick={reset}>New conversation</button>
			</div>
			<div className="chat" aria-live="polite">
				{lines.length === 0 ? (
					<div className="intro">
						<p className="dim">Ask Claude to work on this project. It uses your Claude Code sign-in, reads the project’s brief and files, and can use the studio’s tools (pictures, narration, captions, kits, hand-off). It cannot run shell commands from here.</p>
						<div className="chips">{IDEAS.map((i) => <button key={i} className="chip" onClick={() => void send(i)}>{i}</button>)}</div>
					</div>
				) : lines.map((l, i) => <div key={i} className={`msg ${l.who}`}>{l.who === 'tool' ? `Used: ${l.text}` : l.text}</div>)}
				{busy ? <div className="msg note">Working…</div> : null}
				<div ref={end} />
			</div>
			<form className="ask" onSubmit={(e) => { e.preventDefault(); void send(text); }}>
				<textarea aria-label="Message" rows={2} value={text} placeholder="Ask for something specific: “caption the clip in footage”, “make a kit with a soft click and calm music”…"
					onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(text); } }} />
				{busy ? <button type="button" onClick={() => void window.tibeb.stopAssistant()}>Stop</button> : <button className="primary" disabled={!text.trim() || !project}>Send</button>}
			</form>
		</section>
	);
};
