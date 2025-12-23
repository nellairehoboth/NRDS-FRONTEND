import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';

const OrderDetails = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const currency = (n) => `₹${Number(n || 0).toFixed(2)}`;
  const handlePrint = () => window.print();

  const numberToWords = (num) => {
    const a = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    const inWords = (n) => {
      if (n < 20) return a[n];
      if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
      if (n < 1000) return a[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' ' + inWords(n % 100) : '');
      if (n < 100000) return inWords(Math.floor(n / 1000)) + ' thousand' + (n % 1000 ? ' ' + inWords(n % 1000) : '');
      if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' lakh' + (n % 100000 ? ' ' + inWords(n % 100000) : '');
      return inWords(Math.floor(n / 10000000)) + ' crore' + (n % 10000000 ? ' ' + inWords(n % 10000000) : '');
    };
    return inWords(num).trim();
  };

  const amountInWords = (amount) => {
    const rupees = Math.floor(amount);
    const paise = Math.round((amount - rupees) * 100);
    let words = '';
    if (rupees > 0) words += numberToWords(rupees) + ' rupees';
    if (paise > 0) words += (words ? ' and ' : '') + numberToWords(paise) + ' paise';
    return words ? words + ' only' : 'zero rupees only';
  };

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get(`/api/orders/${id}`);
        setOrder(res.data.order);
      } catch (err) {
        console.error('Failed to load order:', err);
        setError('Failed to load order details.');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchOrder();
  }, [id]);

  // Thermal-only: ensure thermal mode class for print sizing
  useEffect(() => {
    document.body.classList.add('thermal-mode');
    return () => document.body.classList.remove('thermal-mode');
  }, []);

  if (loading) return <div className="container"><h2>Loading order...</h2></div>;
  if (error) return <div className="container"><h2>{error}</h2><Link to="/orders" className="btn">Back to Orders</Link></div>;
  if (!order) return <div className="container"><h2>Order not found</h2><Link to="/orders" className="btn">Back to Orders</Link></div>;

  // Compute GST split rule: default CGST+SGST if TN, else IGST
  const storeState = 'Tamil Nadu';
  const shipState = order?.shippingAddress?.state || '';
  const isIntraState = shipState && storeState && shipState.toLowerCase() === storeState.toLowerCase();

  // Compute line-level and totals
  const items = (order.items || []).map((item) => {
    const rate = Number(item.product?.tax?.gstRate || 0);
    const inclusive = Boolean(item.product?.tax?.inclusive);
    const subtotal = Number(item.subtotal ?? (item.price * item.quantity) ?? 0);
    const taxFactor = rate / 100;
    let taxable = subtotal;
    let tax = 0;
    if (rate > 0) {
      if (inclusive) {
        taxable = subtotal / (1 + taxFactor);
        tax = subtotal - taxable;
      } else {
        taxable = subtotal;
        tax = taxable * taxFactor;
      }
    }
    const cgst = isIntraState ? tax / 2 : 0;
    const sgst = isIntraState ? tax / 2 : 0;
    const igst = isIntraState ? 0 : tax;
    return { ...item, rate, subtotal, taxable, tax, cgst, sgst, igst };
  });

  const totals = items.reduce(
    (acc, i) => {
      acc.qty += Number(i.quantity || 0);
      acc.taxable += i.taxable;
      acc.tax += i.tax;
      acc.cgst += i.cgst;
      acc.sgst += i.sgst;
      acc.igst += i.igst;
      acc.subtotal += i.subtotal;
      return acc;
    },
    { qty: 0, taxable: 0, tax: 0, cgst: 0, sgst: 0, igst: 0, subtotal: 0 }
  );

  const grandTotal = totals.subtotal; // subtotal already includes tax if inclusive pricing was used

  return (
    <div className="order-details-page">
      <style>{`
        @media print {
          header, nav, footer, .btn, a, .no-print { display: none !important; }
          .print-container { box-shadow: none !important; border: none !important; }
          body { background: #fff; }
          .standard-invoice { display: none !important; }
          .thermal-receipt { display: block !important; }
          @page { size: 80mm auto; margin: 0; }
        }
        /* Thermal receipt styles */
        .thermal-receipt { display:block; width: 80mm; margin: 0 auto; padding: 6px 8px; background: #fff; color: #000; }
        .thermal-receipt .t-center { text-align:center; }
        .thermal-receipt .t-right { text-align:right; }
        .thermal-receipt .t-left { text-align:left; }
        .thermal-receipt .title { font-weight: 700; font-size: 16px; line-height: 1.2; }
        .thermal-receipt .sub { font-size: 11px; }
        .thermal-receipt .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 12px; }
        .thermal-receipt .row { display:flex; justify-content:space-between; }
        .thermal-receipt .hr { border-top: 1px dashed #999; margin: 6px 0; }
        .thermal-receipt table { width:100%; border-collapse:collapse; }
        .thermal-receipt th, .thermal-receipt td { font-size:12px; padding: 2px 0; }
        .thermal-receipt th { text-align:left; }
        .thermal-receipt .tot-line { display:flex; justify-content:space-between; margin: 2px 0; }
        .thermal-receipt .tot-title { font-weight:700; }
        }
        .invoice-header { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; }
        .invoice-brand { font-weight:800; font-size:18px; }
        .print-actions { display:flex; gap:8px; }
        .print-container { background:#fff; border:1px solid #eee; border-radius:10px; padding:16px; box-shadow:0 2px 10px rgba(0,0,0,0.05); }
        .invoice-grid { display:grid; grid-template-columns: 1.2fr 0.8fr; gap:16px; }
        .bill-table { width:100%; border-collapse:collapse; }
        .bill-table th, .bill-table td { padding:10px; border-bottom:1px solid #f0f0f0; text-align:left; font-size: 12px; }
        .bill-table th { background:#f8fafc; }
        .totals { display:grid; gap:6px; }
        .totals-row { display:flex; justify-content:space-between; }
        .muted { color:#6b7280; }
        .section-title { margin: 16px 0 8px; font-size: 16px; font-weight: 600; }
      `}</style>
      <div className="container">
        <div className="invoice-header">
          <div>
            <h1 style={{margin:'0 0 4px'}}>Tax Invoice</h1>
            <div>Order #{order.orderNumber}</div>
            <div style={{color:'#6b7280'}}>Placed on {new Date(order.createdAt).toLocaleString()}</div>
          </div>
          <div className="print-actions no-print">
            <button className="btn btn-primary" onClick={handlePrint}>Print</button>
            <Link to="/orders" className="btn">Back to Orders</Link>
          </div>
        </div>

        {/* STANDARD GST INVOICE (disabled for thermal-only) */}
        <div className="print-container standard-invoice" style={{marginTop:16, display:'none'}}>
          <div className="invoice-grid">
            <div>
              <div className="invoice-brand">Nellai Rehoboth Department Store</div>
              <div>8H22+QJ9, Perundurai-Thudupathi-Thingalur Rd</div>
              <div>SMB Nagar, Thuduppathi, Tamil Nadu 638057, India</div>
              <div>Phone: +91 99420 75849</div>
              <div>GSTIN: <span className="muted">Please provide</span></div>
            </div>
            <div style={{textAlign:'right'}}>
              <div><strong>Status:</strong> {order.status}</div>
              <div><strong>Payment:</strong> {order.paymentMethod?.toUpperCase()} — {order.paymentStatus}</div>
              <div><strong>Invoice Date:</strong> {new Date(order.createdAt).toLocaleDateString()}</div>
            </div>
          </div>

          <h3 className="section-title">Items</h3>
          <table className="bill-table">
            <thead>
              <tr>
                <th style={{width:'34%'}}>Item</th>
                <th>HSN</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>GST %</th>
                <th>Taxable</th>
                {isIntraState ? <th>CGST</th> : <th>IGST</th>}
                {isIntraState ? <th>SGST</th> : null}
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const hsn = item.product?.tax?.hsn || '-';
                return (
                  <tr key={idx}>
                    <td>{item.name}{item?.variantLabel ? ` (${item.variantLabel})` : ''}</td>
                    <td>{hsn}</td>
                    <td>{item.quantity}</td>
                    <td>{currency(item.price)}</td>
                    <td>{item.rate}%</td>
                    <td>{currency(item.taxable)}</td>
                    {isIntraState ? <td>{currency(item.cgst)}</td> : <td>{currency(item.igst)}</td>}
                    {isIntraState ? <td>{currency(item.sgst)}</td> : null}
                    <td>{currency(item.subtotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="invoice-grid" style={{marginTop:12}}>
            <div>
              {order.shippingAddress && (
                <div>
                  <h3>Bill To</h3>
                  <div className="print-container" style={{padding:12}}>
                    <div>{order.shippingAddress.name}</div>
                    <div>{order.shippingAddress.street}</div>
                    <div>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}</div>
                    <div>{order.shippingAddress.country}</div>
                    {order.shippingAddress.phone && <div>Phone: {order.shippingAddress.phone}</div>}
                    <div className="muted" style={{marginTop:6}}>Place of Supply: {order.shippingAddress.state || '-'}</div>
                  </div>
                </div>
              )}
              <div style={{marginTop:12}}>
                <h3>Bank & UPI</h3>
                <div className="print-container" style={{padding:12}}>
                  <div><strong>Bank:</strong> <span className="muted">Provide Bank Name</span></div>
                  <div><strong>Branch:</strong> <span className="muted">Provide Branch</span></div>
                  <div><strong>Account No:</strong> <span className="muted">Provide Account</span></div>
                  <div><strong>IFSC:</strong> <span className="muted">Provide IFSC</span></div>
                  <div><strong>UPI ID:</strong> <span className="muted">Provide UPI</span></div>
                </div>
              </div>
            </div>
            <div className="totals">
              <div className="totals-row"><span>Total Qty</span><strong>{totals.qty}</strong></div>
              <div className="totals-row"><span>Taxable Value</span><strong>{currency(totals.taxable)}</strong></div>
              {isIntraState ? (
                <>
                  <div className="totals-row"><span>CGST</span><strong>{currency(totals.cgst)}</strong></div>
                  <div className="totals-row"><span>SGST</span><strong>{currency(totals.sgst)}</strong></div>
                </>
              ) : (
                <div className="totals-row"><span>IGST</span><strong>{currency(totals.igst)}</strong></div>
              )}
              <div className="totals-row"><span>Tax Total</span><strong>{currency(totals.tax)}</strong></div>
              <div className="totals-row"><span>Grand Total</span><strong>{currency(grandTotal)}</strong></div>
              <div className="totals-row"><span>Amount in Words</span><strong style={{textAlign:'right', maxWidth:260}}>{amountInWords(grandTotal)}</strong></div>
            </div>
          </div>

          <div style={{marginTop:16, color:'#6b7280'}}>
            Declaration: Goods once sold will not be taken back. Subject to Erode jurisdiction.
          </div>
          <div style={{marginTop:24, display:'flex', justifyContent:'space-between'}}>
            <div className="muted">This is a computer generated invoice.</div>
            <div style={{textAlign:'right'}}>
              <div>For Nellai Rehoboth Department Store</div>
              <div style={{height:40}}></div>
              <div>Authorised Signatory</div>
            </div>
          </div>
        </div>

        {/* THERMAL RECEIPT 80mm */}
        <div className="thermal-receipt">
          <div className="t-center">
            <div className="title">நெல்லை ரெகோபோத்</div>
            <div className="sub">டிபார்ட்மென்ட் ஸ்டோர், தமிழகத்தில்</div>
          </div>
          <div className="mono" style={{marginTop:4}}>
            BMOPP6722M1ZH, CELL 9942175849
          </div>
          <div className="mono" style={{marginTop:2}}>
            No: {order.orderNumber}  {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}
          </div>
          <div className="mono" style={{marginTop:2}}>
            Name : {order?.shippingAddress?.name || '-'}
          </div>
          <div className="hr" />
          <table>
            <thead>
              <tr className="mono">
                <th style={{width:'55%'}}>PRODUCT NAME</th>
                <th style={{width:'10%'}}>QTY</th>
                <th style={{width:'15%'}}>RATE</th>
                <th style={{width:'20%', textAlign:'right'}}>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i} className="mono">
                  <td>{it.name}{it?.variantLabel ? ` (${it.variantLabel})` : ''}</td>
                  <td>{it.quantity}</td>
                  <td>{Number(it.price).toFixed(0)}</td>
                  <td className="t-right">{Number(it.subtotal).toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="hr" />
          <div className="mono tot-line"><span>TOTAL Items-----&gt;</span><span>{totals.qty} {Number(grandTotal).toFixed(0)}</span></div>
          <div className="mono tot-line"><span>No Of Items----&gt;</span><span>{items.length}</span></div>
          <div className="hr" />
          <div className="mono tot-line"><span className="tot-title">TOTAL AMT :</span><span className="tot-title">{Number(grandTotal).toFixed(2)}</span></div>
          <div className="hr" />
          <div className="mono tot-line"><span>Opening Balance</span><span>0.00</span></div>
          <div className="mono tot-line"><span>Bill Amount</span><span>{Number(grandTotal).toFixed(2)}</span></div>
          <div className="mono tot-line"><span>Closing Balance</span><span>{Number(grandTotal).toFixed(2)}</span></div>
          <div className="hr" />
          <div className="mono t-center" style={{marginTop:8}}>
            நிலவெள்வரிசOLD26kgrs1300
          </div>
          <div className="mono t-center" style={{marginBottom:8}}>
            வெள்ளவரிசOLD26kgRs1400
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
