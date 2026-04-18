// ═══════════════════════════════════════════════════════════════
//  WOOD ART INTERIO — Google Apps Script
// ═══════════════════════════════════════════════════════════════
// ▶▶ PASTE YOUR SPREADSHEET ID HERE (the long code from your sheet URL)
// Open your Google Sheet → copy the part between /d/ and /edit in the URL
var SHEET_ID = 'PASTE_YOUR_SPREADSHEET_ID_HERE';
// ═══════════════════════════════════════════════════════════════

// ── TEST THIS FIRST — run this from the editor to verify sheet works ──
function testSaveOrder() {
  saveOrder({
    orderNumber  : 'WA-TEST-001',
    orderType    : 'Ready Made',
    customerName : 'Test Customer',
    phone        : '9400233733',
    address      : 'Manarcadu, Kottayam',
    products     : 'Milano Sofa 3+1+1',
    customisation: '',
    deliveryDate : '2025-05-01',
    isTakeAway   : false,
    subtotal     : 85000,
    gstAmount    : 15300,
    total        : 100300,
    advance      : 50000,
    balance      : 50300,
    executive    : 'Test Executive',
    notes        : 'This is a test order — delete after confirming',
    vendorDates  : []
  });
  Logger.log('testSaveOrder completed — check the Orders tab in your sheet');
}

// ── Receives data sent from the browser app ──────────────────────
function doPost(e) {
  try {
    var data;
    // Browser sends as URL-encoded form: e.parameter.payload holds the JSON
    if (e.parameter && e.parameter.payload) {
      data = JSON.parse(e.parameter.payload);
    } else if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else {
      return respond({success: false, error: 'No data received in POST'});
    }

    var action = data.action;
    if (action === 'saveOrder')   return saveOrder(data);
    if (action === 'updateStock') return updateStock(data);
    return respond({success: false, error: 'Unknown action: ' + action});
  } catch(err) {
    return respond({success: false, error: 'doPost error: ' + err.toString()});
  }
}

// ── Health check + fallback GET handler ──────────────────────────
function doGet(e) {
  if (e && e.parameter && e.parameter.payload) {
    try {
      var data = JSON.parse(e.parameter.payload);
      var action = data.action;
      if (action === 'saveOrder')   return saveOrder(data);
      if (action === 'updateStock') return updateStock(data);
      return respond({success: false, error: 'Unknown action: ' + action});
    } catch(err) {
      return respond({success: false, error: 'doGet error: ' + err.toString()});
    }
  }
  return ContentService
    .createTextOutput('✅ Wood Art Interio — Google Sheet API is working!')
    .setMimeType(ContentService.MimeType.TEXT);
}

// ═══════════════════════════════════════════════════════════════
//  SAVE ORDER
// ═══════════════════════════════════════════════════════════════
function saveOrder(data) {
  var ss     = SpreadsheetApp.openById(SHEET_ID);
  var orders = getOrCreateSheet(ss, 'Orders', [
    'Order No', 'Type', 'Date', 'Customer Name', 'Phone', 'Address',
    'Products', 'Customisation', 'Delivery Date', 'Take Away?',
    'Subtotal (Rs)', 'GST (Rs)', 'Total (Rs)', 'Advance (Rs)', 'Balance Due (Rs)',
    'Sales Executive', 'Notes', 'Status'
  ]);

  orders.appendRow([
    data.orderNumber    || '',
    data.orderType      || '',
    new Date().toLocaleDateString('en-IN'),
    data.customerName   || '',
    data.phone          || '',
    data.address        || '',
    data.products       || '',
    data.customisation  || '',
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

  if (data.orderType === 'Custom' && data.vendorDates && data.vendorDates.length) {
    var vendors = getOrCreateSheet(ss, 'Vendor Reminders', [
      'Order No', 'Customer', 'Vendor', 'Lead Days', 'Call Date', 'Called?', 'Delivery Date'
    ]);
    data.vendorDates.forEach(function(v) {
      vendors.appendRow([
        data.orderNumber, data.customerName,
        v.vendor, v.leadDays, v.callDate, 'No', data.deliveryDate
      ]);
    });
  }

  formatOrdersSheet(orders);
  return respond({success: true, message: 'Order saved!'});
}

// ═══════════════════════════════════════════════════════════════
//  UPDATE STOCK
// ═══════════════════════════════════════════════════════════════
function updateStock(data) {
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var stock = getOrCreateSheet(ss, 'Stock', [
    'Product ID', 'Product Name', 'Category', 'Stock Count', 'Last Updated', 'Last Order No'
  ]);
  var values = stock.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(data.productId)) {
      stock.getRange(i + 1, 4).setValue(data.newStock);
      stock.getRange(i + 1, 5).setValue(new Date().toLocaleDateString('en-IN'));
      stock.getRange(i + 1, 6).setValue(data.orderNumber || '');
      return respond({success: true, message: 'Stock updated'});
    }
  }
  stock.appendRow([
    data.productId, data.productName || '', data.category || '',
    data.newStock, new Date().toLocaleDateString('en-IN'), data.orderNumber || ''
  ]);
  return respond({success: true, message: 'Stock row created'});
}

// ═══════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════
function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#3D2B1F')
      .setFontColor('#F5E6CC');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function formatOrdersSheet(sheet) {
  try {
    if (sheet.getLastRow() !== 2) return;
    sheet.setColumnWidth(1, 110); sheet.setColumnWidth(2, 90);
    sheet.setColumnWidth(3, 90);  sheet.setColumnWidth(4, 140);
    sheet.setColumnWidth(5, 120); sheet.setColumnWidth(6, 180);
    sheet.setColumnWidth(7, 200); sheet.setColumnWidth(8, 180);
    sheet.setColumnWidth(9, 110);
  } catch(e) {}
}

function respond(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
