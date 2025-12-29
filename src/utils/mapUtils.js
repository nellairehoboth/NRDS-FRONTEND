/**
 * Parses a Nominatim address object into a more consistent structure,
 * with fallbacks optimized for Indian addresses.
 */
export const parseNominatimAddress = (data) => {
    if (!data || !data.address) return null;

    const { address, display_name } = data;

    // 1. Determine "Street / Area" info
    const streetParts = [
        address.house_number,
        address.house_name,
        address.building,
        address.apartment,
        address.room,
        address.road,
        address.residential,
        address.pedestrian,
        address.path,
        address.hamlet,
        address.neighbourhood,
        address.suburb,
        address.allotments
    ].filter(Boolean);

    let street = streetParts.slice(0, 3).join(', '); // Take first 3 parts for street
    if (!street && display_name) {
        street = display_name.split(',')[0].trim();
    }

    // 2. Determine "City / Town / Village"
    // For many Indian locations, "city" might be empty, and instead "district" or "suburb" is what the user expects.
    const city = address.city ||
        address.town ||
        address.village ||
        address.municipality ||
        address.city_district ||
        address.district ||
        address.suburb ||
        address.county ||
        address.state_district ||
        '';

    // 3. Determine "State"
    const state = address.state || address.region || address.state_district || '';

    // 4. Determine "Zip Code"
    const zipCode = address.postcode || '';

    // 5. Determine "Country"
    const country = address.country || 'India';

    // 6. Title for preview
    const title = address.neighbourhood ||
        address.suburb ||
        address.hamlet ||
        address.village ||
        address.town ||
        address.city ||
        "Selected Location";

    return {
        street,
        city,
        state,
        zipCode,
        country,
        title,
        full: display_name
    };
};
