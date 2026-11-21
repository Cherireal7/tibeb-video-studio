import {Timeline} from '@motion/compositions/Timeline';
import {audioClipSchema, mediaClipSchema, textClipSchema, timelineSchema} from '@motion/schemas/Timeline';
import {Player, type PlayerRef} from '@remotion/player';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {z} from 'zod';
import {go, media} from '../App';
import {SchemaForm} from '../SchemaForm';
import {Chat} from './Assistant';

const FPS = 30;
const SIZES: Record<string, [number, number]> = {'9x16': [1080, 1920], '16x9': [1920, 1080]};
const COLORS: Record<string, string> = {text: '#f0609a', video: '#8b7bff', audio: '#33cdb4'};
const snap = (t: number) => Math.max(0, Math.round(t * 20) / 20);
const clean = (e: unknown) => (e as Error).message.replace(/^Error invoking remote method '[^']+': Error: /, '');

/** Inspector forms come from the same schemas the renderer validates with. */
const formSchema = (kind: string): JsonSchema => {
	const s = z.toJSONSchema(kind === 'text' ? textClipSchema : kind === 'audio' ? audioClipSchema : mediaClipSchema, {unrepresentable: 'any'}) as JsonSchema;
	const {id: _id, kind: _kind, balance: _balance, ...properties} = s.properties ?? {};
	return {...s, properties, required: (s.required ?? []).filter((k) => k !== 'id' && k !== 'kind')};
};
// Waveforms and beats are measured once per file by the engine and remembered for the session.
const peakCache = new Map<string, Promise<Peaks>>();
const loadPeaks = (project: string, src: string, beats: boolean) => {
	const key = `${project}|${src}|${beats}`;
	if (!peakCache.has(key)) peakCache.set(key, window.tibeb.peaks(project, src, beats).catch(() => ({duration: 0, per_second: 40, peaks: []})));
	return peakCache.get(key)!;
};

/** The part of a file's waveform that a clip plays (from `in` for `length` seconds), stretched to the clip. */
const Wave = ({project, clip, color, px}: {project: string; clip: EditClip; color: string; px: number}) => {
	const [p, setP] = useState<Peaks | null>(null);
	const src = String(clip.src ?? '');
	useEffect(() => {
		let live = true;
		if (src.startsWith('projects/')) void loadPeaks(project, src, false).then((x) => live && setP(x));
		return () => { live = false; };
	}, [project, src]);
	if (!p || !p.peaks.length) return null;
	const a = Math.floor(Number(clip.in ?? 0) * p.per_second), b = Math.ceil((Number(clip.in ?? 0) + clip.length) * p.per_second);
	const part = p.peaks.slice(a, Math.max(a + 1, b));
	const step = Math.max(1, Math.ceil(part.length / Math.max(60, Math.min(4000, px / 2.5))));
	const pts = Array.from({length: Math.ceil(part.length / step)}, (_, i) => Math.max(...part.slice(i * step, (i + 1) * step)));
	const n = Math.max(1, Math.round((clip.length * p.per_second) / step));
	const d = pts.map((v, i) => `M${i} ${(0.5 - v * 0.46).toFixed(3)}V${(0.5 + v * 0.46).toFixed(3)}`).join('');
	return <svg className="wave" viewBox={`0 0 ${n} 1`} preserveAspectRatio="none" aria-hidden="true"><path d={d} stroke={color} strokeWidth={1.2} vectorEffect="non-scaling-stroke" fill="none" /></svg>;
};

const label = (c: EditClip) => (c.kind === 'text' ? String(c.text) : String(c.src ?? '').split('/').pop() ?? c.id);

type Sel = {track: string; clip: string} | null;
type Drag = {track: string; clip: string; mode: 'move' | 'trim'; x0: number; start0: number; length0: number; before: EditDoc};

const Edit = ({initial}: {initial: string}) => {
	const [projects, setProjects] = useState<ProjectSummary[]>([]);
	const [project, setProject] = useState(initial);
	const [doc, setDoc] = useState<EditDoc | null>(null);
	const [slug, setSlug] = useState('');
	const [files, setFiles] = useState<ProjectFile[]>([]);
	const [format, setFormat] = useState('9x16');
	const [sel, setSel] = useState<Sel>(null);
	const [frame, setFrame] = useState(0);
	const [pps, setPps] = useState(70);
	const [beatInfo, setBeatInfo] = useState<{bpm: number; times: number[]; down: number[]}>({bpm: 0, times: [], down: []});
	const [snapBeats, setSnapBeats] = useState(true);
	const [status, setStatus] = useState('');
	const [problem, setProblem] = useState('');
	const [render, setRender] = useState<{busy: boolean; percent: number; file: string}>({busy: false, percent: 0, file: ''});
	const [side, setSide] = useState<'inspector' | 'assistant'>('inspector');
	const latest = useRef<EditDoc | null>(null);
	const past = useRef<EditDoc[]>([]);
	const future = useRef<EditDoc[]>([]);
	const player = useRef<PlayerRef>(null);
	const drag = useRef<Drag | null>(null);
	const saveTimer = useRef<number | undefined>(undefined);

	useEffect(() => {
		void window.tibeb.projects().then((p) => {
			setProjects(p);
			if (!project && p[0]) setProject(p[0].name);
		});
		return window.tibeb.onRenderProgress((p) => setRender((r) => ({...r, percent: p.percent >= 0 ? p.percent : r.percent})));
	}, []);

	useEffect(() => {
		if (!project) return;
		setDoc(null);
		setSel(null);
		past.current = [];
		future.current = [];
		Promise.all([window.tibeb.loadEdit(project), window.tibeb.project(project)]).then(([e, p]) => {
			setDoc(e.doc);
			setSlug(e.slug);
			setFiles(p.files);
			setStatus(e.created ? 'First cut made from the project files. It is saved when you change something.' : 'Loaded');
			setProblem('');
		}).catch((e) => setProblem(clean(e)));
	}, [project]);

	latest.current = doc;
	// The assistant (or a terminal session) changed edit.json: show it at once, keep the old version on the undo stack.
	useEffect(() => {
		if (!project) return;
		void window.tibeb.watchEdit(project);
		return window.tibeb.onEditExternal((p) => {
			if (p !== project) return;
			void window.tibeb.loadEdit(project).then((e) => {
				const check = timelineSchema.safeParse(e.doc);
				if (!check.success) return setProblem(`The edit was changed outside the editor but is not valid (${check.error.issues[0].path.join(' › ')}: ${check.error.issues[0].message}). Showing your last version.`);
				if (latest.current) past.current = [...past.current.slice(-80), latest.current];
				future.current = [];
				setDoc(e.doc);
				setProblem('');
				setStatus('Updated by the assistant. Undo brings back the previous version.');
			}).catch((err) => setProblem(clean(err)));
		});
	}, [project]);
	const persist = useCallback((next: EditDoc) => {
		window.clearTimeout(saveTimer.current);
		const check = timelineSchema.safeParse(next);
		if (!check.success) {
			const issue = check.error.issues[0];
			setProblem(`Not saved: ${issue.path.join(' › ')}: ${issue.message}`);
			return;
		}
		setProblem('');
		setStatus('Saving…');
		saveTimer.current = window.setTimeout(() => {
			window.tibeb.saveEdit(project, next).then(() => setStatus('Saved')).catch((e) => setProblem(clean(e)));
		}, 600);
	}, [project]);

	/** Every change goes through here: one undo step, then autosave. */
	const change = useCallback((fn: (d: EditDoc) => EditDoc, before?: EditDoc) => {
		setDoc((d) => {
			if (!d) return d;
			past.current = [...past.current.slice(-80), before ?? d];
			future.current = [];
			const next = fn(d);
			persist(next);
			return next;
		});
	}, [persist]);
	const undo = () => setDoc((d) => {
		const prev = past.current.pop();
		if (!d || !prev) return d;
		future.current.push(d);
		persist(prev);
		return prev;
	});
	const redo = () => setDoc((d) => {
		const next = future.current.pop();
		if (!d || !next) return d;
		past.current.push(d);
		persist(next);
		return next;
	});

	const mapClip = (d: EditDoc, s: NonNullable<Sel>, fn: (c: EditClip) => EditClip | EditClip[] | null): EditDoc => ({
		...d, tracks: d.tracks.map((t) => (t.id !== s.track ? t : {...t, clips: t.clips.flatMap((c) => (c.id !== s.clip ? [c] : (fn(c) ?? []) as EditClip | EditClip[]))})),
	});
	// Beats of the first music clip, placed on the timeline (file time shifted by the clip's start and trim).
	const musicClip = useMemo(() => doc?.tracks.find((t) => t.id === 'music')?.clips[0] ?? doc?.tracks.filter((t) => t.kind === 'audio').flatMap((t) => t.clips).find((c) => /music/i.test(String(c.src))) ?? null, [doc]);
	const musicKey = musicClip ? `${musicClip.src}|${musicClip.start}|${musicClip.in}|${musicClip.length}` : '';
	useEffect(() => {
		if (!musicClip || !String(musicClip.src).startsWith('projects/')) return setBeatInfo({bpm: 0, times: [], down: []});
		let live = true;
		const place = (list: number[] = []) => list.map((b) => musicClip.start + b - Number(musicClip.in ?? 0)).filter((t) => t >= musicClip.start && t <= musicClip.start + musicClip.length);
		void loadPeaks(project, String(musicClip.src), true).then((p) => live && setBeatInfo({bpm: p.bpm ?? 0, times: place(p.beats), down: place(p.downbeats)}));
		return () => { live = false; };
	}, [project, musicKey]);
	/** Times snap to a beat when one is close (and the toggle is on), otherwise to 1/20 s. */
	const snapT = useCallback((t: number) => {
		if (snapBeats && beatInfo.times.length) {
			const near = beatInfo.times.reduce((best, b) => (Math.abs(b - t) < Math.abs(best - t) ? b : best), beatInfo.times[0]);
			if (Math.abs(near - t) < 0.14) return Math.max(0, Math.round(near * 1000) / 1000);
		}
		return snap(t);
	}, [snapBeats, beatInfo]);
	const selected = useMemo(() => (doc && sel ? doc.tracks.find((t) => t.id === sel.track)?.clips.find((c) => c.id === sel.clip) ?? null : null), [doc, sel]);
	const now = frame / FPS;
	const newId = (d: EditDoc, p: string) => {
		const ids = new Set(d.tracks.flatMap((t) => t.clips.map((c) => c.id)));
		let n = ids.size + 1;
		while (ids.has(`${p}${n}`)) n++;
		return `${p}${n}`;
	};

	const split = () => {
		if (!doc || !sel || !selected || now <= selected.start + 0.1 || now >= selected.start + selected.length - 0.1) return;
		const cut = snapT(now) - selected.start;
		change((d) => mapClip(d, sel, (c) => [{...c, length: cut}, {...c, id: newId(d, c.id.replace(/\d+$/, '') || 'c'), start: c.start + cut, length: c.length - cut, ...(typeof c.in === 'number' ? {in: c.in + cut} : {})}]));
	};
	const remove = () => {
		if (!sel) return;
		change((d) => mapClip(d, sel, () => null));
		setSel(null);
	};
	const addText = () => change((d) => {
		const track = d.tracks.find((t) => t.kind === 'text') ?? d.tracks[0];
		const id = newId(d, 't');
		setSel({track: track.id, clip: id});
		return {...d, tracks: d.tracks.map((t) => (t.id !== track.id ? t : {...t, clips: [...t.clips, {id, start: snap(now), length: Math.min(3, Math.max(0.5, d.duration - now)), kind: 'text', text: 'New text', style: 'headline', motion: 'rise', size: 8, color: '#FFFFFF', accent: '#FB7A3C', x: 50, y: 50, align: 'center'}]})),
		};
	});
	const addFile = (rel: string) => {
		const f = files.find((x) => x.file === rel);
		if (!f || !doc) return;
		const src = `projects/${slug}/${f.file}`;
		const isAudio = /\.(wav|mp3|m4a|aac)$/i.test(rel), isVideo = /\.(mp4|mov|m4v|webm)$/i.test(rel);
		change((d) => {
			const track = isAudio ? d.tracks.find((t) => t.id === (f.kind === 'voice' ? 'voice' : f.kind === 'music' ? 'music' : 'sfx')) ?? d.tracks.find((t) => t.kind === 'audio') : d.tracks.find((t) => t.kind === 'video');
			if (!track) return d;
			const id = newId(d, isAudio ? 'a' : 'v');
			const length = Math.max(0.5, Math.min(isAudio || isVideo ? f.duration ?? 3 : 3, 600));
			const clip: EditClip = isAudio ? {id, start: snap(now), length, kind: 'audio', src, in: 0, volume: f.kind === 'music' ? 0.35 : 1, fadeIn: 0, fadeOut: 0.3}
				: {id, start: snap(now), length, kind: isVideo ? 'video' : 'image', src, in: 0, volume: 1, fit: 'cover', scale: 1, x: 0, y: 0, opacity: 1, zoom: isVideo ? 0 : 0.08};
			setSel({track: track.id, clip: id});
			return {...d, duration: Math.max(d.duration, snap(now + length)), tracks: d.tracks.map((t) => (t.id !== track.id ? t : {...t, clips: [...t.clips, clip]}))};
		});
	};

	const onPointerMove = (e: React.PointerEvent) => {
		const g = drag.current;
		if (!g) return;
		const dt = (e.clientX - g.x0) / pps;
		setDoc((d) => d && mapClip(d, g, (c) => (g.mode === 'move' ? {...c, start: snapT(g.start0 + dt)} : {...c, length: Math.max(0.2, snapT(g.start0 + g.length0 + dt) - g.start0)})));
	};
	const onPointerUp = () => {
		const g = drag.current;
		drag.current = null;
		if (g && doc && doc !== g.before) change((d) => d, g.before);
	};
	const startDrag = (e: React.PointerEvent, track: string, c: EditClip, mode: 'move' | 'trim') => {
		if (!doc) return;
		e.stopPropagation();
		try {
			(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		} catch {
			// synthetic pointers (tests) cannot be captured
		}
		setSel({track, clip: c.id});
		drag.current = {track, clip: c.id, mode, x0: e.clientX, start0: c.start, length0: c.length, before: doc};
	};
	/** Lower a music track while the voice track is speaking: speech is found from the voice clips' waveforms. */
	const toggleDuck = async (trackId: string) => {
		if (!doc) return;
		const track = doc.tracks.find((t) => t.id === trackId);
		if (track?.duck) return change((d) => ({...d, tracks: d.tracks.map((t) => (t.id === trackId ? (({duck: _d, ...rest}) => rest)(t) as EditTrack : t))}));
		const voice = doc.tracks.find((t) => t.id === 'voice' && t.clips.length) ?? doc.tracks.find((t) => t.kind === 'audio' && t.id !== trackId && t.clips.length);
		if (!voice) return setStatus('Add a voice clip first: ducking lowers the music while the voice speaks.');
		const ranges: [number, number][] = [];
		for (const c of voice.clips) {
			const p = await loadPeaks(project, String(c.src), false);
			const from = Number(c.in ?? 0);
			let open: number | null = null;
			p.peaks.slice(Math.floor(from * p.per_second), Math.ceil((from + c.length) * p.per_second)).forEach((v, i, arr) => {
				const t = c.start + i / p.per_second;
				if (v > 0.08 && open === null) open = t;
				if ((v <= 0.08 || i === arr.length - 1) && open !== null && (i === arr.length - 1 || arr.slice(i, i + Math.ceil(p.per_second * 0.6)).every((x) => x <= 0.08))) {
					ranges.push([Math.round(open * 100) / 100, Math.round(t * 100) / 100]);
					open = null;
				}
			});
		}
		change((d) => ({...d, tracks: d.tracks.map((t) => (t.id === trackId ? {...t, duck: {under: voice.id, amount: 0.3, ...(ranges.length ? {ranges: ranges.slice(0, 400)} : {})}} : t))}));
		setStatus(ranges.length ? `Music dips to 30 % in ${ranges.length} spoken stretch${ranges.length === 1 ? '' : 'es'}.` : 'Music dips under the voice clips.');
	};
	const GRADE = ['look', 'lookStrength', 'exposure', 'contrast', 'saturation', 'temperature', 'tint', 'balance'];
	const [gradeNote, setGradeNote] = useState('');
	const autoBalance = async () => {
		if (!sel || !selected || typeof selected.src !== 'string') return;
		setGradeNote('Measuring…');
		try {
			const r = await window.tibeb.balance(project, selected.src, Number(selected.in ?? 0) + Math.min(0.5, selected.length / 2));
			change((d) => mapClip(d, sel, (c) => ({...c, balance: r.balance})));
			setGradeNote(r.notes[0] ?? 'Balanced');
		} catch (e) {
			setGradeNote(clean(e));
		}
	};
	const resetColour = () => sel && change((d) => mapClip(d, sel, (c) => Object.fromEntries(Object.entries(c).filter(([k]) => !GRADE.includes(k))) as EditClip));
	const colourToTrack = () => sel && selected && change((d) => ({...d, tracks: d.tracks.map((t) => (t.id !== sel.track ? t : {...t, clips: t.clips.map((c) => (c.kind === 'audio' || c.kind === 'text' ? c
		: {...(Object.fromEntries(Object.entries(c).filter(([k]) => !GRADE.includes(k))) as EditClip), ...Object.fromEntries(GRADE.filter((k) => k !== 'balance' && selected[k] !== undefined).map((k) => [k, selected[k]]))}))}))}));
	const seek = (t: number) => player.current?.seekTo(Math.max(0, Math.round(t * FPS)));

	const [handing, setHanding] = useState(false);
	const handoffNow = async () => {
		if (!doc) return;
		setHanding(true);
		setStatus('Preparing layers for your editor: text overlays are being rendered…');
		try {
			await window.tibeb.saveEdit(project, doc);
			const r = await window.tibeb.handoff(project, format);
			setStatus(`Hand-off ready: ${r.files} files in the project's handoff folder (opened in Finder).${r.notes.length ? ' ' + r.notes[0] : ''}`);
		} catch (e) {
			setProblem(clean(e));
		} finally {
			setHanding(false);
		}
	};
	const [pulled, setPulled] = useState<CapcutPull | null>(null);
	const toCapcut = async () => {
		if (!doc) return;
		setHanding(true);
		setStatus('Building a CapCut project: cutting clips and rendering text overlays…');
		try {
			await window.tibeb.saveEdit(project, doc);
			const r = await window.tibeb.capcutCreate(project, format);
			setStatus(`CapCut project “${r.name}” created. ${r.next}`);
		} catch (e) {
			setProblem(clean(e));
		} finally {
			setHanding(false);
		}
	};
	const fromCapcut = async (apply: boolean) => {
		try {
			const r = await window.tibeb.capcutPull(project, apply);
			if (apply) {
				const fresh = await window.tibeb.loadEdit(project);
				past.current.push(doc!);
				setDoc(fresh.doc);
				setPulled(null);
				setStatus(`Applied from CapCut: ${r.summary}. The previous edit was kept as a backup file.`);
			} else {
				setPulled(r);
			}
		} catch (e) {
			setProblem(clean(e));
		}
	};
	const exportNow = async () => {
		if (!doc) return;
		setRender({busy: true, percent: 0, file: ''});
		try {
			await window.tibeb.saveEdit(project, doc);
			const done = await window.tibeb.exportEdit(project, format, `${slug}-edit`);
			setRender({busy: false, percent: 100, file: done.file});
		} catch (e) {
			setRender({busy: false, percent: 0, file: ''});
			setProblem(clean(e));
		}
	};

	useEffect(() => {
		const p = player.current;
		if (!p) return;
		const on = (e: {detail: {frame: number}}) => setFrame(e.detail.frame);
		p.addEventListener('frameupdate', on);
		return () => p.removeEventListener('frameupdate', on);
	}, [doc === null, format]);

	if (!project) return <p className="empty">Create a project first, then come back to edit it.</p>;
	if (!doc) return <p className="dim">{problem || 'Opening the timeline…'}</p>;
	const [w, h] = SIZES[format];
	const width = Math.max(600, doc.duration * pps + 40);
	return (
		<section className="edit">
			<div className="head">
				<div className="row">
					<h1>Edit</h1>
					<select aria-label="Project" value={project} onChange={(e) => { setProject(e.target.value); go(`edit/${e.target.value}`); }}>{projects.map((p) => <option key={p.name}>{p.name}</option>)}</select>
					<select aria-label="Format" value={format} onChange={(e) => setFormat(e.target.value)}><option>9x16</option><option>16x9</option></select>
					<span className="dim small" role="status">{status}</span>
				</div>
				<div className="row">
					{render.file ? <button onClick={() => void window.tibeb.reveal(project, 'exports')}>Show export</button> : null}
					<button onClick={() => void fromCapcut(false)} title="Read back what you changed in the CapCut project made from this edit">Changes from CapCut</button>
					<button disabled={handing || render.busy || Boolean(problem)} onClick={() => void toCapcut()} title="Experimental: writes a new CapCut project with every clip on its own track, then opens CapCut">{handing ? 'Preparing…' : 'Open in CapCut'}</button>
					<button disabled={handing || render.busy || Boolean(problem)} onClick={() => void handoffNow()} title="Every clip as its own file, plus a timeline file and instructions, for Resolve or any other editor">Layers folder</button>
					<button className="primary" disabled={render.busy || handing || Boolean(problem)} onClick={() => void exportNow()}>{render.busy ? `Exporting ${render.percent}%` : 'Export video'}</button>
				</div>
			</div>
			{problem ? <p className="error" role="alert">{problem}</p> : null}
			{pulled ? (
				<div className="pulled" role="region" aria-label="Changes from CapCut">
					<div className="row between"><strong>From CapCut project “{pulled.draft}”: {pulled.summary}</strong>
						<span className="row"><button className="small primary" disabled={!pulled.changes.length && !pulled.deleted.length} onClick={() => void fromCapcut(true)}>Apply to this edit</button><button className="small" onClick={() => setPulled(null)}>Close</button></span></div>
					<ul>
						{pulled.changes.map((c, i) => <li key={i}><b>{c.clip}</b> {c.field}: {String(c.from)} → {String(c.to)}</li>)}
						{pulled.deleted.map((d) => <li key={d}><b>{d}</b> was removed in CapCut</li>)}
						{pulled.added_in_capcut.map((a, i) => <li key={`a${i}`} className="dim">added in CapCut (stays there): {a.file ?? a.text} at {a.start}s</li>)}
						{!pulled.changes.length && !pulled.deleted.length && !pulled.added_in_capcut.length ? <li className="dim">Nothing differs. Save the project in CapCut first if you just changed it.</li> : null}
					</ul>
				</div>
			) : null}
			<div className="estage">
				<div className="viewer">
					<Player ref={player} component={Timeline} inputProps={doc} durationInFrames={Math.max(1, Math.round(doc.duration * FPS))} fps={FPS} compositionWidth={w} compositionHeight={h}
						controls acknowledgeRemotionLicense style={format === '9x16' ? {height: '100%', aspectRatio: '9 / 16'} : {width: '100%', aspectRatio: '16 / 9'}}
						errorFallback={({error}: {error: Error}) => <div className="perr">Preview problem: {error.message}</div>} />
				</div>
				<aside className="inspector">
					<div className="sidetabs" role="tablist">
						<button role="tab" aria-selected={side === 'inspector'} onClick={() => setSide('inspector')}>Inspector</button>
						<button role="tab" aria-selected={side === 'assistant'} onClick={() => setSide('assistant')}>Ask Claude</button>
					</div>
					{side === 'assistant' ? (
						<Chat compact project={project} ideas={['Tighten the timing so nothing overlaps.', 'Make the title larger and place it in the top third.', 'Give every picture a slow zoom and the same look.']}
							before={async () => { window.clearTimeout(saveTimer.current); if (latest.current) await window.tibeb.saveEdit(project, latest.current); }}
							context={() => `playhead at ${now.toFixed(2)} s; format ${format}; ${selected ? `selected clip id "${selected.id}" (${selected.kind}) on track "${sel?.track}"` : 'no clip selected'}.`} />
					) : selected ? (
						<>
							<div className="row between"><strong>{label(selected)}</strong><span className="dim small">{selected.kind}</span></div>
							{typeof selected.src === 'string' && /\.(png|jpe?g|webp)$/i.test(selected.src) ? <img className="ithumb" alt="" src={media(`projects/${project}/${selected.src.replace(`projects/${slug}/`, '')}`)} /> : null}
							{selected.kind === 'video' || selected.kind === 'image' ? (
								<div className="gradebar">
									<button className="small" onClick={() => void autoBalance()}>{Array.isArray(selected.balance) ? 'Balance again' : 'Auto balance'}</button>
									<button className="small" onClick={colourToTrack} title="Copy this clip's look and adjustments to every clip on the track">Colour → whole track</button>
									<button className="small" onClick={resetColour}>Reset colour</button>
									{gradeNote ? <span className="dim small">{gradeNote}</span> : null}
								</div>
							) : null}
							<SchemaForm key={`${sel?.track}-${sel?.clip}`} schema={formSchema(selected.kind)} value={selected} label="Clip" files={files.map((f) => `projects/${slug}/${f.file}`)}
								onChange={(v) => sel && change((d) => mapClip(d, sel, (c) => ({...(v as EditClip), id: c.id, kind: c.kind, ...(c.balance ? {balance: c.balance} : {})})))} />
						</>
					) : (
						<>
							<strong>Video</strong>
							<div className="fields">
								<label className="field"><span>Length (seconds)</span><input type="number" min={1} max={3600} step={0.5} value={doc.duration} onChange={(e) => change((d) => ({...d, duration: Math.max(1, Number(e.target.value) || 1)}))} /></label>
								<label className="field"><span>Background</span><span className="color"><input type="color" value={doc.background} onChange={(e) => change((d) => ({...d, background: e.target.value}))} /><input value={doc.background} readOnly aria-label="Background value" /></span></label>
								<label className="field wide"><span>End credit</span><input value={doc.credit ?? 'Edit by Cheri'} maxLength={40} onChange={(e) => change((d) => ({...d, credit: e.target.value}))} /></label>
							</div>
							<p className="dim small">Select a clip on the timeline to change it. Drag a clip to move it; drag its right edge to make it longer or shorter.</p>
						</>
					)}
				</aside>
			</div>
			<div className="tbar">
				<button onClick={undo} disabled={!past.current.length}>Undo</button><button onClick={redo} disabled={!future.current.length}>Redo</button>
				<button onClick={split} disabled={!selected}>Split at playhead</button><button onClick={remove} disabled={!selected}>Delete</button>
				<button onClick={addText}>Add text</button>
				<select aria-label="Add a project file at the playhead" value="" onChange={(e) => addFile(e.target.value)}>
					<option value="">Add from project…</option>
					{files.filter((f) => /\.(png|jpe?g|webp|mp4|mov|m4v|webm|wav|mp3|m4a|aac)$/i.test(f.file) && f.kind !== 'export').map((f) => <option key={f.file} value={f.file}>{f.file}</option>)}
				</select>
				<button aria-pressed={snapBeats} disabled={!beatInfo.times.length} onClick={() => setSnapBeats(!snapBeats)} title="Moves, trims and splits land on the music's beats">
					{beatInfo.times.length ? `Snap to beat · ${Math.round(beatInfo.bpm)} BPM` : 'No beat found'}</button>
				<div className="grow" />
				<span className="dim small">{now.toFixed(2)} s</span>
				<label className="dim small row">Zoom<input type="range" min={20} max={220} value={pps} onChange={(e) => setPps(Number(e.target.value))} /></label>
			</div>
			<div className="tl" onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
				<div className="lanes" style={{width: width + 150}}>
					<div className="lane ruler" onPointerDown={(e) => seek((e.clientX - e.currentTarget.getBoundingClientRect().left - 150) / pps)}>
						<div className="tname" />
						<div className="track">{Array.from({length: Math.ceil(doc.duration) + 1}, (_, i) => <span key={i} className="tick" style={{left: i * pps}}>{i}s</span>)}
							{pps >= 40 ? beatInfo.times.map((b) => <i key={b} className={`beat${beatInfo.down.some((x) => Math.abs(x - b) < 0.02) ? ' down' : ''}`} style={{left: b * pps}} />) : beatInfo.down.map((b) => <i key={b} className="beat down" style={{left: b * pps}} />)}</div>
					</div>
					{doc.tracks.map((t) => (
						<div key={t.id} className="lane">
							<div className="tname"><span>{t.name}</span>
								{t.kind === 'audio' && t.id !== 'voice' && t.clips.length ? <button className="small" aria-pressed={Boolean(t.duck)} title="Lower this track while the voice speaks" onClick={() => void toggleDuck(t.id)}>Duck</button> : null}
								{t.kind !== 'text' ? <button className="small" aria-pressed={Boolean(t.muted)} onClick={() => change((d) => ({...d, tracks: d.tracks.map((x) => (x.id === t.id ? {...x, muted: !x.muted} : x))}))}>{t.muted ? 'Muted' : 'Mute'}</button> : null}</div>
							<div className="track" onPointerDown={() => setSel(null)}>
								{t.clips.map((c) => (
									<div key={c.id} className={`clip${sel?.clip === c.id && sel.track === t.id ? ' on' : ''}`} title={label(c)}
										style={{left: c.start * pps, width: Math.max(8, c.length * pps - 2), background: `${COLORS[t.kind]}3a`, borderColor: COLORS[t.kind]}}
										onPointerDown={(e) => startDrag(e, t.id, c, 'move')}>
										{t.kind === 'audio' || c.kind === 'video' ? <Wave project={project} clip={c} color={COLORS[t.kind]} px={c.length * pps} /> : null}
										{c.kind === 'audio' && Number(c.fadeIn) > 0 ? <i className="fade in" style={{width: Math.min(c.length, Number(c.fadeIn)) * pps}} /> : null}
										{c.kind === 'audio' && Number(c.fadeOut) > 0 ? <i className="fade out" style={{width: Math.min(c.length, Number(c.fadeOut)) * pps}} /> : null}
										{t.duck ? (t.duck.ranges ?? []).filter(([a, b]) => b > c.start && a < c.start + c.length).map(([a, b]) => <i key={a} className="ducked" style={{left: (Math.max(a, c.start) - c.start) * pps, width: (Math.min(b, c.start + c.length) - Math.max(a, c.start)) * pps}} />) : null}
										<span>{label(c)}</span>
										<i className="grip" onPointerDown={(e) => startDrag(e, t.id, c, 'trim')} />
									</div>
								))}
							</div>
						</div>
					))}
					<div className="playhead" style={{left: 150 + now * pps}} />
				</div>
			</div>
		</section>
	);
};

export default Edit;
