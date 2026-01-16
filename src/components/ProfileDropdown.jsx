import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import './ProfileDropdown.css';

const ProfileDropdown = () => {
    const { user, isAdmin, logout } = useAuth();
    const { t } = useI18n();
    const [isOpen, setIsOpen] = useState(false);
    const [hasImageError, setHasImageError] = useState(false);
    const dropdownRef = useRef(null);

    const toggleDropdown = () => setIsOpen(!isOpen);

    const getUserInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="profile-dropdown-container" ref={dropdownRef}>
            <div className="profile-trigger" onClick={toggleDropdown}>
                <div className="user-avatar-circle">
                    {user?.avatar && !hasImageError ? (
                        <img
                            src={user.avatar}
                            alt={user.name}
                            className="user-avatar-img"
                            onError={() => setHasImageError(true)}
                        />
                    ) : (
                        <span className="avatar-initials">{getUserInitials(user?.name)}</span>
                    )}
                </div>
                <div className="profile-info-brief">
                    <span className="user-display-name">{user?.name}</span>
                    {isAdmin && <span className="admin-badge">Admin</span>}
                </div>
                <span className={`chevron-icon ${isOpen ? 'open' : ''}`}>▼</span>
            </div>

            {isOpen && (
                <div className="profile-dropdown-menu">
                    <div className="dropdown-header">
                        <p className="dropdown-user-name">{user?.name}</p>
                        <p className="dropdown-user-email">{user?.email}</p>
                    </div>
                    <div className="dropdown-divider"></div>
                    <ul className="dropdown-links">
                        {isAdmin && (
                            <li>
                                <Link to="/admin" onClick={() => setIsOpen(false)}>
                                    <span className="dropdown-icon">🛡️</span> {t('nav.admin', 'Admin Panel')}
                                </Link>
                            </li>
                        )}
                        <li>
                            <Link to="/profile" onClick={() => setIsOpen(false)}>
                                <span className="dropdown-icon">👤</span> {t('nav.profile', 'My Profile')}
                            </Link>
                        </li>
                        <li>
                            <Link to="/orders" onClick={() => setIsOpen(false)}>
                                <span className="dropdown-icon">📦</span> {t('nav.orders', 'My Orders')}
                            </Link>
                        </li>
                        <div className="dropdown-divider"></div>
                        <li>
                            <button onClick={() => { logout(); setIsOpen(false); }} className="dropdown-logout-btn">
                                <span className="dropdown-icon">🚪</span> {t('nav.logout', 'Logout')}
                            </button>
                        </li>
                    </ul>
                </div>
            )}
        </div>
    );
};

export default ProfileDropdown;
