// Simplified bill.js - Core functionality only
function generateBillPage() {
  if (!currentUser) {
    alert('Please login to generate bill');
    return;
  }

  if (cart.length === 0) {
    alert('Cart is empty');
    return;
  }

  // Calculate totals
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = total * 0.05;
  const serviceCharge = total * 0.10;
  const grandTotal = total + tax + serviceCharge;
  const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

  // Create bill HTML
  const billHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>La Tavola - Bill</title>
      <style>
        body { font-family: sans-serif; margin: 20px; }
        .bill-container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; }
        h2 { text-align: center; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        .total-row td { font-weight: bold; }
        button { background-color: #4CAF50; color: white; border: none; padding: 10px 15px; margin: 5px; cursor: pointer; }
      </style>
    </head>
    <body>
      <div class="bill-container">
        <h2>La Tavola</h2>
        <div>
          <p><strong>Invoice #:</strong> ${invoiceNumber}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          <p><strong>Customer:</strong> ${currentUser.name}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
          ${cart.map(item => `
            <tr>
              <td>${item.name}</td>
              <td>${item.quantity}</td>
              <td>₹${item.price.toFixed(2)}</td>
              <td>₹${(item.price * item.quantity).toFixed(2)}</td>
            </tr>
          `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="text-align: right;">Subtotal</td>
              <td>₹${total.toFixed(2)}</td>
            </tr>
            <tr>
              <td colspan="3" style="text-align: right;">Tax (5%)</td>
              <td>₹${tax.toFixed(2)}</td>
            </tr>
            <tr>
              <td colspan="3" style="text-align: right;">Service Charge (10%)</td>
              <td>₹${serviceCharge.toFixed(2)}</td>
            </tr>
            <tr class="total-row">
              <td colspan="3" style="text-align: right;">Grand Total</td>
              <td>₹${grandTotal.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        <div style="text-align: center;">
          <p>Thank you for dining with us!</p>
        </div>

        <div style="text-align: center;">
          <button onclick="window.print()">Print</button>
          <button onclick="window.close()">Close</button>
        </div>
      </div>
    </body>
    </html>
  `;

  // Open new window with bill
  const billWindow = window.open('', '_blank');
  if (billWindow) {
    billWindow.document.write(billHTML);
    billWindow.document.close();
  } else {
    alert('Could not open bill window. Please check your popup blocker.');
  }
}