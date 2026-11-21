import {useEffect, useState} from 'react';
import {go, media} from '../App';

const GRADS = ['#e86a92,#3b1f2b', '#e31e24,#5a0c10', '#ff7a59,#8e0d12', '#16a34a,#0f2e1d', '#7c5cff,#1e1b2e', '#33cdb4,#0f2e2a', '#f5c451,#5b430f'];
const grad = (name: string) => GRADS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % GRADS.length];

export const Projects = () => {
	const [list, setList] = useState<ProjectSummary[] | null>(null);
	const [adding, setAdding] = useState(false);
	const [name, setName] = useState('');
	const [error, setError] = useState('');
	const [busy, setBusy] = useState(false);
	useEffect(() => {
		window.tibeb.projects().then(setList).catch((e: Error) => setError(e.message));
	}, []);
	const create = async () => {
		setBusy(true);
		setError('');
		try {
			const p = await window.tibeb.createProject(name.trim());
			go(`project/${p.name}`);
		} catch (e) {
			setError((e as Error).message.replace(/^Error invoking remote method '[^']+': Error: /, ''));
		} finally {
			setBusy(false);
		}
	};
	return (
		<section>
			<div className="head">
				<h1>Projects</h1>
				<button className="primary" onClick={() => setAdding(true)}>New video</button>
			</div>
			{adding ? (
				<form className="newproj" onSubmit={(e) => { e.preventDefault(); void create(); }}>
					<label htmlFor="pname">Name of the video</label>
					<input id="pname" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Nail Art Promo" maxLength={60} />
					<button className="primary" disabled={busy || !name.trim()}>{busy ? 'Creating…' : 'Create'}</button>
					<button type="button" onClick={() => { setAdding(false); setError(''); }}>Cancel</button>
				</form>
			) : null}
			{error ? <p className="error" role="alert">{error}</p> : null}
			{list === null ? <p className="dim">Loading…</p> : list.length === 0 ? (
				<p className="empty">No projects yet. “New video” creates a folder with an inbox to drop your footage, photos and maps into.</p>
			) : (
				<div className="grid projects">
					{list.map((p) => {
						const total = Object.values(p.counts).reduce((a, b) => a + b, 0);
						return (
							<button key={p.name} className="card project" onClick={() => go(`project/${p.name}`)}>
								<div className="cover" style={{backgroundImage: p.cover ? `linear-gradient(#0000 40%, #000c), url("${media(p.cover)}")` : `linear-gradient(135deg, ${grad(p.name)})`}}>
									<span className="pname">{p.name}</span>
								</div>
								<div className="meta">
									<span className={`stage s-${p.stage.split(' ')[0].toLowerCase()}`}>{p.stage}</span>
									<span className="dim">{total} file{total === 1 ? '' : 's'}{p.inbox ? ` · ${p.inbox} in inbox` : ''}</span>
									{p.goal ? <span className="goal">{p.goal}</span> : null}
								</div>
							</button>
						);
					})}
				</div>
			)}
		</section>
	);
};
