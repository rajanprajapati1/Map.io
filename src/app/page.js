'use client';

import { useState, useEffect } from 'react';
import { Box, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import dynamic from 'next/dynamic';

const MapComponent = dynamic(() => import('./components/MapComponent'), { ssr: false });
const AIAssistant = dynamic(() => import('./components/ChatComponent'), { ssr: false });

const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#14b8a6', light: '#2dd4bf', dark: '#0d9488' },
    secondary: { main: '#f43f5e' },
    background: { default: '#f8fafc', paper: '#ffffff' },
    text: { primary: '#1e293b', secondary: '#475569' },
  },
  typography: { fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
  shape: { borderRadius: 12 },
});

export default function Home() {
  const [selectedLocation, setSelectedLocation] = useState(null);

  return (
    <ThemeProvider theme={lightTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', background: '#f8fafc' }}>
        {/* Left - Map */}
        <Box sx={{ flex: 1, height: '100%', position: 'relative' }}>
          <MapComponent searchLocation={selectedLocation} />
        </Box>
        {/* Right - AI Assistant */}
        <Box sx={{ width: 500, height: '100%', borderLeft: '1px solid #e2e8f0', flexShrink: 0 }}>
          <AIAssistant onPlaceSelect={setSelectedLocation} />
        </Box>
      </Box>
    </ThemeProvider>
  );
}
