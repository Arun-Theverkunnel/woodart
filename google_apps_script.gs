// ═══════════════════════════════════════════════════════════════
//  WOOD ART INTERIO — Google Apps Script
//  This script connects your Work Order app to Google Sheets.
//
//  HOW TO SET UP (do this once):
//  1. Open Google Sheets → create a new blank spreadsheet
//  2. Name it: "Wood Art Interio — Orders"
//  3. Click Extensions → Apps Script
//  4. Delete everything in the editor and paste this entire file
//  5. Click Save (floppy disk icon)
//  6. Click Deploy → New Deployment
//  7. Type: Select type → Web App
//  8. Description: Wood Art Interio
//  9. Execute as: Me
// 10. Who has access: Anyone
// 11. Click Deploy → Authorise → Allow
// 12. Copy the Web App URL (looks like: https://script.google.com/macros/s/.../exec)
// 13. Paste that URL into the app Settings (gear icon in topbar)
// ═══════════════════════════════════════════════════════════════

// ── Called automatically when the app sends data ────────────────
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;

    if (action === 'saveOrder')   return saveOrder(data);
    if (action === 'updateStock') return updateStock(data);

    return respond({success: false, error: 'Unknown action'});
  } catch(err) {
    return respond({success: false, error: err.toString()});
  }
}

// ── Called for GET requests — handles both health check and data saves ──
function doGet(e) {
  // If a payload param is present, process it as an action
  if (e && e.parameter && e.parameter.payload) {
    try {
      var data = JSON.parse(e.parameter.payload);
      var action = data.action;
      if (action === 'saveOrder')   return saveOrder(data);
      if (action === 'updateStock') return updateStock(data);
      return respond({success: false, error: 'Unknown action'});
    } catch(err) {
      return respond({success: false, error: err.toString()});
    }
  }
  // Health check
  return ContentService
    .createTextOutput('✅ Wood Art Interio — Google Sheet API is working!')
    .setMimeType(ContentService.MimeType.TEXT);
}

// ═══════════════════════════════════════════════════════════════
//  SAVE ORDER — writes a new row to the Orders tab
// ═══════════════════════════════════════════════════════════════
function saveOrder(data) {
  var ss     = SpreadsheetApp.getActiveSpreadsheet();
  var orders = getOrCreateSheet(ss, 'Orders', [
    'Order No', 'Type', 'Date', 'Customer Name', 'Phone', 'Address',
    'Products', 'Customisation', 'Delivery Date', 'Take Away?',
    'Subtotal (Rs)', 'GST (Rs)', 'Total (Rs)', 'Advance (Rs)', 'Balance Due (Rs)',
    'Sales Executive', 'Notes', 'Status'
  ]);

  orders.appendRow([
    data.orderNumber    || '',
    data.orderType      || '',                     // Ready Made / Custom
    new Date().toLocaleDateString('en-IN'),
    data.customerName   || '',
    data.phone          || '',
    data.address        || '',
    data.products       || '',                     // product names joined
    data.customisation  || '',                     // fabric/colour/size/hardware
    data.deliveryDate   || '',
    data.isTakeAway     ? 'Yes' : 'No',
    data.subtotal       || 0,
    data.gstAmount      || 0,
    data.total          || 0,
    data.advance        || 0,
    data.balance        || 0,
    data.executive      || '',
    data.notes          || '',
    'Confirmed'
  ]);

  // ── Also save vendor reminders if custom order ──
  if (data.orderType === 'Custom' && data.vendorDates) {
    var vendors = getOrCreateSheet(ss, 'Vendor Reminders', [
      'Order No', 'Customer', 'Vendor', 'Lead Days', 'Call Date', 'Called?', 'Delivery Date'
    ]);
    data.vendorDates.forEach(function(v) {
      vendors.appendRow([
        data.orderNumber,
        data.customerName,
        v.vendor,
        v.leadDays,
        v.callDate,
        'No',
        data.deliveryDate
      ]);
    });
  }

  // ── Format the Orders sheet nicely (first time only) ──
  formatOrdersSheet(orders);

  return respond({success: true, message: 'Order saved!'});
}

// ═══════════════════════════════════════════════════════════════
//  UPDATE STOCK — writes to Stock tab when RM order placed
// ═══════════════════════════════════════════════════════════════
function updateStock(data) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var stock = getOrCreateSheet(ss, 'Stock', [
    'Product ID', 'Product Name', 'Category', 'Stock Count', 'Last Updated', 'Last Order No'
  ]);

  var values = stock.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(data.productId)) {
      // Update existing row
      stock.getRange(i + 1, 4).setValue(data.newStock);
      stock.getRange(i + 1, 5).setValue(new Date().toLocaleDateString('en-IN'));
      stock.getRange(i + 1, 6).setValue(data.orderNumber || '');
      return respond({success: true, message: 'Stock updated'});
    }
  }

  // Product not found — add new row
  stock.appendRow([
    data.productId,
    data.productName   || '',
    data.category      || '',
    data.newStock,
    new Date().toLocaleDateString('en-IN'),
    data.orderNumber   || ''
  ]);

  return respond({success: true, message: 'Stock row created'});
}

// ═══════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════

// Get a sheet by name or create it with headers
function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    // Bold the header row
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#3D2B1F')
      .setFontColor('#F5E6CC');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// Format Orders sheet column widths (runs silently)
function formatOrdersSheet(sheet) {
  try {
    if (sheet.getLastRow() !== 2) return; // only format on first real row
    sheet.setColumnWidth(1, 110);  // Order No
    sheet.setColumnWidth(2, 90);   // Type
    sheet.setColumnWidth(3, 90);   // Date
    sheet.setColumnWidth(4, 140);  // Customer Name
    sheet.setColumnWidth(5, 120);  // Phone
    sheet.setColumnWidth(6, 180);  // Address
    sheet.setColumnWidth(7, 200);  // Products
    sheet.setColumnWidth(8, 180);  // Customisation
    sheet.setColumnWidth(9, 110);  // Delivery Date
  } catch(e) { /* ignore formatting errors */ }
}

// Standard JSON response
function respond(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
