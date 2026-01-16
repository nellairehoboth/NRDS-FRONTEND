import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import './Checkout.css';
import { useI18n } from '../contexts/I18nContext';
import { SHOP_LOCATION } from '../config';
import MapModal from '../components/MapModal';
import { handleImageError } from '../utils/imageUtils';
import { parseNominatimAddress } from '../utils/mapUtils';
import { loadRazorpayScript } from '../utils/razorpay';


const Checkout = () => {
  const { cart, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [shippingLocation, setShippingLocation] = useState(null); // { lat, lng }
  const [showMap, setShowMap] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [distanceError, setDistanceError] = useState('');
  const isGpsUpdate = useRef(false);

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
    try {
      const response = await api.get(`/api/maps/search?q=${encodeURIComponent(query)}`);
      const data = response.data;
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        await fetchRoadDistance(parseFloat(lat), parseFloat(lon));
      } else {
        setIsLocating(false);
      }
    } catch (err) {
      console.error(err);
      setIsLocating(false);
    }
  }, [shippingAddress, fetchRoadDistance]);

  // Debounced Automatic Geocoding
  useEffect(() => {
    if (isGpsUpdate.current) {
      isGpsUpdate.current = false;
      return;
    }

    const { street, city } = shippingAddress;
    if (!street || !city) return;

    const timer = setTimeout(() => {
      handleGeocodeAddress();
    }, 1500);

    return () => clearTimeout(timer);
  }, [shippingAddress, handleGeocodeAddress]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported");
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
      alert(t('checkout.required_fields', 'Please fill required fields:') + ' ' + missing.join(', '));
      return;
    }

    if (distanceError) {
      alert(distanceError);
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
      alert(t('checkout.invalid_cart', 'Your cart has invalid items. Please re-add products and try again.'));
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
            alert(t('checkout.sdk_not_loaded', 'Failed to load Razorpay checkout. Please check your internet connection and try again.'));
            return;
          }

          const rpRes = await api.post('/api/orders/razorpay/order', { orderId: ord._id });
          if (!rpRes?.data?.success) {
            alert(rpRes?.data?.message || t('checkout.init_failed', 'Failed to initialize Razorpay payment.'));
            return;
          }

          const { keyId, razorpayOrderId, amount, currency } = rpRes.data;

          const options = {
            key: keyId,
            amount,
            currency,
            name: t('brand.name', 'Nellai Rehoboth Department Store'),
            description: `${t('checkout.title', 'Checkout')} - ${t('order_details.order', 'Order')} ${ord.orderNumber}`,
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
                  alert(`${t('checkout.pay_success', 'Payment successful!\nOrder No:')} ${verifyRes.data.order.orderNumber}`);
                  await clearCart();
                  navigate(`/orders/${verifyRes.data.order._id}`);
                } else {
                  alert(verifyRes?.data?.message || t('checkout.pay_verify_failed', 'Payment verification failed.'));
                }
              } catch (err) {
                console.error('Razorpay verify failed:', err);
                const msg = err?.response?.data?.message || err?.message || t('checkout.pay_verify_failed', 'Payment verification failed.');
                alert(msg);
              }
            },
            modal: {
              ondismiss: async () => {
                try {
                  await api.post('/api/orders/razorpay/cancel', { orderId: ord._id });
                  alert(t('checkout.pay_cancelled_retry', 'Payment was cancelled. You can retry the payment from your Order History.'));
                } catch (err) {
                  console.error('Failed to notify cancellation:', err);
                  alert(t('checkout.pay_cancelled', 'Payment was cancelled. Your order is still saved as PAYMENT_PENDING.'));
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
            alert(t('checkout.sdk_not_available', 'Razorpay SDK not available. Please refresh and try again.'));
            return;
          }

          const rzp1 = new Razorpay(options);
          rzp1.on('payment.failed', async (resp) => {
            console.error('Razorpay payment failed:', resp);
            try {
              await api.post('/api/orders/razorpay/cancel', { orderId: ord._id });
              alert(resp?.error?.description || t('checkout.pay_failed_retry', 'Payment failed. You can retry from your Order History.'));
            } catch (err) {
              console.error('Failed to notify cancellation on failure:', err);
              alert(resp?.error?.description || t('checkout.pay_failed', 'Payment failed. Please try again.'));
            }
            navigate(`/orders/${ord._id}`);
          });
          rzp1.open();
        } else {
          alert(`${t('checkout.order_placed', 'Order placed successfully!\nOrder No:')} ${ord.orderNumber}`);
          await clearCart();
          navigate(`/orders/${ord._id}`);
        }
      } else {
        const msg = response.data?.message || t('checkout.place_failed', 'Failed to place order. Please try again.');
        alert(msg);
      }
    } catch (error) {
      console.error('Error placing order:', error);
      const msg = error?.response?.data?.message || error?.message || t('checkout.place_failed', 'Failed to place order. Please try again.');
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!cart.items || cart.items.length === 0) {
    return (
      <div className="checkout-empty">
        <h2>{t('checkout.empty_title', 'No items to checkout')}</h2>
        <p>{t('checkout.empty_sub', 'Add some products to your cart first!')}</p>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="container">
        <h1>{t('checkout.title', 'Checkout')}</h1>
        <div className="checkout-content">
          <div className="checkout-form">
            <div className="shipping-section">
              <h3>{t('checkout.shipping', 'Shipping Address')}</h3>
              <div className="form-grid">
                <input
                  type="text"
                  placeholder={t('checkout.name', 'Full Name')}
                  value={shippingAddress.name}
                  onChange={(e) => handleAddressChange('name', e.target.value)}
                />
                <input
                  type="text"
                  placeholder={t('checkout.phone', 'Phone Number')}
                  value={shippingAddress.phone}
                  onChange={(e) => handleAddressChange('phone', e.target.value)}
                />
                <input
                  type="text"
                  placeholder={t('checkout.street', 'Street Address')}
                  value={shippingAddress.street}
                  onChange={(e) => handleAddressChange('street', e.target.value)}
                  className="full-width"
                />
                <div className="three-cols">
                  <input
                    type="text"
                    placeholder={t('checkout.city', 'City')}
                    value={shippingAddress.city}
                    onChange={(e) => handleAddressChange('city', e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder={t('checkout.state', 'State')}
                    value={shippingAddress.state}
                    onChange={(e) => handleAddressChange('state', e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder={t('checkout.zip', 'ZIP Code')}
                    value={shippingAddress.zipCode}
                    onChange={(e) => handleAddressChange('zipCode', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="delivery-section">
              <div className="delivery-container">
                <h3>📍 {t('checkout.delivery_location', 'Choose Delivery Location')}</h3>

                <div className="loc-btn-group">
                  <button
                    type="button"
                    className="loc-btn loc-btn-primary"
                    onClick={handleUseCurrentLocation}
                    disabled={isLocating}
                  >
                    {isLocating ? '⌛' : <img src="https://cdn-icons-gif.flaticon.com/6844/6844595.gif" alt="" onError={(e) => handleImageError(e, '/placeholder-product.svg')} style={{ width: '20px', height: '20px' }} />} {t('checkout.use_current', 'Use Current Location')}
                  </button>
                  <button
                    type="button"
                    className="loc-btn loc-btn-secondary"
                    onClick={handleGeocodeAddress}
                    disabled={isLocating}
                  >
                    🔍 {t('checkout.locate_address', 'Locate from Address')}
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
                    ❌ {t('checkout.reset', 'Reset Address')}
                  </button>
                </div>

                {distanceError && <p style={{ color: '#dc2626', fontSize: '13px', marginBottom: '10px' }}>{distanceError}</p>}

                <div className="distance-info-card">
                  <p>
                    <span>{t('checkout.distance', 'Road Distance:')}</span>
                    <strong>{isLocating ? 'Calculating...' : `${distance} KM`}</strong>
                  </p>
                  <p>
                    <span>{t('checkout.applied_charge', 'Delivery Charge:')}</span>
                    <strong>{isLocating ? '...' : `₹${deliveryCharge}`}</strong>
                  </p>
                </div>

                {isActuallyFree && (
                  <div className="free-delivery-text">
                    {t('checkout.free_delivery', 'Free delivery applied!')} ✅
                  </div>
                )}
              </div>
            </div>

            <div className="payment-section">
              <h3>{t('checkout.payment', 'Payment Method')}</h3>
              <div className="payment-options">
                <label className="payment-option">
                  <input
                    type="radio"
                    value="cod"
                    checked={paymentMethod === 'cod'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <span>{t('checkout.pay_cod', 'Cash on Delivery')}</span>
                </label>
                <label className="payment-option">
                  <input
                    type="radio"
                    value="razorpay"
                    checked={paymentMethod === 'razorpay'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <span>{t('checkout.pay_razorpay', 'UPI/Cards/Wallets (Razorpay)')}</span>
                </label>
              </div>
            </div>
          </div>

          <div className="order-summary">
            <h3>{t('checkout.order_summary', 'Order Summary')}</h3>
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
              <span>{t('checkout.subtotal', 'Subtotal:')}</span>
              <span>₹{cart.totalAmount.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>{t('checkout.delivery_fee', 'Delivery Fee:')}</span>
              <span>{deliveryCharge > 0 ? `₹${deliveryCharge.toFixed(2)}` : t('checkout.free', 'Free')}</span>
            </div>
            <div className="summary-row total-row">
              <span>{t('checkout.total', 'Total:')}</span>
              <span>₹{(cart.totalAmount + deliveryCharge).toFixed(2)}</span>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={loading}
              className="place-order-btn"
            >
              {loading ? t('checkout.placing', 'Placing Order...') : t('checkout.place_order', 'Place Order')}
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
