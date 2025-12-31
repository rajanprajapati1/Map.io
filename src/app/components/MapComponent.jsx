'use client';

import { useEffect, useState, useRef } from 'react';
import {
  Box, TextField, InputAdornment, Paper, Typography, CircularProgress,
  IconButton, Tooltip, Chip, Fade, Button, Divider, Avatar
} from '@mui/material';
import {
  Search as SearchIcon, MyLocation as MyLocationIcon, Layers as LayersIcon,
  Close as CloseIcon, GpsFixed as GpsIcon, Directions as DirectionsIcon,
  Share as ShareIcon, Bookmark as BookmarkIcon, Star as StarIcon,
  Place as PlaceIcon, AccessTime as TimeIcon, Phone as PhoneIcon,
  Language as WebIcon, NavigationOutlined as NavIcon, ContentCopy as CopyIcon
} from '@mui/icons-material';

let L, MapContainer, TileLayer, Marker, useMap, Circle, ZoomControl;

const MapComponent = ({ onLocationSelect, searchLocation }) => {
  const [isClient, setIsClient] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [mapStyle, setMapStyle] = useState('streets');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [placeDetails, setPlaceDetails] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const mapRef = useRef(null);

  useEffect(() => {
    const loadLeaflet = async () => {
      L = await import('leaflet');
      const rl = await import('react-leaflet');
      MapContainer = rl.MapContainer; TileLayer = rl.TileLayer; Marker = rl.Marker;
      useMap = rl.useMap; Circle = rl.Circle; ZoomControl = rl.ZoomControl;
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

  // Fetch place details when searchLocation changes
  useEffect(() => {
    if (searchLocation && mapRef.current) {
      mapRef.current.flyTo([searchLocation.lat, searchLocation.lon], 17, { duration: 1.5 });
      setSelectedPlace(searchLocation);
      fetchPlaceDetails(searchLocation.lat, searchLocation.lon);
    }
  }, [searchLocation]);

  const fetchPlaceDetails = async (lat, lon) => {
    setIsLoadingDetails(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      setPlaceDetails(data);
    } catch (e) {
      console.error('Failed to fetch place details:', e);
    }
    setIsLoadingDetails(false);
  };

  const mapStyles = {
    streets: { url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', name: 'Streets', icon: '🗺️' },
    light: { url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', name: 'Light', icon: '☀️' },
    dark: { url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', name: 'Dark', icon: '🌙' },
    satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', name: 'Satellite', icon: '🛰️' },
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
    if (mapRef.current) mapRef.current.flyTo([lat, lon], 17, { duration: 1.5 });
    const location = { lat, lon, name: result.display_name.split(',')[0], fullName: result.display_name };
    setSelectedPlace(location);
    fetchPlaceDetails(lat, lon);
    if (onLocationSelect) onLocationSelect(location);
    setShowSearchResults(false);
    setSearchQuery(result.display_name.split(',')[0]);
  };

  const handleGetCurrentLocation = async () => {
    setIsGettingLocation(true);
    setLocationError(null);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation([latitude, longitude]);
          if (mapRef.current) mapRef.current.flyTo([latitude, longitude], 17, { duration: 1.5 });
          setIsGettingLocation(false);
        },
        async (error) => {
          try {
            const response = await fetch('https://ipapi.co/json/');
            const data = await response.json();
            if (data.latitude && data.longitude) {
              setCurrentLocation([data.latitude, data.longitude]);
              if (mapRef.current) mapRef.current.flyTo([data.latitude, data.longitude], 14, { duration: 1.5 });
            }
          } catch (e) {
            setLocationError('Could not get location');
          }
          setIsGettingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setLocationError('Geolocation not supported');
      setIsGettingLocation(false);
    }
  };

  const handleOpenDirections = () => {
    if (selectedPlace) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedPlace.lat},${selectedPlace.lon}`, '_blank');
    }
  };

  const handleShare = async () => {
    if (selectedPlace && navigator.share) {
      try {
        await navigator.share({
          title: selectedPlace.name,
          text: `Check out ${selectedPlace.name}`,
          url: `https://www.google.com/maps?q=${selectedPlace.lat},${selectedPlace.lon}`
        });
      } catch (e) { }
    } else if (selectedPlace) {
      navigator.clipboard.writeText(`https://www.google.com/maps?q=${selectedPlace.lat},${selectedPlace.lon}`);
    }
  };

  const closeInfoCard = () => {
    setSelectedPlace(null);
    setPlaceDetails(null);
  };

  const MapController = () => { const map = useMap(); useEffect(() => { mapRef.current = map; }, [map]); return null; };

  const createCustomIcon = (color = '#14b8a6', isCurrentLocation = false) => {
    if (!L) return null;

    if (isCurrentLocation) {
      return L.divIcon({
        className: 'current-location-marker',
        html: `
          <div style="position: relative; width: 28px; height: 28px;">
            <div style="position: absolute; width: 28px; height: 28px; background: ${color}; border-radius: 50%; animation: pulse 2s infinite ease-out; opacity: 0.4;"></div>
            <div style="position: absolute; top: 6px; left: 6px; width: 16px; height: 16px; background: linear-gradient(135deg, ${color} 0%, #0284c7 100%); border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.35);"></div>
          </div>
          <style>
            @keyframes pulse {
              0% { transform: scale(1); opacity: 0.4; }
              70% { transform: scale(2.5); opacity: 0; }
              100% { transform: scale(1); opacity: 0; }
            }
          </style>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14],
      });
    }

    return L.divIcon({
      className: 'point-pin-marker',
      html: `
        <div style="position: relative; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));">
          <svg width="40" height="40" viewBox="0 0 297 297" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="pinGradient${color.replace('#', '')}" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
                <stop offset="100%" style="stop-color:${color}cc;stop-opacity:1" />
              </linearGradient>
            </defs>
            <path 
              d="M148.5,0C85.646,0,34.511,51.136,34.511,113.989c0,25.11,8.008,48.926,23.157,68.873
                 c13.604,17.914,32.512,31.588,53.658,38.904l27.464,68.659c1.589,3.971,5.434,6.574,9.71,6.574
                 c4.276,0,8.121-2.603,9.71-6.574l27.464-68.659c21.147-7.316,40.054-20.99,53.658-38.904
                 c15.149-19.947,23.157-43.763,23.157-68.873C262.489,51.136,211.354,0,148.5,0z M148.5,162.356
                 c0,0-51.766-34.511-51.766-60.394c0-14.297,11.588-25.883,25.883-25.883S148.5,87.668,148.5,101.963
                 c0-14.295,11.588-25.883,25.883-25.883c14.295,0,25.883,11.586,25.883,25.883
                 C200.266,127.846,148.5,162.356,148.5,162.356z"
              fill="url(#pinGradient${color.replace('#', '')})"
            />
            <path 
              d="M148.5,162.356c0,0-51.766-34.511-51.766-60.394c0-14.297,11.588-25.883,25.883-25.883
                 S148.5,87.668,148.5,101.963c0-14.295,11.588-25.883,25.883-25.883c14.295,0,25.883,11.586,25.883,25.883
                 C200.266,127.846,148.5,162.356,148.5,162.356z"
              fill="white"
            />
          </svg>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40],
    });
  };

  // Get formatted address from place details
  const getFormattedAddress = () => {
    if (!placeDetails?.address) return selectedPlace?.fullName || selectedPlace?.name || '';
    const addr = placeDetails.address;
    const parts = [];
    if (addr.road) parts.push(addr.road);
    if (addr.suburb || addr.neighbourhood) parts.push(addr.suburb || addr.neighbourhood);
    if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village);
    if (addr.state) parts.push(addr.state);
    if (addr.postcode) parts.push(addr.postcode);
    return parts.join(', ');
  };

  const getPlaceType = () => {
    if (!placeDetails) return 'Location';
    return placeDetails.type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Location';
  };

  if (!isClient || !MapContainer) {
    return (
      <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' }}>
        <Box sx={{ textAlign: 'center' }}>
          <Box sx={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(20, 184, 166, 0.3)'
          }}>
            <CircularProgress size={40} sx={{ color: 'white' }} />
          </Box>
          <Typography variant="h6" sx={{ color: '#1e293b', fontWeight: 600, mb: 0.5 }}>Loading Map</Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>Preparing your exploration...</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Search Bar */}
      <Fade in>
        <Paper elevation={0} sx={{
          position: 'absolute', top: 16, left: 16, right: 16, zIndex: 1000,
          background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(20px)',
          borderRadius: 3, boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
          overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)'
        }}>
          <TextField
            fullWidth placeholder="Search places, addresses..."
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            sx={{
              '& .MuiOutlinedInput-root': { color: '#1e293b', fontSize: '0.95rem', '& fieldset': { border: 'none' }, '& input': { py: 1.75 } },
              '& .MuiInputBase-input::placeholder': { color: '#94a3b8' }
            }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#14b8a6', fontSize: 22 }} /></InputAdornment>,
              endAdornment: <InputAdornment position="end">
                {isSearching ? <CircularProgress size={20} sx={{ color: '#14b8a6' }} /> :
                  searchQuery && <IconButton size="small" onClick={() => { setSearchQuery(''); setShowSearchResults(false); }}>
                    <CloseIcon sx={{ color: '#94a3b8', fontSize: 18 }} />
                  </IconButton>}
              </InputAdornment>
            }}
          />
          {showSearchResults && searchResults.length > 0 && (
            <Box sx={{ borderTop: '1px solid #f1f5f9', maxHeight: 300, overflow: 'auto' }}>
              {searchResults.map((result, i) => (
                <Box key={i} onClick={() => handleSearchResultClick(result)} sx={{
                  p: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1.5,
                  transition: 'all 0.15s', '&:hover': { background: '#f8fafc' }, borderBottom: '1px solid #f8fafc'
                }}>
                  <Box sx={{ width: 40, height: 40, background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(20, 184, 166, 0.25)', flexShrink: 0 }}>
                    <PlaceIcon sx={{ color: 'white', fontSize: 20 }} />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>{result.display_name.split(',')[0]}</Typography>
                    <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {result.display_name.split(',').slice(1, 4).join(',')}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Paper>
      </Fade>

      {/* Map Controls */}
      <Box sx={{ position: 'absolute', top: 100, right: 16, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end' }}>
        <Box sx={{ position: 'relative' }}>
          <Tooltip title="Map Style" placement="left">
            <Paper sx={{ background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(10px)', borderRadius: 2, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <IconButton onClick={() => setShowLayerMenu(!showLayerMenu)} sx={{ color: '#14b8a6', width: 44, height: 44 }}>
                <LayersIcon />
              </IconButton>
            </Paper>
          </Tooltip>
          {showLayerMenu && (
            <Paper sx={{ position: 'absolute', top: 0, right: 52, p: 1.5, background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(10px)', borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', width: 150, zIndex: 1001 }}>
              <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600, fontSize: '0.65rem', textTransform: 'uppercase', px: 0.5, mb: 1, display: 'block' }}>Map Style</Typography>
              {Object.entries(mapStyles).map(([key, style]) => (
                <Box key={key} onClick={() => { setMapStyle(key); setShowLayerMenu(false); }}
                  sx={{ p: 1, borderRadius: 1.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1, background: mapStyle === key ? 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)' : 'transparent', transition: 'all 0.15s', '&:hover': { background: mapStyle === key ? undefined : '#f8fafc' } }}>
                  <Typography sx={{ fontSize: 14 }}>{style.icon}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: mapStyle === key ? 600 : 400, color: mapStyle === key ? 'white' : '#475569', fontSize: '0.85rem' }}>{style.name}</Typography>
                </Box>
              ))}
            </Paper>
          )}
        </Box>

        <Tooltip title="My Location" placement="left">
          <Paper sx={{ background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(10px)', borderRadius: 2, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <IconButton onClick={handleGetCurrentLocation} disabled={isGettingLocation} sx={{ width: 44, height: 44, color: currentLocation ? '#22c55e' : '#14b8a6' }}>
              {isGettingLocation ? <CircularProgress size={20} sx={{ color: '#14b8a6' }} /> : currentLocation ? <GpsIcon /> : <MyLocationIcon />}
            </IconButton>
          </Paper>
        </Tooltip>

        {locationError && (
          <Fade in><Chip label={locationError} size="small" color="error" onDelete={() => setLocationError(null)} sx={{ borderRadius: 2 }} /></Fade>
        )}
      </Box>

      {/* Google-Style Place Info Card */}
      {selectedPlace && (
        <Fade in>
          <Paper elevation={0} sx={{
            position: 'absolute', bottom: 24, left: 16, zIndex: 1000,
            width: 340, maxWidth: 'calc(100% - 32px)',
            background: 'white', borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            overflow: 'hidden'
          }}>
            {/* Card Header with image placeholder */}
            <Box sx={{
              height: 120,
              background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 50%, #0f766e 100%)',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <PlaceIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }} />
              <IconButton onClick={closeInfoCard} sx={{ position: 'absolute', top: 10, right: 15, background: 'rgba(0,0,0,0.2)', color: 'white', '&:hover': { background: 'rgba(0,0,0,0.3)' } }}>
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>

            {/* Card Content */}
            <Box sx={{ p: 2 }}>
              {/* Place Name & Type */}
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '1.1rem', mb: 0.25 }}>
                {selectedPlace.name}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Chip label={getPlaceType()} size="small" sx={{ height: 22, fontSize: '0.7rem', background: '#f1f5f9', color: '#64748b' }} />
                {isLoadingDetails && <CircularProgress size={14} sx={{ color: '#14b8a6' }} />}
              </Box>

              {/* Address */}
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
                <PlaceIcon sx={{ fontSize: 18, color: '#94a3b8', mt: 0.25 }} />
                <Typography variant="body2" sx={{ color: '#475569', fontSize: '0.85rem', lineHeight: 1.5 }}>
                  {getFormattedAddress()}
                </Typography>
              </Box>

              {/* Coordinates */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <NavIcon sx={{ fontSize: 18, color: '#94a3b8' }} />
                <Typography variant="body2" sx={{ color: '#94a3b8', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                  {selectedPlace.lat.toFixed(6)}, {selectedPlace.lon.toFixed(6)}
                </Typography>
                <IconButton size="small" onClick={() => navigator.clipboard.writeText(`${selectedPlace.lat}, ${selectedPlace.lon}`)} sx={{ ml: 'auto' }}>
                  <CopyIcon sx={{ fontSize: 14, color: '#94a3b8' }} />
                </IconButton>
              </Box>

              <Divider sx={{ mb: 2 }} />

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  startIcon={<DirectionsIcon />}
                  onClick={handleOpenDirections}
                  sx={{
                    flex: 1,
                    background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    boxShadow: '0 4px 12px rgba(20, 184, 166, 0.3)',
                    '&:hover': { boxShadow: '0 6px 16px rgba(20, 184, 166, 0.4)' }
                  }}
                >
                  Directions
                </Button>
                <IconButton onClick={handleShare} sx={{ background: '#f1f5f9', borderRadius: 2, '&:hover': { background: '#e2e8f0' } }}>
                  <ShareIcon sx={{ fontSize: 20, color: '#64748b' }} />
                </IconButton>
                <IconButton sx={{ background: '#f1f5f9', borderRadius: 2, '&:hover': { background: '#e2e8f0' } }}>
                  <BookmarkIcon sx={{ fontSize: 20, color: '#64748b' }} />
                </IconButton>
              </Box>
            </Box>
          </Paper>
        </Fade>
      )}

      <MapContainer center={[21.1702, 72.8311]} zoom={12} style={{ width: '100%', height: '100%' }} zoomControl={false}>
        <MapController />
        <ZoomControl position="bottomright" />
        <TileLayer url={mapStyles[mapStyle].url} attribution='&copy; OpenStreetMap, CARTO' />
        {searchLocation && (
          <Marker position={[searchLocation.lat, searchLocation.lon]} icon={createCustomIcon('#14b8a6')} />
        )}
        {currentLocation && (
          <>
            <Circle center={currentLocation} radius={100} pathOptions={{ color: '#14b8a6', fillColor: '#14b8a6', fillOpacity: 0.1, weight: 2 }} />
            <Circle center={currentLocation} radius={30} pathOptions={{ color: '#14b8a6', fillColor: '#14b8a6', fillOpacity: 0.2, weight: 0 }} />
            <Marker position={currentLocation} icon={createCustomIcon('#0ea5e9', true)} />
          </>
        )}
      </MapContainer>
    </Box>
  );
};

export default MapComponent;
