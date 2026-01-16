import React from 'react';
import './AnnouncementBar.css';

const AnnouncementBar = () => {
    return (
        <div className="announcement-bar">
            <div className="marquee-content">
                <span>🎧 Top-Notch Support</span>
                <span>🛡️ Secure Payments</span>
                <span>🚚 Free Delivery upto below 5km</span>
                <span>✅ 100% Satisfaction Guarantee</span>

                {/* Duplicate for seamless loop */}
                <span>🎧 Top-Notch Support</span>
                <span>🛡️ Secure Payments</span>
                <span>🚚 Free Delivery upto below 5km</span>
                <span>✅ 100% Satisfaction Guarantee</span>

                <span>🎧 Top-Notch Support</span>
                <span>🛡️ Secure Payments</span>
                <span>🚚 Free Delivery upto below 5km</span>
                <span>✅ 100% Satisfaction Guarantee</span>
            </div>
        </div>
    );
};

export default AnnouncementBar;
