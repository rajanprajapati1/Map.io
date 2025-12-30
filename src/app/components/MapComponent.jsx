'use client';

import { useEffect, useState, useRef } from 'react';
import { Box, TextField, InputAdornment, Paper, Typography, CircularProgress, IconButton, Tooltip } from '@mui/material';
import { Search as SearchIcon, MyLocation as MyLocationIcon, Layers as LayersIcon, Close as CloseIcon } from '@mui/icons-material';

let L, MapContainer, TileLayer, Marker, Popup, useMap, Circle, ZoomControl;

const MapComponent = ({ onLocationSelect, searchLocation }) => {
 const [isClient, setIsClient] = useState(false);
 const [searchQuery, setSearchQuery] = useState('');
 const [searchResults, setSearchResults] = useState([]);
 const [showSearchResults, setShowSearchResults] = useState(false);
 const [isSearching, setIsSearching] = useState(false);
 const [mapStyle, setMapStyle] = useState('streets');
 const [currentLocation, setCurrentLocation] = useState(null);
 const [showLayerMenu, setShowLayerMenu] = useState(false);
 const mapRef = useRef(null);

 useEffect(() => {
  const loadLeaflet = async () => {
   L = await import('leaflet');
   const rl = await import('react-leaflet');
   MapContainer = rl.MapContainer; TileLayer = rl.TileLayer; Marker = rl.Marker;
   Popup = rl.Popup; useMap = rl.useMap; Circle = rl.Circle; ZoomControl = rl.ZoomControl;
   await import('leaflet/dist/leaflet.css');
   delete L.Icon.Default.prototype._getIconUrl;
   L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
   });
   setIsClient(true);
  };
  loadLeaflet();
 }, []);

 useEffect(() => {
  if (searchLocation && mapRef.current) {
   mapRef.current.flyTo([searchLocation.lat, searchLocation.lon], 15);
  }
 }, [searchLocation]);

 const mapStyles = {
  streets: { url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', name: 'Streets' },
  light: { url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', name: 'Light' },
  satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', name: 'Satellite' },
 };

 const handleSearch = async () => {
  if (!searchQuery.trim()) return;
  setIsSearching(true);
  try {
   const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`);
   const data = await response.json();
   setSearchResults(data);
   setShowSearchResults(true);
  } catch (error) { console.error('Search error:', error); }
  setIsSearching(false);
 };

 const handleSearchResultClick = (result) => {
  const lat = parseFloat(result.lat), lon = parseFloat(result.lon);
  if (mapRef.current) mapRef.current.flyTo([lat, lon], 15);
  if (onLocationSelect) onLocationSelect({ lat, lon, name: result.display_name });
  setShowSearchResults(false);
  setSearchQuery(result.display_name.split(',')[0]);
 };

 const handleGetCurrentLocation = () => {
  if (navigator.geolocation) {
   navigator.geolocation.getCurrentPosition((position) => {
    const { latitude, longitude } = position.coords;
    setCurrentLocation([latitude, longitude]);
    if (mapRef.current) mapRef.current.flyTo([latitude, longitude], 15);
   });
  }
 };

 const MapController = () => { const map = useMap(); useEffect(() => { mapRef.current = map; }, [map]); return null; };

 const createCustomIcon = (color = '#14b8a6') => {
  if (!L) return null;
  return L.divIcon({
   className: 'custom-marker',
   html: `<div style="width:32px;height:32px;background:${color};border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px ${color}44;border:3px solid white;"><div style="transform:rotate(45deg);color:white;font-size:14px;">📍</div></div>`,
   iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32],
  });
 };

 if (!isClient || !MapContainer) {
  return (
   <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
    <Box sx={{ textAlign: 'center' }}>
     <CircularProgress size={50} sx={{ color: '#14b8a6', mb: 2 }} />
     <Typography variant="h6" sx={{ color: '#64748b', fontWeight: 500 }}>Loading Map...</Typography>
    </Box>
   </Box>
  );
 }

 return (
  <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
   {/* Search Bar */}
   <Paper elevation={0} sx={{ position: 'absolute', top: 16, left: 16, right: 16, zIndex: 1000, background: 'white', borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
    <TextField fullWidth placeholder="Search places, addresses..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
     sx={{ '& .MuiOutlinedInput-root': { color: '#1e293b', '& fieldset': { border: 'none' } }, '& .MuiInputBase-input::placeholder': { color: '#94a3b8' } }}
     InputProps={{
      startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#14b8a6' }} /></InputAdornment>,
      endAdornment: <InputAdornment position="end">{isSearching ? <CircularProgress size={20} sx={{ color: '#14b8a6' }} /> : searchQuery && <IconButton size="small" onClick={() => { setSearchQuery(''); setShowSearchResults(false); }}><CloseIcon sx={{ color: '#94a3b8' }} /></IconButton>}</InputAdornment>
     }} />
    {showSearchResults && searchResults.length > 0 && (
     <Box sx={{ borderTop: '1px solid #e2e8f0' }}>
      {searchResults.map((result, i) => (
       <Box key={i} onClick={() => handleSearchResultClick(result)} sx={{ p: 1.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1.5, '&:hover': { background: '#f8fafc' }, borderBottom: '1px solid #f1f5f9' }}>
        <Box sx={{ width: 36, height: 36, background: '#f1f5f9', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📍</Box>
        <Box><Typography variant="body2" sx={{ fontWeight: 500, color: '#1e293b' }}>{result.display_name.split(',')[0]}</Typography><Typography variant="caption" sx={{ color: '#94a3b8' }}>{result.display_name.split(',').slice(1, 3).join(',')}</Typography></Box>
       </Box>
      ))}
     </Box>
    )}
   </Paper>

   {/* Map Controls */}
   <Box sx={{ position: 'absolute', top: 100, right: 16, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 1 }}>
    <Tooltip title="Layers" placement="left">
     <Paper sx={{ background: 'white', borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
      <IconButton onClick={() => setShowLayerMenu(!showLayerMenu)} sx={{ color: '#14b8a6' }}><LayersIcon /></IconButton>
     </Paper>
    </Tooltip>
    {showLayerMenu && (
     <Paper sx={{ p: 1.5, background: 'white', borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minWidth: 120 }}>
      {Object.entries(mapStyles).map(([key, style]) => (
       <Box key={key} onClick={() => { setMapStyle(key); setShowLayerMenu(false); }} sx={{ p: 1, borderRadius: 1, cursor: 'pointer', background: mapStyle === key ? '#f1f5f9' : 'transparent', '&:hover': { background: '#f8fafc' } }}>
        <Typography variant="body2" sx={{ fontWeight: mapStyle === key ? 600 : 400, color: mapStyle === key ? '#14b8a6' : '#475569' }}>{style.name}</Typography>
       </Box>
      ))}
     </Paper>
    )}
    <Tooltip title="My Location" placement="left">
     <Paper sx={{ background: 'white', borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <IconButton onClick={handleGetCurrentLocation} sx={{ color: currentLocation ? '#10b981' : '#14b8a6' }}><MyLocationIcon /></IconButton>
     </Paper>
    </Tooltip>
   </Box>

   <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ width: '100%', height: '100%' }} zoomControl={false}>
    <MapController />
    <ZoomControl position="bottomright" />
    <TileLayer url={mapStyles[mapStyle].url} attribution='&copy; OpenStreetMap, CARTO' />
    {searchLocation && <Marker position={[searchLocation.lat, searchLocation.lon]} icon={createCustomIcon('#14b8a6')}><Popup><Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{searchLocation.name}</Typography></Popup></Marker>}
    {currentLocation && (<><Circle center={currentLocation} radius={200} pathOptions={{ color: '#14b8a6', fillColor: '#14b8a6', fillOpacity: 0.15 }} /><Marker position={currentLocation} icon={createCustomIcon('#10b981')}><Popup><Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Your Location</Typography></Popup></Marker></>)}
   </MapContainer>
  </Box>
 );
};

export default MapComponent;
