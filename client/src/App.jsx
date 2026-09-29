import { Toaster } from 'react-hot-toast';
import Studio from './components/Studio.jsx';
import { ThemeProvider, useTheme } from './hooks/useTheme.jsx';

function ThemedToaster() {
  const { isDark } = useTheme();
  return (
    <Toaster
      // Top, just under the top bar: at the bottom it sat over the filmstrip and
      // swallowed clicks on the photos; flush to the top it covered the step tabs.
      position="top-center"
      containerStyle={{ top: 76 }}
      toastOptions={{
        style: {
          background: isDark ? 'rgba(23,23,27,0.94)' : 'rgba(255,255,255,0.94)',
          color: isDark ? '#f5f5f4' : '#1c1917',
          border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e7e5e4',
          borderRadius: '999px',
          boxShadow: '0 18px 40px -22px rgba(28,26,23,0.45)',
          backdropFilter: 'blur(12px)',
          fontWeight: 500,
          fontSize: '14px',
        },
        success: { iconTheme: { primary: '#957240', secondary: '#fff' } },
        loading: { iconTheme: { primary: '#957240', secondary: '#e8d9bf' } },
      }}
    />
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Studio />
      <ThemedToaster />
    </ThemeProvider>
  );
}
