import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Star, Users, Building } from 'lucide-react';

// Fix for default markers in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons for different property types
const createCustomIcon = (propertyType, color) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div style="
        background-color: ${color};
        width: 30px;
        height: 30px;
        border-radius: 50%;
        border: 3px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        color: white;
        font-size: 12px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ">
        ${propertyType?.charAt(0)?.toUpperCase() || 'P'}
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

const LeafletMap = ({
  properties = [],
  selectedLocation = null,
  radius = 5,
  onPropertyClick = () => { },
  height = '320px',
  showRadius = true
}) => {
  const [mapCenter, setMapCenter] = useState([12.9716, 77.5946]); // Default to Bangalore
  const [mapZoom, setMapZoom] = useState(12);

  // Update map center when selectedLocation changes
  useEffect(() => {
    if (selectedLocation && selectedLocation.lat && selectedLocation.lng) {
      const lat = parseFloat(selectedLocation.lat);
      const lng = parseFloat(selectedLocation.lng);
      if (!isNaN(lat) && !isNaN(lng)) {
        setMapCenter([lat, lng]);
        setMapZoom(15);
      }
    }
  }, [selectedLocation]);

  // Get marker color based on property type
  const getMarkerColor = (propertyType) => {
    switch (propertyType?.toLowerCase()) {
      case 'pg': return '#ef4444'; // Red
      case 'co-living': return '#3b82f6'; // Blue
      case 'apartment': return '#10b981'; // Green
      case 'house': return '#f59e0b'; // Yellow
      default: return '#ef4444'; // Default red
    }
  };

  // Format amenities for display
  const formatAmenities = (amenities) => {
    if (!amenities || typeof amenities !== 'object') return [];
    return Object.entries(amenities)
      .filter(([key, value]) => value === true)
      .map(([key]) => key);
  };

  return (
    <div className="w-full rounded-lg border border-gray-200 overflow-hidden relative z-10" style={{ height }}>
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        zoomControl={true}
        key={`${mapCenter[0]}-${mapCenter[1]}-${mapZoom}`} // Force re-render when center changes
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Property markers */}
        {/* Property markers */}
        {properties.map((property) => {
          const lat = parseFloat(property.lat);
          const lng = parseFloat(property.lng);

          if (isNaN(lat) || isNaN(lng)) return null;

          const markerColor = getMarkerColor(property.propertyType);
          const customIcon = createCustomIcon(property.propertyType, markerColor);
          const amenities = formatAmenities(property.amenities);

          return (
            <Marker
              key={property.id}
              position={[lat, lng]}
              icon={customIcon}
              eventHandlers={{
                click: () => onPropertyClick(property.id),
              }}
            >
              <Popup maxWidth={300} minWidth={250}>
                <div className="p-2">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                      {property.name}
                    </h3>
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 ml-2">
                      {property.propertyType || 'PG'}
                    </span>
                  </div>

                  <div className="flex items-center text-xs text-gray-600 mb-2">
                    <MapPin className="w-3 h-3 mr-1" />
                    <span className="truncate">{property.address}</span>
                  </div>

                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-bold text-red-600">{property.price}</p>
                      {property.matchScore && (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                          <Star className="w-2.5 h-2.5 fill-red-700" /> {property.matchScore}%
                        </span>
                      )}
                    </div>
                    {property.distance && property.distance !== '0 km' && (
                      <p className="text-xs text-gray-500">{property.distance} away</p>
                    )}
                  </div>

                  <div className="space-y-1 text-xs text-gray-600">
                    {property.maxOccupancy && (
                      <div className="flex items-center">
                        <Users className="w-3 h-3 mr-1" />
                        <span>Max Occupancy: {property.maxOccupancy} people</span>
                      </div>
                    )}

                    {property.ownerName && (
                      <div className="flex items-center">
                        <Building className="w-3 h-3 mr-1" />
                        <span>Owner: {property.ownerName}</span>
                      </div>
                    )}

                    {property.rating && (
                      <div className="flex items-center">
                        <Star className="w-3 h-3 mr-1 text-yellow-400 fill-current" />
                        <span>Rating: {property.rating}</span>
                      </div>
                    )}
                  </div>

                  {amenities.length > 0 && (
                    <div className="mt-2">
                      <p className="font-medium mb-1 text-xs">Amenities:</p>
                      <div className="flex flex-wrap gap-1">
                        {amenities.slice(0, 3).map((amenity, idx) => (
                          <span
                            key={idx}
                            className="px-1 py-0.5 bg-gray-100 text-gray-700 rounded text-xs"
                          >
                            {amenity}
                          </span>
                        ))}
                        {amenities.length > 3 && (
                          <span className="px-1 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                            +{amenities.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {property.images && property.images.length > 0 && (
                    <div className="mt-3">
                      <img
                        src={property.images[0]}
                        alt={property.name}
                        className="w-full h-16 object-cover rounded border"
                      />
                    </div>
                  )}

                  <button
                    onClick={() => onPropertyClick(property.id)}
                    className="w-full mt-3 bg-red-600 text-white text-xs py-2 px-3 rounded hover:bg-red-700 transition-colors"
                  >
                    View Details
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Radius Circle */}
        {selectedLocation && showRadius && !isNaN(parseFloat(selectedLocation.lat)) && !isNaN(parseFloat(selectedLocation.lng)) && (
          <Circle
            center={[parseFloat(selectedLocation.lat), parseFloat(selectedLocation.lng)]}
            radius={radius * 1000} // Convert km to meters
            pathOptions={{
              color: '#ef4444',
              fillColor: '#ef4444',
              fillOpacity: 0.1,
              weight: 2
            }}
          />
        )}
      </MapContainer>
    </div >
  );
};

export default LeafletMap;
