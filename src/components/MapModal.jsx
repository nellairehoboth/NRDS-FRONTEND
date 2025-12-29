import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Polyline, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapModal.css';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icons
const storeIcon = new L.Icon({
    iconUrl: 'https://cdn0.iconfinder.com/data/icons/small-n-flat/24/678111-map-marker-512.png',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
});

const customerIcon = new L.Icon({
    iconUrl: 'https://cdn4.iconfinder.com/data/icons/small-n-flat/24/user-512.png',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
});

// Helper to update map view when props change
function ChangeView({ center, zoom }) {
    const map = useMap();
    useEffect(() => {
        if (center && center[0] && center[1]) {
            map.setView(center, zoom || map.getZoom());
        }
    }, [center, zoom, map]);
    return null;
}

// Click handler component
function LocationPicker({ onLocationSelect, enabled }) {
    useMapEvents({
        click(e) {
            if (enabled) {
                onLocationSelect(e.latlng);
            }
        },
    });
    return null;
}

const MapModal = ({
    isOpen,
    onClose,
    onConfirm,
    initialLocation, // User's location
    shopLocation,    // Store's location
    viewOnly = false,
    title = "Select Delivery Location"
}) => {
    const [selectedLoc, setSelectedLoc] = useState(initialLocation);
    const [route, setRoute] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [locationError, setLocationError] = useState('');
    const debounceTimeout = useRef(null);

    // Sync with initialLocation when it changes
    useEffect(() => {
        if (initialLocation?.lat && initialLocation?.lng) {
            setSelectedLoc(initialLocation);
        }
    }, [initialLocation]);

    // Fetch route when locations exist
    useEffect(() => {
        const fetchRoute = async () => {
            if (selectedLoc?.lat && shopLocation?.lat) {
                try {
                    const url = `https://router.project-osrm.org/route/v1/driving/${shopLocation.lng},${shopLocation.lat};${selectedLoc.lng},${selectedLoc.lat}?overview=full&geometries=geojson`;
                    const res = await fetch(url);
                    const data = await res.json();
                    if (data.code === 'Ok' && data.routes?.[0]) {
                        const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
                        setRoute(coords);
                    }
                } catch (err) {
                    console.error("Route fetch failed:", err);
                }
            }
        };
        fetchRoute();
    }, [selectedLoc, shopLocation]);

    const handleSearchInput = (e) => {
        const query = e.target.value;
        setSearchQuery(query);

        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

        if (query.length < 3) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        debounceTimeout.current = setTimeout(async () => {
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5`);
                const data = await res.json();
                setSuggestions(data);
                setShowSuggestions(true);
            } catch (err) {
                console.error("Autosuggest failed:", err);
            }
        }, 300);
    };

    const handleSuggestionClick = (item) => {
        const { lat, lon, display_name } = item;
        const newLoc = { lat: parseFloat(lat), lng: parseFloat(lon) };
        setSelectedLoc(newLoc);
        setSearchQuery(display_name);
        setSuggestions([]);
        setShowSuggestions(false);
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        setShowSuggestions(false);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
            const data = await res.json();
            if (data && data.length > 0) {
                const { lat, lon } = data[0];
                const newLoc = { lat: parseFloat(lat), lng: parseFloat(lon) };
                setSelectedLoc(newLoc);
            }
        } catch (err) {
            console.error("Search failed:", err);
        } finally {
            setIsSearching(false);
        }
    };

    const [addressPreview, setAddressPreview] = useState({ title: '', full: 'Loading address...' });

    // Fetch address preview for the bottom sheet when selectedLoc changes
    useEffect(() => {
        const fetchAddressPreview = async () => {
            if (selectedLoc?.lat && selectedLoc?.lng) {
                try {
                    setAddressPreview(prev => ({ ...prev, full: 'Fetching address...' }));
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${selectedLoc.lat}&lon=${selectedLoc.lng}`);
                    const data = await res.json();
                    if (data && data.address) {
                        const addr = data.address;
                        const title = addr.neighbourhood || addr.suburb || addr.hamlet || addr.village || addr.town || addr.city || "Selected Location";
                        const full = data.display_name;
                        setAddressPreview({ title, full });
                    }
                } catch (error) {
                    console.error("Failed to fetch address preview", error);
                    setAddressPreview({ title: "Selected Location", full: "Address details unavailable" });
                }
            }
        };

        const timeoutId = setTimeout(fetchAddressPreview, 500); // Debounce
        return () => clearTimeout(timeoutId);
    }, [selectedLoc]);

    // Update handleCurrentLocation to not just set loc but also trigger view change
    const handleCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            return;
        }
        setIsSearching(true);
        setLocationError('');

        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 30000
        };

        const success = (pos) => {
            const { latitude, longitude } = pos.coords;
            setSelectedLoc({ lat: latitude, lng: longitude });
            setIsSearching(false);
            setLocationError('');
        };

        const error = (err) => {
            console.warn(`Geolocation error (${err.code}): ${err.message}`);

            // If high accuracy fails or times out, try one more time with low accuracy
            if (options.enableHighAccuracy) {
                console.log("Retrying with low accuracy...");
                navigator.geolocation.getCurrentPosition(success, (err2) => {
                    let msg = "Location request timed out.";
                    if (err2.code === 1) msg = "Location access denied.";
                    else if (err2.code === 2) msg = "Location unavailable.";

                    setLocationError(msg);
                    setIsSearching(false);
                }, { ...options, enableHighAccuracy: false, timeout: 5000 });
            } else {
                setLocationError("Location request timed out.");
                setIsSearching(false);
            }
        };

        navigator.geolocation.getCurrentPosition(success, error, options);
    };

    const [isMaximized, setIsMaximized] = useState(true);

    if (!isOpen) return null;

    const center = selectedLoc?.lat ? [selectedLoc.lat, selectedLoc.lng] : [10.7870, 79.1378];

    return (
        <div className={`map-modal-overlay ${isMaximized ? 'maximized' : ''}`}>
            <div className={`map-modal-card ${isMaximized ? 'maximized' : ''}`}>

                {/* Floating Close Button */}
                <button onClick={onClose} className="map-close-btn-floating">✕</button>

                {/* Window Toggle Button (Maximize/Minimize) */}
                <button
                    onClick={() => setIsMaximized(!isMaximized)}
                    className="map-toggle-btn-floating"
                    title={isMaximized ? "Minimize" : "Maximize"}
                    style={{ right: '65px' }} // Position next to close button
                >
                    {isMaximized ? '🗗' : '🗖'}
                </button>

                {/* Floating Search Bar */}
                {!viewOnly && (
                    <div className="map-floating-search">
                        <span className="search-icon-overlay">🔍</span>
                        <form onSubmit={handleSearch}>
                            <input
                                type="text"
                                placeholder="Search for area, street name..."
                                value={searchQuery}
                                onChange={handleSearchInput}
                                className="map-search-input-floating"
                            />
                        </form>
                        {showSuggestions && suggestions.length > 0 && (
                            <ul className="map-search-suggestions">
                                {suggestions.map((item, index) => (
                                    <li key={index} onClick={() => handleSuggestionClick(item)} className="suggestion-item">
                                        <strong>{item.display_name.split(',')[0]}</strong>
                                        <small>{item.display_name}</small>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {/* Floating Current Location Button */}
                {!viewOnly && (
                    <>
                        <div className="location-btn-text-floating">Current location</div>
                        <button
                            type="button"
                            onClick={handleCurrentLocation}
                            disabled={isSearching}
                            className="map-floating-location-btn"
                            title="Use Current Location"
                        >
                            <img src="/gps-target-icon.png" alt="" style={{ width: '22px', height: '22px' }} />
                        </button>
                        {locationError && (
                            <div style={{
                                position: 'absolute',
                                top: '155px',
                                right: '20px',
                                color: '#ef4444',
                                backgroundColor: 'rgba(255,255,255,0.9)',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '0.85rem',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                zIndex: 1000
                            }}>
                                {locationError}
                            </div>
                        )}
                    </>
                )}

                {/* Full Screen Map */}
                <div className="map-container-wrapper">
                    <MapContainer center={center} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        <ChangeView center={center} />

                        {!viewOnly && (
                            <LocationPicker
                                onLocationSelect={(latlng) => setSelectedLoc({ lat: latlng.lat, lng: latlng.lng })}
                                enabled={!viewOnly}
                            />
                        )}

                        {shopLocation?.lat && (
                            <Marker position={[shopLocation.lat, shopLocation.lng]} icon={storeIcon}>
                                <Popup>Our Shop</Popup>
                            </Marker>
                        )}

                        {selectedLoc?.lat && (
                            <Marker position={[selectedLoc.lat, selectedLoc.lng]} icon={customerIcon}>
                            </Marker>
                        )}

                        {route.length > 0 && (
                            <Polyline positions={route} color="#2c5530" weight={4} opacity={0.8} />
                        )}
                    </MapContainer>
                </div>

                {/* Bottom Sheet Card */}
                {!viewOnly && (
                    <div className="map-bottom-sheet">
                        <div className="bottom-sheet-header">
                            <span className="bottom-sheet-label">Order will be delivered here</span>
                            <div className="address-preview-container">
                                <div className="location-pin-icon">📍</div>
                                <div className="address-details">
                                    <h4>{addressPreview.title}</h4>
                                    <p>{addressPreview.full}</p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => onConfirm(selectedLoc)}
                            className="map-confirm-btn-floating"
                            disabled={!selectedLoc}
                        >
                            Confirm & proceed
                        </button>
                    </div>
                )}
            </div>
        </div >
    );
};

export default MapModal;
