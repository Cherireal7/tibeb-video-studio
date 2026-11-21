import {useEffect, useState} from 'react';

const clean = (e: unknown) => (e as Error).message.replace(/^Error invoking remote method '[^']+': Error: /, '');

/** Start and stop OBS recordings and file the result into a project. OBS itself must be open. */
export const Record = () => {
	const [status, setStatus] = useState<ObsStatus | null>(null);
	const [scenes, setScenes] = useState<string[]>([]);
	const [scene, setScene] = useState('');
	const [projects, setProjects] = useState<ProjectSummary[]>([]);
	const [project, setProject] = useState('');
	const [busy, setBusy] = useState(false);
	const [note, setNote] = useState('');
	const refresh = async () => {
		try {
			const s = await window.tibeb.obsStatus();
			setStatus(s);
			if (s.connected) {
				const sc = await window.tibeb.obsScenes();
				const names = (sc.scenes ?? []).map((x) => (typeof x === 'string' ? x : String((x as {name?: string}).name ?? '')));
				setScenes(names);
				setScene((cur) => cur || sc.current || '');
			}
		} catch (e) {
			setStatus({connected: false, message: clean(e)});
		}
	};
	useEffect(() => {
		void refresh();
		void window.tibeb.projects().then((p) => { setProjects(p); setProject(p[0]?.name ?? ''); });
		const t = window.setInterval(() => void refresh(), 4000);
		return () => window.clearInterval(t);
	}, []);
	const run = async (job: () => Promise<string>) => {
		setBusy(true);
		try {
			setNote(await job());
		} catch (e) {
			setNote(clean(e));
		} finally {
			setBusy(false);
			void refresh();
		}
	};
	const recording = Boolean(status?.recording);
	return (
		<section>
			<div className="head"><h1>Record</h1><button onClick={() => void refresh()}>Check OBS</button></div>
			{!status ? <p className="dim">Looking for OBS…</p> : !status.connected ? (
				<div className="tool"><strong className="notready">OBS is not connected</strong><p className="dim">{status.message}</p>
					<p className="dim small">Recording your screen, camera or voice goes through OBS. Open OBS and this screen connects by itself.</p></div>
			) : (
				<div className="tool">
					<div className="row between"><strong className={recording ? 'notready' : 'ready'}>{recording ? '● Recording' : 'OBS is ready'}</strong>
						<span className="dim small">{status.records_into_library === false ? 'OBS saves outside the library' : 'Saves into the library (footage/obs)'}</span></div>
					<div className="bar plain">
						<label className="field"><span>Scene</span>
							<select value={scene} disabled={recording} onChange={(e) => setScene(e.target.value)}>{scenes.length ? scenes.map((s) => <option key={s}>{s}</option>) : <option value="">Current scene</option>}</select></label>
						<label className="field"><span>Add the recording to</span>
							<select value={project} onChange={(e) => setProject(e.target.value)}><option value="">Library only</option>{projects.map((p) => <option key={p.name}>{p.name}</option>)}</select></label>
						{recording
							? <button className="primary" disabled={busy} onClick={() => void run(async () => { const r = await window.tibeb.obsStop(project); return r.file ? `Saved ${r.file.split('/').pop()}${r.seconds ? ` (${Math.round(r.seconds)} s)` : ''}${r.addedTo ? ` and added to ${r.addedTo}` : ''}.` : 'Stopped.'; })}>{busy ? 'Finishing…' : 'Stop recording'}</button>
							: <button className="primary" disabled={busy} onClick={() => void run(async () => { await window.tibeb.obsStart(scene); return 'Recording. This captures what the OBS scene shows: screen, camera, microphone.'; })}>Start recording</button>}
					</div>
					{note ? <p className="note" role="status">{note}</p> : null}
				</div>
			)}
		</section>
	);
};
