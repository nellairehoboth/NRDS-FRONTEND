import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';
import './Checkout.css';

import { SHOP_LOCATION } from '../config';
import MapModal from '../components/MapModal';
import { handleImageError } from '../utils/imageUtils';
import { parseNominatimAddress } from '../utils/mapUtils';
import { loadRazorpayScript } from '../utils/razorpay';


const Checkout = () => {
  const { cart, clearCart } = useCart();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [shippingLocation, setShippingLocation] = useState(null); // { lat, lng }
  const [showMap, setShowMap] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [distanceError, setDistanceError] = useState('');
  const isGpsUpdate = useRef(false);
  const hasCalculatedInitialDistance = useRef(false);

  const [shippingAddress, setShippingAddress] = useState({
    name: user?.name || '',
    street: user?.address?.street || '',
    city: user?.address?.city || '',
    state: user?.address?.state || '',
    zipCode: user?.address?.zipCode || '',
    country: user?.address?.country || 'India',
    phone: user?.phone || ''
  });

  const [distance, setDistance] = useState('0');
  const [customDeliveryCharge, setCustomDeliveryCharge] = useState('0');

  const [deliverySettings, setDeliverySettings] = useState({
    deliveryChargePerKm: 0,
    freeDistanceLimit: 5,
    maxDeliveryDistance: 20,
    freeDeliveryThreshold: 500,
    storeLatitude: 10.7870,
    storeLongitude: 79.1378,
    deliverySlabs: []
  });

  useEffect(() => {
    const fetchPublicSettings = async () => {
      try {
        const response = await api.get('/api/settings/public');
        if (response.data.success) {
          setDeliverySettings(response.data.settings);
        }
      } catch (err) {
        console.error('Failed to fetch delivery settings:', err);
      }
    };
    fetchPublicSettings();
  }, []);

  const distValue = parseFloat(distance) || 0;
  const isFreeDistance = distValue <= (deliverySettings.freeDistanceLimit || 0);
  const isFreeAmount = cart.totalAmount >= (deliverySettings.freeDeliveryThreshold || 0);
  const isActuallyFree = isFreeDistance || isFreeAmount;

  useEffect(() => {
    if (isActuallyFree) {
      setCustomDeliveryCharge('0');
    }
  }, [isActuallyFree]);

  const calculateDynamicSlabCharge = useCallback((dist) => {
    const slabs = [...(deliverySettings.deliverySlabs || [])].sort((a, b) => a.minDistance - b.minDistance);
    if (!slabs.length) return 0;

    // Find the last slab where the distance is at least the minDistance
    // This handles "gaps" by sticking to the previous slab's rate until the next minDistance is hit.
    const eligibleSlabs = slabs.filter(s => dist >= s.minDistance);
    if (eligibleSlabs.length > 0) {
      return eligibleSlabs[eligibleSlabs.length - 1].charge;
    }

    // If shorter than the first slab's minDistance, it might be free or use the first slab
    return 0;
  }, [deliverySettings.deliverySlabs]);

  const deliveryCharge = isActuallyFree ? 0 : (parseFloat(customDeliveryCharge) || 0);

  const handleAddressChange = (field, value) => {
    setShippingAddress(prev => ({ ...prev, [field]: value }));
  };


  const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return d * 1.3; // Add 30% buffer to approximate road distance
  };

  const fetchRoadDistance = useCallback(async (userLat, userLng) => {
    try {
      setDistanceError('');
      const shopLat = deliverySettings.storeLatitude || SHOP_LOCATION.lat;
      const shopLng = deliverySettings.storeLongitude || SHOP_LOCATION.lng;

      let finalDist = 0;
      try {
        const response = await api.get(`/api/maps/route?start=${shopLng},${shopLat}&end=${userLng},${userLat}`);
        const data = response.data;
        if (data.code === 'Ok' && data.routes?.[0]) {
          finalDist = data.routes[0].distance / 1000;
        } else {
          throw new Error('OSRM fail');
        }
      } catch (err) {
        console.warn("OSRM failed, falling back to Haversine");
        finalDist = calculateHaversineDistance(shopLat, shopLng, userLat, userLng);
      }

      setDistance(finalDist.toFixed(2));

      const maxDist = deliverySettings.maxDeliveryDistance || 20;

      if (finalDist > maxDist) {
        setDistanceError(`Sorry, delivery is not available for locations beyond ${maxDist} KM.`);
      }

      setCustomDeliveryCharge(String(calculateDynamicSlabCharge(finalDist)));
      setShippingLocation({ lat: userLat, lng: userLng });
    } catch (err) {
      console.error("Distance calculation failed:", err);
      const errorMsg = err.response?.data?.details || err.response?.data?.message || "Could not calculate distance automatically.";
      setDistanceError(`Distance error: ${errorMsg}`);
    } finally {
      setIsLocating(false);
    }
  }, [deliverySettings, calculateDynamicSlabCharge]);

  const handleGeocodeAddress = useCallback(async () => {
    const { street, city, state, zipCode } = shippingAddress;
    const query = [street, city, state, zipCode].filter(Boolean).join(', ');
    if (!query.trim()) return;

    setIsLocating(true);
    setDistanceError('');

    const performSearch = async (searchQuery) => {
      try {
        const response = await api.get(`/api/maps/search?q=${encodeURIComponent(searchQuery)}`);
        return response.data || [];
      } catch (err) {
        console.error("Geocoding error:", err);
        return [];
      }
    };

    try {
      // 1. Try exact search
      let results = await performSearch(query);

      // 2. Fallback: If no results and query starts with numbers (e.g. "3/27 Street Name"), try stripping numbers
      if (results.length === 0) {
        // Regex to match leading digits, special chars like / - . , and spaces
        const cleanedQuery = query.replace(/^[\d/\-.,\s]+\s+/, '');

        // Only retry if we actually changed something and adhere to a minimum length to avoid searching "A"
        if (cleanedQuery !== query && cleanedQuery.length > 3) {
          console.log(`Retrying search with cleaned query: "${cleanedQuery}"`);
          results = await performSearch(cleanedQuery);
        }
      }

      if (results.length > 0) {
        const { lat, lon } = results[0];
        await fetchRoadDistance(parseFloat(lat), parseFloat(lon));
      } else {
        setDistanceError('Address not found. Please try a different address or use "Locate Me".');
        setDistance('0');
        setCustomDeliveryCharge('0');
        setShippingLocation(null);
        setIsLocating(false);
      }
    } catch (err) {
      console.error(err);
      setDistanceError('Failed to geocode address.');
      setDistance('0');
      setCustomDeliveryCharge('0');
      setShippingLocation(null);
      setIsLocating(false);
    }
  }, [shippingAddress, fetchRoadDistance]);

  // Debounced Automatic Geocoding
  useEffect(() => {
    if (isGpsUpdate.current) {
      isGpsUpdate.current = false;
      return;
    }

    const { street } = shippingAddress;
    if (!street) return;

    const timer = setTimeout(() => {
      handleGeocodeAddress();
    }, 1500);

    return () => clearTimeout(timer);
  }, [shippingAddress, handleGeocodeAddress]);

  // Initialize location from user profile coordinates
  useEffect(() => {
    // Only run once when component mounts with profile data
    if (hasCalculatedInitialDistance.current) return;

    if (user?.address?.lat && user?.address?.lng && deliverySettings.storeLatitude) {
      const lat = parseFloat(user.address.lat);
      const lng = parseFloat(user.address.lng);
      const storeLat = deliverySettings.storeLatitude;
      const storeLng = deliverySettings.storeLongitude;

      if (!isNaN(lat) && !isNaN(lng)) {
        // Check if user coordinates are the same as store coordinates (within 0.0001 degrees ~11m)
        const isSameLocation = Math.abs(lat - storeLat) < 0.0001 && Math.abs(lng - storeLng) < 0.0001;

        if (isSameLocation) {
          // User is at store location, set distance to 0
          setDistance('0');
          setCustomDeliveryCharge('0');
          setShippingLocation({ lat, lng });
          hasCalculatedInitialDistance.current = true;
        } else {
          // Calculate distance for different location
          setShippingLocation({ lat, lng });
          fetchRoadDistance(lat, lng);
          hasCalculatedInitialDistance.current = true;
        }
      }
    }
  }, [user, deliverySettings.storeLatitude, deliverySettings.storeLongitude, fetchRoadDistance]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      showToast("Geolocation not supported", "error");
      return;
    }
    setIsLocating(true);
    setDistanceError('');

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000
    };

    const success = (pos) => {
      const { latitude, longitude } = pos.coords;
      setShippingLocation({ lat: latitude, lng: longitude });
      setIsLocating(false);
      setShowMap(true);
    };

    const error = (err) => {
      console.warn(`Checkout Geolocation error (${err.code}): ${err.message}`);

      if (options.enableHighAccuracy) {
        // Retry without high accuracy
        navigator.geolocation.getCurrentPosition(success, (err2) => {
          let msg = "Could not retrieve location.";
          if (err2.code === 1) msg = "Location access denied. Please enable location permissions.";
          else if (err2.code === 2) msg = "Location information is unavailable.";
          else if (err2.code === 3) msg = "Location request timed out.";

          setDistanceError(msg);
          setIsLocating(false);
        }, { ...options, enableHighAccuracy: false, timeout: 5000 });
      } else {
        let msg = "Could not retrieve location.";
        if (err.code === 1) msg = "Location access denied. Please enable location permissions.";
        else if (err.code === 2) msg = "Location information is unavailable.";
        else if (err.code === 3) msg = "Location request timed out.";
        setDistanceError(msg);
        setIsLocating(false);
      }
    };

    navigator.geolocation.getCurrentPosition(success, error, options);
  };
  const handlePlaceOrder = async () => {
    const required = ['name', 'street'];
    const missing = required.filter((k) => !String(shippingAddress[k] || '').trim());
    if (missing.length) {
      showToast('Please fill required fields: ' + missing.join(', '), 'warning');
      return;
    }

    if (distanceError) {
      showToast(distanceError, 'error');
      return;
    }

    const items = (cart.items || [])
      .filter((it) => it && (it.product?._id || it.product))
      .map((it) => ({
        product: it.product?._id || it.product,
        variantId: it.variantId || null,
        quantity: it.quantity,
      }));

    if (!items.length) {
      showToast('Your cart has invalid items. Please re-add products and try again.', 'error');
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        items,
        totalAmount: cart.totalAmount + deliveryCharge,
        deliveryCharge,
        freeDeliveryThreshold: deliverySettings.freeDeliveryThreshold,
        paymentMethod,
        shippingAddress: {
          ...shippingAddress,
          name: String(shippingAddress.name).trim(),
          street: String(shippingAddress.street).trim(),
          latitude: shippingLocation?.lat,
          longitude: shippingLocation?.lng
        },
        distance: distValue
      };

      const response = await api.post('/api/orders', orderData);

      if (response.data.success) {
        const ord = response.data.order;
        if (paymentMethod === 'razorpay') {
          const ok = await loadRazorpayScript();
          if (!ok) {
            showToast('Failed to load Razorpay checkout. Please check your internet connection and try again.', 'error');
            return;
          }

          const rpRes = await api.post('/api/orders/razorpay/order', { orderId: ord._id });
          if (!rpRes?.data?.success) {
            showToast(rpRes?.data?.message || 'Failed to initialize Razorpay payment.', 'error');
            return;
          }

          const { keyId, razorpayOrderId, amount, currency } = rpRes.data;

          const options = {
            key: keyId,
            amount,
            currency,
            name: 'Nellai Rehoboth Department Store',
            description: `Checkout - Order ${ord.orderNumber}`,
            order_id: razorpayOrderId,
            prefill: {
              name: shippingAddress.name,
              email: user?.email || '',
              contact: shippingAddress.phone || '',
            },
            notes: {
              orderId: ord._id,
            },
            handler: async (rzp) => {
              try {
                const verifyRes = await api.post('/api/orders/razorpay/verify', {
                  orderId: ord._id,
                  razorpay_order_id: rzp.razorpay_order_id,
                  razorpay_payment_id: rzp.razorpay_payment_id,
                  razorpay_signature: rzp.razorpay_signature,
                });

                if (verifyRes?.data?.success) {
                  showToast(`Payment successful!\nOrder No: ${verifyRes.data.order.orderNumber}`, 'success');
                  await clearCart();
                  navigate(`/orders/${verifyRes.data.order._id}`);
                } else {
                  showToast(verifyRes?.data?.message || 'Payment verification failed.', 'error');
                }
              } catch (err) {
                console.error('Razorpay verify failed:', err);
                const msg = err?.response?.data?.message || err?.message || 'Payment verification failed.';
                showToast(msg, 'error');
              }
            },
            modal: {
              ondismiss: async () => {
                try {
                  await api.post('/api/orders/razorpay/cancel', { orderId: ord._id });
                  showToast('Payment was cancelled. You can retry the payment from your Order History.', 'info');
                } catch (err) {
                  console.error('Failed to notify cancellation:', err);
                  showToast('Payment was cancelled. Your order is still saved as PAYMENT_PENDING.', 'info');
                }
                navigate(`/orders/${ord._id}`);
              },
            },
            theme: {
              color: '#2c5530',
            },
          };

          const Razorpay = window.Razorpay;
          if (!Razorpay) {
            showToast('Razorpay SDK not available. Please refresh and try again.', 'error');
            return;
          }

          const rzp1 = new Razorpay(options);
          rzp1.on('payment.failed', async (resp) => {
            console.error('Razorpay payment failed:', resp);
            try {
              await api.post('/api/orders/razorpay/cancel', { orderId: ord._id });
              showToast(resp?.error?.description || 'Payment failed. You can retry from your Order History.', 'error');
            } catch (err) {
              console.error('Failed to notify cancellation on failure:', err);
              showToast(resp?.error?.description || 'Payment failed. Please try again.', 'error');
            }
            navigate(`/orders/${ord._id}`);
          });
          rzp1.open();
        } else {
          showToast(`Order placed successfully!\nOrder No: ${ord.orderNumber}`, 'success');
          await clearCart();
          navigate(`/orders/${ord._id}`);
        }
      } else {
        const msg = response.data?.message || 'Failed to place order. Please try again.';
        showToast(msg, 'error');
      }
    } catch (error) {
      console.error('Error placing order:', error);
      const msg = error?.response?.data?.message || error?.message || 'Failed to place order. Please try again.';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!cart.items || cart.items.length === 0) {
    return (
      <div className="checkout-empty">
        <h2>No items to checkout</h2>
        <p>Add some products to your cart first!</p>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="container">
        <h1>Checkout</h1>
        <div className="checkout-content">
          <div className="checkout-form">
            <div className="shipping-section">
              <h3>Shipping Address</h3>
              <div className="form-grid">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={shippingAddress.name}
                  onChange={(e) => handleAddressChange('name', e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Phone Number"
                  value={shippingAddress.phone}
                  onChange={(e) => handleAddressChange('phone', e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Street Address"
                  value={shippingAddress.street}
                  onChange={(e) => handleAddressChange('street', e.target.value)}
                  className="full-width"
                />
                <div className="three-cols">
                  <input
                    type="text"
                    placeholder="City"
                    value={shippingAddress.city}
                    onChange={(e) => handleAddressChange('city', e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="State"
                    value={shippingAddress.state}
                    onChange={(e) => handleAddressChange('state', e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="ZIP Code"
                    value={shippingAddress.zipCode}
                    onChange={(e) => handleAddressChange('zipCode', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="delivery-section">
              <div className="delivery-container">
                <h3>📍 Choose Delivery Location</h3>

                <div className="loc-btn-group">
                  <button
                    type="button"
                    className="loc-btn loc-btn-primary"
                    onClick={handleUseCurrentLocation}
                    disabled={isLocating}
                  >
                    {isLocating ? '⌛' : <img src="https://cdn-icons-gif.flaticon.com/6844/6844595.gif" alt="" onError={(e) => handleImageError(e, '/placeholder-product.svg')} style={{ width: '20px', height: '20px' }} />} Use Current Location
                  </button>
                  <button
                    type="button"
                    className="loc-btn loc-btn-secondary"
                    onClick={handleGeocodeAddress}
                    disabled={isLocating}
                  >
                    🔍 Locate from Address
                  </button>
                  <button
                    type="button"
                    className="loc-btn loc-btn-danger"
                    onClick={() => {
                      setShippingAddress(prev => ({
                        ...prev,
                        street: '',
                        city: '',
                        state: '',
                        zipCode: ''
                      }));
                      setDistance('0');
                      setCustomDeliveryCharge('0');
                      setShippingLocation(null);
                      setDistanceError('');
                    }}
                  >
                    ❌ Reset Address
                  </button>
                </div>

                {distanceError && <p style={{ color: '#dc2626', fontSize: '13px', marginBottom: '10px' }}>{distanceError}</p>}

                <div className="distance-info-card">
                  <p>
                    <span>Road Distance:</span>
                    <strong>{isLocating ? 'Calculating...' : `${distance} KM`}</strong>
                  </p>
                  <p>
                    <span>Delivery Charge:</span>
                    <strong>{isLocating ? '...' : `₹${deliveryCharge}`}</strong>
                  </p>
                </div>

                {isActuallyFree && (
                  <div className="free-delivery-text">
                    Free delivery applied! ✅
                  </div>
                )}
              </div>
            </div>

            <div className="payment-section">
              <h3>Payment Method</h3>
              <div className="payment-options">
                <label className="payment-option">
                  <input
                    type="radio"
                    value="cod"
                    checked={paymentMethod === 'cod'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <span>Cash on Delivery</span>
                </label>
                <label className="payment-option">
                  <input
                    type="radio"
                    value="razorpay"
                    checked={paymentMethod === 'razorpay'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <span>UPI/Cards/Wallets (Razorpay)</span>
                </label>
              </div>
            </div>
          </div>

          <div className="order-summary">
            <h3>Order Summary</h3>
            <div className="order-items-list">
              {cart.items.map((item, index) => {
                const product = item?.product || {};
                const key = product?._id || item?.productId || `idx-${index}`;
                const name = product?.name || item?.name || 'Product';
                return (
                  <div key={key} className="summary-item">
                    <span>{name} x {item.quantity}</span>
                    <span>₹{(() => {
                      const subtotal = item.price * item.quantity;
                      const rate = Number(item.tax?.gstRate || 0);
                      const inclusive = Boolean(item.tax?.inclusive ?? false);
                      if (rate > 0 && !inclusive) {
                        return (subtotal + (subtotal * rate / 100)).toFixed(2);
                      }
                      return subtotal.toFixed(2);
                    })()}</span>
                  </div>
                );
              })}
            </div>

            <div className="summary-divider"></div>

            <div className="summary-row">
              <span>Subtotal:</span>
              <span>₹{cart.totalAmount.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Delivery Fee:</span>
              <span>{deliveryCharge > 0 ? `₹${deliveryCharge.toFixed(2)}` : 'Free'}</span>
            </div>
            <div className="summary-row total-row">
              <span>Total:</span>
              <span>₹{(cart.totalAmount + deliveryCharge).toFixed(2)}</span>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={loading}
              className="place-order-btn"
            >
              {loading ? 'Placing Order...' : 'Place Order'}
            </button>
          </div>
        </div>
      </div>

      <MapModal
        isOpen={showMap}
        onClose={() => setShowMap(false)}
        onConfirm={async (loc) => {
          setShowMap(false);
          isGpsUpdate.current = true;

          try {
            const response = await api.get(`/api/maps/reverse?lat=${loc.lat}&lon=${loc.lng}`);
            const parsed = parseNominatimAddress(response.data);
            if (parsed) {
              setShippingAddress((prev) => ({
                ...prev,
                street: parsed.street,
                city: parsed.city,
                state: parsed.state,
                zipCode: parsed.zipCode,
                country: parsed.country || prev.country
              }));
            }
          } catch (error) {
            console.error("Reverse geocoding failed:", error);
            const errorMsg = error.response?.data?.details || error.response?.data?.message || "Address lookup failed.";
            setDistanceError(`Reverse geocoding error: ${errorMsg}`);
          }

          fetchRoadDistance(loc.lat, loc.lng);
        }}
        initialLocation={shippingLocation || { lat: deliverySettings.storeLatitude, lng: deliverySettings.storeLongitude }}
        shopLocation={{ lat: deliverySettings.storeLatitude, lng: deliverySettings.storeLongitude }}
      />
    </div>
  );
};

export default Checkout;
