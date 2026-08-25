// ==============================================
// SECURITY PIN LOGIC
// ==============================================
let currentSecurityPin = localStorage.getItem('mandal_app_pin') || '1234';

function unlockApp() {
  const enteredPin = document.getElementById('inputPinField').value.trim();
  if (enteredPin === currentSecurityPin) {
    document.getElementById('securityScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    renderUI();
  } else {
    alert('गलत पिन! कृपया सही 4-अंकों का पिन दर्ज करें।');
    document.getElementById('inputPinField').value = '';
    document.getElementById('inputPinField').focus();
  }
}

function lockApp() {
  document.getElementById('mainApp').style.display = 'none';
  document.getElementById('securityScreen').style.display = 'flex';
  document.getElementById('inputPinField').value = '';
  document.getElementById('inputPinField').focus();
}

function changePinPrompt() {
  const oldPin = prompt('वर्तमान सुरक्षा पिन दर्ज करें:');
  if (oldPin === currentSecurityPin) {
    const newPin = prompt('नया 4-अंकों का पिन दर्ज करें:');
    if (newPin && newPin.trim().length === 4 && !isNaN(newPin)) {
      currentSecurityPin = newPin.trim();
      localStorage.setItem('mandal_app_pin', currentSecurityPin);
      alert('सुरक्षा पिन सफलतापूर्वक बदल दिया गया! नया पिन: ' + currentSecurityPin);
    } else {
      alert('अमान्य पिन! कृपया केवल 4 अंकों का नंबर दर्ज करें।');
    }
  } else if (oldPin !== null) {
    alert('गलत पुराना पिन!');
  }
}

// ==============================================
// MAIN DATA & POS STORAGE
// ==============================================
let inventory = JSON.parse(localStorage.getItem('mandal_pos_stable')) || [
  { id: 101, name: 'चीनी (Sugar)', unit: 'Kg', costPrice: 38, price: 44, stock: 50 },
  { id: 102, name: 'अरहर दाल', unit: 'Kg', costPrice: 135, price: 160, stock: 30 },
  { id: 103, name: 'सरसों तेल 1L', unit: 'Ltr', costPrice: 120, price: 140, stock: 25 },
  { id: 104, name: 'फॉर्च्यून रिफाइंड', unit: 'Pkt', costPrice: 105, price: 125, stock: 15 },
  { id: 105, name: 'लाइफबॉय साबुन', unit: 'Pc', costPrice: 8, price: 10, stock: 0 }
];

let salesHistory = JSON.parse(localStorage.getItem('mandal_sales_stable')) || [];
let purchaseHistory = JSON.parse(localStorage.getItem('mandal_purchase_stable')) || [];
let khataLedger = JSON.parse(localStorage.getItem('mandal_khata_stable')) || [];
let upiID = localStorage.getItem('mandal_upi_id') || '6204339748-3@ybl';

let currentBill = [];
let billDiscount = 0;

function getProductEmoji(name) {
  const n = name.toLowerCase();
  if (n.includes('तेल') || n.includes('oil') || n.includes('रिफाइंड')) return '🛢️';
  if (n.includes('दाल') || n.includes('चावल') || n.includes('आटा') || n.includes('गेहूं') || n.includes('सूजी') || n.includes('मैदा')) return '🌾';
  if (n.includes('चीनी') || n.includes('sugar') || n.includes('गुड़') || n.includes('मीठा')) return '🍬';
  if (n.includes('साबुन') || n.includes('सर्फ़') || n.includes('डिटर्जेंट') || n.includes('soap')) return '🧼';
  if (n.includes('मसाला') || n.includes('हल्दी') || n.includes('मिर्च') || n.includes('धनिया')) return '🌶️';
  if (n.includes('चाय') || n.includes('कॉफी')) return '☕';
  if (n.includes('बिस्कुट') || n.includes('नमकीन') || n.includes('कुरकुरे')) return '🍪';
  return '📦';
}

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDailyInvoiceNumber() {
  const today = getTodayKey();
  const storedDate = localStorage.getItem('mandal_inv_date');
  let currentNo = parseInt(localStorage.getItem('mandal_inv_seq') || '1');

  if (storedDate !== today) {
    currentNo = 1;
    localStorage.setItem('mandal_inv_date', today);
    localStorage.setItem('mandal_inv_seq', '1');
  }
  return currentNo;
}

function incrementDailyInvoiceNumber() {
  let currentNo = getDailyInvoiceNumber();
  localStorage.setItem('mandal_inv_seq', (currentNo + 1).toString());
}

function switchTab(tabId, btnId) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  
  const targetTab = document.getElementById(tabId);
  const targetBtn = document.getElementById(btnId);
  
  if (targetTab) targetTab.classList.add('active');
  if (targetBtn) targetBtn.classList.add('active');

  if (tabId === 'mandi-tab') renderMandiOrderTable();
  if (tabId === 'khata-tab') renderKhataTable();
  if (tabId === 'sales-report-tab') renderSalesReport();
}

function updateClock() {
  const now = new Date();
  document.getElementById('liveClock').innerText = now.toLocaleString('hi-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
  });
}
setInterval(updateClock, 1000);
updateClock();

function setUPIPrompt() {
  const newUPI = prompt('अपनी दुकान की UPI ID दर्ज करें:', upiID);
  if (newUPI && newUPI.trim() !== '') {
    upiID = newUPI.trim();
    localStorage.setItem('mandal_upi_id', upiID);
    document.getElementById('upiIdDisplay').innerText = 'UPI: ' + upiID;
    updateStaticQRCode();
  }
}

function saveState() {
  localStorage.setItem('mandal_pos_stable', JSON.stringify(inventory));
  localStorage.setItem('mandal_sales_stable', JSON.stringify(salesHistory));
  localStorage.setItem('mandal_purchase_stable', JSON.stringify(purchaseHistory));
  localStorage.setItem('mandal_khata_stable', JSON.stringify(khataLedger));
  renderUI();
}

function renderUI() {
  renderCatalog(inventory);
  renderInventoryTable(inventory);
  renderPurchaseSelect();
  renderPurchaseHistory();
  renderSalesReport();
  renderKhataTable();
  renderMandiOrderTable();
  
  const lowStock = inventory.filter(p => p.stock <= 5).length;
  const invNo = getDailyInvoiceNumber();
  const today = getTodayKey();
  const todayPurchases = purchaseHistory.filter(p => p.dateKey === today).reduce((acc, cur) => acc + cur.totalCost, 0);
  const totalUdhar = khataLedger.reduce((acc, cur) => acc + cur.balance, 0);

  document.getElementById('lowStockCount').innerText = lowStock;
  document.getElementById('statTodayPurchases').innerText = todayPurchases.toFixed(2);
  document.getElementById('statTotalUdhar').innerText = totalUdhar.toFixed(2);
  document.getElementById('activeBillNo').innerText = 'INV-' + invNo;
  document.getElementById('upiIdDisplay').innerText = 'UPI: ' + upiID;
  
  updateStaticQRCode();
}

function getStaticUPIString() {
  return `upi://pay?pa=${encodeURIComponent(upiID)}&pn=${encodeURIComponent('Best To Best Kirana')}&cu=INR`;
}

function updateStaticQRCode() {
  const qrImg = document.getElementById('screenQRImg');
  const upiUrl = getStaticUPIString();
  qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiUrl)}`;
}

function renderCatalog(products) {
  const grid = document.getElementById('productGrid');
  grid.innerHTML = '';
  products.forEach(p => {
    const isOut = p.stock <= 0;
    const isLow = p.stock <= 5 && p.stock > 0;
    const emoji = getProductEmoji(p.name);
    
    let pillClass = 'healthy';
    let pillText = `स्टॉक: ${p.stock} ${p.unit}`;
    if (isOut) { pillClass = 'out'; pillText = 'खत्म (0)'; }
    else if (isLow) { pillClass = 'low'; pillText = `कम: ${p.stock} ${p.unit}`; }

    const div = document.createElement('div');
    div.className = `product-card ${isOut ? 'out-of-stock' : ''}`;
    div.onclick = () => addToBill(p);
    div.innerHTML = `
      <div class="product-emoji">${emoji}</div>
      <h4>${p.name}</h4>
      <div class="price">₹${p.price}</div>
      <div><span class="stock-pill ${pillClass}">${pillText}</span></div>
    `;
    grid.appendChild(div);
  });
}

function filterCatalog() {
  const q = document.getElementById('searchCatalog').value.toLowerCase();
  renderCatalog(inventory.filter(p => p.name.toLowerCase().includes(q)));
}

function addToBill(product) {
  const liveProd = inventory.find(p => p.id === product.id);
  if (!liveProd || liveProd.stock <= 0) {
    alert(`"${product.name}" का स्टॉक खत्म (0) है! पहले नया माल खरीदकर स्टॉक जोड़ें।`);
    return;
  }

  const existing = currentBill.find(i => i.id === product.id);
  if (existing) {
    if (existing.qty + 1 > liveProd.stock) {
      alert(`स्टॉक में केवल ${liveProd.stock} ${liveProd.unit} ही उपलब्ध है!`);
      return;
    }
    existing.qty = parseFloat((existing.qty + 1).toFixed(3));
  } else {
    currentBill.push({
      id: product.id,
      name: product.name,
      unit: product.unit,
      costPrice: product.costPrice || 0,
      price: product.price,
      qty: 1
    });
  }
  renderBill();
}

function onQtyChange(id, val) {
  const item = currentBill.find(i => i.id === id);
  const liveProd = inventory.find(p => p.id === id);
  const parsed = parseFloat(val);
  
  if (item && liveProd && !isNaN(parsed)) {
    if (parsed > liveProd.stock) {
      alert(`स्टॉक में केवल ${liveProd.stock} ${liveProd.unit} उपलब्ध है!`);
      item.qty = liveProd.stock;
    } else if (parsed <= 0) {
      removeFromBill(id);
      return;
    } else {
      item.qty = parsed;
    }
    renderBill(false);
  }
}

function addGrams(id, amt) {
  const item = currentBill.find(i => i.id === id);
  const liveProd = inventory.find(p => p.id === id);
  if (item && liveProd) {
    const nextQty = parseFloat((item.qty + amt).toFixed(3));
    if (nextQty > liveProd.stock) {
      alert(`स्टॉक में केवल ${liveProd.stock} ${liveProd.unit} उपलब्ध है!`);
      return;
    }
    item.qty = nextQty;
    renderBill();
  }
}

function removeFromBill(id) {
  currentBill = currentBill.filter(i => i.id !== id);
  renderBill();
}

function applyDiscount(amt) {
  billDiscount = amt;
  renderBill(false);
}

function renderBill(rebuildInputs = true) {
  const tbody = document.getElementById('billBody');
  let grandTotal = 0;
  let totalItems = 0;

  if (rebuildInputs) tbody.innerHTML = '';

  currentBill.forEach(item => {
    const itemTotal = parseFloat((item.qty * item.price).toFixed(2));
    grandTotal += itemTotal;
    totalItems += 1;

    if (rebuildInputs) {
      const isKgOrLtr = item.unit === 'Kg' || item.unit === 'Ltr';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="text-align:left; font-weight:700;">${item.name}</td>
        <td>
          <input type="number" step="any" class="qty-input" value="${item.qty}" onchange="onQtyChange(${item.id}, this.value)">
          <span style="font-size:10px; color:var(--text-muted);">${item.unit}</span>
        </td>
        <td>
          ${isKgOrLtr ? `
            <button class="shortcut-btn" onclick="addGrams(${item.id}, 0.1)">+100g</button>
            <button class="shortcut-btn" onclick="addGrams(${item.id}, 0.25)">+250g</button>
            <button class="shortcut-btn" onclick="addGrams(${item.id}, 0.5)">+500g</button>
          ` : `
            <button class="shortcut-btn" onclick="addGrams(${item.id}, 1)">+1</button>
          `}
        </td>
        <td>₹${item.price}</td>
        <td style="font-weight:800; color:var(--dark-surface);">₹${itemTotal.toFixed(2)}</td>
        <td><button class="action-btn del" onclick="removeFromBill(${item.id})">×</button></td>
      `;
      tbody.appendChild(tr);
    }
  });

  const finalPayable = Math.max(0, grandTotal - billDiscount);
  document.getElementById('grandTotal').innerText = finalPayable.toFixed(2);
  document.getElementById('billItemCount').innerText = totalItems;
}

function clearBill() {
  currentBill = [];
  billDiscount = 0;
  renderBill();
}

// ==============================================
// 100% SINGLE-PAGE DIRECT PRINT ENGINE
// ==============================================
function generatePrintHTML(order, mode) {
  let rowsHtml = '';
  order.items.forEach((item, idx) => {
    const tot = (item.qty * item.price).toFixed(2);
    rowsHtml += `
      <tr>
        ${mode === 'a4' ? `<td style="text-align:center;">${idx+1}</td>` : ''}
        <td style="text-align:left;">${item.name}</td>
        <td style="text-align:center;">${item.qty} ${item.unit}</td>
        <td style="text-align:center;">₹${item.price}</td>
        <td style="text-align:right;">₹${tot}</td>
      </tr>
    `;
  });

  const upiUrl = getStaticUPIString();
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(upiUrl)}`;

  if (mode === 'thermal') {
    return `
      <div class="thermal-box">
        <h2>बेस्ट टू बेस्ट किराना स्टोर</h2>
        <p>बड़बाद, पूर्वी टुंडी, धनबाद (828109)<br>मो: 6204339748 | प्रो: गोराचाँद मंडल</p>
        <div class="meta-line">
          <span>${order.billNo} (${order.paymentType || 'CASH'})</span>
          <span>${order.dateStr}</span>
        </div>
        ${order.customer ? `<div style="font-size:10.5px; margin-bottom:3px;">ग्राहक: <b>${order.customer.name}</b> (${order.customer.phone || ''})</div>` : ''}
        <table>
          <thead>
            <tr>
              <th style="text-align:left;">सामान</th>
              <th>मात्रा</th>
              <th>रेट</th>
              <th style="text-align:right;">कुल</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <div class="total-line">कुल देय राशि: ₹${order.grandTotal.toFixed(2)}</div>
        
        <div class="qr-print-box">
          <img src="${qrApiUrl}" alt="UPI QR">
          <p style="font-size:8.5px; margin-top:1px;">Scan & Pay UPI (${upiID})</p>
        </div>

        <div class="terms-box">
          <b>नियम व शर्तें:</b><br>
          1. बिका माल 48 घंटे के भीतर रसीद के साथ ही वापस होगा।<br>
          2. खुला/फटा हुआ पैकेट वापस नहीं होगा।
        </div>
        <p style="margin-top:6px; font-size:10px; text-align:center;">*** धन्यवाद! फिर पधारें ***</p>
      </div>
    `;
  } else {
    return `
      <div class="a4-box">
        <div class="a4-header">
          <div>
            <h2 style="font-size:20px; font-weight:800; margin:0;">बेस्ट टू बेस्ट किराना स्टोर</h2>
            <p style="font-size:12px; margin:2px 0;">बड़बाद, पूर्वी टुंडी, धनबाद, झारखंड - 828109</p>
            <p style="font-size:12px; margin:0;">मोबाइल: +91 6204339748 | प्रो: गोराचाँद मंडल</p>
          </div>
          <div style="text-align:right;">
            <h3 style="font-size:16px; color:#059669; margin:0;">RETAIL INVOICE</h3>
            <p style="font-size:12px; font-weight:bold; margin:2px 0;">${order.billNo} (${order.paymentType || 'CASH'})</p>
            <p style="font-size:12px; margin:0;">${order.dateStr}</p>
          </div>
        </div>
        ${order.customer ? `<p style="font-size:12px; margin-bottom:6px;">ग्राहक का नाम: <b>${order.customer.name}</b> | फोन: ${order.customer.phone || '-'}</p>` : ''}
        <table>
          <thead>
            <tr>
              <th>क्र.</th>
              <th style="text-align:left;">सामान का विवरण</th>
              <th>मात्रा</th>
              <th>दर (₹)</th>
              <th style="text-align:right;">कुल राशि (₹)</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <div class="total-box">कुल देय राशि: ₹${order.grandTotal.toFixed(2)}</div>
        
        <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:12px;">
          <div class="terms-box" style="font-size:11px; line-height:1.3; max-width:65%;">
            <b>नियम एवं शर्तें:</b><br>
            1. बिका हुआ माल 48 घंटे के अंदर बिल के साथ लाने पर ही वापस/बदला जाएगा।<br>
            2. फटा या इस्तेमाल किया हुआ सामान वापस नहीं लिया जाएगा।
          </div>
          <div style="text-align:center;">
            <img src="${qrApiUrl}" style="width:95px; height:95px; border-radius:4px;" alt="UPI QR">
            <p style="font-size:10px; margin-top:2px;">Scan & Pay UPI (${upiID})</p>
          </div>
        </div>
      </div>
    `;
  }
}

function triggerPrintEngine(orderRecord, mode) {
  const wrapper = document.getElementById('printWrapper');
  wrapper.innerHTML = generatePrintHTML(orderRecord, mode);
  document.body.classList.add('printing-mode');

  setTimeout(() => {
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-mode');
      wrapper.innerHTML = '';
    }, 500);
  }, 350);
}

function completeSaleAndPrint(mode, paymentType = 'CASH', customerData = null) {
  if (currentBill.length === 0) {
    alert('बिल खाली है! कृपया पहले सामान चुनें।');
    return;
  }

  for (let b of currentBill) {
    const prod = inventory.find(p => p.id === b.id);
    if (!prod || prod.stock < b.qty) {
      alert(`त्रुटि: "${b.name}" का स्टॉक (${prod ? prod.stock : 0}) कम है!`);
      return;
    }
  }

  let totalSaleAmount = 0;
  let totalProfitAmount = 0;

  currentBill.forEach(b => {
    const prod = inventory.find(p => p.id === b.id);
    if (prod) prod.stock = parseFloat(Math.max(0, prod.stock - b.qty).toFixed(3));
    
    totalSaleAmount += (b.qty * b.price);
    totalProfitAmount += (b.qty * (b.price - b.costPrice));
  });

  const finalAmount = Math.max(0, totalSaleAmount - billDiscount);
  const invNo = getDailyInvoiceNumber();
  const billNoStr = 'INV-' + invNo;
  const now = new Date();
  const d = now.toLocaleDateString('hi-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const t = now.toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const fullDateStr = `${d} ${t}`;

  const orderRecord = {
    billNo: billNoStr,
    dateKey: getTodayKey(),
    dateStr: fullDateStr,
    time: t,
    paymentType: paymentType,
    customer: customerData,
    items: JSON.parse(JSON.stringify(currentBill)),
    grandTotal: parseFloat(finalAmount.toFixed(2)),
    profit: parseFloat(totalProfitAmount.toFixed(2))
  };
  salesHistory.unshift(orderRecord);

  incrementDailyInvoiceNumber();
  saveState();

  triggerPrintEngine(orderRecord, mode);
  clearBill();
}

function reprintOrder(billNo, mode) {
  const order = salesHistory.find(s => s.billNo === billNo);
  if (order) {
    triggerPrintEngine(order, mode);
  }
}

// Mandi Re-Order List
function renderMandiOrderTable() {
  const tbody = document.getElementById('mandiOrderTableBody');
  tbody.innerHTML = '';
  
  const lowStockItems = inventory.filter(p => p.stock <= 5);

  if (lowStockItems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="padding:20px; color:#64748b;">सब सामान पर्याप्त स्टॉक में है!</td></tr>`;
    return;
  }

  lowStockItems.forEach((p, idx) => {
    const isOut = p.stock <= 0;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td style="text-align:left; font-weight:700;">${p.name}</td>
      <td>${p.unit}</td>
      <td style="font-weight:800; color:var(--danger);">${p.stock} ${p.unit}</td>
      <td>₹${p.costPrice || 0}</td>
      <td><span class="action-btn del">${isOut ? 'खत्म (0)' : 'कम स्टॉक'}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function shareMandiListWhatsApp() {
  const lowStockItems = inventory.filter(p => p.stock <= 5);
  if (lowStockItems.length === 0) {
    alert('दुकान में कोई भी सामान कम स्टॉक पर नहीं है!');
    return;
  }
  let text = `*बेस्ट टू बेस्ट किराना स्टोर - मंडी री-ऑर्डर लिस्ट*\nदिनांक: ${getTodayKey()}\n\n`;
  lowStockItems.forEach((p, idx) => {
    text += `${idx + 1}. ${p.name} - (बचा स्टॉक: ${p.stock} ${p.unit})\n`;
  });
  text += `\nकृपया माल जल्दी भिजवाएं। धन्यवाद!`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}

// Udhar / Khata System
function openKhataModal() {
  if (currentBill.length === 0) {
    alert('बिल खाली है! कृपया पहले सामान चुनें।');
    return;
  }
  document.getElementById('khataModal').classList.add('active');
}

function closeKhataModal() {
  document.getElementById('khataModal').classList.remove('active');
}

function submitKhataBill() {
  const name = document.getElementById('modalKhataName').value.trim();
  const phone = document.getElementById('modalKhataPhone').value.trim();

  if (!name) {
    alert('कृपया ग्राहक का नाम दर्ज करें!');
    return;
  }

  const billAmount = parseFloat(document.getElementById('grandTotal').innerText);

  let customer = khataLedger.find(k => k.name.toLowerCase() === name.toLowerCase());
  if (!customer) {
    customer = {
      id: Date.now(),
      name: name,
      phone: phone,
      balance: 0,
      lastUpdated: getTodayKey()
    };
    khataLedger.unshift(customer);
  }

  customer.balance += billAmount;
  customer.lastUpdated = getTodayKey();
  if (phone) customer.phone = phone;

  closeKhataModal();
  document.getElementById('modalKhataName').value = '';
  document.getElementById('modalKhataPhone').value = '';

  alert(`₹${billAmount} का बिल "${customer.name}" के खाते में जुड़ गया! कुल बकाया: ₹${customer.balance}`);
  completeSaleAndPrint('thermal', 'UDHAR', { name: customer.name, phone: customer.phone });
}

function receiveKhataPayment() {
  const name = document.getElementById('khataCustName').value.trim();
  const amount = parseFloat(document.getElementById('khataPaymentAmount').value);

  if (!name || isNaN(amount) || amount <= 0) {
    alert('कृपया सही ग्राहक नाम और जमा राशि भरें!');
    return;
  }

  const customer = khataLedger.find(k => k.name.toLowerCase() === name.toLowerCase());
  if (!customer) {
    alert('यह ग्राहक खाता लिस्ट में नहीं मिला!');
    return;
  }

  customer.balance = Math.max(0, customer.balance - amount);
  customer.lastUpdated = getTodayKey();
  saveState();

  document.getElementById('khataCustName').value = '';
  document.getElementById('khataPaymentAmount').value = '';
  alert(`₹${amount} जमा हो गया! अब "${customer.name}" का शेष बकाया: ₹${customer.balance}`);
}

function renderKhataTable(list = khataLedger) {
  const tbody = document.getElementById('khataTableBody');
  tbody.innerHTML = '';
  list.forEach((k, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td style="text-align:left; font-weight:700;">${k.name}</td>
      <td>${k.phone || '-'}</td>
      <td style="font-weight:800; color:var(--danger);">₹${k.balance.toFixed(2)}</td>
      <td>${k.lastUpdated}</td>
      <td>
        ${k.phone ? `<button class="action-btn whatsapp" onclick="sendWhatsAppReminder('${k.name}', '${k.phone}', ${k.balance})">📲 तकादा</button>` : '-'}
      </td>
      <td><button class="action-btn del" onclick="deleteKhata(${k.id})">हटाएं</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function sendWhatsAppReminder(name, phone, amount) {
  const msg = encodeURIComponent(`नमस्ते ${name} जी, बेस्ट टू बेस्ट किराना स्टोर से आपका कुल बकाया ₹${amount.toFixed(2)} है। कृपया समय पर भुगतान करने का कष्ट करें। धन्यवाद!`);
  window.open(`https://wa.me/91${phone}?text=${msg}`, '_blank');
}

function deleteKhata(id) {
  if (confirm('क्या आप सचमुच इस ग्राहक का खाता हटाना चाहते हैं?')) {
    khataLedger = khataLedger.filter(k => k.id !== id);
    saveState();
  }
}

function filterKhataTable() {
  const q = document.getElementById('searchKhata').value.toLowerCase();
  renderKhataTable(khataLedger.filter(k => k.name.toLowerCase().includes(q) || (k.phone && k.phone.includes(q))));
}

// Sales Report
function renderSalesReport() {
  const filterInput = document.getElementById('salesFilterDate');
  if (!filterInput.value) filterInput.value = getTodayKey();

  const selectedDate = filterInput.value;
  const filteredSales = salesHistory.filter(s => s.dateKey === selectedDate);
  
  let totSales = 0;
  let totProfit = 0;
  const tbody = document.getElementById('salesHistoryBody');
  tbody.innerHTML = '';

  filteredSales.forEach(order => {
    totSales += order.grandTotal;
    totProfit += order.profit;
    const itemsSummary = order.items.map(i => `${i.name} (${i.qty} ${i.unit})`).join(', ');

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight:800;">${order.billNo}</td>
      <td style="color:var(--text-muted); font-weight:600;">${order.time}</td>
      <td style="text-align:left; font-size:11.5px; color:#334155;">${itemsSummary}</td>
      <td><span class="action-btn ${order.paymentType === 'UDHAR' ? 'del' : 'stock'}">${order.paymentType || 'CASH'}</span></td>
      <td style="font-weight:800; color:var(--dark-surface);">₹${order.grandTotal.toFixed(2)}</td>
      <td style="font-weight:800; color:var(--accent-blue);">+₹${order.profit.toFixed(2)}</td>
      <td>
        <button class="action-btn reprint" onclick="reprintOrder('${order.billNo}', 'thermal')">थर्मल</button>
        <button class="action-btn edit" onclick="reprintOrder('${order.billNo}', 'a4')">A4</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  const today = getTodayKey();
  const todaySales = salesHistory.filter(s => s.dateKey === today).reduce((acc, cur) => acc + cur.grandTotal, 0);

  document.getElementById('statTodaySales').innerText = todaySales.toFixed(2);
  document.getElementById('repTotalSales').innerText = totSales.toFixed(2);
  document.getElementById('repTotalProfit').innerText = totProfit.toFixed(2);
  document.getElementById('repTotalOrders').innerText = filteredSales.length;
}

function setTodaySalesFilter() {
  document.getElementById('salesFilterDate').value = getTodayKey();
  renderSalesReport();
}

// Inventory & Products
function renderInventoryTable(products) {
  const tbody = document.getElementById('inventoryTableBody');
  tbody.innerHTML = '';
  products.forEach((p, idx) => {
    const isLow = p.stock <= 5;
    const profit = (p.price - p.costPrice).toFixed(2);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td style="text-align:left; font-weight:700;">${p.name}</td>
      <td>${p.unit}</td>
      <td style="color:#64748b; font-weight:700;">₹${p.costPrice || 0}</td>
      <td style="font-weight:700; color:var(--primary);">₹${p.price}</td>
      <td style="font-weight:700; color:var(--accent-blue);">+₹${profit}</td>
      <td class="${isLow ? 'low-stock' : ''}" style="font-weight:700;">${p.stock} ${p.unit}</td>
      <td><button class="action-btn edit" onclick="editRatesPrompt(${p.id})">✎ CP/SP</button></td>
      <td><button class="action-btn stock" onclick="editStockPrompt(${p.id})">⇪ स्टॉक</button></td>
      <td><button class="action-btn del" onclick="deleteProduct(${p.id})">हटाएं</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderPurchaseSelect() {
  const sel = document.getElementById('buyProductSelect');
  sel.innerHTML = '<option value="">-- सामान चुनें --</option>';
  inventory.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.innerText = `${p.name} (स्टॉक: ${p.stock} ${p.unit})`;
    sel.appendChild(opt);
  });
}

function onPurchaseProductSelect() {
  const id = parseInt(document.getElementById('buyProductSelect').value);
  const prod = inventory.find(p => p.id === id);
  if (prod) document.getElementById('buyRate').value = prod.costPrice || '';
}

function recordStockPurchase() {
  const prodId = parseInt(document.getElementById('buyProductSelect').value);
  const supplier = document.getElementById('buySupplier').value.trim() || 'लोकल मंडी';
  const qty = parseFloat(document.getElementById('buyQty').value);
  const rate = parseFloat(document.getElementById('buyRate').value);

  if (!prodId || isNaN(qty) || qty <= 0 || isNaN(rate) || rate < 0) {
    alert('कृपया सही विवरण भरें!');
    return;
  }

  const prod = inventory.find(p => p.id === prodId);
  if (prod) {
    prod.stock = parseFloat((prod.stock + qty).toFixed(3));
    prod.costPrice = rate;

    const now = new Date();
    const d = now.toLocaleDateString('hi-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const t = now.toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    purchaseHistory.unshift({
      id: Date.now(),
      dateKey: getTodayKey(),
      dateStr: `${d} ${t}`,
      productName: prod.name,
      unit: prod.unit,
      supplier: supplier,
      qty: qty,
      rate: rate,
      totalCost: parseFloat((qty * rate).toFixed(2))
    });
    saveState();

    document.getElementById('buyQty').value = '';
    document.getElementById('buyRate').value = '';
    document.getElementById('buySupplier').value = '';
    alert(`सफलतापूर्वक ${qty} ${prod.unit} स्टॉक में जुड़ गया!`);
  }
}

function renderPurchaseHistory() {
  const tbody = document.getElementById('purchaseHistoryBody');
  tbody.innerHTML = '';
  purchaseHistory.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="color:var(--text-muted); font-weight:600;">${p.dateStr}</td>
      <td style="text-align:left; font-weight:700;">${p.productName}</td>
      <td>${p.supplier}</td>
      <td style="font-weight:800; color:var(--primary);">${p.qty} ${p.unit}</td>
      <td>₹${p.rate}</td>
      <td style="font-weight:800; color:var(--accent-orange);">₹${p.totalCost.toFixed(2)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function editRatesPrompt(id) {
  const p = inventory.find(i => i.id === id);
  if (p) {
    const newCP = prompt(`"${p.name}" का नया खरीद रेट (CP):`, p.costPrice || 0);
    if (newCP === null) return;
    const newSP = prompt(`"${p.name}" का नया बिक्री रेट (SP):`, p.price);
    if (newSP === null) return;

    if (!isNaN(newCP) && newCP.trim() !== '') p.costPrice = parseFloat(newCP);
    if (!isNaN(newSP) && newSP.trim() !== '') p.price = parseFloat(newSP);

    const billItem = currentBill.find(b => b.id === id);
    if (billItem) {
      billItem.price = p.price;
      billItem.costPrice = p.costPrice;
    }
    saveState();
    renderBill();
  }
}

function editStockPrompt(id) {
  const p = inventory.find(i => i.id === id);
  if (p) {
    const newStock = prompt(`"${p.name}" का नया कुल स्टॉक:`, p.stock);
    if (newStock !== null && !isNaN(newStock) && newStock.trim() !== '') {
      p.stock = parseFloat(newStock);
      saveState();
    }
  }
}

function addProduct() {
  const name = document.getElementById('pName').value.trim();
  const unit = document.getElementById('pUnit').value;
  const costPrice = parseFloat(document.getElementById('pCostPrice').value) || 0;
  const price = parseFloat(document.getElementById('pPrice').value);
  const stock = parseFloat(document.getElementById('pStock').value) || 0;

  if (!name || isNaN(price)) {
    alert('कृपया नाम और बिक्री रेट सही भरें!');
    return;
  }

  inventory.unshift({ id: Date.now(), name, unit, costPrice, price, stock });
  saveState();

  document.getElementById('pName').value = '';
  document.getElementById('pCostPrice').value = '';
  document.getElementById('pPrice').value = '';
  document.getElementById('pStock').value = '';

  alert('नया सामान सुरक्षित कर लिया गया!');
  switchTab('inventory-tab', 'btn-inventory');
}

function deleteProduct(id) {
  if (confirm('क्या आप सचमुच इसे हटाना चाहते हैं?')) {
    inventory = inventory.filter(p => p.id !== id);
    saveState();
  }
}

function filterInventoryTable() {
  const q = document.getElementById('searchInventory').value.toLowerCase();
  renderInventoryTable(inventory.filter(p => p.name.toLowerCase().includes(q)));
}

function exportBackup() {
  const backupData = {
    inventory: inventory,
    salesHistory: salesHistory,
    purchaseHistory: purchaseHistory,
    khataLedger: khataLedger,
    upiID: upiID,
    securityPin: currentSecurityPin,
    invoiceDate: localStorage.getItem('mandal_inv_date'),
    invoiceSeq: localStorage.getItem('mandal_inv_seq')
  };
  const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Mandal_Kirana_Backup_${getTodayKey()}.json`;
  a.click();
}

function importBackup(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (data.inventory) {
        inventory = data.inventory;
        salesHistory = data.salesHistory || [];
        purchaseHistory = data.purchaseHistory || [];
        khataLedger = data.khataLedger || [];
        if (data.upiID) upiID = data.upiID;
        if (data.securityPin) {
          currentSecurityPin = data.securityPin;
          localStorage.setItem('mandal_app_pin', currentSecurityPin);
        }
        if (data.invoiceDate) localStorage.setItem('mandal_inv_date', data.invoiceDate);
        if (data.invoiceSeq) localStorage.setItem('mandal_inv_seq', data.invoiceSeq);
        saveState();
        alert('बैकअप डेटा सफलतापूर्वक लोड हो गया!');
      }
    } catch(err) {
      alert('अमान्य बैकअप फाइल!');
    }
  };
  reader.readAsText(file);
}