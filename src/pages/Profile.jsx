import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

import api from '../api/axios';
import MapPicker from '../components/MapPicker.jsx';
import { getAvatarUrl } from '../utils/imageUtils';
import './Profile.css';

const Profile = () => {
    const { user, updateUser } = useAuth();

    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const fileInputRef = useRef(null);

    const [showMap, setShowMap] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: {
            street: '',
            city: '',
            state: '',
            zipCode: '',
            lat: null,
            lng: null
        }
    });

    const [previewImage, setPreviewImage] = useState(null);
    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                phone: user.phone || '',
                address: {
                    street: user.address?.street || '',
                    city: user.address?.city || '',
                    state: user.address?.state || '',
                    zipCode: user.address?.zipCode || '',
                    lat: user.address?.lat || null,
                    lng: user.address?.lng || null
                }
            });
            if (user.avatar) {
                setPreviewImage(getAvatarUrl(user.avatar));
            }
        }
    }, [user]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name.includes('.')) {
            const [field, subField] = name.split('.');
            setFormData(prev => ({
                ...prev,
                [field]: {
                    ...prev[field],
                    [subField]: value
                }
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleImageClick = () => {
        fileInputRef.current.click();
    };

    const handleLocationSelect = (location) => {
        const { lat, lng, address, displayName } = location;

        // Parse address parts if available
        const street = address?.road || address?.suburb || address?.hamlet || displayName.split(',')[0];
        const city = address?.city || address?.town || address?.village || address?.county;
        const state = address?.state;
        const zipCode = address?.postcode;

        setFormData(prev => ({
            ...prev,
            address: {
                ...prev.address,
                street: street || prev.address.street,
                city: city || prev.address.city,
                state: state || prev.address.state,
                zipCode: zipCode || prev.address.zipCode,
                lat,
                lng
            }
        }));
        setShowMap(false);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setMessage({ type: 'error', text: 'Image size should be less than 5MB' });
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const data = new FormData();
            data.append('name', formData.name);
            data.append('phone', formData.phone);
            data.append('address', JSON.stringify(formData.address));

            if (fileInputRef.current.files[0]) {
                data.append('avatar', fileInputRef.current.files[0]);
            }

            const response = await api.put('/api/users/profile', data, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.data.success) {
                updateUser(response.data.user);
                setMessage({ type: 'success', text: 'Profile updated successfully! Redirecting...' });
                setTimeout(() => {
                    navigate('/');
                }, 1500);
            }
        } catch (error) {
            console.error('Update profile error:', error);
            const errorData = error.response?.data;
            const errorMessage = errorData?.message || error.message || 'An unknown error occurred';

            setMessage({
                type: 'error',
                text: `Failed to update profile: ${errorMessage}`
            });
        } finally {
            setLoading(false);
        }
    };

    const getUserInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <div className="profile-page-container">
            <div className="profile-card">
                <div className="profile-header">
                    <h2>User Profile</h2>
                    <p>Manage your personal information and photo</p>
                </div>

                <form onSubmit={handleSubmit} className="profile-form">
                    <div className="profile-avatar-section">
                        <div className="profile-avatar-display" onClick={handleImageClick}>
                            {previewImage ? (
                                <img src={previewImage} alt="Profile" className="profile-avatar-img" />
                            ) : (
                                <span className="profile-avatar-initials">{getUserInitials(formData.name)}</span>
                            )}
                        </div>
                        <div className="avatar-upload-overlay" onClick={handleImageClick}>
                            <span>📷</span>
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                    </div>

                    <div className="form-group full-width">
                        <label>Full Name</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Email Address</label>
                        <input type="email" value={user?.email || ''} disabled style={{ opacity: 0.6 }} />
                    </div>

                    <div className="form-group">
                        <label>Phone Number</label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                        />
                    </div>

                    <div className="address-section">
                        <div style={{ marginBottom: '20px' }}>
                            <h3 style={{ margin: 0 }}>Delivery Address</h3>
                            <button
                                type="button"
                                onClick={() => setShowMap(!showMap)}
                                style={{
                                    marginTop: '10px',
                                    background: '#17a2b8',
                                    color: 'white',
                                    border: 'none',
                                    padding: '8px 12px',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                {showMap ? 'Hide Map' : '📍 Pick Location on Map'}
                            </button>
                        </div>
                        {showMap && (
                            <MapPicker
                                initialLat={formData.address.lat}
                                initialLng={formData.address.lng}
                                onLocationSelect={handleLocationSelect}
                            />
                        )}
                        <div className="address-grid">
                            <div className="form-group full-width">
                                <label>Street Address</label>
                                <input
                                    type="text"
                                    name="address.street"
                                    value={formData.address.street}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div className="form-group">
                                <label>City</label>
                                <input
                                    type="text"
                                    name="address.city"
                                    value={formData.address.city}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div className="form-group">
                                <label>State</label>
                                <input
                                    type="text"
                                    name="address.state"
                                    value={formData.address.state}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div className="form-group">
                                <label>Zip Code</label>
                                <input
                                    type="text"
                                    name="address.zipCode"
                                    value={formData.address.zipCode}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>
                    </div>

                    {message.text && (
                        <div className={`message-banner ${message.type}`} style={{
                            gridColumn: 'span 2',
                            padding: '10px',
                            borderRadius: '8px',
                            background: message.type === 'success' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)',
                            color: message.type === 'success' ? '#81c784' : '#e57373',
                            textAlign: 'center',
                            marginTop: '20px'
                        }}>
                            {message.text}
                        </div>
                    )}

                    <div className="profile-actions">
                        <button type="submit" className="btn-save-profile" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Profile'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Profile;
