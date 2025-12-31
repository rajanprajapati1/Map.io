'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, TextField, IconButton, InputAdornment,
  CircularProgress, Tooltip, Fade, Avatar
} from '@mui/material';
import {
  LocationOn as LocationIcon, Restaurant as RestaurantIcon,
  LocalCafe as CafeIcon, Hotel as HotelIcon, Attractions as AttractionIcon,
  Search as SearchIcon, MyLocation as MyLocationIcon, Refresh as RefreshIcon,
  NearMe as NearMeIcon, Map as MapIcon, TravelExplore as ExploreIcon,
  LocalHospital as HospitalIcon, LocalGasStation as GasIcon, ShoppingCart as ShoppingIcon,
  Park as ParkIcon, ArrowUpward as ArrowUpIcon, Explore as CompassIcon,
  CheckCircle as CheckIcon, WifiOff as WifiOffIcon, ErrorOutline as ErrorIcon
} from '@mui/icons-material';

const QUICK_ACTIONS = [
  { label: 'Cafes', icon: <CafeIcon />, query: 'cafe', color: '#14b8a6' },
  { label: 'Food', icon: <RestaurantIcon />, query: 'restaurant', color: '#f43f5e' },
  { label: 'Hotels', icon: <HotelIcon />, query: 'hotel', color: '#8b5cf6' },
  { label: 'Attractions', icon: <AttractionIcon />, query: 'tourist attraction', color: '#0ea5e9' },
  { label: 'Hospital', icon: <HospitalIcon />, query: 'hospital', color: '#ef4444' },
  { label: 'Fuel', icon: <GasIcon />, query: 'petrol pump', color: '#f59e0b' },
  { label: 'Mall', icon: <ShoppingIcon />, query: 'shopping mall', color: '#ec4899' },
  { label: 'Parks', icon: <ParkIcon />, query: 'park garden', color: '#22c55e' },
];

const DEFAULT_LOCATION = { lat: 21.1702, lon: 72.8311, name: 'Surat' };

const AIAssistant = ({ onPlaceSelect }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationName, setLocationName] = useState('');
  const [locationStatus, setLocationStatus] = useState('loading');
  const [locationAccuracy, setLocationAccuracy] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    getLocationWithFallbacks();
  }, []);

  const getBrowserLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          let name = 'Your Location';
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16`,
              { headers: { 'Accept-Language': 'en' } }
            );
            const data = await res.json();
            name = data.address?.suburb || data.address?.neighbourhood ||
              data.address?.city || data.address?.town ||
              data.address?.village || data.address?.county || 'Your Location';
          } catch (e) { console.log('Reverse geocoding failed:', e); }
          resolve({ lat: latitude, lon: longitude, name, accuracy, method: 'gps' });
        },
        (error) => { reject(error); },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  const getIPLocation = async () => {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      if (data.latitude && data.longitude) {
        return { lat: data.latitude, lon: data.longitude, name: data.city || data.region || 'Your Area', accuracy: null, method: 'ip' };
      }
      throw new Error('No IP location data');
    } catch (e) {
      try {
        const response = await fetch('https://ip-api.com/json/?fields=lat,lon,city,regionName,country');
        const data = await response.json();
        if (data.lat && data.lon) {
          return { lat: data.lat, lon: data.lon, name: data.city || data.regionName || 'Your Area', accuracy: null, method: 'ip' };
        }
      } catch (e2) { }
      throw new Error('IP geolocation failed');
    }
  };

  const getLocationWithFallbacks = async () => {
    setLocationStatus('loading');
    try {
      const loc = await getBrowserLocation();
      setCurrentLocation({ lat: loc.lat, lon: loc.lon });
      setLocationName(loc.name);
      setLocationAccuracy(loc.accuracy);
      setLocationStatus('success');
      return;
    } catch (e) { }

    try {
      const loc = await getIPLocation();
      setCurrentLocation({ lat: loc.lat, lon: loc.lon });
      setLocationName(loc.name);
      setLocationAccuracy(null);
      setLocationStatus('ip-fallback');
      return;
    } catch (e) { }

    setCurrentLocation(DEFAULT_LOCATION);
    setLocationName(DEFAULT_LOCATION.name);
    setLocationStatus('error');
  };

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages]);

  const searchPlaces = async (query, loc) => {
    setIsLoading(true);
    try {
      const searchLoc = loc || currentLocation || DEFAULT_LOCATION;
      const radius = 0.15;
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=10&viewbox=${searchLoc.lon - radius},${searchLoc.lat + radius},${searchLoc.lon + radius},${searchLoc.lat - radius}&bounded=1`;
      const response = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      let results = await response.json();
      if (results.length === 0) {
        const widerUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ' near ' + (locationName || 'India'))}&limit=8`;
        const widerResponse = await fetch(widerUrl, { headers: { 'Accept-Language': 'en' } });
        results = await widerResponse.json();
      }
      return results;
    } catch (error) { return []; }
    finally { setIsLoading(false); }
  };

  const handleSendMessage = useCallback(async (customQuery = null) => {
    const query = customQuery || inputValue.trim();
    if (!query) return;
    setMessages(prev => [...prev, { id: Date.now(), type: 'user', text: query }]);
    setInputValue('');
    const results = await searchPlaces(query, currentLocation);
    const aiResponse = results.length > 0
      ? { id: Date.now() + 1, type: 'ai', text: `Found ${results.length} places near ${locationName || 'you'}`, results: results.slice(0, 6) }
      : { id: Date.now() + 1, type: 'ai', text: `No results found for "${query}". Try a different search.` };
    setMessages(prev => [...prev, aiResponse]);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [inputValue, currentLocation, locationName]);

  const handlePlaceClick = (place) => {
    if (onPlaceSelect) onPlaceSelect({ lat: parseFloat(place.lat), lon: parseFloat(place.lon), name: place.display_name.split(',')[0] });
  };

  const getStatusColor = () => {
    switch (locationStatus) {
      case 'success': return '#22c55e';
      case 'ip-fallback': return '#f59e0b';
      case 'error': return '#ef4444';
      default: return '#94a3b8';
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#fff' }}>
      {/* Header */}
      <Box sx={{
        px: 2, py: 1.5,
        background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
        flexShrink: 0
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 36, height: 36, borderRadius: 2, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ExploreIcon sx={{ color: 'white', fontSize: 20 }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, color: 'white', fontSize: '1rem' }}>Place Explorer</Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.7rem' }}>Find places nearby</Typography>
          </Box>
        </Box>
      </Box>

      {/* Location Bar */}
      <Box sx={{ px: 2, py: 1, background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MyLocationIcon sx={{ fontSize: 16, color: getStatusColor() }} />
          <Box>
            <Typography sx={{ fontWeight: 600, color: '#1e293b', fontSize: '0.8rem' }}>
              {locationStatus === 'loading' ? 'Detecting...' : locationName}
            </Typography>
            <Typography sx={{ color: '#94a3b8', fontSize: '0.6rem' }}>
              {locationStatus === 'success' && locationAccuracy && `GPS • ${Math.round(locationAccuracy)}m`}
              {locationStatus === 'ip-fallback' && 'IP-based location'}
              {locationStatus === 'error' && 'Default location'}
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={getLocationWithFallbacks} disabled={locationStatus === 'loading'} sx={{ width: 28, height: 28 }}>
          {locationStatus === 'loading' ? <CircularProgress size={14} /> : <RefreshIcon sx={{ fontSize: 16 }} />}
        </IconButton>
      </Box>

      {/* Quick Actions - Compact Horizontal Chips */}
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
        <Typography sx={{ color: '#94a3b8', fontWeight: 600, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1 }}>
          Quick Search
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {QUICK_ACTIONS.map((action) => (
            <Box
              key={action.label}
              onClick={() => handleSendMessage(action.query)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                px: 1.25,
                py: 0.5,
                borderRadius: 2,
                background: `${action.color}10`,
                border: `1px solid ${action.color}30`,
                cursor: 'pointer',
                transition: 'all 0.15s',
                '&:hover': { background: `${action.color}20`, transform: 'translateY(-1px)' },
                '& svg': { fontSize: 14, color: action.color }
              }}
            >
              {action.icon}
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 500, color: action.color }}>{action.label}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Messages Area */}
      <Box sx={{
        flex: 1,
        overflow: 'auto',
        px: 2,
        py: 1.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        minHeight: 0
      }}>
        {messages.length === 0 ? (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
            <Box sx={{ width: 60, height: 60, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5 }}>
              <MapIcon sx={{ fontSize: 28, color: '#94a3b8' }} />
            </Box>
            <Typography sx={{ fontWeight: 600, color: '#475569', fontSize: '0.9rem', mb: 0.5 }}>Explore Your Area</Typography>
            <Typography sx={{ color: '#94a3b8', fontSize: '0.75rem', maxWidth: 200 }}>Search for places or tap a quick action above</Typography>
          </Box>
        ) : (
          messages.map((msg) => (
            <Fade in key={msg.id}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: msg.type === 'user' ? 'flex-end' : 'flex-start' }}>
                {msg.type === 'user' ? (
                  <Box sx={{ py: 1, px: 2, borderRadius: '14px 14px 4px 14px', background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)', maxWidth: '85%' }}>
                    <Typography sx={{ color: 'white', fontSize: '0.8rem' }}>{msg.text}</Typography>
                  </Box>
                ) : (
                  <Box sx={{ width: '100%' }}>
                    <Typography sx={{ color: '#64748b', fontSize: '0.75rem', mb: 0.75 }}>{msg.text}</Typography>
                    {msg.results && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                        {msg.results.map((place, i) => (
                          <Paper key={i} elevation={0} onClick={() => handlePlaceClick(place)}
                            sx={{ p: 1.25, borderRadius: 2, background: '#f8fafc', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.15s', '&:hover': { borderColor: '#14b8a6', transform: 'translateX(2px)' } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ width: 28, height: 28, borderRadius: 1.5, background: '#14b8a6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <LocationIcon sx={{ fontSize: 14, color: 'white' }} />
                              </Box>
                              <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography sx={{ fontWeight: 600, color: '#1e293b', fontSize: '0.8rem', lineHeight: 1.2 }}>{place.display_name.split(',')[0]}</Typography>
                                <Typography sx={{ color: '#94a3b8', fontSize: '0.65rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {place.display_name.split(',').slice(1, 3).join(',')}
                                </Typography>
                              </Box>
                              <NearMeIcon sx={{ fontSize: 14, color: '#94a3b8' }} />
                            </Box>
                          </Paper>
                        ))}
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
            </Fade>
          ))
        )}
        {isLoading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={16} sx={{ color: '#14b8a6' }} />
            <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>Searching...</Typography>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input Area */}
      <Box sx={{ p: 1.5, borderTop: '1px solid #e2e8f0', background: '#fff', flexShrink: 0 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search places..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            inputRef={inputRef}
            autoComplete="off"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2.5,
                background: '#f8fafc',
                fontSize: '0.85rem',
                '& fieldset': { borderColor: '#e2e8f0' },
                '&:hover fieldset': { borderColor: '#14b8a6' },
                '&.Mui-focused fieldset': { borderColor: '#14b8a6' }
              }
            }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#94a3b8', fontSize: 18 }} /></InputAdornment>,
            }}
          />
          <IconButton
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || isLoading}
            sx={{
              width: 40, height: 40, borderRadius: 2,
              background: inputValue.trim() ? 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)' : '#e2e8f0',
              color: 'white',
              '&:hover': { background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)' },
              '&.Mui-disabled': { background: '#e2e8f0', color: '#94a3b8' }
            }}>
            <ArrowUpIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
};

export default AIAssistant;
