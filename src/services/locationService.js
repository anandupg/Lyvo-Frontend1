// Universal Location Search Service
// Works with both Google Maps and Leaflet maps

class LocationService {
  constructor() {
    this.googleMapsLoaded = false;
    this.geocoder = null;
    this.autocomplete = null;
  }

  // Initialize Google Maps services
  async initializeGoogleMaps() {
    if (this.googleMapsLoaded) return Promise.resolve();

    return new Promise((resolve, reject) => {
      if (window.google && window.google.maps) {
        this.googleMapsLoaded = true;
        this.geocoder = new window.google.maps.Geocoder();
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyCoPzRJLAmma54BBOyF4AhZ2ZIqGvak8CA&libraries=places,geometry`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        this.googleMapsLoaded = true;
        this.geocoder = new window.google.maps.Geocoder();
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Search locations using Google Places API (for Google Maps)
  async searchWithGooglePlaces(query, inputElement) {
    if (!this.googleMapsLoaded) {
      await this.initializeGoogleMaps();
    }

    if (!this.autocomplete && inputElement) {
      this.autocomplete = new window.google.maps.places.Autocomplete(
        inputElement,
        {
          types: ['establishment', 'geocode'],
          componentRestrictions: { country: 'in' },
          fields: ['place_id', 'geometry', 'name', 'formatted_address']
        }
      );
    }

    return this.autocomplete;
  }

  // Search locations using OpenStreetMap Nominatim API (for Leaflet)
  async searchWithNominatim(query) {
    if (!query || query.length < 3) return [];

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=5&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'LyvoPlus-App'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const results = await response.json();

      return results.map(result => ({
        id: result.place_id,
        name: result.display_name.split(',')[0], // Get the first part as name
        address: result.display_name,
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        type: result.type,
        importance: result.importance
      })).sort((a, b) => b.importance - a.importance); // Sort by importance
    } catch (error) {
      console.error('Nominatim search error:', error);
      return [];
    }
  }

  // Reverse geocoding using Google Maps API
  async reverseGeocodeWithGoogle(lat, lng) {
    if (!this.googleMapsLoaded) {
      await this.initializeGoogleMaps();
    }

    return new Promise((resolve, reject) => {
      this.geocoder.geocode(
        { location: { lat, lng } },
        (results, status) => {
          if (status === 'OK' && results[0]) {
            const result = results[0];
            let locationName = 'Current Location';
            let address = result.formatted_address;

            if (result.address_components) {
              const components = result.address_components;
              const locality = components.find(comp => comp.types.includes('locality'));
              const sublocality = components.find(comp => comp.types.includes('sublocality'));
              const neighborhood = components.find(comp => comp.types.includes('neighborhood'));
              const administrative_area_level_1 = components.find(comp => comp.types.includes('administrative_area_level_1'));
              const administrative_area_level_2 = components.find(comp => comp.types.includes('administrative_area_level_2'));

              if (locality && administrative_area_level_1) {
                locationName = `${locality.long_name}, ${administrative_area_level_1.long_name}`;
              } else if (sublocality && administrative_area_level_1) {
                locationName = `${sublocality.long_name}, ${administrative_area_level_1.long_name}`;
              } else if (neighborhood && administrative_area_level_1) {
                locationName = `${neighborhood.long_name}, ${administrative_area_level_1.long_name}`;
              } else if (administrative_area_level_2 && administrative_area_level_1) {
                locationName = `${administrative_area_level_2.long_name}, ${administrative_area_level_1.long_name}`;
              } else {
                locationName = result.formatted_address;
              }
            }

            resolve({
              name: locationName,
              address: address,
              lat: lat,
              lng: lng
            });
          } else {
            reject(new Error('Geocoding failed'));
          }
        }
      );
    });
  }

  // Reverse geocoding using Nominatim API (for Leaflet)
  async reverseGeocodeWithNominatim(lat, lng) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'LyvoPlus-App'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      let locationName = 'Current Location';
      let address = result.display_name;

      if (result.address) {
        const addr = result.address;
        if (addr.city || addr.town || addr.village) {
          const city = addr.city || addr.town || addr.village;
          const state = addr.state;
          locationName = state ? `${city}, ${state}` : city;
        } else if (addr.suburb || addr.neighbourhood) {
          const suburb = addr.suburb || addr.neighbourhood;
          const state = addr.state;
          locationName = state ? `${suburb}, ${state}` : suburb;
        } else if (addr.state) {
          locationName = addr.state;
        }
      }

      return {
        name: locationName,
        address: address,
        lat: lat,
        lng: lng
      };
    } catch (error) {
      console.error('Nominatim reverse geocoding error:', error);
      return {
        name: 'Current Location',
        address: 'Your current location',
        lat: lat,
        lng: lng
      };
    }
  }

  // Universal search method that works with both map types
  async searchLocation(query, mapType = 'google') {
    if (mapType === 'google') {
      // For Google Maps, we'll return the autocomplete instance
      // The actual search will be handled by Google's autocomplete
      return null;
    } else {
      // For Leaflet, use Nominatim
      return await this.searchWithNominatim(query);
    }
  }

  // Universal reverse geocoding
  async reverseGeocode(lat, lng, mapType = 'google') {
    if (mapType === 'google') {
      return await this.reverseGeocodeWithGoogle(lat, lng);
    } else {
      return await this.reverseGeocodeWithNominatim(lat, lng);
    }
  }

  // Get current location with universal geocoding
  async getCurrentLocation(mapType = 'google') {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          try {
            const locationData = await this.reverseGeocode(latitude, longitude, mapType);
            resolve({
              ...locationData,
              accuracy: position.coords.accuracy,
              timestamp: new Date().toLocaleString()
            });
          } catch (error) {
            // Fallback if geocoding fails
            resolve({
              name: 'Current Location',
              address: 'Your current location',
              lat: latitude,
              lng: longitude,
              accuracy: position.coords.accuracy,
              timestamp: new Date().toLocaleString()
            });
          }
        },
        (error) => {
          let errorMessage = 'Unable to get your current location. ';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage += 'Location access denied by user.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage += 'Location information unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage += 'Location request timed out.';
              break;
            default:
              errorMessage += 'Unknown error occurred.';
              break;
          }
          reject(new Error(errorMessage));
        }
      );
    });
  }
}

// Export singleton instance
export default new LocationService();
