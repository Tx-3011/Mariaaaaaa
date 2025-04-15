// Bill generation functionality

// Depends on global currentUser and cart (defined in main.js/index.html)
// Depends on global escapeHTML function (defined in main.js/index.html)

function generateBillPage(orderId = null) { // Accept optional orderId from checkout
  if (!currentUser) {
      alert('Error: Not logged in. Cannot generate bill.');
      console.error("generateBillPage called without currentUser.");
      return;
  }

  // Use the cart state as it was just before clearing during checkout.
  // If the cart is already empty AND no orderId was passed, we can't generate.
  if (cart.length === 0 && !orderId) {
      alert('Cannot generate bill: Cart is empty and no recent order ID provided.');
      console.error("generateBillPage called with empty cart and no orderId.");
      return;
  }

  // Calculate totals based on the cart *before* it was cleared
  const itemsForBill = cart;
  const total = itemsForBill.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = total * 0.05; // 5% tax
  const serviceCharge = total * 0.10; // 10% service charge
  const grandTotal = total + tax + serviceCharge;

  // Escape user data before inserting into HTML
  const safeUserName = escapeHTML(currentUser.name);
  const safeUserPhone = escapeHTML(currentUser.phone);
  // Use order ID if available for a more specific invoice number
  const invoiceNumber = orderId ? `ORD-${orderId}` : `INV-${Date.now().toString().slice(-6)}`;

  // Create bill HTML
  const billHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>La Tavola - Bill - ${invoiceNumber}</title>
      <style>
        /* Basic styling - consider moving to a separate CSS */
        body { font-family: 'Open Sans', sans-serif; margin: 0; padding: 20px; background-color: #f9f9f9; }
        .bill-container { max-width: 600px; margin: 20px auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); }
        h2 { font-family: 'Pacifico', cursive; text-align: center; color: #8d6e63; margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f5f5f5; }
        .total-row td { font-weight: bold; border-top: 2px solid #333; }
        .actions { display: flex; justify-content: center; gap: 12px; margin-top: 30px; }
        button { background-color: #8d6e63; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-size: 14px; }
        button:hover { background-color: #6d4c41; }
        .thank-you, .restaurant-info { text-align: center; margin-top: 20px; color: #666; }
        .restaurant-info { font-size: 14px; color: #777; }
        .bill-header { display: flex; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; }
        .bill-header div { margin-bottom: 10px; width: 48%; } /* Adjust layout */
        @media print {
            body { background-color: white; padding: 0; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .bill-container { box-shadow: none; padding: 10px; margin: 0; max-width: 100%; border-radius: 0;}
            .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="bill-container">
        <h2>La Tavola</h2>

        <div class="bill-header">
          <div>
            <p><strong>Invoice #:</strong> ${invoiceNumber}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Time:</strong> ${new Date().toLocaleTimeString()}</p>
          </div>
          <div>
            <p><strong>Customer:</strong> ${safeUserName}</p>
            <p><strong>Phone:</strong> ${safeUserPhone}</p>
          </div>
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
          ${itemsForBill.map(item => `
            <tr>
              <td>${escapeHTML(item.name)}</td>
              <td>${item.quantity}</td>
              <td>₹${item.price.toFixed(2)}</td>
              <td>₹${(item.price * item.quantity).toFixed(2)}</td>
            </tr>
          `).join('')}
          </tbody>
          <tfoot>
              <tr>
                <td colspan="3" style="text-align: right;"><strong>Subtotal</strong></td>
                <td>₹${total.toFixed(2)}</td>
              </tr>
              <tr>
                <td colspan="3" style="text-align: right;">Tax (GST 5%)</td>
                <td>₹${tax.toFixed(2)}</td>
              </tr>
              <tr>
                <td colspan="3" style="text-align: right;">Service Charge (10%)</td>
                <td>₹${serviceCharge.toFixed(2)}</td>
              </tr>
              <tr class="total-row">
                <td colspan="3" style="text-align: right;"><strong>Grand Total</strong></td>
                <td>₹${grandTotal.toFixed(2)}</td>
              </tr>
          </tfoot>
        </table>

        <div class="thank-you">
          <p>Thank you for dining with us at La Tavola!</p>
          <p>We hope to see you again soon.</p>
        </div>

        <div class="restaurant-info">
          <p>La Tavola Italian Restaurant</p>
          <p>123 Food Street, Cuisine City</p>
          <p>Phone: +91 99999 88888</p>
        </div>

        <div class="actions no-print">
          <button onclick="window.print()">Print Bill</button>
          <button onclick="openFeedbackAndClose()">Leave Feedback</button>
          <button onclick="window.close()">Close</button>
        </div>
      </div>
      <script>
          // Function to safely call opener's function and close window
          function openFeedbackAndClose() {
              try {
                  // Check if opener exists and has the function
                  if (window.opener && typeof window.opener.showFeedbackModal === 'function') {
                       window.opener.showFeedbackModal();
                  } else {
                      console.warn('Could not find showFeedbackModal on opener window.');
                      // Maybe provide alternative feedback link?
                      // alert('Feedback form could not be opened automatically.');
                  }
              } catch (e) {
                  console.error('Error calling opener function:', e);
                 // alert('An error occurred trying to open the feedback form.');
              }
              window.close(); // Close the bill window regardless
          }
      </script>
    </body>
    </html>
  `;

  // Open new window with bill
  const billWindow = window.open('', '_blank', 'width=700,height=800');
  if (billWindow) {
      billWindow.document.write(billHTML);
      billWindow.document.close(); // Important for scripts/styles to load properly
      billWindow.focus(); // Bring the new window to the front
  } else {
       alert('Could not open bill window. Please check your popup blocker settings.');
  }
}