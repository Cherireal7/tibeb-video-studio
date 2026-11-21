import assert from 'node:assert/strict';
import {mkdirSync, mkdtempSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';
import {isProjectName, safeJoin} from './paths';

const root = mkdtempSync(join(tmpdir(), 'tibeb-test-'));
process.env.RESOLVE_ASSIST_OUTPUT = root;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const store = require('./store') as typeof import('./store');

test('safeJoin keeps every path inside its root', () => {
	mkdirSync(join(root, 'library'), {recursive: true});
	assert.equal(safeJoin(root, 'library'), join(root, 'library'));
	for (const bad of ['../x', '/etc/passwd', 'library/../../x', 'a\0b']) assert.throws(() => safeJoin(root, bad), bad);
	symlinkSync(tmpdir(), join(root, 'escape'));
	assert.throws(() => safeJoin(root, 'escape'));
});

test('project names are plain folder names', () => {
	for (const ok of ['Nail Art Session', 'Luther-1517', 'a']) assert.ok(isProjectName(ok), ok);
	for (const bad of ['', '..', 'a/b', '.hidden', ' lead', 'x'.repeat(61), 5]) assert.equal(isProjectName(bad), false, String(bad));
});

test('projects are read from the folder: stage, cover, goal, inbox, kit', () => {
	const p = join(root, 'projects', 'Demo');
	for (const d of ['inbox', 'stills', 'exports']) mkdirSync(join(p, d), {recursive: true});
	writeFileSync(join(p, 'brief.md'), '# Brief\n\n- Goal of the video: Sell the gel set\n- Audience:\n');
	writeFileSync(join(p, 'project.json'), JSON.stringify({updated: '2026-11-21 10:00', counts: {image: 1}, files: [{file: 'stills/a.png', kind: 'image', bytes: 3}]}));
	writeFileSync(join(p, 'inbox', 'new.mp4'), 'x');
	mkdirSync(join(root, 'projects', 'Old one'), {recursive: true});
	assert.equal(store.getProject('Old one').stage, 'Not indexed');
	const s = store.listProjects().find((x) => x.name === 'Demo')!;
	assert.deepEqual([s.name, s.stage, s.cover, s.goal, s.inbox], ['Demo', 'Material added', 'projects/Demo/stills/a.png', 'Sell the gel set', 1]);
	writeFileSync(join(p, 'exports', 'final.mp4'), 'x');
	assert.equal(store.getProject('Demo').stage, 'Exported');
	assert.throws(() => store.getProject('../Demo'));

	mkdirSync(join(root, 'library', 'sfx'), {recursive: true});
	writeFileSync(join(root, 'library', 'sfx', 'pop.wav'), 'RIFF');
	writeFileSync(join(root, 'library', 'manifest.json'), JSON.stringify({items: [{id: 'pop', category: 'sfx', file: 'sfx/pop.wav', tags: [], usage: ''}]}));
	assert.equal(store.addToKit('Demo', 'sfx/pop.wav'), 'kit/sfx/pop.wav');
	assert.throws(() => store.addToKit('Demo', '../manifest.json'));

	const src = join(root, 'drop.png');
	writeFileSync(src, 'x');
	assert.deepEqual(store.copyToInbox('Demo', [src, src + '.missing']), {copied: ['drop.png'], skipped: ['drop.png.missing']});
	assert.deepEqual(store.copyToInbox('Demo', [src]).skipped, ['drop.png']); // never overwrites
});

test('project media is linked into Motion Studio only for this project and only real files', () => {
	const motion = join(root, 'motion');
	mkdirSync(join(root, 'cfg', '.config', 'studio'), {recursive: true});
	process.env.HOME = join(root, 'cfg');
	writeFileSync(join(root, 'cfg', '.config', 'studio', 'config'), `motion=${motion}\n`);
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const m = require('./motion') as typeof import('./motion');
	assert.equal(m.projectSlug('Martin Luther Short'), 'martin-luther-short');
	const linked = m.linkProjectMedia('Demo', {image: 'projects/demo/stills/a.png', list: [{src: 'projects/demo/stills/missing.png'}, 'projects/other/x.png'], n: 3});
	assert.deepEqual(linked, []); // stills/a.png is only in project.json in this fixture, not on disk
	writeFileSync(join(root, 'projects', 'Demo', 'stills', 'a.png'), 'png');
	assert.deepEqual(m.linkProjectMedia('Demo', {image: 'projects/demo/stills/a.png'}), ['stills/a.png']);
	assert.throws(() => m.linkProjectMedia('Demo', {image: 'projects/demo/../../escape'}));
});
