import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Cache busting timestamp
const cacheBuster = Date.now();
console.log('App loaded at:', cacheBuster);

createRoot(document.getElementById("root")!).render(<App />);
