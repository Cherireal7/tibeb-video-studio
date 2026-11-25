import {useEffect, useState} from 'react';
import {go} from '../App';

/** Small Markdown reader for the kit's own guides: headings, paragraphs, lists, tables, code. Text is never inserted as HTML. */
const inline = (text: string, key: number) => {
	const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean);
	return <span key={key}>{parts.map((p, i) => p.startsWith('`') ? <code key={i}>{p.slice(1, -1)}</code> : p.startsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : p)}</span>;
};
const Markdown = ({text}: {text: string}) => {
	const out: React.ReactNode[] = [];
	const lines = text.split('\n');
	let i = 0;
	while (i < lines.length) {
		const line = lines[i];
		if (line.startsWith('```')) {
			const code: string[] = [];
			i++;
			while (i < lines.length && !lines[i].startsWith('```')) code.push(lines[i++]);
			i++;
			out.push(<pre key={out.length}>{code.join('\n')}</pre>);
		} else if (/^#{1,3} /.test(line)) {
			const level = line.indexOf(' ');
			const body = line.slice(level + 1);
			out.push(level === 1 ? <h1 key={out.length}>{body}</h1> : level === 2 ? <h2 key={out.length}>{body}</h2> : <h3 key={out.length}>{body}</h3>);
			i++;
		} else if (line.startsWith('|')) {
			const rows: string[][] = [];
			while (i < lines.length && lines[i].startsWith('|')) {
				if (!/^\|[\s:|-]+\|$/.test(lines[i])) rows.push(lines[i].slice(1, -1).split('|').map((c) => c.trim()));
				i++;
			}
			out.push(<table key={out.length}><thead><tr>{rows[0].map((c, k) => <th key={k}>{inline(c, k)}</th>)}</tr></thead>
				<tbody>{rows.slice(1).map((r, k) => <tr key={k}>{r.map((c, j) => <td key={j}>{inline(c, j)}</td>)}</tr>)}</tbody></table>);
		} else if (/^(-|\d+\.) /.test(line)) {
			const ordered = /^\d+\. /.test(line);
			const items: string[] = [];
			while (i < lines.length && (/^(-|\d+\.) /.test(lines[i]) || /^ {2,}\S/.test(lines[i]))) {
				if (/^ {2,}\S/.test(lines[i])) items[items.length - 1] += ' ' + lines[i].trim();
				else items.push(lines[i].replace(/^(-|\d+\.) /, ''));
				i++;
			}
			const lis = items.map((t, k) => <li key={k}>{inline(t, k)}</li>);
			out.push(ordered ? <ol key={out.length}>{lis}</ol> : <ul key={out.length}>{lis}</ul>);
		} else if (!line.trim()) {
			i++;
		} else {
			const para: string[] = [];
			while (i < lines.length && lines[i].trim() && !/^(#{1,3} |\||```|-|\d+\. )/.test(lines[i])) para.push(lines[i++]);
			out.push(<p key={out.length}>{inline(para.join(' '), 0)}</p>);
		}
	}
	return <div className="md">{out}</div>;
};

export const Guides = ({initial}: {initial: string}) => {
	const [guides, setGuides] = useState<Guide[]>([]);
	const [presets, setPresets] = useState<Preset[]>([]);
	const [id, setId] = useState(initial);
	const [text, setText] = useState('');
	const [copied, setCopied] = useState('');
	useEffect(() => {
		void window.tibeb.guides().then((g) => { setGuides(g); if (!id && g[0]) setId(g[0].id); });
		void window.tibeb.presets().then(setPresets);
	}, []);
	useEffect(() => {
		if (initial) setId(initial);
	}, [initial]);
	useEffect(() => {
		if (id && id !== 'prompts') void window.tibeb.guide(id).then(setText).catch(() => setText('This guide could not be opened.'));
	}, [id]);
	const copy = async (p: Preset) => {
		await navigator.clipboard.writeText(p.prompt);
		setCopied(p.id);
		setTimeout(() => setCopied(''), 1500);
	};
	return (
		<section className="guides">
			<div className="head"><h1>Guides</h1><button className="primary" onClick={() => go('make')}>Make a video</button></div>
			<div className="guidegrid">
				<nav className="guidelist" aria-label="Guides">
					{guides.map((g) => <button key={g.id} className="nav" aria-current={id === g.id ? 'page' : undefined} onClick={() => { setId(g.id); go(`guides/${g.id}`); }}>{g.title}</button>)}
					<button className="nav" aria-current={id === 'prompts' ? 'page' : undefined} onClick={() => { setId('prompts'); go('guides/prompts'); }}>Prompt presets</button>
				</nav>
				<div className="guidebody">
					{id === 'prompts' ? (
						<div className="md">
							<h1>Prompt presets</h1>
							<p>Starting points for the Make screen. Fill in the [brackets]. They also work pasted into Claude Code or Codex in a terminal.</p>
							{presets.map((p) => (
								<div key={p.id} className="card presetcard">
									<div className="row between"><strong>{p.title}</strong><button onClick={() => void copy(p)}>{copied === p.id ? 'Copied' : 'Copy'}</button></div>
									<p className="dim small">{p.summary}{p.needs ? ` Needs: ${p.needs}` : ''}</p>
									<pre>{p.prompt}</pre>
								</div>
							))}
						</div>
					) : <Markdown text={text} />}
				</div>
			</div>
		</section>
	);
};
