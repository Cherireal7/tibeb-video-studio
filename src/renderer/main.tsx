import {createRoot} from 'react-dom/client';
import {App} from './App';
import './styles.css';

// Remotion's staticFile() resolves against Motion Studio's public folder, served by the main process.
(window as unknown as {remotion_staticBase: string}).remotion_staticBase = '/_motion';

createRoot(document.getElementById('root')!).render(<App />);
