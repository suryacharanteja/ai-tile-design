import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Cache busting and deployment trigger
const cacheBuster = Date.now();
const deploymentId = 'deploy-' + Math.random().toString(36).substr(2, 9);
console.log('App loaded at:', cacheBuster, 'Deployment ID:', deploymentId);

createRoot(document.getElementById("root")!).render(<App />);
