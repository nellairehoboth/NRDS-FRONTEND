
export const generateInvoiceHtml = (order) => {
    const dateStr = new Date(order.createdAt).toLocaleString('en-IN', {
        day: 'numeric', month: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
    }).replace(',', '');

    const itemsHtml = order.items.map(item => `
    <div class="row">
      <div class="col-name">${item.name} ${item.variantLabel ? `(${item.variantLabel})` : ''}</div>
      <div class="col-qty">${item.quantity}</div>
      <div class="col-rate">${item.price}</div>
      <div class="col-amt">${(item.price * item.quantity).toFixed(0)}</div>
    </div>
  `).join('');

    const subtotal = order.totalAmount - (order.deliveryCharge || 0);

    return `
    <html>
      <head>
        <title>Invoice - ${order.orderNumber}</title>
        <style>
          @media print {
            @page { margin: 0; size: 80mm 200mm; }
            body { margin: 0; padding: 5mm; }
          }
          body { 
            font-family: 'Courier New', Courier, monospace; 
            font-size: 12px; 
            color: #000; 
            width: 70mm; 
            margin: 0 auto;
            line-height: 1.2;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .header-info { margin-bottom: 5px; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; margin: 2px 0; }
          .table-header { font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 3px; margin-bottom: 5px; }
          .col-name { flex: 2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .col-qty { flex: 0.5; text-align: center; }
          .col-rate { flex: 0.8; text-align: right; }
          .col-amt { flex: 0.8; text-align: right; }
          .summary-row { display: flex; justify-content: space-between; margin: 2px 0; }
          .footer { margin-top: 15px; font-size: 10px; }
          h2, h3 { margin: 2px 0; }
        </style>
      </head>
      <body>
        <div class="center">
          <h2 class="bold">நெல்லை ரெகோபோத்</h2>
          <div class="bold">டிபார்ட்மென்ட் ஸ்டோர், தமிழகத்தில்</div>
          <div class="header-info">BMOPP6722M1ZH, CELL 9942175849</div>
        </div>
        <div class="divider"></div>
        <div>No: ${order.orderNumber} ${dateStr}</div>
        <div>Name : ${order.shippingAddress?.name || 'Customer'}</div>
        <div class="divider"></div>
        <div class="row table-header">
          <div class="col-name">PRODUCT NAME</div>
          <div class="col-qty">QTY</div>
          <div class="col-rate">RATE</div>
          <div class="col-amt">AMOUNT</div>
        </div>
        ${itemsHtml}
        <div class="divider"></div>
        <div class="summary-row">
          <span>TOTAL Items-----></span>
          <span>${order.items.reduce((acc, i) => acc + i.quantity, 0)} ${subtotal.toFixed(0)}</span>
        </div>
        <div class="summary-row">
          <span>No Of Items----></span>
          <span>${order.items.length}</span>
        </div>
        <div class="divider"></div>
        <div class="summary-row">
          <span>Taxable Value</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div class="summary-row">
          <span>CGST (0%)</span>
          <span>0.00</span>
        </div>
        <div class="summary-row">
          <span>SGST (0%)</span>
          <span>0.00</span>
        </div>
        <div class="summary-row">
          <span>Tax Total</span>
          <span>0.00</span>
        </div>
        <div class="divider"></div>
        <div class="summary-row bold">
          <span>TOTAL AMT :</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div class="divider"></div>
        <div class="summary-row">
          <span>Items Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div class="summary-row">
          <span>Delivery Fee</span>
          <span>${(order.deliveryCharge || 0).toFixed(2)}</span>
        </div>
        <div class="summary-row">
          <span>Opening Balance</span>
          <span>0.00</span>
        </div>
        <div class="summary-row bold">
          <span>Bill Amount</span>
          <span>${order.totalAmount.toFixed(2)}</span>
        </div>
        <div class="summary-row bold">
          <span>Closing Balance</span>
          <span>${order.totalAmount.toFixed(2)}</span>
        </div>
        <div class="divider"></div>
        <div class="center footer">
          <div>நிலவெள்வரிசOLD26kgrs1300</div>
          <div>வெள்ளவரிசOLD26kgRs1400</div>
        </div>
        <script>
          setTimeout(() => {
            window.print();
            window.close();
          }, 500);
        </script>
      </body>
    </html>
  `;
};

export const handlePrintInvoice = (order) => {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) return alert('Please allow popups to print invoices');

    printWindow.document.write(generateInvoiceHtml(order));
    printWindow.document.close();
};
