import {useEffect, useMemo, useRef, useState} from 'react';
import {media} from '../App';

const ORDER = ['sfx', 'music', 'graphics', 'motion', 'overlays', 'transitions', 'backgrounds', 'textures', 'fonts', 'luts', 'footage', 'ai-generated', 'powergrades'];
const NAMES: Record<string, string> = {sfx: 'Sounds', luts: 'Looks', fonts: 'Typefaces'};
const AUDIO = /\.(wav|mp3|m4a|aac)$/i, IMG = /\.(png|jpe?g|webp)$/i, VID = /\.(mp4|mov|webm)$/i, FONT = /\.(ttf|otf)$/i;
const PAGE = 60;

const preview = (it: LibraryItem) =>
	IMG.test(it.file) ? media(`library/${it.file}`)
		: VID.test(it.file) ? media(`library/.previews/video/${it.id}.png`)
		: it.category === 'luts' ? media(`library/.previews/luts/${it.id.replace(/-50$/, '')}.png`) : '';

export const Library = () => {
	const [items, setItems] = useState<LibraryItem[] | null>(null);
	const [projects, setProjects] = useState<ProjectSummary[]>([]);
	const [target, setTarget] = useState('');
	const [cat, setCat] = useState('all');
	const [q, setQ] = useState('');
	const [shown, setShown] = useState(PAGE);
	const [added, setAdded] = useState<Record<string, string>>({});
	const playing = useRef<HTMLAudioElement | null>(null);
	useEffect(() => {
		void window.tibeb.library().then((l) => setItems(l.items));
		void window.tibeb.projects().then((p) => { setProjects(p); setTarget(p[0]?.name ?? ''); });
	}, []);
	useEffect(() => setShown(PAGE), [cat, q]);
	const cats = useMemo(() => [...new Set((items ?? []).map((i) => i.category))].sort((a, b) => (ORDER.indexOf(a) + 99) % 99 - (ORDER.indexOf(b) + 99) % 99), [items]);
	const hits = useMemo(() => {
		const words = q.toLowerCase().split(/\s+/).filter(Boolean);
		return (items ?? []).filter((i) => (cat === 'all' || i.category === cat) && words.every((w) => `${i.id} ${i.category} ${i.usage} ${i.tags.join(' ')}`.toLowerCase().includes(w)));
	}, [items, cat, q]);
	const faces = useMemo(() => (items ?? []).filter((i) => FONT.test(i.file)).map((i) => `@font-face{font-family:"lib-${i.id.replace(/["\\]/g, '')}";src:url("${media(`library/${i.file}`)}");font-display:swap}`).join('\n'), [items]);
	const add = async (it: LibraryItem) => {
		try {
			await window.tibeb.addToKit(target, it.file);
			setAdded((a) => ({...a, [it.file]: target}));
		} catch (e) {
			setAdded((a) => ({...a, [it.file]: `! ${(e as Error).message}`}));
		}
	};
	if (!items) return <p className="dim">Loading…</p>;
	return (
		<section>
			<style>{faces}</style>
			<div className="head">
				<h1>Library <span className="dim count">{hits.length} of {items.length}</span></h1>
				<div className="row">
					<label className="dim small" htmlFor="target">Add to</label>
					<select id="target" value={target} onChange={(e) => setTarget(e.target.value)}>
						{projects.length ? projects.map((p) => <option key={p.name}>{p.name}</option>) : <option value="">No project yet</option>}
					</select>
					<input type="search" aria-label="Search the library" placeholder="Search: whoosh, warm, 9:16, title…" value={q} onChange={(e) => setQ(e.target.value)} />
				</div>
			</div>
			<div className="chips" role="tablist" aria-label="Categories">
				{['all', ...cats].map((c) => (
					<button key={c} role="tab" aria-selected={cat === c} className="chip" onClick={() => setCat(c)}>
						{c === 'all' ? 'Everything' : NAMES[c] ?? c[0].toUpperCase() + c.slice(1)} <span>{c === 'all' ? items.length : items.filter((i) => i.category === c).length}</span>
					</button>
				))}
			</div>
			{hits.length === 0 ? <p className="empty">Nothing matches. Try fewer words.</p> : (
				<div className="grid assets">
					{hits.slice(0, shown).map((it) => {
						const src = preview(it);
						const state = added[it.file];
						return (
							<div key={it.file} className={`card asset${AUDIO.test(it.file) ? ' audio' : ''}`}>
								{src ? <div className="thumb check"><img loading="lazy" alt="" src={src} onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} /></div>
									: FONT.test(it.file) ? <div className="spec" style={{fontFamily: `"lib-${it.id}"`}}>Aa Bb 123 ሰላም</div> : null}
								<div className="body">
									<div className="fname">{it.id}</div>
									<div className="dim small">{it.usage}</div>
									{AUDIO.test(it.file) ? (
										<audio controls preload="none" src={media(`library/${it.file}`)} onPlay={(e) => { if (playing.current && playing.current !== e.currentTarget) playing.current.pause(); playing.current = e.currentTarget; }} />
									) : null}
									<div className="row between">
										<span className="dim small">{[it.seconds ? `${it.seconds} s` : '', it.bpm ? `${it.bpm} BPM` : '', it.file.split('.').pop()?.toUpperCase()].filter(Boolean).join(' · ')}</span>
										<button className="small" disabled={!target || Boolean(state && !state.startsWith('!'))} onClick={() => void add(it)} title={state?.startsWith('!') ? state.slice(2) : undefined}>
											{state ? (state.startsWith('!') ? 'Failed' : 'In kit') : 'Add to kit'}
										</button>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			)}
			{hits.length > shown ? <button className="more" onClick={() => setShown(shown + PAGE * 2)}>Show more ({hits.length - shown} left)</button> : null}
		</section>
	);
};
