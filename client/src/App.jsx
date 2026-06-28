import { useState } from 'react';
import Header from './components/Header.jsx';
import ModeTabs from './components/ModeTabs.jsx';
import EnhanceWorkspace from './components/EnhanceWorkspace.jsx';
import RecolorWorkspace from './components/RecolorWorkspace.jsx';
import Footer from './components/Footer.jsx';

export default function App() {
  const [mode, setMode] = useState('enhance');

  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <ModeTabs mode={mode} onChange={setMode} />
      <main className="flex-1">
        {mode === 'enhance' ? <EnhanceWorkspace /> : <RecolorWorkspace />}
      </main>
      <Footer />
    </div>
  );
}
