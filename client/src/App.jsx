import { Toaster } from 'react-hot-toast';
import Studio from './components/Studio.jsx';
import { ThemeProvider, useTheme } from './hooks/useTheme.jsx';

function ThemedToaster() {
  const { isDark } = useTheme();
  return (
    <Toaster
      position="bottom-center"
      toastOptions={{
        style: {
          background: isDark ? 'rgba(15,32,80,0.94)' : 'rgba(255,255,255,0.92)',
          color: isDark ? '#e2e8f0' : '#1e293b',
          border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #dbeafe',
          borderRadius: '14px',
          boxShadow: '0 20px 45px -25px rgba(30,58,138,0.45)',
          backdropFilter: 'blur(12px)',
          fontWeight: 500,
          fontSize: '14px',
        },
        success: { iconTheme: { primary: '#2563eb', secondary: '#fff' } },
        loading: { iconTheme: { primary: '#3b82f6', secondary: '#dbeafe' } },
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
