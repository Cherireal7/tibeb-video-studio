import {useEffect, useState} from 'react';
import {go, media} from '../App';

const clean = (e: unknown) => (e as Error).message.replace(/^Error invoking remote method '[^']+': Error: /, '');

/** Before posting: check each export (shape, resolution, loudness) and grab the credits text. */
export const Deliver = ({initial}: {initial: string}) => {
	const [projects, setProjects] = useState<ProjectSummary[]>([]);
	const [name, setName] = useState(initial);
	const [p, setP] = useState<ProjectDetail | null>(null);
	const [credits, setCredits] = useState('');
	const [results, setResults] = useState<Record<string, Delivery | string>>({});
	const [copied, setCopied] = useState(false);
	useEffect(() => {
		void window.tibeb.projects().then((list) => { setProjects(list); if (!name && list[0]) setName(list[0].name); });
	}, []);
	useEffect(() => {
		if (!name) return;
		setResults({});
		void window.tibeb.project(name).then(setP);
		void window.tibeb.credits(name).then(setCredits);
	}, [name]);
	const check = async (file: string) => {
		setResults((r) => ({...r, [file]: 'Checking…'}));
		try {
			const d = await window.tibeb.deliveryCheck(name, file);
			setResults((r) => ({...r, [file]: d}));
		} catch (e) {
			setResults((r) => ({...r, [file]: clean(e)}));
		}
	};
	const exportsList = (p?.files ?? []).filter((f) => f.kind === 'export' && /\.(mp4|mov|m4v)$/i.test(f.file));
	const lines = credits.split('\n').filter((l) => l.startsWith('| `')).map((l) => l.split('|').map((c) => c.trim().replace(/`/g, '')));
	const description = ['Edit by Cheri', ...(lines.length ? ['', 'Credits:', ...lines.map((c) => `${c[1].split('/').pop()}: ${[c[3], c[2], c[4]].filter(Boolean).join(', ')}`)] : [])].join('\n');
	return (
		<section>
			<div className="head">
				<div className="row"><h1>Deliver</h1><select aria-label="Project" value={name} onChange={(e) => { setName(e.target.value); go(`deliver/${e.target.value}`); }}>{projects.map((x) => <option key={x.name}>{x.name}</option>)}</select></div>
				{name ? <button onClick={() => void window.tibeb.reveal(name, 'exports')}>Open exports folder</button> : null}
			</div>
			{!p ? <p className="dim">Loading…</p> : exportsList.length === 0 ? <p className="empty">No exports in this project yet. Export from Edit or render from Create.</p> : (
				<div className="deliver">
					{exportsList.map((f) => {
						const r = results[f.file];
						return (
							<div key={f.file} className="card dcard">
								<video controls preload="metadata" src={media(`projects/${name}/${f.file}`)} />
								<div className="dbody">
									<strong>{f.file.split('/').pop()}</strong>
									<span className="dim small">{[f.width && f.height ? `${f.width}×${f.height}` : '', f.duration ? `${Math.round(f.duration)} s` : '', `${(f.bytes / 1e6).toFixed(1)} MB`].filter(Boolean).join(' · ')}</span>
									{typeof r === 'object' ? (
										<>
											<span className={r.ready ? 'ready' : 'notready'}>{r.ready ? 'Ready to post' : 'Needs attention'}</span>
											<ul className="checks mini">{r.checks.map((c) => (
												<li key={c.check} className={c.ok ? 'ok' : 'bad'}><span className="mark" aria-hidden="true">{c.ok ? '✓' : '!'}</span><span className="what">{c.check}</span><span className="dim">{c.detail}</span>{!c.ok && c.fix ? <span className="fix">{c.fix}</span> : null}</li>
											))}</ul>
										</>
									) : <span className="dim small">{r ?? 'Not checked yet'}</span>}
									<button className="small" disabled={r === 'Checking…'} onClick={() => void check(f.file)}>{typeof r === 'object' ? 'Check again' : 'Check'}</button>
								</div>
							</div>
						);
					})}
				</div>
			)}
			{p ? (
				<>
					<h2>Text for the post</h2>
					<div className="tool"><pre className="desc">{description}</pre>
						<button className="small" onClick={() => { void navigator.clipboard.writeText(description); setCopied(true); window.setTimeout(() => setCopied(false), 1200); }}>{copied ? 'Copied' : 'Copy'}</button>
						<p className="dim small">{lines.length ? 'Credits come from the project’s CREDITS.md. Share-alike or attribution licences must be credited where you post.' : 'No third-party material is recorded for this project.'}</p></div>
				</>
			) : null}
		</section>
	);
};
