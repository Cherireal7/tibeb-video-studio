import {Suspense, lazy, useEffect, useState} from 'react';
import {Assistant} from './screens/Assistant';
import {Create} from './screens/Create';
import {Deliver} from './screens/Deliver';
import {Library} from './screens/Library';
import {Record} from './screens/Record';
import {Project} from './screens/Project';
import {Projects} from './screens/Projects';
import {Setup} from './screens/Setup';

// The editor pulls in Remotion and Motion Studio's components, so it loads only when opened.
const Edit = lazy(() => import('./screens/Edit'));

const NAV: {id: string; label: string; soon?: boolean}[] = [
	{id: 'projects', label: 'Projects'}, {id: 'library', label: 'Library'},
	{id: 'create', label: 'Create'}, {id: 'edit', label: 'Edit'}, {id: 'record', label: 'Record'},
	{id: 'assistant', label: 'Assistant'}, {id: 'deliver', label: 'Deliver'}, {id: 'setup', label: 'Setup'},
];

/** media://workspace/<path>: files from the workspace, served by the main process. */
export const media = (rel: string) => 'media://workspace/' + rel.split('/').map(encodeURIComponent).join('/');
export const go = (hash: string) => {
	location.hash = hash;
};

const useRoute = () => {
	const read = () => decodeURIComponent(location.hash.replace(/^#/, '')) || 'projects';
	const [route, setRoute] = useState(read);
	useEffect(() => {
		const on = () => setRoute(read());
		window.addEventListener('hashchange', on);
		return () => window.removeEventListener('hashchange', on);
	}, []);
	return route;
};

export const App = () => {
	const route = useRoute();
	const [section, ...rest] = route.split('/');
	const current = section === 'project' ? 'projects' : section;
	return (
		<div className="app">
			<header className="titlebar"><span className="brand">Tibeb</span><span className="route">{section === 'project' ? rest.join('/') : ''}</span></header>
			<nav className="side" aria-label="Sections">
				{NAV.map((n) => (
					<button key={n.id} className="nav" aria-current={current === n.id ? 'page' : undefined} disabled={n.soon} onClick={() => go(n.id)} title={n.soon ? 'Planned: see PLAN.md' : undefined}>
						<span className="dot" />{n.label}{n.soon ? <span className="soon">soon</span> : null}
					</button>
				))}
				<div className="grow" />
				<button className="session" onClick={() => void window.tibeb.startSession()}>Start a session</button>
			</nav>
			<main className="main">
				{section === 'project' ? <Project name={rest.join('/')} /> : section === 'edit' ? <Suspense fallback={<p className="dim">Opening the editor…</p>}><Edit initial={rest.join('/')} /></Suspense> : section === 'assistant' ? <Assistant initial={rest.join('/')} /> : section === 'record' ? <Record /> : section === 'deliver' ? <Deliver initial={rest.join('/')} /> : section === 'create' ? <Create initial={rest[0] ?? ''} /> : section === 'library' ? <Library /> : section === 'setup' ? <Setup /> : <Projects />}
			</main>
		</div>
	);
};
