import {useEffect, useState} from 'react';

const EDITORS = [['resolve', 'DaVinci Resolve', 'Live control through the bridge'], ['capcut', 'CapCut', 'Files are handed over as a kit'], ['none', 'No editor', 'Files only']];

export const Setup = () => {
	const [d, setD] = useState<Doctor | null>(null);
	const [error, setError] = useState('');
	const [agents, setAgents] = useState<AgentStatus[]>([]);
	const [credit, setCredit] = useState('');
	const load = () => {
		void window.tibeb.agents().then((a) => { setAgents(a.agents); setCredit(a.credit); });
		setError('');
		window.tibeb.doctor().then(setD).catch((e: Error) => setError(e.message));
	};
	useEffect(load, []);
	const choose = async (editor: string) => {
		await window.tibeb.setEditor(editor);
		setD(null);
		load();
	};
	return (
		<section>
			<div className="head"><h1>Setup</h1><button onClick={() => { setD(null); load(); }}>Check again</button></div>
			{error ? <p className="error" role="alert">{error}</p> : null}
			{!d && !error ? <p className="dim">Checking your setup…</p> : null}
			{d ? (
				<>
					<p className={d.ready ? 'ready' : 'notready'}>{d.ready ? 'Everything needed is in place.' : 'Some things need fixing before everything works.'}</p>
					<h2>Editor</h2>
					<div className="editors">
						{EDITORS.map(([id, label, hint]) => (
							<button key={id} className="card editor" aria-pressed={d.editor === id} onClick={() => void choose(id)}>
								<strong>{label}</strong><span className="dim small">{hint}</span>
							</button>
						))}
					</div>
					<h2>AI agents</h2>
					<ul className="checks">
						{agents.map((a) => (
							<li key={a.id} className={a.installed && a.signedIn ? 'ok' : 'bad'}>
								<span className="mark" aria-hidden="true">{a.installed && a.signedIn ? '✓' : '!'}</span>
								<span className="what">{a.label}</span>
								<span className="dim">{a.detail}{a.version ? ` · ${a.version}` : ''}</span>
								{a.fix ? <span className="fix">{a.fix}</span> : null}
							</li>
						))}
					</ul>
					<p className="dim small">One signed-in agent is enough for the Make screen. End credit on new videos: {credit ? `“${credit}”` : 'none'} (change with a line <code>credit=Your text</code> in ~/.config/studio/config; leave it empty for none).</p>
					<h2>Checks</h2>
					<ul className="checks">
						{d.checks.map((c) => (
							<li key={c.check} className={c.ok ? 'ok' : 'bad'}>
								<span className="mark" aria-hidden="true">{c.ok ? '✓' : '!'}</span>
								<span className="what">{c.check}</span>
								<span className="dim">{c.detail}</span>
								{!c.ok && c.fix ? <span className="fix">{c.fix}</span> : null}
							</li>
						))}
					</ul>
					<p className="dim small">Workspace: {d.workspace}</p>
				</>
			) : null}
		</section>
	);
};
