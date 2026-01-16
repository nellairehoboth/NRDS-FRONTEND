/**
 * Utility to sanitize image URLs and provide fallbacks for known broken services.
 * This prevents the console from showing ERR_NAME_NOT_RESOLVED errors
 * by checking the URL before it's assigned to an <img> src.
 */
export const sanitizeImageUrl = (url, fallback = '/placeholder-product.svg') => {
    if (!url) return fallback;

    // Check if the URL points to the known problematic service
    if (url.includes('via.placeholder.com')) {
        return fallback;
    }

    // You can add more known problematic patterns here if needed

    return url;
};

export const handleImageError = (e, fallback = '/placeholder-product.svg') => {
    if (e.target.src !== fallback) {
        e.target.src = fallback;
    }
};

export const getAvatarUrl = (avatar) => {
    if (!avatar) return null;
    if (avatar.startsWith('http') || avatar.startsWith('data:')) return avatar;
    const baseUrl = process.env.REACT_APP_API_IMAGE_URL || 'http://localhost:5000';
    return `${baseUrl}${avatar}`;
};
