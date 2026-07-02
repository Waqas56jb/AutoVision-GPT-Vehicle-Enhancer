import Header from './components/Header.jsx';
import Workspace from './components/Workspace.jsx';
import Footer from './components/Footer.jsx';

export default function App() {
  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="flex-1">
        <Workspace />
      </main>
      <Footer />
    </div>
  );
}
