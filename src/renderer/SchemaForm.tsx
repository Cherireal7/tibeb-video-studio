import {useState} from 'react';

type Props = {schema: JsonSchema; value: unknown; onChange: (v: unknown) => void; label: string; required?: boolean; depth?: number; files?: string[]};

// Text inputs that hold a media path offer the project's own files.
const MEDIA_FIELD = /image|media|map|narration|music|aroll|video|logo|photo|screen|src|opener/i;

const title = (key: string) => key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
const typeOf = (s: JsonSchema) => (Array.isArray(s.type) ? s.type.find((t) => t !== 'null') : s.type);

/** A starting value for a new list item or a missing field. */
export const blank = (s: JsonSchema): unknown => {
	if (s.default !== undefined) return s.default;
	if (s.enum) return s.enum[0];
	switch (typeOf(s)) {
		case 'object': return Object.fromEntries(Object.entries(s.properties ?? {}).filter(([k]) => (s.required ?? []).includes(k)).map(([k, v]) => [k, blank(v)]));
		case 'array': return [];
		case 'number': case 'integer': return s.minimum ?? 0;
		case 'boolean': return false;
		case 'string': return s.description === '__remotion-color' ? '#ffffff' : '';
		default: return s.anyOf || s.oneOf ? blank((s.anyOf ?? s.oneOf)![0]) : null;
	}
};

/** Free-form editor for shapes the form cannot draw (scene lists with several kinds of scene). */
const JsonField = ({value, onChange, label}: {value: unknown; onChange: (v: unknown) => void; label: string}) => {
	const [text, setText] = useState(() => JSON.stringify(value, null, 2));
	const [bad, setBad] = useState('');
	return (
		<label className="field wide">
			<span>{label} <em>edited as text</em></span>
			<textarea className="json" rows={Math.min(18, text.split('\n').length + 1)} value={text} spellCheck={false}
				onChange={(e) => {
					setText(e.target.value);
					try {
						onChange(JSON.parse(e.target.value));
						setBad('');
					} catch (err) {
						setBad((err as Error).message);
					}
				}} />
			{bad ? <span className="error small">Not valid yet: {bad}</span> : null}
		</label>
	);
};

export const SchemaForm = ({schema, value, onChange, label, required = true, depth = 0, files = []}: Props) => {
	const t = typeOf(schema);
	const hint = schema.description && schema.description !== '__remotion-color' ? schema.description : '';
	if (schema.enum) {
		return (
			<label className="field"><span>{label}</span>
				<select value={String(value ?? '')} onChange={(e) => onChange(schema.enum!.find((o) => String(o) === e.target.value))}>
					{!required ? <option value="">(default)</option> : null}
					{schema.enum.map((o) => <option key={String(o)}>{String(o)}</option>)}
				</select>
			</label>
		);
	}
	if (t === 'string') {
		const color = schema.description === '__remotion-color';
		const long = (schema.maxLength ?? 0) > 200;
		return (
			<label className={`field${long ? ' wide' : ''}`}><span>{label}</span>
				{color ? (
					<span className="color"><input type="color" value={/^#[0-9a-f]{6}$/i.test(String(value)) ? String(value) : '#000000'} onChange={(e) => onChange(e.target.value)} />
						<input value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} aria-label={`${label} value`} /></span>
				) : long ? <textarea rows={2} value={String(value ?? '')} maxLength={schema.maxLength} onChange={(e) => onChange(e.target.value)} />
					: <input value={String(value ?? '')} maxLength={schema.maxLength} list={files.length && MEDIA_FIELD.test(label) ? 'project-files' : undefined} onChange={(e) => onChange(e.target.value)} />}
				{hint ? <small>{hint}</small> : null}
			</label>
		);
	}
	if (t === 'number' || t === 'integer') {
		return (
			<label className="field"><span>{label}</span>
				<input type="number" value={value === undefined || value === null ? '' : Number(value)} min={schema.minimum} max={schema.maximum} step={t === 'integer' ? 1 : 'any'}
					onChange={(e) => onChange(e.target.value === '' ? (required ? 0 : undefined) : Number(e.target.value))} />
				{hint ? <small>{hint}</small> : null}
			</label>
		);
	}
	if (t === 'boolean') {
		return <label className="field check"><input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} /><span>{label}</span>{hint ? <small>{hint}</small> : null}</label>;
	}
	if (t === 'object' && schema.properties) {
		const obj = (value ?? {}) as Record<string, unknown>;
		const fields = Object.entries(schema.properties).map(([k, s]) => (
			<SchemaForm key={k} schema={s} label={title(k)} value={obj[k]} required={(schema.required ?? []).includes(k)} depth={depth + 1} files={files}
				onChange={(v) => {
					const next = {...obj, [k]: v};
					if (v === undefined) delete next[k];
					onChange(next);
				}} />
		));
		return depth === 0 ? <div className="fields">{fields}</div> : <fieldset className="group"><legend>{label}</legend><div className="fields">{fields}</div></fieldset>;
	}
	if (t === 'array' && schema.items && !schema.items.anyOf && !schema.items.oneOf) {
		const list = Array.isArray(value) ? value : [];
		const max = schema.maxItems ?? 99, min = schema.minItems ?? 0;
		return (
			<fieldset className="group list"><legend>{label} <em>{list.length}</em></legend>
				{list.map((item, i) => (
					<div key={i} className="item">
						<SchemaForm schema={schema.items!} label={`${i + 1}`} value={item} depth={depth + 1} files={files} onChange={(v) => onChange(list.map((x, j) => (j === i ? v : x)))} />
						<button type="button" className="small" disabled={list.length <= min} onClick={() => onChange(list.filter((_, j) => j !== i))} aria-label={`Remove ${label} ${i + 1}`}>Remove</button>
					</div>
				))}
				<button type="button" className="small" disabled={list.length >= max} onClick={() => onChange([...list, blank(schema.items!)])}>Add</button>
			</fieldset>
		);
	}
	return <JsonField label={label} value={value} onChange={onChange} />;
};
