'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Box, Paper, Typography, TextField, IconButton, InputAdornment, CircularProgress, Chip } from '@mui/material';
import { Send as SendIcon, LocationOn as LocationIcon, Restaurant as RestaurantIcon, LocalCafe as CafeIcon, Hotel as HotelIcon, Attractions as AttractionIcon, Search as SearchIcon, ArrowForward as ArrowIcon, MyLocation as MyLocationIcon } from '@mui/icons-material';

const QUICK_ACTIONS = [
  { label: 'Cafes', icon: <CafeIcon sx={{ fontSize: 16 }} />, query: 'cafe', color: '#14b8a6' },
  { label: 'Restaurants', icon: <RestaurantIcon sx={{ fontSize: 16 }} />, query: 'restaurant', color: '#f43f5e' },
  { label: 'Hotels', icon: <HotelIcon sx={{ fontSize: 16 }} />, query: 'hotel', color: '#8b5cf6' },
  { label: 'Attractions', icon: <AttractionIcon sx={{ fontSize: 16 }} />, query: 'tourist attraction', color: '#0ea5e9' },
];

const DEFAULT_LOCATION = { lat: 40.7128, lon: -74.006, name: 'New York' };

const AIAssistant = ({ onPlaceSelect }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationName, setLocationName] = useState('');
  const [isGettingLocation, setIsGettingLocation] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Get current location on mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = () => {
    setIsGettingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const loc = { lat: position.coords.latitude, lon: position.coords.longitude };
          setCurrentLocation(loc);
          // Reverse geocode to get location name
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.lat}&lon=${loc.lon}`);
            const data = await res.json();
            setLocationName(data.address?.city || data.address?.town || data.address?.village || 'Your Location');
          } catch { setLocationName('Your Location'); }
          setIsGettingLocation(false);
        },
        () => {
          setCurrentLocation(DEFAULT_LOCATION);
          setLocationName(DEFAULT_LOCATION.name);
          setIsGettingLocation(false);
        },
        { timeout: 5000 }
      );
    } else {
      setCurrentLocation(DEFAULT_LOCATION);
      setLocationName(DEFAULT_LOCATION.name);
      setIsGettingLocation(false);
    }
  };

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages]);

  const searchPlaces = async (query, loc) => {
    setIsLoading(true);
    try {
      const searchLoc = loc || currentLocation || DEFAULT_LOCATION;
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=8&viewbox=${searchLoc.lon - 0.2},${searchLoc.lat + 0.2},${searchLoc.lon + 0.2},${searchLoc.lat - 0.2}&bounded=0`;
      const response = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      return await response.json();
    } catch (error) { console.error('Search error:', error); return []; }
    finally { setIsLoading(false); }
  };

  const handleSendMessage = useCallback(async (customQuery = null) => {
    const query = customQuery || inputValue.trim();
    if (!query) return;

    setMessages(prev => [...prev, { id: Date.now(), type: 'user', text: query, time: new Date() }]);
    setInputValue('');

    const results = await searchPlaces(query, currentLocation);
    const aiResponse = results.length > 0
      ? { id: Date.now() + 1, type: 'ai', text: `Found ${results.length} results near ${locationName || 'you'}`, results: results.slice(0, 5), time: new Date() }
      : { id: Date.now() + 1, type: 'ai', text: `No results found. Try a different search.`, time: new Date() };
    setMessages(prev => [...prev, aiResponse]);

    // Keep focus on input
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [inputValue, currentLocation, locationName]);

  const handleQuickAction = useCallback((query) => {
    const searchQuery = `${query} near ${locationName || 'me'}`;
    handleSendMessage(searchQuery);
  }, [locationName, handleSendMessage]);

  const handlePlaceClick = (place) => {
    if (onPlaceSelect) onPlaceSelect({ lat: parseFloat(place.lat), lon: parseFloat(place.lon), name: place.display_name.split(',')[0] });
  };

  const handleInputChange = useCallback((e) => {
    setInputValue(e.target.value);
  }, []);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  return (
    <Box sx={{ height: '100%', background: 'white', display: 'flex', flexDirection: 'column' }}>
      {/* Compact Header */}
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 28, height: 28, borderRadius: 1.5, background: '#14b8a6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SearchIcon sx={{ color: 'white', fontSize: 16 }} />
          </Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1e293b' }}>Place Search</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <MyLocationIcon sx={{ fontSize: 14, color: isGettingLocation ? '#94a3b8' : '#14b8a6' }} />
          <Typography variant="caption" sx={{ color: '#64748b' }}>{isGettingLocation ? 'Getting location...' : locationName}</Typography>
        </Box>
      </Box>

      {/* Compact Quick Actions */}
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
        {QUICK_ACTIONS.map((action) => (
          <Chip key={action.label} icon={action.icon} label={action.label} size="small" onClick={() => handleQuickAction(action.query)}
            sx={{
              height: 28, fontSize: '0.75rem', background: `${action.color}10`, color: action.color, border: `1px solid ${action.color}25`, fontWeight: 500,
              '& .MuiChip-icon': { color: action.color, ml: 0.5 }, '&:hover': { background: `${action.color}20` }
            }} />
        ))}
      </Box>

      {/* Messages Area */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 2, py: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {messages.length === 0 ? (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#94a3b8' }}>
            <SearchIcon sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
            <Typography variant="body2" sx={{ textAlign: 'center' }}>Search for places or tap a quick action above</Typography>
          </Box>
        ) : (
          messages.map((msg) => (
            <Box key={msg.id} sx={{ display: 'flex', flexDirection: 'column', alignItems: msg.type === 'user' ? 'flex-end' : 'flex-start' }}>
              {msg.type === 'user' ? (
                <Box sx={{ py: 1, px: 2, borderRadius: 2, background: '#14b8a6', maxWidth: '85%' }}>
                  <Typography variant="body2" sx={{ color: 'white', fontSize: '0.8rem' }}>{msg.text}</Typography>
                </Box>
              ) : (
                <Box sx={{ width: '100%' }}>
                  <Typography variant="caption" sx={{ color: '#64748b', mb: 0.75, display: 'block' }}>{msg.text}</Typography>
                  {msg.results && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                      {msg.results.map((place, i) => (
                        <Paper key={i} elevation={0} onClick={() => handlePlaceClick(place)}
                          sx={{ p: 1.25, borderRadius: 2, background: '#f8fafc', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.15s', '&:hover': { background: '#f1f5f9', borderColor: '#14b8a6' } }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 24, height: 24, borderRadius: 1.5, background: '#14b8a6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <LocationIcon sx={{ fontSize: 14, color: 'white' }} />
                            </Box>
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b', fontSize: '0.8rem', lineHeight: 1.3 }}>{place.display_name.split(',')[0]}</Typography>
                              <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{place.display_name.split(',').slice(1, 3).join(',')}</Typography>
                            </Box>
                          </Box>
                        </Paper>
                      ))}
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          ))
        )}
        {isLoading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={16} sx={{ color: '#14b8a6' }} />
            <Typography variant="caption" sx={{ color: '#64748b' }}>Searching...</Typography>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Compact Input */}
      <Box sx={{ p: 1.5, borderTop: '1px solid #f1f5f9' }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search places..."
          value={inputValue}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          inputRef={inputRef}
          autoComplete="off"
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5, background: '#f8fafc', fontSize: '0.85rem', '& fieldset': { borderColor: '#e2e8f0' }, '&:hover fieldset': { borderColor: '#14b8a6' }, '&.Mui-focused fieldset': { borderColor: '#14b8a6' } } }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#94a3b8', fontSize: 18 }} /></InputAdornment>,
            endAdornment: <InputAdornment position="end">
              <IconButton size="small" onClick={() => handleSendMessage()} disabled={!inputValue.trim() || isLoading}
                sx={{ width: 28, height: 28, background: inputValue.trim() ? '#14b8a6' : '#e2e8f0', color: 'white', '&:hover': { background: '#0d9488' }, '&.Mui-disabled': { background: '#e2e8f0', color: '#94a3b8' } }}>
                <ArrowIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </InputAdornment>
          }} />
      </Box>
    </Box>
  );
};

export default AIAssistant;
