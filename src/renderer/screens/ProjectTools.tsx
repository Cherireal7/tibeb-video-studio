import {useState} from 'react';
import {media} from '../App';

const clean = (e: unknown) => (e as Error).message.replace(/^Error invoking remote method '[^']+': Error: /, '');
const VOICES = [['', 'Automatic (by language)'], ['en-GB-RyanNeural', 'English · Ryan (UK)'], ['en-US-GuyNeural', 'English · Guy (US)'], ['en-US-AriaNeural', 'English · Aria (US)'],
	['am-ET-AmehaNeural', 'Amharic · Ameha'], ['am-ET-MekdesNeural', 'Amharic · Mekdes']];

const Narration = ({project, onChange}: {project: ProjectDetail; onChange: (p: ProjectDetail) => void}) => {
	const [text, setText] = useState('');
	const [name, setName] = useState('narration');
	const [provider, setProvider] = useState<'edge' | 'say'>('edge');
	const [voice, setVoice] = useState('');
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');
	const [done, setDone] = useState<NarrationResult | null>(null);
	const make = async () => {
		setBusy(true);
		setError('');
		try {
			const r = await window.tibeb.narrate({project: project.name, text, name, voice: provider === 'edge' ? voice : '', provider});
			setDone(r);
			onChange(r.project);
		} catch (e) {
			setError(clean(e));
		} finally {
			setBusy(false);
		}
	};
	const words = text.trim() ? text.trim().split(/\s+/).length : 0;
	return (
		<form className="tool" onSubmit={(e) => { e.preventDefault(); void make(); }}>
			<label className="field wide"><span>Script <em>{words} words · about {Math.round(words / 2.3)} s</em></span>
				<textarea rows={6} value={text} onChange={(e) => setText(e.target.value)}
					placeholder={'Write what the voice should say.\n\nLeave an empty line for a pause. Put a marker like {map} right before a word to note when it is spoken.'} /></label>
			<div className="bar plain">
				<label className="field"><span>Voice source</span>
					<select value={provider} onChange={(e) => setProvider(e.target.value as 'edge' | 'say')}>
						<option value="edge">Natural voices (online)</option><option value="say">This Mac’s voice (offline)</option>
					</select></label>
				{provider === 'edge' ? (
					<label className="field"><span>Voice</span><select value={voice} onChange={(e) => setVoice(e.target.value)}>{VOICES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
				) : null}
				<label className="field"><span>File name</span><input value={name} onChange={(e) => setName(e.target.value.replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 40))} /></label>
				<button className="primary" disabled={busy || !text.trim() || !name}>{busy ? 'Recording…' : 'Create narration'}</button>
			</div>
			<p className="dim small">{provider === 'edge' ? 'Natural voices send the script text to Microsoft’s speech service. Check their terms before commercial use.' : 'Made on this Mac; nothing is sent anywhere. The voice is plainer.'}</p>
			{error ? <p className="error" role="alert">{error}</p> : null}
			{done ? (
				<div className="result plain">
					<audio controls src={media(done.file) + `?t=${done.duration}`} />
					<div className="dim small">{done.duration.toFixed(1)} s · {done.word_count} words · {done.voice}
						{Object.keys(done.cues).length ? <> · markers: {Object.entries(done.cues).map(([k, v]) => `${k} ${v.toFixed(1)}s`).join(', ')}</> : null}
						<br />Saved to voice/{name}.wav with word timings in prep/{name}.narration.json</div>
				</div>
			) : null}
		</form>
	);
};

const Pictures = ({project, onChange}: {project: ProjectDetail; onChange: (p: ProjectDetail) => void}) => {
	const [q, setQ] = useState('');
	const [results, setResults] = useState<CommonsResult[] | null>(null);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');
	const [added, setAdded] = useState<Record<string, string>>({});
	const [freeOnly, setFreeOnly] = useState(true);
	const search = async () => {
		setBusy(true);
		setError('');
		try {
			setResults(await window.tibeb.commonsSearch(q));
		} catch (e) {
			setError(clean(e));
		} finally {
			setBusy(false);
		}
	};
	const add = async (r: CommonsResult) => {
		setAdded((a) => ({...a, [r.title]: 'Adding…'}));
		try {
			const res = await window.tibeb.commonsAdd(project.name, r.title);
			setAdded((a) => ({...a, [r.title]: res.notes[0] ?? 'Added'}));
			onChange(res.project);
		} catch (e) {
			setAdded((a) => ({...a, [r.title]: clean(e)}));
		}
	};
	const shown = (results ?? []).filter((r) => !freeOnly || r.free);
	return (
		<div className="tool">
			<form className="bar plain" onSubmit={(e) => { e.preventDefault(); void search(); }}>
				<label className="field grow2"><span>Search Wikimedia Commons</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cranach Luther portrait, Wartburg, old map of Germany…" /></label>
				<label className="field check"><input type="checkbox" checked={freeOnly} onChange={(e) => setFreeOnly(e.target.checked)} /><span>Free to use only</span></label>
				<button className="primary" disabled={busy || q.trim().length < 2}>{busy ? 'Searching…' : 'Search'}</button>
			</form>
			{error ? <p className="error" role="alert">{error}</p> : null}
			{results && shown.length === 0 ? <p className="dim">{results.length ? 'Only results that need attribution were found. Untick “Free to use only” to see them.' : 'Nothing found. Try other words.'}</p> : null}
			<div className="grid files">
				{shown.map((r) => (
					<div key={r.title} className="card file">
						<div className="thumb"><img loading="lazy" alt="" src={r.thumb} /></div>
						<div className="fname" title={r.title}>{r.title.replace(/^File:/, '')}</div>
						<div className={`lic${r.share_alike ? ' warn' : ''}`}>{r.license}</div>
						<div className="dim small pad" title={r.author}>{r.author}</div>
						<button className="small pad" disabled={Boolean(added[r.title])} onClick={() => void add(r)}>{added[r.title] ?? 'Add to project'}</button>
					</div>
				))}
			</div>
			{results ? <p className="dim small">Licence, author and source are saved with each picture and listed in the project’s CREDITS.md.</p> : null}
		</div>
	);
};

const Depth = ({project, onChange}: {project: ProjectDetail; onChange: (p: ProjectDetail) => void}) => {
	const pictures = project.files.filter((f) => f.kind === 'image' && !f.file.startsWith('stills/layers/') && !f.file.startsWith('stills/plates/') && /\.(jpe?g|png|webp|heic|tiff?)$/i.test(f.file));
	const [file, setFile] = useState(pictures[0]?.file ?? '');
	const [round, setRound] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');
	const [done, setDone] = useState<{subject: string; background: string; found: string[]} | null>(null);
	const cut = async () => {
		setBusy(true);
		setError('');
		setDone(null);
		try {
			const r = await window.tibeb.cutout(project.name, file, round);
			setDone(r);
			onChange(r.project);
		} catch (e) {
			setError(clean(e));
		} finally {
			setBusy(false);
		}
	};
	if (!pictures.length) return <div className="tool"><p className="dim">Add a picture to the project first (drop it on the project, or use “Find real pictures”).</p></div>;
	const url = (rel: string) => media(`projects/${project.name}/${rel}`) + `?t=${Date.now()}`;
	return (
		<form className="tool" onSubmit={(e) => { e.preventDefault(); void cut(); }}>
			<div className="bar plain">
				<label className="field grow2"><span>Picture</span><select value={file} onChange={(e) => setFile(e.target.value)}>{pictures.map((f) => <option key={f.file} value={f.file}>{f.file}</option>)}</select></label>
				<label className="field check"><input type="checkbox" checked={round} onChange={(e) => setRound(e.target.checked)} /><span>Round fisheye picture</span></label>
				<button className="primary" disabled={busy || !file}>{busy ? 'Cutting out…' : 'Cut out the subject'}</button>
			</div>
			<p className="dim small">Splits the picture into its subject and a background with the subject painted out, so the two can move against each other and the picture gets depth. Done on this Mac; nothing is sent anywhere.</p>
			{error ? <p className="error" role="alert">{error}</p> : null}
			{done ? (
				<div className="result plain layers">
					<figure><div className="thumb checker"><img alt="The subject, cut out" src={url(done.subject)} /></div><figcaption className="dim small">{done.subject}</figcaption></figure>
					<figure><div className="thumb"><img alt="The background with the subject painted out" src={url(done.background)} /></div><figcaption className="dim small">{done.background}</figcaption></figure>
					<div className="dim small">{done.found.length ? `Found ${done.found.length} subject${done.found.length > 1 ? 's' : ''}.` : ''} Both files keep the picture’s credit. In a DeskStory photo scene, the background is the picture and the subject is its front layer.</div>
				</div>
			) : null}
		</form>
	);
};

/** Things you make inside a project: a narration from a script, real pictures with their licence, depth layers for a picture. */
export const Tools = ({project, onChange}: {project: ProjectDetail; onChange: (p: ProjectDetail) => void}) => {
	const [open, setOpen] = useState<'' | 'voice' | 'pictures' | 'depth'>('');
	return (
		<div className="tools">
			<div className="row">
				<button aria-expanded={open === 'voice'} onClick={() => setOpen(open === 'voice' ? '' : 'voice')}>Narration from a script</button>
				<button aria-expanded={open === 'pictures'} onClick={() => setOpen(open === 'pictures' ? '' : 'pictures')}>Find real pictures</button>
				<button aria-expanded={open === 'depth'} onClick={() => setOpen(open === 'depth' ? '' : 'depth')}>Give a picture depth</button>
			</div>
			{open === 'voice' ? <Narration project={project} onChange={onChange} /> : null}
			{open === 'pictures' ? <Pictures project={project} onChange={onChange} /> : null}
			{open === 'depth' ? <Depth project={project} onChange={onChange} /> : null}
		</div>
	);
};
