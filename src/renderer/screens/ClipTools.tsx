import {gradeTables} from '@motion/utils/grade';
import {keyValue} from '@motion/utils/keys';
import {useEffect, useRef, useState} from 'react';

type RGB = [number, number, number];
const AMOUNT = 0.22; // offset at the rim of a wheel

/** A colour wheel: drag towards a colour to push that tonal range towards it. Double-click resets. */
const Wheel = ({label, value, onChange}: {label: string; value?: number[]; onChange: (v: RGB | undefined) => void}) => {
	const [r, g, b] = value ?? [0, 0, 0];
	// inverse of the mapping below: where the dot sits for the stored offsets
	const x = (2 * r - g - b) / 3 / AMOUNT, y = (g - b) / Math.sqrt(3) / AMOUNT;
	const set = (e: React.PointerEvent<HTMLDivElement>) => {
		const box = e.currentTarget.getBoundingClientRect();
		let dx = ((e.clientX - box.left) / box.width) * 2 - 1, dy = -(((e.clientY - box.top) / box.height) * 2 - 1);
		const len = Math.hypot(dx, dy);
		if (len > 1) { dx /= len; dy /= len; }
		const th = Math.atan2(dy, dx), a = Math.min(1, len) * AMOUNT;
		onChange([a * Math.cos(th), a * Math.cos(th - (2 * Math.PI) / 3), a * Math.cos(th + (2 * Math.PI) / 3)].map((v) => Math.round(v * 1000) / 1000) as RGB);
	};
	return (
		<div className="wheelbox">
			<div className="wheel" role="slider" aria-label={`${label} colour`} aria-valuetext={value ? value.join(', ') : 'neutral'} tabIndex={0}
				onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); set(e); }} onPointerMove={(e) => { if (e.buttons === 1) set(e); }} onDoubleClick={() => onChange(undefined)}>
				<i style={{left: `${50 + x * 50}%`, top: `${50 - y * 50}%`}} />
			</div>
			<span>{label}</span>
		</div>
	);
};

/** Tone curve: click to add a point, drag to move it, double-click a point to remove it. */
const Curve = ({value, onChange}: {value?: number[][]; onChange: (v: number[][] | undefined) => void}) => {
	const pts = (value && value.length >= 2 ? value : [[0, 0], [1, 1]]).slice().sort((a, b) => a[0] - b[0]);
	const drag = useRef<number | null>(null);
	const S = 132;
	const pos = (e: React.PointerEvent<SVGSVGElement>) => {
		const box = e.currentTarget.getBoundingClientRect();
		return [Math.min(1, Math.max(0, (e.clientX - box.left) / box.width)), Math.min(1, Math.max(0, 1 - (e.clientY - box.top) / box.height))].map((v) => Math.round(v * 100) / 100);
	};
	const down = (e: React.PointerEvent<SVGSVGElement>) => {
		const [x, y] = pos(e);
		let i = pts.findIndex((p) => Math.hypot(p[0] - x, p[1] - y) < 0.08);
		if (i < 0 && pts.length < 6) {
			const next = [...pts, [x, y]].sort((a, b) => a[0] - b[0]);
			i = next.findIndex((p) => p[0] === x && p[1] === y);
			onChange(next);
		}
		drag.current = i;
		e.currentTarget.setPointerCapture(e.pointerId);
	};
	const move = (e: React.PointerEvent<SVGSVGElement>) => {
		const i = drag.current;
		if (i === null || i < 0 || e.buttons !== 1) return;
		const [x, y] = pos(e);
		const end = i === 0 || i === pts.length - 1;
		onChange(pts.map((p, k) => (k === i ? [end ? p[0] : Math.min(pts[i + 1][0] - 0.02, Math.max(pts[i - 1][0] + 0.02, x)), y] : p)));
	};
	return (
		<div className="wheelbox">
			<svg className="curve" width={S} height={S} viewBox="0 0 1 1" onPointerDown={down} onPointerMove={move} onPointerUp={() => { drag.current = null; }}
				onDoubleClick={(e) => { const box = e.currentTarget.getBoundingClientRect(); const x = (e.clientX - box.left) / box.width, y = 1 - (e.clientY - box.top) / box.height;
					const i = pts.findIndex((p) => Math.hypot(p[0] - x, p[1] - y) < 0.08); onChange(i > 0 && i < pts.length - 1 ? pts.filter((_, k) => k !== i) : undefined); }}>
				<path d="M0 .25H1M0 .5H1M0 .75H1M.25 0V1M.5 0V1M.75 0V1" stroke="#2f2d39" strokeWidth={0.008} fill="none" />
				<path d={pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${1 - p[1]}`).join(' ')} stroke="#fb7a3c" strokeWidth={0.018} fill="none" />
				{pts.map((p, i) => <circle key={i} cx={p[0]} cy={1 - p[1]} r={0.035} fill="#fff" />)}
			</svg>
			<span>Curve</span>
		</div>
	);
};

const lookup = (table: number[], v: number) => {
	const f = v * (table.length - 1), a = Math.floor(f);
	return table[a] + ((table[Math.min(table.length - 1, a + 1)] ?? table[a]) - table[a]) * (f - a);
};

/** Histogram of the clip's picture after its colour settings: where the reds, greens and blues sit from dark to bright. */
const Histogram = ({url, video, time, clip}: {url: string; video: boolean; time: number; clip: EditClip}) => {
	const [bins, setBins] = useState<number[][] | null>(null);
	const [clipped, setClipped] = useState('');
	const grade = JSON.stringify(['look', 'lookStrength', 'exposure', 'contrast', 'saturation', 'temperature', 'tint', 'balance', 'wheels', 'curve'].map((k) => clip[k]));
	useEffect(() => {
		let live = true;
		const measure = (el: CanvasImageSource, w: number, h: number) => {
			const c = document.createElement('canvas');
			c.width = 96;
			c.height = Math.max(1, Math.round((96 * h) / w));
			const ctx = c.getContext('2d', {willReadFrequently: true});
			if (!ctx) return;
			ctx.drawImage(el, 0, 0, c.width, c.height);
			let data: Uint8ClampedArray;
			try {
				data = ctx.getImageData(0, 0, c.width, c.height).data;
			} catch {
				return; // the picture could not be read back
			}
			const t = gradeTables(clip as Parameters<typeof gradeTables>[0]);
			const out = [new Array(48).fill(0), new Array(48).fill(0), new Array(48).fill(0)];
			let hot = 0, dark = 0;
			for (let i = 0; i < data.length; i += 4) {
				const rgb = [lookup(t.r, data[i] / 255), lookup(t.g, data[i + 1] / 255), lookup(t.b, data[i + 2] / 255)];
				rgb.forEach((v, ch) => { out[ch][Math.min(47, Math.floor(v * 48))]++; });
				if (Math.max(...rgb) >= 0.995) hot++;
				if (Math.max(...rgb) <= 0.005) dark++;
			}
			const total = data.length / 4;
			const top = Math.max(...out.flat().slice(1, -1), 1);
			if (!live) return;
			setBins(out.map((ch) => ch.map((v) => Math.min(1, v / top))));
			setClipped([hot / total > 0.02 ? `${Math.round((hot / total) * 100)} % blown out` : '', dark / total > 0.05 ? `${Math.round((dark / total) * 100)} % pure black` : ''].filter(Boolean).join(' · '));
		};
		if (video) {
			const v = document.createElement('video');
			v.crossOrigin = 'anonymous';
			v.muted = true;
			v.preload = 'auto';
			v.onloadeddata = () => { v.currentTime = Math.min(time, Math.max(0, (v.duration || time) - 0.05)); };
			v.onseeked = () => measure(v, v.videoWidth || 16, v.videoHeight || 9);
			v.src = url;
		} else {
			const im = new Image();
			im.crossOrigin = 'anonymous';
			im.onload = () => measure(im, im.naturalWidth, im.naturalHeight);
			im.src = url;
		}
		return () => { live = false; };
	}, [url, video, Math.round(time * 2), grade]);
	if (!bins) return <div className="histo dim small">Measuring the picture…</div>;
	return (
		<div className="histo">
			<svg viewBox="0 0 48 1" preserveAspectRatio="none" aria-label="Histogram: dark tones on the left, bright on the right">
				{bins.map((ch, k) => <path key={k} d={`M0 1 ${ch.map((v, i) => `L${i + 0.5} ${(1 - v).toFixed(3)}`).join(' ')} L48 1Z`} fill={['#ff5a5a', '#4ade80', '#60a5fa'][k]} fillOpacity={0.45} />)}
			</svg>
			<span className={clipped ? 'fix' : 'dim'}>{clipped || 'No clipping'}</span>
		</div>
	);
};

export const ColourTools = ({clip, url, video, time, onChange}: {clip: EditClip; url: string; video: boolean; time: number; onChange: (patch: Partial<EditClip>) => void}) => {
	const wheels = (clip.wheels ?? {}) as {shadows?: number[]; mids?: number[]; highlights?: number[]};
	const setWheel = (name: 'shadows' | 'mids' | 'highlights', v: RGB | undefined) => {
		const next = {...wheels, [name]: v};
		if (!v) delete next[name];
		onChange({wheels: Object.keys(next).length ? next : undefined});
	};
	return (
		<details className="section" open={Boolean(clip.wheels || clip.curve)}>
			<summary>Wheels, curve and histogram</summary>
			<div className="wheels">
				<Wheel label="Shadows" value={wheels.shadows} onChange={(v) => setWheel('shadows', v)} />
				<Wheel label="Midtones" value={wheels.mids} onChange={(v) => setWheel('mids', v)} />
				<Wheel label="Highlights" value={wheels.highlights} onChange={(v) => setWheel('highlights', v)} />
			</div>
			<div className="wheels">
				<Curve value={clip.curve as number[][] | undefined} onChange={(v) => onChange({curve: v})} />
				<Histogram url={url} video={video} time={time} clip={clip} />
			</div>
			<p className="dim small">Drag inside a wheel towards a colour; double-click resets. On the curve: click adds a point, drag moves it, double-click removes it.</p>
		</details>
	);
};

const ANIMATABLE: Record<string, [string, string, number][]> = {
	video: [['scale', 'Scale', 1], ['x', 'Shift right (%)', 0], ['y', 'Shift down (%)', 0], ['opacity', 'Opacity', 1]],
	image: [['scale', 'Scale', 1], ['x', 'Shift right (%)', 0], ['y', 'Shift down (%)', 0], ['opacity', 'Opacity', 1]],
	text: [['x', 'From left (%)', 50], ['y', 'From top (%)', 50], ['size', 'Size', 8], ['opacity', 'Opacity', 1]],
	audio: [['volume', 'Volume', 1]],
};
type Key = {t: number; v: number};

/** Keyframes: a property changes between the marked moments of the clip. */
export const Keyframes = ({clip, now, onChange}: {clip: EditClip; now: number; onChange: (patch: Partial<EditClip>) => void}) => {
	const keys = (clip.keys ?? {}) as Record<string, Key[] | undefined>;
	const t = Math.round(Math.min(clip.length, Math.max(0, now - clip.start)) * 100) / 100;
	const inside = now >= clip.start - 0.001 && now <= clip.start + clip.length + 0.001;
	const write = (prop: string, list: Key[]) => {
		const next = {...keys, [prop]: list.sort((a, b) => a.t - b.t)};
		if (!list.length) delete next[prop];
		onChange({keys: Object.keys(next).length ? next : undefined});
	};
	const count = Object.values(keys).reduce((a, k) => a + (k?.length ?? 0), 0);
	return (
		<details className="section" open={count > 0}>
			<summary>Keyframes{count ? ` (${count})` : ''}</summary>
			{(ANIMATABLE[clip.kind] ?? []).map(([prop, label, fallback]) => {
				const list = keys[prop] ?? [];
				const base = typeof clip[prop] === 'number' ? (clip[prop] as number) : fallback;
				return (
					<div key={prop} className="krow">
						<span className="klabel">{label}</span>
						<div className="klist">
							{list.map((k, i) => (
								<span key={i} className="key"><b>{k.t.toFixed(2)}s</b>
									<input type="number" step="any" aria-label={`${label} at ${k.t} seconds`} value={k.v} onChange={(e) => write(prop, list.map((x, j) => (j === i ? {...x, v: Number(e.target.value) || 0} : x)))} />
									<button className="small" aria-label={`Remove ${label} keyframe at ${k.t} seconds`} onClick={() => write(prop, list.filter((_, j) => j !== i))}>×</button></span>
							))}
							<button className="small" disabled={!inside} title={inside ? `Add a keyframe at ${t.toFixed(2)} s into the clip` : 'Move the playhead onto this clip first'}
								onClick={() => write(prop, [...list.filter((k) => Math.abs(k.t - t) > 0.02), {t, v: Math.round(keyValue(list, t, base) * 1000) / 1000}])}>◆ at playhead</button>
						</div>
					</div>
				);
			})}
			<p className="dim small">Put the playhead where a change should start or end, press “◆ at playhead”, then type the value. Between two keyframes the value glides.</p>
		</details>
	);
};
