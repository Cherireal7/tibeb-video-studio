import assert from 'node:assert/strict';
import {test} from 'node:test';
import {claudeArgs, codexArgs, makeBrief, readLine} from './agents';
import {listGuides, listPresets, parseFront, readGuide} from './kit';

test('claude arguments allow the tools a video needs and carry the brief', () => {
	const a = claudeArgs('make it', 'Demo', 'abcd1234-ef');
	assert.equal(a[0], '-p');
	assert.equal(a[1], 'make it');
	for (const t of ['Bash', 'Write', 'Skill', 'mcp__resolve-assist']) assert.ok(a.includes(t), t);
	assert.equal(a[a.indexOf('--permission-mode') + 1], 'acceptEdits');
	assert.ok(a[a.indexOf('--append-system-prompt') + 1].includes('projects/Demo/'));
	assert.deepEqual(a.slice(-2), ['--resume', 'abcd1234-ef']);
	assert.ok(!claudeArgs('x', 'Demo').includes('--resume'));
});

test('codex arguments stay in the workspace sandbox and put the request last', () => {
	const a = codexArgs('make it', 'Demo');
	assert.deepEqual(a.slice(0, 2), ['exec', '--json']);
	assert.equal(a[a.indexOf('-s') + 1], 'workspace-write');
	assert.ok(!a.some((x) => x.includes('dangerously')));
	assert.ok(a[a.length - 1].endsWith('The request: make it'));
});

test('the brief forbids paid tools and asks for the VIDEO line', () => {
	const b = makeBrief('Demo');
	assert.match(b, /no Higgsfield, ElevenLabs/);
	assert.match(b, /VIDEO: <absolute path/);
});

test('agent output lines become events', () => {
	const c = readLine('claude', JSON.stringify({type: 'assistant', session_id: 's1', message: {content: [{type: 'text', text: 'hello'}, {type: 'tool_use', name: 'Bash', input: {description: 'Render the video'}}, {type: 'tool_use', name: 'mcp__resolve-assist__beat_grid', input: {}}]}}));
	assert.deepEqual(c.events, [{type: 'text', text: 'hello'}, {type: 'step', text: 'Bash · Render the video'}, {type: 'step', text: 'studio: beat_grid'}]);
	assert.equal(c.session, 's1');
	assert.deepEqual(readLine('claude', JSON.stringify({type: 'result', is_error: true, result: 'limit reached'})).finished, {ok: false, note: 'limit reached'});
	const x = readLine('codex', JSON.stringify({type: 'item.completed', item: {type: 'command_execution', command: 'npx hyperframes render'}}));
	assert.deepEqual(x.events, [{type: 'step', text: 'shell · npx hyperframes render'}]);
	assert.equal(readLine('codex', JSON.stringify({type: 'thread.started', thread_id: 't1'})).session, 't1');
	assert.deepEqual(readLine('codex', JSON.stringify({type: 'turn.completed'})).finished, {ok: true, note: ''});
	assert.deepEqual(readLine('codex', 'not json').events, []);
	assert.match((readLine('claude', JSON.stringify({type: 'system', subtype: 'api_retry', attempt: 3})).events[0] as {text: string}).text, /retrying \(attempt 3\)/);
});

test('the kit has presets and guides, and guides cannot be read by path', () => {
	const presets = listPresets();
	assert.ok(presets.length >= 8);
	for (const p of presets) assert.ok(p.title && p.summary && p.prompt.length > 40, p.id);
	const guides = listGuides();
	assert.ok(guides.length >= 6);
	assert.match(readGuide(guides[0].id), /^# /);
	assert.throws(() => readGuide('../prompts/01-work-showcase'));
	assert.deepEqual(parseFront('---\ntitle: A: b\n---\nbody').meta, {title: 'A: b'});
});
