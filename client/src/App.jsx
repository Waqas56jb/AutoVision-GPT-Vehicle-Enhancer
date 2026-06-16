import Header from './components/Header.jsx';
import EnhanceWorkspace from './components/EnhanceWorkspace.jsx';
import Footer from './components/Footer.jsx';

export default function App() {
  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="flex-1">
        <EnhanceWorkspace />
      </main>
      <Footer />
    </div>
  );
}
