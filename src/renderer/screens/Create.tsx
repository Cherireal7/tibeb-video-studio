import {useEffect, useMemo, useState} from 'react';
import {go, media} from '../App';
import {SchemaForm, blank} from '../SchemaForm';

const ABOUT: Record<string, string> = {
	MapJourney: 'A curved route on a tilted map, camera following', PathStory: 'A line through steps or milestones, camera following',
	GraphRide: 'A chart line with the camera riding its tip', ImageTour: 'Glide between hotspots on any image', DocStory: 'Documentary short: pictures, map, stamps, quote, narration',
	MinimalStory: 'Talking head with cinematic captions and 10 scene types', VoxStory: 'Narrated explainer story', TextOverlay: 'Transparent text overlay (11 types)',
	MotionElement: 'Transparent animated element', Graphic: 'Transparent still graphic', LowerThird: 'Transparent name and role', KineticText: 'One punchy line at a time',
	ProductPromo: 'Hook, product, price, features, call to action', LogoReveal: 'Logo intro', Announcement: 'Offer or news card', AppShowcase: 'Phone mock-up with screens',
	AppFlowPromo: 'App screens with taps and captions', BrandSizzle: 'Beat-synced word slams and close-ups',
};
const ORDER = ['DocStory', 'MinimalStory', 'MapJourney', 'PathStory', 'GraphRide', 'ImageTour'];
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'video';

export const Create = ({initial}: {initial: string}) => {
	const [templates, setTemplates] = useState<Template[] | null>(null);
	const [projects, setProjects] = useState<ProjectSummary[]>([]);
	const [id, setId] = useState(initial);
	const [project, setProject] = useState('');
	const [format, setFormat] = useState('');
	const [name, setName] = useState('');
	const [props, setProps] = useState<unknown>(null);
	const [alpha, setAlpha] = useState(false);
	const [state, setState] = useState<{busy: boolean; percent: number; line: string; error: string; file: string}>({busy: false, percent: 0, line: '', error: '', file: ''});
	useEffect(() => {
		void window.tibeb.templates().then((t) => setTemplates([...t].sort((a, b) => (ORDER.indexOf(a.id) + 99) % 99 - (ORDER.indexOf(b.id) + 99) % 99 || a.id.localeCompare(b.id))));
		void window.tibeb.projects().then((p) => { setProjects(p); setProject(p[0]?.name ?? ''); });
		return window.tibeb.onRenderProgress((p) => setState((s) => ({...s, percent: p.percent >= 0 ? p.percent : s.percent, line: p.line})));
	}, []);
	const t = useMemo(() => templates?.find((x) => x.id === id) ?? null, [templates, id]);
	const [files, setFiles] = useState<string[]>([]);
	useEffect(() => {
		if (!project) return;
		const prefix = `projects/${project.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project'}/`;
		void window.tibeb.project(project).then((p) => setFiles(p.files.filter((f) => f.kind !== 'export' && f.kind !== 'document').map((f) => prefix + f.file)));
	}, [project]);
	const start = (tpl: Template, exampleFile?: string) => {
		const ex = tpl.examples.find((e) => e.file === exampleFile) ?? tpl.examples[0];
		setProps(ex ? structuredClone(ex.props) : tpl.inputs ? blank(tpl.inputs) : {});
		setFormat(ex && tpl.formats.includes(ex.format) ? ex.format : tpl.formats[0]);
		setAlpha(Boolean(ex?.alpha));
		setName(slug(ex?.name ?? tpl.id));
		setState({busy: false, percent: 0, line: '', error: '', file: ''});
	};
	useEffect(() => {
		if (t) start(t);
	}, [t]);
	const renderNow = async () => {
		if (!t) return;
		setState({busy: true, percent: 0, line: 'Starting…', error: '', file: ''});
		try {
			const done = await window.tibeb.render({project, template: t.id, format, name, alpha, props});
			setState({busy: false, percent: 100, line: '', error: '', file: done.file});
		} catch (e) {
			setState({busy: false, percent: 0, line: '', error: (e as Error).message.replace(/^Error invoking remote method '[^']+': Error: /, ''), file: ''});
		}
	};
	if (!templates) return <p className="dim">Loading…</p>;
	if (!templates.length) return <p className="empty">No templates found. In Motion Studio run “npm run templates”, then come back.</p>;
	return (
		<section className="create">
			<div className="head"><h1>Create</h1><span className="dim small">{templates.length} templates from Motion Studio</span></div>
			<div className="split">
				<div className="tlist" role="listbox" aria-label="Templates">
					{templates.map((x) => (
						<button key={x.id} role="option" aria-selected={x.id === id} className="titem" onClick={() => { setId(x.id); go(`create/${x.id}`); }}>
							<strong>{x.id}</strong><span className="dim small">{ABOUT[x.id] ?? ''}</span><span className="fmt">{x.formats.join(' · ')}</span>
						</button>
					))}
				</div>
				{!t ? <p className="empty">Pick a template to fill in.</p> : (
					<form className="editor-form" onSubmit={(e) => { e.preventDefault(); void renderNow(); }}>
						<div className="bar">
							<label className="field"><span>Project</span>
								<select value={project} onChange={(e) => setProject(e.target.value)}>{projects.length ? projects.map((p) => <option key={p.name}>{p.name}</option>) : <option value="">Create a project first</option>}</select></label>
							<label className="field"><span>Start from</span>
								<select onChange={(e) => start(t, e.target.value)} disabled={t.examples.length < 2}>{t.examples.map((e) => <option key={e.file} value={e.file}>{e.name}</option>)}</select></label>
							<label className="field"><span>Format</span><select value={format} onChange={(e) => setFormat(e.target.value)}>{t.formats.map((f) => <option key={f}>{f}</option>)}</select></label>
							<label className="field"><span>File name</span><input value={name} onChange={(e) => setName(slug(e.target.value))} /></label>
							<button className="primary" disabled={state.busy || !project || !name}>{state.busy ? `Rendering ${state.percent}%` : 'Render'}</button>
						</div>
						{state.busy ? <div className="progress" role="progressbar" aria-valuenow={state.percent} aria-valuemin={0} aria-valuemax={100}><div style={{width: `${state.percent}%`}} /><span>{state.line}</span></div> : null}
						{state.error ? <p className="error" role="alert">{state.error}</p> : null}
						{state.file ? (
							<div className="result">
								{/\.mp4$/.test(state.file) ? <video controls src={media(state.file)} /> : <p className="note">Transparent overlay saved (preview it in your editor).</p>}
								<div><p className="note">Saved to {state.file.replace(/^projects\//, '')}</p><button type="button" onClick={() => void window.tibeb.reveal(project, 'exports')}>Show in Finder</button></div>
							</div>
						) : null}
						<datalist id="project-files">{files.map((f) => <option key={f} value={f} />)}</datalist>
						{files.length ? <p className="dim small">Fields for pictures, video, maps, voice and music suggest this project’s files as you type.</p> : null}
						{t.inputs && props !== null ? <SchemaForm key={t.id} schema={t.inputs} value={props} onChange={setProps} label={t.id} files={files} /> : null}
					</form>
				)}
			</div>
		</section>
	);
};
