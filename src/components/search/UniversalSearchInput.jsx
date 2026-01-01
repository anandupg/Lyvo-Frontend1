import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2, X } from 'lucide-react';
import locationService from '../../services/locationService';

const UniversalSearchInput = ({
  mapType = 'google',
  onLocationSelect,
  placeholder = "Search for a location (e.g., Koramangala, Bangalore)",
  className = ""
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [googleAutocomplete, setGoogleAutocomplete] = useState(null);

  const inputRef = useRef(null);
  const resultsRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Initialize Google Maps autocomplete when mapType is 'google'
  useEffect(() => {
    if (mapType === 'google' && inputRef.current) {
      initializeGoogleAutocomplete();
    }
  }, [mapType]);

  // Initialize Google Places Autocomplete
  const initializeGoogleAutocomplete = async () => {
    try {
      await locationService.initializeGoogleMaps();
      if (inputRef.current && !googleAutocomplete) {
        const autocomplete = await locationService.searchWithGooglePlaces('', inputRef.current);

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (place.geometry) {
            const locationData = {
              name: place.name || place.formatted_address,
              address: place.formatted_address,
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng()
            };
            setSearchQuery(locationData.name);
            setShowResults(false);
            onLocationSelect(locationData);
          }
        });

        setGoogleAutocomplete(autocomplete);
      }
    } catch (error) {
      console.error('Failed to initialize Google autocomplete:', error);
    }
  };

  // Handle search input changes
  const handleSearchInput = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    // Debounce search for Leaflet maps
    if (mapType === 'leaflet') {
      searchTimeoutRef.current = setTimeout(async () => {
        await performSearch(query);
      }, 300);
    }
  };

  // Perform search for Leaflet maps using Nominatim
  const performSearch = async (query) => {
    setIsSearching(true);
    try {
      const results = await locationService.searchWithNominatim(query);
      setSearchResults(results);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle result selection
  const handleResultSelect = (result) => {
    setSearchQuery(result.name);
    setShowResults(false);
    onLocationSelect(result);
  };

  // Handle current location button
  const handleCurrentLocation = async () => {
    setIsSearching(true);
    try {
      const location = await locationService.getCurrentLocation(mapType);
      setSearchQuery(location.name);
      setShowResults(false);
      onLocationSelect(location);
    } catch (error) {
      console.error('Current location error:', error);
      alert(error.message);
    } finally {
      setIsSearching(false);
    }
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (resultsRef.current && !resultsRef.current.contains(event.target) &&
        inputRef.current && !inputRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative z-20 ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={handleSearchInput}
          onFocus={() => {
            if (mapType === 'leaflet' && searchResults.length > 0) {
              setShowResults(true);
            }
          }}
          className="w-full pl-10 pr-20 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          autoComplete="off"
        />

        {/* Right side controls */}
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
          {/* Loading indicator */}
          {isSearching && (
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          )}

          {/* Map type indicator */}
          <div className="text-xs text-gray-500">
            {mapType === 'google' ? (
              <span className="text-green-600">✓ Google</span>
            ) : (
              <span className="text-blue-600">✓ Leaflet</span>
            )}
          </div>

          {/* Clear button */}
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Search Results Dropdown (for Leaflet maps) */}
      {mapType === 'leaflet' && showResults && searchResults.length > 0 && (
        <div
          ref={resultsRef}
          className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto"
          style={{ zIndex: 30 }}
        >
          {searchResults.map((result, index) => (
            <button
              key={result.id || index}
              onClick={() => handleResultSelect(result)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
            >
              <div className="flex items-start space-x-3">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {result.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {result.address}
                  </p>
                  {result.type && (
                    <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                      {result.type}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Current Location Button */}
      <div className="mt-2 flex justify-between items-center">
        <button
          onClick={handleCurrentLocation}
          disabled={isSearching}
          className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <MapPin className="w-4 h-4" />
          <span>Use Current Location</span>
        </button>

        {/* Search info */}
        <div className="text-xs text-gray-500">
          {mapType === 'google' ? 'Google Places Autocomplete' : 'OpenStreetMap Search'}
        </div>
      </div>
    </div>
  );
};

export default UniversalSearchInput;
