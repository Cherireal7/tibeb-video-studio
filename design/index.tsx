import React from 'react';
import {AbsoluteFill, Composition, registerRoot} from 'remotion';

const C = {bg: '#131217', panel: '#1b1a21', panel2: '#22212a', line: '#2f2d39', text: '#eceaf2', dim: '#9793a6', faint: '#6b6779',
	orange: '#fb7a3c', violet: '#8b7bff', teal: '#33cdb4', pink: '#f0609a', yellow: '#f5c451'};
const font = '-apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif';
const row = {display: 'flex', flexDirection: 'row'} as const;
const col = {display: 'flex', flexDirection: 'column'} as const;

// ------------------------------------------------------------------ roadmap
const STAGES: {id: string; title: string; state: 'done' | 'next' | 'later'; goal: string; items: string[]}[] = [
	{id: 'M0', title: 'Foundations', state: 'done', goal: 'One word starts a session', items: ['studio command + app icon', '350-asset library + browser', 'Editor choice: Resolve / CapCut', 'Project kits']},
	{id: 'M1', title: 'Shell', state: 'next', goal: 'Everything in one window', items: ['Project grid, new / open', 'Library: search, listen, preview', 'Add to project, reveal in Finder', 'Setup check with fixes']},
	{id: 'M2', title: 'Create', state: 'later', goal: 'Graphics without code', items: ['Template forms from schemas', 'Live preview, render queue', 'Text styles + typefaces', 'Style kits + edit plan page']},
	{id: 'M3', title: 'Editor', state: 'later', goal: 'Cut and customise in the app', items: ['Timeline: cut, trim, reorder scenes', 'Text, graphics, overlay layers', 'Looks, colour adjust, scopes', 'Keyframes, undo, export MP4']},
	{id: 'M4', title: 'Sound', state: 'later', goal: 'Edit audio like picture', items: ['Voice, music, SFX tracks', 'Trim, volume, fades, ducking', 'Waveforms + beat markers', 'Snap cuts to beats, −14 LUFS']},
	{id: 'M5', title: 'Assistant', state: 'later', goal: 'Ask instead of click', items: ['Claude panel per project', 'It edits the same timeline file', 'Captions, beat cuts, kits', 'Every change undoable']},
	{id: 'M6', title: 'Hand-off', state: 'later', goal: 'In and out of the app', items: ['Layered export, stays editable', 'CapCut project + pull changes', 'Resolve bridge, OTIO / XML', 'OBS record, delivery checks']},
	{id: 'M7', title: 'Share', state: 'later', goal: 'Other people can run it', items: ['First-run setup', 'Signed macOS build', 'Neutral examples, docs', 'Licence notes']},
];
const stateColor = {done: C.teal, next: C.orange, later: C.faint};
const stateLabel = {done: 'Done', next: 'Next', later: 'Later'};

const Roadmap: React.FC = () => (
	<AbsoluteFill style={{background: C.bg, color: C.text, fontFamily: font, padding: '64px 72px'}}>
		<div style={{...row, alignItems: 'baseline', justifyContent: 'space-between'}}>
			<div>
				<div style={{fontSize: 46, fontWeight: 700, letterSpacing: -0.5}}>Tibeb roadmap</div>
				<div style={{fontSize: 22, color: C.dim, marginTop: 10}}>One window for the whole video: organise, create, edit picture and sound, hand off or export.</div>
			</div>
			<div style={{...row, gap: 26, fontSize: 18, color: C.dim}}>
				{(['done', 'next', 'later'] as const).map((s) => (
					<div key={s} style={{...row, alignItems: 'center', gap: 9}}>
						<div style={{width: 13, height: 13, borderRadius: 7, background: stateColor[s]}} />{stateLabel[s]}
					</div>
				))}
			</div>
		</div>
		<div style={{position: 'relative', marginTop: 70}}>
			<div style={{position: 'absolute', left: 0, right: 0, top: 21, height: 3, background: C.line}} />
			<div style={{position: 'absolute', left: 0, width: '12.5%', top: 21, height: 3, background: C.teal}} />
			<div style={{...row, gap: 18}}>
				{STAGES.map((s) => (
					<div key={s.id} style={{...col, flex: 1, minWidth: 0}}>
						<div style={{width: 45, height: 45, borderRadius: 23, background: s.state === 'later' ? C.panel : stateColor[s.state], border: `3px solid ${stateColor[s.state]}`,
							color: s.state === 'later' ? C.dim : '#14121a', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', zIndex: 1}}>{s.id}</div>
						<div style={{...col, marginTop: 22, background: C.panel, border: `1px solid ${s.state === 'next' ? C.orange : C.line}`, borderRadius: 14, padding: '20px 18px 22px', height: 372, boxSizing: 'border-box'}}>
							<div style={{fontSize: 13, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: stateColor[s.state]}}>{stateLabel[s.state]}</div>
							<div style={{fontSize: 25, fontWeight: 700, marginTop: 8}}>{s.title}</div>
							<div style={{fontSize: 16, color: C.dim, marginTop: 6, lineHeight: 1.35, height: 44}}>{s.goal}</div>
							<div style={{height: 1, background: C.line, margin: '14px 0 14px'}} />
							{s.items.map((it) => (
								<div key={it} style={{...row, gap: 9, fontSize: 15.5, lineHeight: 1.35, marginBottom: 11, color: C.text}}>
									<div style={{width: 6, height: 6, borderRadius: 3, background: stateColor[s.state], marginTop: 8, flexShrink: 0}} /><div>{it}</div>
								</div>
							))}
						</div>
					</div>
				))}
			</div>
		</div>
		<div style={{...row, gap: 18, marginTop: 34}}>
			{[
				['Built on what exists', 'resolve-assist (Python engine) and Motion Studio (Remotion) keep doing the work. The app calls them.'],
				['One timeline file', 'The editor, the assistant and the renderer all read and write the same edit.json in the project folder.'],
				['Editors stay optional', 'Finish in the app, or send the cut to DaVinci Resolve or CapCut. Nothing depends on either.'],
				['Usable at every step', 'Each milestone ends with something you can use. The terminal workflow keeps working throughout.'],
			].map(([t, d]) => (
				<div key={t} style={{flex: 1, background: C.panel2, borderRadius: 14, padding: '20px 22px'}}>
					<div style={{fontSize: 18, fontWeight: 700}}>{t}</div>
					<div style={{fontSize: 15.5, color: C.dim, marginTop: 7, lineHeight: 1.45}}>{d}</div>
				</div>
			))}
		</div>
		<div style={{position: 'absolute', left: 72, bottom: 34, fontSize: 15, color: C.faint}}>Order of work, not dates. Plan: PLAN.md · 2026-11-21</div>
	</AbsoluteFill>
);

// ------------------------------------------------------------------ shared app chrome
const NAV = ['Projects', 'Library', 'Create', 'Edit', 'Record', 'Assistant', 'Deliver', 'Setup'];
const Chrome: React.FC<{active: string; title: string; right?: React.ReactNode; children: React.ReactNode}> = ({active, title, right, children}) => (
	<AbsoluteFill style={{background: C.bg, color: C.text, fontFamily: font, fontSize: 14}}>
		<div style={{...row, height: 52, alignItems: 'center', borderBottom: `1px solid ${C.line}`, padding: '0 18px', gap: 14, flexShrink: 0}}>
			<div style={{...row, gap: 8}}>{['#ff5f57', '#febc2e', '#28c840'].map((c) => <div key={c} style={{width: 12, height: 12, borderRadius: 6, background: c}} />)}</div>
			<div style={{fontWeight: 600, fontSize: 15, marginLeft: 12}}>{title}</div>
			<div style={{fontSize: 12, color: C.teal, border: `1px solid ${C.line}`, borderRadius: 20, padding: '3px 10px'}}>9:16 · 30 fps</div>
			<div style={{flex: 1}} />
			{right}
		</div>
		<div style={{...row, flex: 1, minHeight: 0}}>
			<div style={{...col, width: 150, borderRight: `1px solid ${C.line}`, padding: '14px 10px', gap: 2, flexShrink: 0}}>
				{NAV.map((n) => (
					<div key={n} style={{padding: '9px 12px', borderRadius: 8, fontSize: 14.5, fontWeight: n === active ? 600 : 400, color: n === active ? C.text : C.dim, background: n === active ? C.panel2 : 'transparent', ...row, alignItems: 'center', gap: 10}}>
						<div style={{width: 7, height: 7, borderRadius: 4, background: n === active ? C.orange : C.line}} />{n}
					</div>
				))}
				<div style={{flex: 1}} />
				<div style={{fontSize: 12, color: C.faint, padding: '0 12px', lineHeight: 1.5}}>Editor: CapCut<br />Engine ready</div>
			</div>
			{children}
		</div>
	</AbsoluteFill>
);
const Btn: React.FC<{children: React.ReactNode; primary?: boolean}> = ({children, primary}) => (
	<div style={{fontSize: 13.5, fontWeight: 600, padding: '7px 14px', borderRadius: 8, background: primary ? C.orange : C.panel2, color: primary ? '#17120f' : C.text, border: primary ? 'none' : `1px solid ${C.line}`}}>{children}</div>
);
const wave = (n: number, seed: number) => Array.from({length: n}, (_, i) => 0.18 + 0.82 * Math.abs(Math.sin(i * 0.37 + seed) * Math.sin(i * 0.11 + seed * 2) * Math.cos(i * 0.05 + seed)));
const Wave: React.FC<{n: number; seed: number; color: string}> = ({n, seed, color}) => (
	<div style={{...row, alignItems: 'center', gap: 1.5, height: '100%', padding: '0 6px', overflow: 'hidden'}}>
		{wave(n, seed).map((v, i) => <div key={i} style={{width: 2, height: `${Math.round(v * 78)}%`, background: color, borderRadius: 1, flexShrink: 0}} />)}
	</div>
);
const thumb = (a: string, b: string) => `linear-gradient(135deg, ${a}, ${b})`;

// ------------------------------------------------------------------ editor mockup
const PX = 15.2; // pixels per frame-ish unit on the timeline
const Clip: React.FC<{left: number; width: number; color: string; label: string; selected?: boolean; children?: React.ReactNode}> = ({left, width, color, label, selected, children}) => (
	<div style={{position: 'absolute', left: left * PX, width: width * PX - 3, top: 5, bottom: 5, borderRadius: 7, background: `${color}33`, border: `${selected ? 2 : 1}px solid ${selected ? '#fff' : color}`, overflow: 'hidden', boxSizing: 'border-box'}}>
		<div style={{position: 'absolute', left: 8, top: 4, fontSize: 11.5, fontWeight: 600, color: C.text, whiteSpace: 'nowrap', zIndex: 1, textShadow: '0 1px 2px #000'}}>{label}</div>
		{children}
	</div>
);
const Track: React.FC<{name: string; hint: string; h?: number; children: React.ReactNode}> = ({name, hint, h = 50, children}) => (
	<div style={{...row, height: h, borderBottom: `1px solid ${C.line}`}}>
		<div style={{width: 132, flexShrink: 0, borderRight: `1px solid ${C.line}`, padding: '7px 12px', boxSizing: 'border-box'}}>
			<div style={{fontSize: 13, fontWeight: 600}}>{name}</div><div style={{fontSize: 11, color: C.faint, marginTop: 1}}>{hint}</div>
		</div>
		<div style={{position: 'relative', flex: 1}}>{children}</div>
	</div>
);
const Field: React.FC<{label: string; value: string; fill?: number}> = ({label, value, fill}) => (
	<div style={{marginBottom: 13}}>
		<div style={{...row, justifyContent: 'space-between', fontSize: 12.5, color: C.dim, marginBottom: 6}}><span>{label}</span><span style={{color: C.text, fontVariantNumeric: 'tabular-nums'}}>{value}</span></div>
		{fill === undefined ? null : (
			<div style={{height: 5, borderRadius: 3, background: C.line, position: 'relative'}}>
				<div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: `${fill * 100}%`, background: C.orange, borderRadius: 3}} />
				<div style={{position: 'absolute', left: `calc(${fill * 100}% - 7px)`, top: -5, width: 14, height: 14, borderRadius: 7, background: '#fff'}} />
			</div>
		)}
	</div>
);
const Section: React.FC<{title: string; children: React.ReactNode}> = ({title, children}) => (
	<div style={{padding: '14px 16px 4px', borderBottom: `1px solid ${C.line}`}}>
		<div style={{fontSize: 11.5, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: C.faint, marginBottom: 12}}>{title}</div>{children}
	</div>
);

const TOOLS = ['Media', 'Audio', 'Text', 'Stickers', 'Effects', 'Transitions', 'Captions', 'Looks', 'Adjust', 'Templates', 'Styles'];
const Glyph: React.FC<{i: number; on: boolean}> = ({i, on}) => {
	const c = on ? C.orange : C.dim;
	const shapes = [
		<div style={{width: 18, height: 14, border: `2px solid ${c}`, borderRadius: 3}} />,
		<div style={{...row, gap: 2, alignItems: 'center', height: 16}}>{[8, 14, 6, 12].map((h, k) => <div key={k} style={{width: 2.5, height: h, background: c, borderRadius: 1}} />)}</div>,
		<div style={{fontSize: 17, fontWeight: 800, color: c, lineHeight: '16px'}}>T</div>,
		<div style={{width: 15, height: 15, borderRadius: 8, border: `2px solid ${c}`}} />,
		<div style={{width: 13, height: 13, background: c, transform: 'rotate(45deg)', borderRadius: 2}} />,
		<div style={{...row}}><div style={{width: 9, height: 14, border: `2px solid ${c}`, borderRadius: 2}} /><div style={{width: 9, height: 14, background: c, borderRadius: 2, marginLeft: -2}} /></div>,
		<div style={{width: 18, height: 12, border: `2px solid ${c}`, borderRadius: 3, borderTopWidth: 6}} />,
		<div style={{width: 16, height: 16, borderRadius: 8, background: `conic-gradient(${c}, transparent, ${c})`}} />,
		<div style={{...col, gap: 3}}>{[14, 9, 12].map((w, k) => <div key={k} style={{width: 18, height: 2, background: C.line, position: 'relative'}}><div style={{position: 'absolute', left: w, top: -2, width: 5, height: 6, background: c, borderRadius: 2}} /></div>)}</div>,
		<div style={{display: 'grid', gridTemplateColumns: '7px 7px', gap: 2}}>{[0, 1, 2, 3].map((k) => <div key={k} style={{width: 7, height: 7, background: c, borderRadius: 1.5}} />)}</div>,
		<div style={{width: 16, height: 16, border: `2px solid ${c}`, borderRadius: '50% 50% 50% 4px'}} />,
	];
	return <div style={{height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{shapes[i]}</div>;
};
const Slider: React.FC<{label: string; value: string; at: number}> = ({label, value, at}) => (
	<div style={{...row, alignItems: 'center', gap: 10, marginBottom: 10}}>
		<div style={{width: 78, fontSize: 12.5, color: C.dim}}>{label}</div>
		<div style={{flex: 1, height: 4, borderRadius: 2, background: C.line, position: 'relative'}}>
			<div style={{position: 'absolute', left: `${Math.min(50, at * 100)}%`, width: `${Math.abs(at - 0.5) * 100}%`, top: 0, bottom: 0, background: C.orange, borderRadius: 2}} />
			<div style={{position: 'absolute', left: `calc(${at * 100}% - 6px)`, top: -4, width: 12, height: 12, borderRadius: 6, background: '#fff'}} />
		</div>
		<div style={{width: 34, textAlign: 'right', fontSize: 12.5, fontVariantNumeric: 'tabular-nums'}}>{value}</div>
	</div>
);
const Wheel: React.FC<{label: string; x: number; y: number}> = ({label, x, y}) => (
	<div style={{...col, alignItems: 'center', gap: 6}}>
		<div style={{width: 66, height: 66, borderRadius: 33, background: 'conic-gradient(#ff5a5a, #ffd24a, #5aff7a, #4ad2ff, #6a5aff, #ff5ad2, #ff5a5a)', position: 'relative'}}>
			<div style={{position: 'absolute', inset: 5, borderRadius: 30, background: 'radial-gradient(circle, #5b5966 0%, #24232c 78%)'}} />
			<div style={{position: 'absolute', left: 33 + x - 5, top: 33 + y - 5, width: 10, height: 10, borderRadius: 5, background: '#fff', border: '2px solid #131217', boxSizing: 'border-box'}} />
		</div>
		<div style={{fontSize: 11.5, color: C.dim}}>{label}</div>
	</div>
);

const TextInspector: React.FC = () => (
	<>
		<div style={{padding: '12px 16px', borderBottom: `1px solid ${C.line}`}}>
			<div style={{fontSize: 12, color: C.faint}}>Selected · Text</div>
			<div style={{fontSize: 15.5, fontWeight: 600, marginTop: 3}}>Your nails deserve a glow up</div>
		</div>
		<Section title="Text">
			<div style={{...row, gap: 8, marginBottom: 13}}>
				{[['Style', 'headline'], ['Typeface', 'Poppins']].map(([l, v]) => (
					<div key={l} style={{flex: 1}}><div style={{fontSize: 12.5, color: C.dim, marginBottom: 6}}>{l}</div>
						<div style={{background: C.panel, border: `1px solid ${C.line}`, borderRadius: 7, padding: '7px 10px', fontSize: 13}}>{v} ▾</div></div>
				))}
			</div>
			<Field label="Size" value="88" fill={0.62} />
			<div style={{...row, gap: 8, marginBottom: 14, alignItems: 'center'}}>
				<span style={{fontSize: 12.5, color: C.dim, flex: 1}}>Colours</span>
				{['#ffffff', '#f7c59f', '#e86a92', '#1a0f14'].map((c) => <div key={c} style={{width: 22, height: 22, borderRadius: 6, background: c, border: `1px solid ${C.line}`}} />)}
			</div>
		</Section>
		<Section title="Animation in">
			<div style={{...row, flexWrap: 'wrap', gap: 6, marginBottom: 14}}>
				{['rise', 'pop', 'slam', 'letters', 'mask', 'typewriter'].map((m, i) => (
					<div key={m} style={{fontSize: 12.5, padding: '5px 10px', borderRadius: 20, background: i === 2 ? C.orange : C.panel, color: i === 2 ? '#17120f' : C.dim, border: `1px solid ${i === 2 ? C.orange : C.line}`, fontWeight: i === 2 ? 600 : 400}}>{m}</div>
				))}
			</div>
		</Section>
		<Section title="Timing">
			<Field label="Length" value="2.4 s" fill={0.4} />
			<Field label="Fade out" value="0.3 s" fill={0.15} />
		</Section>
		<Section title="Sound on entry">
			<div style={{background: C.panel, border: `1px solid ${C.line}`, borderRadius: 7, padding: '7px 10px', fontSize: 13, marginBottom: 12}}>impact-slam ▾</div>
			<Field label="Volume" value="−12 dB" fill={0.35} />
		</Section>
	</>
);
const ColorInspector: React.FC = () => (
	<>
		<div style={{...row, gap: 8, padding: '12px 16px', borderBottom: `1px solid ${C.line}`}}>
			<div style={{flex: 1, textAlign: 'center', fontSize: 13, fontWeight: 600, padding: '7px 0', borderRadius: 8, background: `${C.teal}26`, color: C.teal, border: `1px solid ${C.teal}`}}>Auto balance</div>
			<div style={{flex: 1, textAlign: 'center', fontSize: 13, fontWeight: 600, padding: '7px 0', borderRadius: 8, background: C.panel2, border: `1px solid ${C.line}`}}>Match to shot…</div>
		</div>
		<Section title="Look">
			<div style={{...row, gap: 8, alignItems: 'center', marginBottom: 12}}>
				<div style={{flex: 1, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 7, padding: '7px 10px', fontSize: 13}}>golden-hour ▾</div>
				<div style={{fontSize: 12.5, color: C.dim}}>Import .cube</div>
			</div>
			<Slider label="Strength" value="60" at={0.8} />
		</Section>
		<Section title="Basic">
			<Slider label="Temperature" value="+8" at={0.58} />
			<Slider label="Tint" value="−2" at={0.48} />
			<Slider label="Exposure" value="+0.3" at={0.56} />
			<Slider label="Contrast" value="+12" at={0.62} />
			<Slider label="Highlights" value="−18" at={0.38} />
			<Slider label="Shadows" value="+10" at={0.6} />
			<Slider label="Saturation" value="+6" at={0.56} />
		</Section>
		<Section title="Wheels and curve">
			<div style={{...row, justifyContent: 'space-between', marginBottom: 14}}>
				<Wheel label="Shadows" x={-6} y={5} /><Wheel label="Midtones" x={3} y={-2} /><Wheel label="Highlights" x={9} y={-6} />
				<div style={{...col, alignItems: 'center', gap: 6}}>
					<svg width={66} height={66} viewBox="0 0 66 66" style={{background: C.panel, borderRadius: 6, border: `1px solid ${C.line}`}}>
						<path d="M0 22H66M0 44H66M22 0V66M44 0V66" stroke={C.line} strokeWidth={1} />
						<path d="M2 64 C 22 60, 30 30, 64 2" stroke={C.orange} strokeWidth={2} fill="none" />
						<circle cx={20} cy={54} r={3} fill="#fff" /><circle cx={44} cy={18} r={3} fill="#fff" />
					</svg>
					<div style={{fontSize: 11.5, color: C.dim}}>Curve</div>
				</div>
			</div>
		</Section>
	</>
);

const Editor: React.FC<{mode: 'text' | 'color'}> = ({mode}) => {
	const color = mode === 'color';
	const tool = color ? 7 : 1;
	const tabs = color ? ['Video', 'Audio', 'Speed', 'Animation', 'Adjust'] : ['Text', 'Animation', 'Tracking', 'Audio'];
	const activeTab = color ? 4 : 0;
	return (
		<AbsoluteFill style={{background: C.bg, color: C.text, fontFamily: font, fontSize: 14}}>
			<div style={{...row, height: 48, alignItems: 'center', borderBottom: `1px solid ${C.line}`, padding: '0 16px', gap: 14, flexShrink: 0}}>
				<div style={{...row, gap: 8}}>{['#ff5f57', '#febc2e', '#28c840'].map((c) => <div key={c} style={{width: 12, height: 12, borderRadius: 6, background: c}} />)}</div>
				<div style={{fontSize: 13, color: C.dim, marginLeft: 10}}>‹ Projects</div>
				<div style={{flex: 1, textAlign: 'center', fontWeight: 600, fontSize: 14.5}}>Nail Art Promo <span style={{color: C.faint, fontWeight: 400}}>· saved</span></div>
				<div style={{fontSize: 12, color: C.teal, border: `1px solid ${C.line}`, borderRadius: 20, padding: '3px 10px'}}>9:16 · 30 fps</div>
				<Btn>Ask Claude</Btn><Btn>Send to…</Btn><Btn primary>Export</Btn>
			</div>
			<div style={{...row, flex: 1, minHeight: 0}}>
				{/* left: tool tabs + browser */}
				<div style={{...col, width: 452, borderRight: `1px solid ${C.line}`, flexShrink: 0}}>
					<div style={{...row, borderBottom: `1px solid ${C.line}`, padding: '8px 6px 6px'}}>
						{TOOLS.map((t, i) => (
							<div key={t} style={{...col, flex: 1, alignItems: 'center', gap: 4, padding: '4px 0', borderRadius: 7, background: i === tool ? C.panel2 : 'transparent'}}>
								<Glyph i={i} on={i === tool} />
								<div style={{fontSize: 9.5, color: i === tool ? C.text : C.dim, fontWeight: i === tool ? 600 : 400}}>{t}</div>
							</div>
						))}
					</div>
					{color ? (
						<div style={{padding: 14}}>
							<div style={{fontSize: 12, color: C.faint, marginBottom: 10}}>Looks · click to apply to the selected scene</div>
							<div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10}}>
								{[['golden-hour', 'sepia(.35) saturate(1.3) brightness(1.05)', true], ['warm-film', 'sepia(.25) contrast(1.05)', false], ['teal-orange', 'hue-rotate(-12deg) saturate(1.35)', false], ['clean-commercial', 'brightness(1.1) contrast(1.1)', false], ['pastel-dream', 'saturate(.7) brightness(1.15)', false], ['moody-teal', 'hue-rotate(25deg) saturate(.7) brightness(.8)', false], ['vintage-fade', 'sepia(.5) contrast(.85)', false], ['cool-night', 'hue-rotate(40deg) brightness(.7)', false], ['bw-contrast', 'grayscale(1) contrast(1.3)', false]].map(([n, f, on]) => (
									<div key={n as string} style={{borderRadius: 9, overflow: 'hidden', border: `${on ? 2 : 1}px solid ${on ? C.orange : C.line}`, background: C.panel}}>
										<div style={{height: 92, background: thumb('#c96f9a', '#3b1f2b'), filter: f as string, position: 'relative'}}>
											<div style={{position: 'absolute', left: 38, top: 18, width: 56, height: 56, borderRadius: 28, background: 'radial-gradient(circle at 35% 30%, #ffd9c2, #f7a98a 60%, #c96f6a)'}} />
										</div>
										<div style={{fontSize: 11.5, padding: '5px 7px', color: on ? C.text : C.dim}}>{n}</div>
									</div>
								))}
							</div>
						</div>
					) : (
						<>
							<div style={{...row, gap: 6, padding: '12px 14px 0'}}>
								{['Library', 'Project', 'Music', 'Sound effects', 'Voice-over'].map((t, i) => (
									<div key={t} style={{fontSize: 12.5, padding: '5px 10px', borderRadius: 20, background: i === 3 ? C.text : C.panel, color: i === 3 ? '#131217' : C.dim, border: `1px solid ${i === 3 ? C.text : C.line}`, fontWeight: i === 3 ? 600 : 400}}>{t}</div>
								))}
							</div>
							<div style={{margin: '12px 14px', padding: '8px 12px', borderRadius: 8, background: C.panel, border: `1px solid ${C.line}`, color: C.faint, fontSize: 13}}>Search sounds: whoosh, pop, uplift…</div>
							<div style={{...col, gap: 7, padding: '0 14px', overflow: 'hidden'}}>
								{[['whoosh-whip', '0.3 s · transition', C.violet, 3], ['ui-like-pop', '0.2 s · interface', C.violet, 5], ['sparkle-magic-chime', '2.5 s · reveal', C.violet, 7], ['impact-slam', '0.5 s · impact', C.violet, 9], ['drum-clap', '0.3 s · beat', C.violet, 11], ['riser-tonal', '4.0 s · build-up', C.violet, 13]].map(([n, m, c, sd]) => (
									<div key={n as string} style={{...row, alignItems: 'center', gap: 10, background: C.panel, borderRadius: 9, padding: '8px 10px', border: `1px solid ${C.line}`}}>
										<div style={{width: 26, height: 26, borderRadius: 13, background: C.panel2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
											<div style={{width: 0, height: 0, borderLeft: `8px solid ${c}`, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', marginLeft: 2}} />
										</div>
										<div style={{width: 150, flexShrink: 0}}><div style={{fontSize: 13, fontWeight: 600}}>{n}</div><div style={{fontSize: 11.5, color: C.faint}}>{m}</div></div>
										<div style={{flex: 1, minWidth: 0, height: 24, overflow: 'hidden'}}><Wave n={40} seed={sd as number} color={c as string} /></div>
										<div style={{width: 22, height: 22, borderRadius: 11, background: C.orange, color: '#17120f', fontWeight: 700, fontSize: 15, lineHeight: '21px', textAlign: 'center', flexShrink: 0}}>+</div>
									</div>
								))}
							</div>
						</>
					)}
				</div>
				{/* player */}
				<div style={{...col, flex: 1, background: '#0e0d12', minWidth: 0}}>
					<div style={{height: 34, ...row, alignItems: 'center', padding: '0 14px', fontSize: 12.5, color: C.dim, borderBottom: `1px solid ${C.line}`}}>Player<div style={{flex: 1}} />{color ? 'Before / After' : 'Fit'} ▾</div>
					<div style={{...row, flex: 1, alignItems: 'center', justifyContent: 'center', gap: 26, minHeight: 0}}>
						<div style={{width: 262, height: 466, borderRadius: 10, background: thumb('#e86a92', '#3b1f2b'), position: 'relative', overflow: 'hidden', boxShadow: '0 20px 60px #0009', filter: color ? 'sepia(.3) saturate(1.25) brightness(1.05)' : undefined}}>
							<div style={{position: 'absolute', left: 52, top: 104, width: 158, height: 158, borderRadius: 80, background: 'radial-gradient(circle at 35% 30%, #ffd9c2, #f7a98a 60%, #c96f6a)'}} />
							<div style={{position: 'absolute', left: 22, right: 22, top: 292, fontSize: 24, fontWeight: 800, lineHeight: 1.1, color: '#fff', letterSpacing: -0.4}}>Your nails deserve a <span style={{color: '#f7c59f'}}>glow up</span></div>
							{color ? null : <div style={{position: 'absolute', left: 14, right: 14, top: 284, height: 70, border: '1.5px solid #fff', borderRadius: 3}} />}
							{color ? null : [[8, 278], [248, 278], [8, 348], [248, 348]].map(([x, y]) => <div key={`${x}-${y}`} style={{position: 'absolute', left: x, top: y, width: 9, height: 9, background: '#fff', borderRadius: 2}} />)}
							<div style={{position: 'absolute', left: 28, right: 28, bottom: 30, textAlign: 'center', fontSize: 14, fontWeight: 700, color: '#fff', background: '#000a', borderRadius: 6, padding: '5px 0'}}>Lasts up to three weeks</div>
						</div>
						{color ? (
							<div style={{...col, gap: 12, width: 250}}>
								{[['Waveform', 0], ['Histogram', 1]].map(([n, k]) => (
									<div key={n as string} style={{background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: '8px 10px'}}>
										<div style={{fontSize: 11.5, color: C.faint, marginBottom: 6}}>{n}</div>
										<div style={{...row, alignItems: 'flex-end', gap: 1, height: 92, borderBottom: `1px solid ${C.line}`}}>
											{Array.from({length: 76}, (_, i) => {
												const v = k === 0 ? 0.3 + 0.55 * Math.abs(Math.sin(i * 0.21) * Math.cos(i * 0.07)) : Math.exp(-((i - 30) ** 2) / 380) * 0.9 + Math.exp(-((i - 60) ** 2) / 90) * 0.4;
												return <div key={i} style={{width: 2, height: `${v * 100}%`, background: k === 0 ? `rgba(240,160,130,${0.35 + v * 0.6})` : ['#f0609a', '#33cdb4', '#8b7bff'][i % 3], opacity: 0.85}} />;
											})}
										</div>
									</div>
								))}
								<div style={{fontSize: 12, color: C.dim, lineHeight: 1.45}}>Skin tones in range · no clipping</div>
							</div>
						) : null}
					</div>
					<div style={{...row, alignItems: 'center', justifyContent: 'center', gap: 18, height: 46, color: C.dim, fontSize: 13, fontVariantNumeric: 'tabular-nums', borderTop: `1px solid ${C.line}`}}>
						<span>00:06:12</span>
						<div style={{width: 0, height: 0, borderLeft: `13px solid ${C.text}`, borderTop: '8px solid transparent', borderBottom: '8px solid transparent'}} />
						<span>00:15:00</span>
					</div>
				</div>
				{/* inspector */}
				<div style={{...col, width: 348, borderLeft: `1px solid ${C.line}`, flexShrink: 0, overflow: 'hidden'}}>
					<div style={{...row, borderBottom: `1px solid ${C.line}`, padding: '0 8px'}}>
						{tabs.map((t, i) => (
							<div key={t} style={{fontSize: 13, padding: '11px 10px 9px', fontWeight: i === activeTab ? 600 : 400, color: i === activeTab ? C.text : C.dim, borderBottom: `2px solid ${i === activeTab ? C.orange : 'transparent'}`}}>{t}</div>
						))}
					</div>
					{color ? <ColorInspector /> : <TextInspector />}
				</div>
			</div>
			{/* timeline */}
			<div style={{...col, height: 356, borderTop: `1px solid ${C.line}`, background: C.panel, flexShrink: 0}}>
				<div style={{...row, alignItems: 'center', gap: 8, height: 42, padding: '0 12px', borderBottom: `1px solid ${C.line}`}}>
					{['Undo', 'Redo', 'Split', 'Delete', 'Freeze', 'Reverse', 'Crop', 'Auto captions', 'Remove silences', 'Snap to beat'].map((b2, i) => (
						<div key={b2} style={{fontSize: 12.5, padding: '5px 10px', borderRadius: 7, background: i === 9 ? `${C.teal}26` : 'transparent', color: i === 9 ? C.teal : C.text, border: `1px solid ${i === 9 ? C.teal : 'transparent'}`}}>{b2}</div>
					))}
					<div style={{flex: 1}} />
					<div style={{fontSize: 12.5, color: C.dim}}>Magnet · Link · Zoom ▬▬●▬</div>
				</div>
				<div style={{position: 'relative', flex: 1}}>
					<div style={{...row, height: 24, borderBottom: `1px solid ${C.line}`}}>
						<div style={{width: 132, flexShrink: 0, borderRight: `1px solid ${C.line}`}} />
						<div style={{position: 'relative', flex: 1}}>
							{Array.from({length: 17}, (_, i) => (
								<div key={i} style={{position: 'absolute', left: i * 6 * PX, top: 0, bottom: 0, borderLeft: `1px solid ${C.line}`, paddingLeft: 5, fontSize: 11, color: C.faint, lineHeight: '24px', fontVariantNumeric: 'tabular-nums'}}>{`00:${String(i).padStart(2, '0')}`}</div>
							))}
						</div>
					</div>
					<Track name="Text" hint="titles, captions" h={44}>
						<Clip left={2} width={14} color={C.pink} label="Tired of chipped nails?" />
						<Clip left={31} width={14.5} color={C.pink} label="Your nails deserve a glow up" selected={!color} />
						<Clip left={62} width={16} color={C.pink} label="Book now" />
					</Track>
					<Track name="Stickers" hint="graphics, effects" h={44}>
						<Clip left={18} width={9} color={C.yellow} label="arrow-draw-on" />
						<Clip left={47} width={12} color={C.yellow} label="sticker-new" />
						<Clip left={76} width={12} color={C.yellow} label="follow-button" />
					</Track>
					<Track name="Video" hint="main track" h={62}>
						{[[0, 17, 'hands-closeup', '#e86a92', '#5b2a3d'], [17, 14, 'gel-set', '#f7c59f', '#b06a5a'], [31, 16, 'painting', '#c96f9a', '#3b1f2b'], [47, 15, 'result', '#ffb38a', '#e86a92'], [62, 26, 'end-card', '#3b1f2b', '#1a0f14']].map(([l, w, n, a2, b2], i) => (
							<div key={n as string} style={{position: 'absolute', left: (l as number) * PX, width: (w as number) * PX - 3, top: 5, bottom: 5, borderRadius: 7, background: thumb(a2 as string, b2 as string), overflow: 'hidden', border: color && i === 2 ? '2px solid #fff' : 'none', boxSizing: 'border-box'}}>
								<div style={{position: 'absolute', left: 8, top: 4, fontSize: 11.5, fontWeight: 600, textShadow: '0 1px 3px #000'}}>{n}{color && i === 2 ? ' · golden-hour 60%' : ''}</div>
							</div>
						))}
					</Track>
					<Track name="Voice" hint="narration" h={44}><Clip left={1} width={58} color={C.orange} label=""><Wave n={230} seed={1.3} color={C.orange} /></Clip></Track>
					<Track name="Music" hint="118 BPM" h={44}>
						<Clip left={0} width={88} color={C.teal} label=""><Wave n={350} seed={4.1} color={`${C.teal}aa`} /></Clip>
						{Array.from({length: 30}, (_, i) => <div key={i} style={{position: 'absolute', left: i * 3.05 * PX, top: 0, width: 1, height: i % 4 === 0 ? 12 : 6, background: C.teal}} />)}
					</Track>
					<Track name="SFX" hint="on cuts" h={44}>
						{[[16, 3, 'whip'], [28, 3, 'whip'], [31.3, 4, 'slam'], [46, 3, 'pop'], [61, 5, 'chime']].map(([l, w, n], i) => <Clip key={i} left={l as number} width={w as number} color={C.violet} label={n as string} />)}
					</Track>
					<div style={{position: 'absolute', left: 132 + 36.7 * PX, top: 0, bottom: 0, width: 2, background: '#fff'}} />
					<div style={{position: 'absolute', left: 132 + 36.7 * PX - 6, top: 0, width: 14, height: 14, background: '#fff', borderRadius: '3px 3px 8px 8px'}} />
				</div>
			</div>
		</AbsoluteFill>
	);
};

// ------------------------------------------------------------------ library / projects mockup
const Home: React.FC = () => (
	<Chrome active="Projects" title="Tibeb" right={<div style={{...row, gap: 10}}><Btn>Open folder</Btn><Btn primary>New video</Btn></div>}>
		<div style={{...col, flex: 1, minWidth: 0, padding: '26px 30px', gap: 22}}>
			<div>
				<div style={{fontSize: 22, fontWeight: 700}}>Projects</div>
				<div style={{...row, gap: 18, marginTop: 14}}>
					{[['Nail Art Promo', 'Editing · 5 scenes', '#e86a92', '#3b1f2b', 0.6], ['Fida Origin Story', 'Exported · 1:15', '#e31e24', '#5a0c10', 1], ['Fida Order Flow', 'Captions next', '#ff7a59', '#8e0d12', 0.8], ['Market Offer', 'Draft · 2 scenes', '#16a34a', '#0f2e1d', 0.25], ['Studio Tour', 'Footage imported', '#7c5cff', '#1e1b2e', 0.1]].map(([n, s, a, b, p]) => (
						<div key={n as string} style={{width: 232, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 13, overflow: 'hidden'}}>
							<div style={{height: 250, background: thumb(a as string, b as string), position: 'relative'}}>
								<div style={{position: 'absolute', left: 14, bottom: 14, right: 14, fontSize: 20, fontWeight: 800, lineHeight: 1.1}}>{n}</div>
							</div>
							<div style={{padding: '11px 14px 13px'}}>
								<div style={{fontSize: 12.5, color: C.dim}}>{s}</div>
								<div style={{height: 4, borderRadius: 2, background: C.line, marginTop: 9}}><div style={{width: `${(p as number) * 100}%`, height: 4, borderRadius: 2, background: p === 1 ? C.teal : C.orange}} /></div>
							</div>
						</div>
					))}
				</div>
			</div>
			<div style={{...col, flex: 1, minHeight: 0}}>
				<div style={{...row, alignItems: 'center', gap: 14}}>
					<div style={{fontSize: 22, fontWeight: 700}}>Library</div>
					<div style={{fontSize: 13, color: C.dim}}>350 assets</div>
					<div style={{flex: 1}} />
					<div style={{width: 380, padding: '8px 12px', borderRadius: 8, background: C.panel, border: `1px solid ${C.line}`, color: C.faint, fontSize: 13}}>Search: whoosh, warm, vertical, title…</div>
				</div>
				<div style={{...row, gap: 7, marginTop: 13}}>
					{['Everything', 'Sounds 87', 'Music 22', 'Graphics 73', 'Motion 16', 'Overlays 38', 'Transitions 18', 'Backgrounds 51', 'Typefaces 11', 'Looks 20'].map((t, i) => (
						<div key={t} style={{fontSize: 13, padding: '6px 12px', borderRadius: 20, background: i === 0 ? C.text : C.panel, color: i === 0 ? '#131217' : C.dim, border: `1px solid ${i === 0 ? C.text : C.line}`, fontWeight: i === 0 ? 600 : 400}}>{t}</div>
					))}
				</div>
				<div style={{...row, gap: 14, marginTop: 16, alignItems: 'flex-start'}}>
					{[['mesh-aurora', 'Background', thumb('#19e6b3', '#b833e6')], ['grainy-coral', 'Background', thumb('#ff8066', '#8c2673')], ['spotlight-red', 'Background', 'radial-gradient(circle at 50% 42%, #d91f24, #060608 70%)'], ['light-leak-warm', 'Overlay', 'radial-gradient(circle at 100% 0%, #ff8c33, #000 60%)'], ['sunburst-cream', 'Texture', 'repeating-conic-gradient(#faf0d6 0 11.25deg, #f2deb3 0 22.5deg)'], ['halftone-red', 'Texture', 'radial-gradient(#d92626 34%, #f5edd9 36%) 0 0 / 14px 14px']].map(([n, k, bg]) => (
						<div key={n} style={{width: 150, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 11, overflow: 'hidden'}}>
							<div style={{height: 150, background: bg}} />
							<div style={{padding: '8px 10px 10px'}}><div style={{fontSize: 13, fontWeight: 600}}>{n}</div><div style={{fontSize: 11.5, color: C.faint}}>{k}</div></div>
						</div>
					))}
					<div style={{...col, gap: 9, flex: 1, minWidth: 0}}>
						{[['whoosh-whip', 'Whip pans and very fast cuts', C.violet, 3], ['sparkle-magic-chime', 'Before → after reveals', C.violet, 7], ['ethio-tizita', 'Tizita scale, 6/8 groove · 100 BPM', C.teal, 4], ['uplift-corporate', 'Bright plucks · 120 BPM', C.teal, 6]].map(([n, u, c, s]) => (
							<div key={n as string} style={{...row, alignItems: 'center', gap: 12, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: '9px 12px'}}>
								<div style={{width: 28, height: 28, borderRadius: 14, background: C.panel2, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
									<div style={{width: 0, height: 0, borderLeft: `9px solid ${c}`, borderTop: '6px solid transparent', borderBottom: '6px solid transparent', marginLeft: 2}} />
								</div>
								<div style={{width: 250, flexShrink: 0}}><div style={{fontSize: 13, fontWeight: 600}}>{n}</div><div style={{fontSize: 11.5, color: C.faint}}>{u}</div></div>
								<div style={{flex: 1, minWidth: 0, height: 26, overflow: 'hidden'}}><Wave n={70} seed={s as number} color={c as string} /></div>
								<div style={{fontSize: 12, color: C.dim, border: `1px solid ${C.line}`, borderRadius: 6, padding: '3px 9px', whiteSpace: 'nowrap'}}>Add to project</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	</Chrome>
);

// ------------------------------------------------------------------ interchange diagram
const Box: React.FC<{title: string; sub: string; color: string; w?: number}> = ({title, sub, color, w = 400}) => (
	<div style={{width: w, background: C.panel, border: `1px solid ${C.line}`, borderLeft: `4px solid ${color}`, borderRadius: 12, padding: '14px 18px', boxSizing: 'border-box'}}>
		<div style={{fontSize: 19, fontWeight: 700}}>{title}</div>
		<div style={{fontSize: 14.5, color: C.dim, marginTop: 4, lineHeight: 1.4}}>{sub}</div>
	</div>
);
const Arrow: React.FC<{label?: string; both?: boolean}> = ({label, both}) => (
	<div style={{...col, alignItems: 'center', justifyContent: 'center', flex: 1, minWidth: 90, padding: '0 14px'}}>
		<div style={{fontSize: 12.5, color: C.faint, height: 18}}>{label}</div>
		<div style={{...row, alignItems: 'center', width: '100%'}}>
			{both ? <div style={{width: 0, height: 0, borderRight: `10px solid ${C.dim}`, borderTop: '6px solid transparent', borderBottom: '6px solid transparent'}} /> : null}
			<div style={{flex: 1, height: 2, background: C.dim}} />
			<div style={{width: 0, height: 0, borderLeft: `10px solid ${C.dim}`, borderTop: '6px solid transparent', borderBottom: '6px solid transparent'}} />
		</div>
		<div style={{height: 18}} />
	</div>
);
const Interchange: React.FC = () => (
	<AbsoluteFill style={{background: C.bg, color: C.text, fontFamily: font, padding: '56px 64px'}}>
		<div style={{fontSize: 42, fontWeight: 700, letterSpacing: -0.5}}>Open interchange</div>
		<div style={{fontSize: 21, color: C.dim, marginTop: 8}}>AI and Remotion work arrives in any editor as separate layers, and edits made there can come back.</div>
		<div style={{...row, alignItems: 'center', justifyContent: 'space-between', marginTop: 50}}>
			<div style={{...col, gap: 14}}>
				<div style={{fontSize: 13, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: C.faint}}>Makers</div>
				<Box title="Claude" sub="plans, cuts, captions, sound design" color={C.orange} />
				<Box title="Remotion" sub="animated scenes, text, graphics" color={C.violet} />
				<Box title="You" sub="footage, recordings, decisions" color={C.teal} />
				<Box title="Other tools" sub="OBS, AI generators, stock, voice" color={C.faint} />
			</div>
			<Arrow label="write" both />
			<div style={{...col, alignItems: 'center', gap: 14}}>
				<div style={{fontSize: 13, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: C.faint}}>Neutral core</div>
				<div style={{width: 470, background: C.panel2, border: `2px solid ${C.orange}`, borderRadius: 16, padding: '22px 24px', boxSizing: 'border-box'}}>
					<div style={{fontSize: 25, fontWeight: 700}}>edit.json</div>
					<div style={{fontSize: 15, color: C.dim, marginTop: 6, lineHeight: 1.45}}>One timeline: tracks, clips, text, sound, looks. Versioned, open schema.</div>
					<div style={{height: 1, background: C.line, margin: '16px 0'}} />
					<div style={{fontSize: 17, fontWeight: 700}}>Layered package</div>
					<div style={{...row, flexWrap: 'wrap', gap: 7, marginTop: 10}}>
						{['cut source clips', 'one clip per animation', 'captions as text', 'audio stems', 'looks as LUTs', 'OTIO + XML'].map((t) => (
							<div key={t} style={{fontSize: 13, padding: '4px 10px', borderRadius: 20, background: C.panel, border: `1px solid ${C.line}`, color: C.text}}>{t}</div>
						))}
					</div>
				</div>
				<div style={{fontSize: 14, color: C.faint}}>Nothing is flattened unless the target cannot hold it</div>
			</div>
			<Arrow label="adapters" both />
			<div style={{...col, gap: 14}}>
				<div style={{fontSize: 13, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: C.faint}}>Editors and beyond</div>
				<Box title="CapCut" sub="native project, pull changes back · experimental" color={C.pink} w={460} />
				<Box title="DaVinci Resolve" sub="live bridge, OTIO / FCPXML import" color={C.yellow} w={460} />
				<Box title="Premiere · Final Cut" sub="XML from the same timeline" color={C.violet} w={460} />
				<Box title="Any editor" sub="the folder + a five-step README" color={C.teal} w={460} />
				<Box title="Plug-ins" sub="your own adapters, hooks, MCP tools" color={C.faint} w={460} />
			</div>
		</div>
		<div style={{...row, gap: 16, marginTop: 44}}>
			{[['Layers, not pixels', 'Each animation, caption and sound stays its own clip.'], ['Never overwrite', 'Adapters create new projects and read existing ones. Changes come back as a diff you approve.'], ['Honest report', 'Every export lists what stayed editable, what was baked and what was dropped.']].map(([t, d]) => (
				<div key={t} style={{flex: 1, background: C.panel, borderRadius: 14, padding: '18px 22px'}}>
					<div style={{fontSize: 18, fontWeight: 700}}>{t}</div><div style={{fontSize: 15, color: C.dim, marginTop: 6, lineHeight: 1.45}}>{d}</div>
				</div>
			))}
		</div>
	</AbsoluteFill>
);

registerRoot(() => (
	<>
		<Composition id="Interchange" component={Interchange} width={1920} height={880} fps={30} durationInFrames={1} />
		<Composition id="Roadmap" component={Roadmap} width={1920} height={900} fps={30} durationInFrames={1} />
		<Composition id="Editor" component={Editor} width={1680} height={1050} fps={30} durationInFrames={1} defaultProps={{mode: 'text' as const}} />
		<Composition id="Color" component={Editor} width={1680} height={1050} fps={30} durationInFrames={1} defaultProps={{mode: 'color' as const}} />
		<Composition id="Home" component={Home} width={1680} height={900} fps={30} durationInFrames={1} />
	</>
));
