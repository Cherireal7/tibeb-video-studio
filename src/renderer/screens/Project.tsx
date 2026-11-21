import {useEffect, useState} from 'react';
import {go, media} from '../App';

const ORDER = ['video', 'image', 'map', 'voice', 'music', 'reference', 'document', 'captions', 'export'];
const TITLES: Record<string, string> = {video: 'Footage', image: 'Stills', map: 'Maps', voice: 'Voice', music: 'Music', reference: 'References', document: 'Documents', captions: 'Captions', export: 'Exports'};
const size = (b: number) => (b > 1e9 ? `${(b / 1e9).toFixed(1)} GB` : b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);
const length = (s?: number) => (s && s >= 1 ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : '');
const isImage = (f: string) => /\.(png|jpe?g|webp)$/i.test(f);

export const Project = ({name}: {name: string}) => {
	const [p, setP] = useState<ProjectDetail | null>(null);
	const [note, setNote] = useState('');
	const [over, setOver] = useState(false);
	const [busy, setBusy] = useState(false);
	useEffect(() => {
		setP(null);
		window.tibeb.project(name).then(setP).catch((e: Error) => setNote(e.message));
	}, [name]);
	const report = (r: IntakeResult) => {
		setP(r.project);
		const parts = [r.moved.length ? `${r.moved.length} sorted` : '', r.skipped?.length ? `${r.skipped.length} already there` : '', r.left.length ? `${r.left.length} of an unknown type left in the inbox` : ''].filter(Boolean);
		setNote(parts.join(' · ') || 'Nothing new in the inbox.');
	};
	const run = async (job: () => Promise<IntakeResult>) => {
		setBusy(true);
		try {
			report(await job());
		} catch (e) {
			setNote((e as Error).message);
		} finally {
			setBusy(false);
		}
	};
	if (!p) return <p className="dim">{note || 'Loading…'}</p>;
	const groups = ORDER.map((k) => [k, p.files.filter((f) => f.kind === k)] as const).filter(([, fs]) => fs.length);
	return (
		<section>
			<div className="head">
				<div><button className="link" onClick={() => go('projects')}>‹ Projects</button><h1>{p.name}</h1></div>
				<div className="row">
					<span className={`stage s-${p.stage.split(' ')[0].toLowerCase()}`}>{p.stage}</span>
					<button onClick={() => void window.tibeb.reveal(p.name, '')}>Open folder</button>
					<button onClick={() => void window.tibeb.reveal(p.name, 'brief.md')}>Edit brief</button>
				</div>
			</div>
			<div className={`drop${over ? ' over' : ''}`}
				onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
				onDrop={(e) => { e.preventDefault(); setOver(false); const files = [...e.dataTransfer.files]; if (files.length) void run(() => window.tibeb.dropFiles(p.name, files)); }}>
				<div>
					<strong>{busy ? 'Sorting…' : 'Drop footage, photos, maps, voice, music or references here'}</strong>
					<span className="dim">They are copied into the inbox, sorted into folders and indexed. Names with “map”, “ref” or “voice” go to those folders.</span>
				</div>
				<div className="row">
					<button onClick={() => void window.tibeb.reveal(p.name, 'inbox')}>Open inbox{p.inbox ? ` (${p.inbox})` : ''}</button>
					<button disabled={busy} onClick={() => void run(() => window.tibeb.intake(p.name))}>Sort inbox</button>
				</div>
			</div>
			{note ? <p className="note" role="status">{note}</p> : null}
			<div className="cols">
				<div>
					{groups.length === 0 ? <p className="empty">Nothing in this project yet.</p> : groups.map(([kind, files]) => (
						<div key={kind}>
							<h2>{TITLES[kind] ?? kind} <span className="dim">{files.length}</span></h2>
							<div className="grid files">
								{files.map((f) => (
									<div key={f.file} className="card file">
										<div className="thumb">
											{isImage(f.file) ? <img loading="lazy" alt="" src={media(`projects/${p.name}/${f.file}`)} />
												: /\.(mp4|mov|m4v|webm)$/i.test(f.file) ? <video muted preload="metadata" src={media(`projects/${p.name}/${f.file}`) + '#t=0.5'} />
												: <span className="kind">{f.file.split('.').pop()?.toUpperCase()}</span>}
										</div>
										<div className="fname" title={f.file}>{f.file.split('/').pop()}</div>
										<div className="dim small">{[length(f.duration), f.width && f.height ? `${f.width}×${f.height}` : '', size(f.bytes)].filter(Boolean).join(' · ')}</div>
									</div>
								))}
							</div>
						</div>
					))}
				</div>
				<aside className="brief">
					<h2>Brief</h2>
					<pre>{p.brief.replace(/^# .*\n+/, '').replace(/^Fill in[^\n]*\n[^\n]*\n+/m, '') || 'No brief yet.'}</pre>
					{p.prepared.length ? <p className="dim small">Prepared: {p.prepared.join(', ')}{p.hasPlan ? ' · plan page ready' : ''}</p> : null}
				</aside>
			</div>
		</section>
	);
};
