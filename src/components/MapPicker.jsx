import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../api/axios';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const LocationPicker = ({ onSelect }) => {
    useMapEvents({
        click(e) {
            onSelect(e.latlng);
        },
    });
    return null;
};

const MapPicker = ({ initialLat, initialLng, onLocationSelect }) => {
    const [position, setPosition] = useState(
        initialLat && initialLng ? { lat: initialLat, lng: initialLng } : { lat: 10.7870, lng: 79.1378 }
    );
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/api/maps/reverse?lat=${position.lat}&lon=${position.lng}`);
            const data = response.data;

            onLocationSelect({
                lat: position.lat,
                lng: position.lng,
                address: data.address,
                displayName: data.display_name
            });
        } catch (error) {
            console.error("Reverse geocoding failed:", error);
            // Fallback if reverse geocoding fails
            onLocationSelect({
                lat: position.lat,
                lng: position.lng,
                address: {},
                displayName: "Selected Location"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="map-picker-container" style={{ margin: '20px 0', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ height: '300px', width: '100%' }}>
                <MapContainer center={[position.lat, position.lng]} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={[position.lat, position.lng]} draggable={true}
                        eventHandlers={{
                            dragend: (e) => {
                                setPosition(e.target.getLatLng());
                            }
                        }}
                    />
                    <LocationPicker onSelect={(latlng) => setPosition(latlng)} />
                </MapContainer>
            </div>
            <div style={{ padding: '15px', background: '#f8f9fa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '12px', color: '#666' }}>
                    Click map or drag marker to select location
                </div>
                <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={loading}
                    style={{
                        background: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    {loading ? 'Processing...' : 'Confirm Location'}
                </button>
            </div>
        </div>
    );
};

export default MapPicker;
