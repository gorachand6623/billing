// ==============================================
// 1. GEMINI AI & FIREBASE CONFIG
// ==============================================
const GEMINI_API_KEY = "AQ.Ab8RN6LwW_J52aJ4ZGfB1rk4zmVc5WQHgViDxiDm5G2VfiuxYA";

const firebaseConfig = {
  apiKey: "AIzaSyD775jRZe9ApSzxmo6u2ZVkeOz-Hbz_m5A",
  authDomain: "best-to-best-kirana.firebaseapp.com",
  projectId: "best-to-best-kirana",
  storageBucket: "best-to-best-kirana.firebasestorage.app",
  messagingSenderId: "1071667802267",
  appId: "1:1071667802267:web:1162db2de517901185d63e"
};

let db = null;
let isFirebaseReady = false;

try {
  if (typeof firebase !== 'undefined') {
    if (firebase.apps.length === 0) {
      firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();
    isFirebaseReady = true;
  }
} catch (e) {
  console.warn("Firebase Init Error:", e);
}

// ==============================================
// 2. SECURITY PIN LOGIC
// ==============================================
let currentSecurityPin = localStorage.getItem('mandal_app_pin') || '1234';

function unlockApp() {
  const enteredPin = document.getElementById('inputPinField').value.trim();
  if (enteredPin === currentSecurityPin) {
    document.getElementById('securityScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    initAppWithCloudSync();
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
      saveState();
      alert('सुरक्षा पिन बदल दिया गया! नया पिन: ' + currentSecurityPin);
    } else {
      alert('अमान्य पिन!');
    }
  } else if (oldPin !== null) {
    alert('गलत पुराना पिन!');
  }
}

// ==============================================
// 3. MAIN DATA
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
let discountType = 'rs'; 
let discountValue = 0;

let qrTimerInterval = null;
let qrSecondsLeft = 3600; 
let currentSessionRef = '';
let selectedKhataCustomer = null;

// ==============================================
// 4. REALTIME SYNC
// ==============================================
function initAppWithCloudSync() {
  renderUI();

  if (isFirebaseReady && db) {
    const statusBadge = document.getElementById('syncStatusBadge');
    
    try {
      db.collection('kirana_store').doc('store_data').onSnapshot((doc) => {
        if (doc && doc.exists) {
          const cloudData = doc.data();
          if (cloudData.inventory) inventory = cloudData.inventory;
          if (cloudData.salesHistory) salesHistory = cloudData.salesHistory;
          if (cloudData.purchaseHistory) purchaseHistory = cloudData.purchaseHistory;
          if (cloudData.khataLedger) khataLedger = cloudData.khataLedger;
          if (cloudData.upiID) upiID = cloudData.upiID;
          if (cloudData.securityPin) {
            currentSecurityPin = cloudData.securityPin;
            localStorage.setItem('mandal_app_pin', currentSecurityPin);
          }

          localStorage.setItem('mandal_pos_stable', JSON.stringify(inventory));
          localStorage.setItem('mandal_sales_stable', JSON.stringify(salesHistory));
          localStorage.setItem('mandal_purchase_stable', JSON.stringify(purchaseHistory));
          localStorage.setItem('mandal_khata_stable', JSON.stringify(khataLedger));
          localStorage.setItem('mandal_upi_id', upiID);

          if (statusBadge) statusBadge.innerHTML = '🟢 क्लाउड सिंक चालू';
          renderUI();
        } else {
          saveState();
        }
      }, (err) => {
        console.warn("Firestore listener error:", err);
        if (statusBadge) statusBadge.innerHTML = '🟡 ऑफलाइन मोड';
      });
    } catch (e) {
      console.warn("Sync setup error:", e);
      if (statusBadge) statusBadge.innerHTML = '🟡 ऑफलाइन मोड';
    }
  }
}

function saveState() {
  localStorage.setItem('mandal_pos_stable', JSON.stringify(inventory));
  localStorage.setItem('mandal_sales_stable', JSON.stringify(salesHistory));
  localStorage.setItem('mandal_purchase_stable', JSON.stringify(purchaseHistory));
  localStorage.setItem('mandal_khata_stable', JSON.stringify(khataLedger));
  localStorage.setItem('mandal_upi_id', upiID);

  if (isFirebaseReady && db) {
    try {
      db.collection('kirana_store').doc('store_data').set({
        inventory: inventory,
        salesHistory: salesHistory,
        purchaseHistory: purchaseHistory,
        khataLedger: khataLedger,
        upiID: upiID,
        securityPin: currentSecurityPin,
        lastUpdated: new Date().toISOString()
      }, { merge: true }).catch(err => console.error("Cloud Save Error:", err));
    } catch(e) {
      console.error(e);
    }
  }

  renderUI();
}

// ==============================================
// 5. HELPER FUNCTIONS
// ==============================================
function getProductEmoji(name) {
  const n = (name || '').toLowerCase();
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

function getYesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
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
  if (tabId === 'purchase-tab') {
    renderBulkPurchaseSheet();
    renderPurchaseHistory();
  }
  if (tabId === 'inventory-tab') {
    renderInventoryTable();
  }
}

function updateClock() {
  const now = new Date();
  const clk = document.getElementById('liveClock');
  if (clk) {
    clk.innerText = now.toLocaleString('hi-IN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
    });
  }
}
setInterval(updateClock, 1000);
updateClock();

function setUPIPrompt() {
  const newUPI = prompt('अपनी दुकान की UPI ID दर्ज करें:', upiID);
  if (newUPI && newUPI.trim() !== '') {
    upiID = newUPI.trim();
    localStorage.setItem('mandal_upi_id', upiID);
    document.getElementById('upiIdDisplay').innerText = 'UPI: ' + upiID;
    saveState();
    updateDynamicQRCode();
  }
}

function renderUI() {
  renderCatalog(inventory);
  renderInventoryTable();
  renderBulkPurchaseSheet();
  renderPurchaseHistory();
  renderSalesReport();
  renderKhataTable();
  renderMandiOrderTable();
  
  const lowStock = inventory.filter(p => p.stock <= 5).length;
  const invNo = getDailyInvoiceNumber();
  const today = getTodayKey();
  const todayPurchases = purchaseHistory.filter(p => p.dateKey === today).reduce((acc, cur) => acc + (cur.totalCost || 0), 0);
  const totalUdhar = khataLedger.reduce((acc, cur) => acc + (cur.balance || 0), 0);

  const lowStockEl = document.getElementById('lowStockCount');
  if (lowStockEl) lowStockEl.innerText = lowStock;
  
  const purchasesEl = document.getElementById('statTodayPurchases');
  if (purchasesEl) purchasesEl.innerText = todayPurchases.toFixed(2);
  
  const udharEl = document.getElementById('statTotalUdhar');
  if (udharEl) udharEl.innerText = totalUdhar.toFixed(2);
  
  const billNoEl = document.getElementById('activeBillNo');
  if (billNoEl) billNoEl.innerText = 'INV-' + invNo;
  
  const upiEl = document.getElementById('upiIdDisplay');
  if (upiEl) upiEl.innerText = 'UPI: ' + upiID;
  
  updateDynamicQRCode();
}

function drawQRCodeToElement(containerId, textToEncode, width = 100, height = 100) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  
  try {
    if (typeof QRCode !== 'undefined') {
      new QRCode(container, {
        text: textToEncode,
        width: width,
        height: height,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
      });
    } else {
      const img = document.createElement('img');
      img.src = `https://api.qrserver.com/v1/create-qr-code/?size=${width}x${height}&data=${encodeURIComponent(textToEncode)}`;
      img.style.width = width + 'px';
      img.style.height = height + 'px';
      container.appendChild(img);
    }
  } catch (err) {
    console.error("QR Error:", err);
  }
}

function getOneTimeUPIString(amount, sessionRef) {
  const amtStr = parseFloat(amount || 0).toFixed(2);
  return `upi://pay?pa=${encodeURIComponent(upiID)}&pn=${encodeURIComponent('Best To Best Kirana')}&am=${amtStr}&cu=INR&tr=${encodeURIComponent(sessionRef)}&tn=${encodeURIComponent('Bill ' + sessionRef)}`;
}

function updateDynamicQRCode() {
  const grandTotalEl = document.getElementById('grandTotal');
  const grandTotal = grandTotalEl ? (parseFloat(grandTotalEl.innerText) || 0) : 0;
  
  const qrAmtEl = document.getElementById('qrAmountDisplay');
  if (qrAmtEl) qrAmtEl.innerText = grandTotal.toFixed(2);
  
  const badge = document.getElementById('qrExpiryBadge');

  if (grandTotal <= 0) {
    const staticUpi = `upi://pay?pa=${encodeURIComponent(upiID)}&pn=${encodeURIComponent('Best To Best Kirana')}&cu=INR`;
    drawQRCodeToElement('screenQRCodeContainer', staticUpi, 90, 90);
    if (qrTimerInterval) clearInterval(qrTimerInterval);
    if (badge) {
      badge.innerHTML = '🟢 परमानेंट काउंटर QR';
      badge.classList.remove('expired');
    }
    return;
  }

  if (!currentSessionRef || qrSecondsLeft <= 0) {
    currentSessionRef = 'INV' + getDailyInvoiceNumber() + '-' + Date.now().toString().slice(-4);
    startOneHourExpiryTimer();
  }

  const upiUrl = getOneTimeUPIString(grandTotal, currentSessionRef);
  drawQRCodeToElement('screenQRCodeContainer', upiUrl, 90, 90);
}

function startOneHourExpiryTimer() {
  if (qrTimerInterval) clearInterval(qrTimerInterval);
  qrSecondsLeft = 3600;

  const badge = document.getElementById('qrExpiryBadge');
  const timerDisplay = document.getElementById('qrTimerDisplay');
  if (badge) badge.classList.remove('expired');

  qrTimerInterval = setInterval(() => {
    qrSecondsLeft--;
    if (qrSecondsLeft <= 0) {
      clearInterval(qrTimerInterval);
      if (badge) {
        badge.classList.add('expired');
        badge.innerHTML = '❌ QR एक्सपायर (नया बिल बनाएं)';
      }
      currentSessionRef = '';
    } else {
      const m = String(Math.floor(qrSecondsLeft / 60)).padStart(2, '0');
      const s = String(qrSecondsLeft % 60).padStart(2, '0');
      if (timerDisplay) timerDisplay.innerText = `${m}:${s}`;
    }
  }, 1000);
}

function renderCatalog(products) {
  const grid = document.getElementById('productGrid');
  if (!grid) return;
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

function onDiscountTypeChange() {
  discountType = document.getElementById('discountType').value;
  renderBill(false);
}

function onCustomDiscountChange(val) {
  const parsed = parseFloat(val);
  discountValue = (!isNaN(parsed) && parsed >= 0) ? parsed : 0;
  renderBill(false);
}

function calculateActualDiscount(subtotal) {
  if (discountValue <= 0) return 0;
  if (discountType === 'per') {
    return parseFloat(((subtotal * discountValue) / 100).toFixed(2));
  } else {
    return Math.min(subtotal, discountValue);
  }
}

function renderBill(rebuildInputs = true) {
  const tbody = document.getElementById('billBody');
  if (!tbody) return;
  let subtotal = 0;
  let totalItems = 0;

  if (rebuildInputs) tbody.innerHTML = '';

  currentBill.forEach(item => {
    const itemTotal = parseFloat((item.qty * item.price).toFixed(2));
    subtotal += itemTotal;
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

  const actualDisc = calculateActualDiscount(subtotal);
  const finalPayable = Math.max(0, subtotal - actualDisc);
  
  const grandEl = document.getElementById('grandTotal');
  if (grandEl) grandEl.innerText = finalPayable.toFixed(2);
  
  const countEl = document.getElementById('billItemCount');
  if (countEl) countEl.innerText = totalItems;
}

function clearBill() {
  currentBill = [];
  discountValue = 0;
  const discInp = document.getElementById('customDiscountInput');
  if (discInp) discInp.value = '';
  currentSessionRef = '';
  if (qrTimerInterval) clearInterval(qrTimerInterval);
  renderBill();
}

// ==========================================================
// 6. EXCEL SPREADSHEET INVENTORY & STOCK ENGINE
// ==========================================================
function renderInventoryTable(products = inventory) {
  const tbody = document.getElementById('inventoryTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  products.forEach((p, idx) => {
    const profit = ((p.price || 0) - (p.costPrice || 0)).toFixed(2);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td style="text-align:left; font-weight:700;">
        ${getProductEmoji(p.name)} ${p.name}
      </td>
      <td>${p.unit}</td>
      <td>
        <input type="number" step="any" class="excel-cell-input excel-cp-input" id="inv_cp_${p.id}" value="${p.costPrice || 0}" oninput="updateLiveProfit(${p.id})">
      </td>
      <td>
        <input type="number" step="any" class="excel-cell-input excel-sp-input" id="inv_sp_${p.id}" value="${p.price || 0}" oninput="updateLiveProfit(${p.id})">
      </td>
      <td style="font-weight:800; color:var(--accent-blue);" id="inv_profit_${p.id}">
        +₹${profit}
      </td>
      <td>
        <input type="number" step="any" class="excel-cell-input excel-stock-input" id="inv_stock_${p.id}" value="${p.stock || 0}">
      </td>
      <td>
        <button class="action-btn del" onclick="deleteProduct(${p.id})">×</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function updateLiveProfit(id) {
  const cpEl = document.getElementById(`inv_cp_${id}`);
  const spEl = document.getElementById(`inv_sp_${id}`);
  const profitEl = document.getElementById(`inv_profit_${id}`);

  if (cpEl && spEl && profitEl) {
    const cp = parseFloat(cpEl.value) || 0;
    const sp = parseFloat(spEl.value) || 0;
    const prof = (sp - cp).toFixed(2);
    profitEl.innerText = (prof >= 0 ? '+₹' : '-₹') + Math.abs(prof);
    profitEl.style.color = prof >= 0 ? 'var(--accent-blue)' : 'var(--danger)';
  }
}

function saveAllExcelInventory() {
  let changeCount = 0;

  inventory.forEach(p => {
    const cpEl = document.getElementById(`inv_cp_${p.id}`);
    const spEl = document.getElementById(`inv_sp_${p.id}`);
    const stockEl = document.getElementById(`inv_stock_${p.id}`);

    if (cpEl && spEl && stockEl) {
      const newCP = parseFloat(cpEl.value);
      const newSP = parseFloat(spEl.value);
      const newStock = parseFloat(stockEl.value);

      if (!isNaN(newCP) && !isNaN(newSP) && !isNaN(newStock)) {
        p.costPrice = newCP;
        p.price = newSP;
        p.stock = newStock;
        changeCount++;

        const bItem = currentBill.find(b => b.id === p.id);
        if (bItem) {
          bItem.price = p.price;
          bItem.costPrice = p.costPrice;
        }
      }
    }
  });

  saveState();
  renderBill();
  alert(`सफलतापूर्वक ${changeCount} सामानों के रेट व स्टॉक सुरक्षित कर लिए गए!`);
}

function filterInventoryTable() {
  const q = document.getElementById('searchInventory').value.toLowerCase();
  renderInventoryTable(inventory.filter(p => p.name.toLowerCase().includes(q)));
}

// ==========================================================
// 7. INDIVIDUAL ITEM BULK PURCHASE & HISTORY ENGINE
// ==========================================================
function renderBulkPurchaseSheet(products = inventory) {
  const tbody = document.getElementById('bulkPurchaseSheetBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  products.forEach((p, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td style="text-align:left; font-weight:700;">
        ${getProductEmoji(p.name)} ${p.name}
      </td>
      <td style="color:var(--text-muted); font-weight:700;">
        ${p.stock} ${p.unit}
      </td>
      <td>
        <input type="number" step="any" class="bulk-qty-input" id="bulk_qty_${p.id}" placeholder="0" oninput="calculateBulkSummary()">
        <span style="font-size:11px; font-weight:700; color:var(--text-muted);">${p.unit}</span>
      </td>
      <td>
        <input type="number" step="any" class="bulk-rate-input" id="bulk_rate_${p.id}" value="${p.costPrice || 0}" oninput="calculateBulkSummary()">
      </td>
      <td style="font-weight:800; color:var(--accent-orange);" id="bulk_cost_${p.id}">
        ₹0.00
      </td>
    `;
    tbody.appendChild(tr);
  });

  calculateBulkSummary();
}

function filterBulkPurchaseSheet() {
  const q = document.getElementById('searchBulkPurchase').value.toLowerCase();
  renderBulkPurchaseSheet(inventory.filter(p => p.name.toLowerCase().includes(q)));
}

function calculateBulkSummary() {
  let grandBulkCost = 0;

  inventory.forEach(p => {
    const qtyInput = document.getElementById(`bulk_qty_${p.id}`);
    const rateInput = document.getElementById(`bulk_rate_${p.id}`);
    const costCell = document.getElementById(`bulk_cost_${p.id}`);

    if (qtyInput && rateInput) {
      const q = parseFloat(qtyInput.value) || 0;
      const r = parseFloat(rateInput.value) || 0;
      const total = q * r;
      grandBulkCost += total;
      if (costCell) costCell.innerText = '₹' + total.toFixed(2);
    }
  });

  const sumCostEl = document.getElementById('bulkTotalSummaryCost');
  if (sumCostEl) sumCostEl.innerText = grandBulkCost.toFixed(2);
}

function resetBulkSheetInputs() {
  inventory.forEach(p => {
    const qtyInput = document.getElementById(`bulk_qty_${p.id}`);
    if (qtyInput) qtyInput.value = '';
  });
  const supInp = document.getElementById('bulkSupplierName');
  if (supInp) supInp.value = '';
  calculateBulkSummary();
}

function saveAllBulkSheetStock() {
  const supplier = document.getElementById('bulkSupplierName').value.trim() || 'थोक मंडी';
  const now = new Date();
  const d = now.toLocaleDateString('hi-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const t = now.toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  let updatedCount = 0;

  inventory.forEach(p => {
    const qtyInput = document.getElementById(`bulk_qty_${p.id}`);
    const rateInput = document.getElementById(`bulk_rate_${p.id}`);

    if (qtyInput && rateInput) {
      const addedQty = parseFloat(qtyInput.value);
      const newRate = parseFloat(rateInput.value);

      if (!isNaN(addedQty) && addedQty > 0) {
        p.stock = parseFloat((p.stock + addedQty).toFixed(3));
        if (!isNaN(newRate) && newRate >= 0) p.costPrice = newRate;

        // प्रत्येक सामान की अलग 1-बाय-1 लाइन एंट्री
        purchaseHistory.unshift({
          id: Date.now() + Math.random(),
          dateKey: getTodayKey(),
          dateStr: `${d} ${t}`,
          productName: p.name,
          unit: p.unit,
          supplier: supplier,
          qty: addedQty,
          rate: (!isNaN(newRate) ? newRate : p.costPrice),
          totalCost: parseFloat((addedQty * (!isNaN(newRate) ? newRate : p.costPrice)).toFixed(2))
        });

        updatedCount++;
      }
    }
  });

  if (updatedCount === 0) {
    alert('कृपया कम से कम एक सामान में नई खरीदी मात्रा भरें!');
    return;
  }

  alert(`सफलतापूर्वक ${updatedCount} सामानों का नया स्टॉक अलग-अलग जुड़ गया!`);
  resetBulkSheetInputs();
  saveState();
}

function renderPurchaseHistory() {
  const filterInput = document.getElementById('purchaseFilterDate');
  const selectedDate = filterInput ? filterInput.value : '';
  const isAllMode = !filterInput || filterInput.dataset.mode === 'all' || !selectedDate;

  const filteredPurchases = isAllMode 
    ? purchaseHistory 
    : purchaseHistory.filter(p => p.dateKey === selectedDate);

  const tbody = document.getElementById('purchaseHistoryBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (filteredPurchases.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="padding:15px; color:var(--text-muted);">कोई खरीद रिकॉर्ड उपलब्ध नहीं है।</td></tr>`;
    return;
  }

  filteredPurchases.forEach(p => {
    const name = p.productName || (p.items ? p.items.map(i => i.name).join(', ') : 'सामान');
    const qtyStr = p.qty !== undefined ? `${p.qty} ${p.unit || ''}` : `${p.itemCount || 1} आइटम`;
    const rateStr = p.rate !== undefined ? `₹${p.rate}` : '-';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="color:var(--text-muted); font-weight:600;">${p.dateStr}</td>
      <td style="text-align:left; font-weight:700;">${name}</td>
      <td>${p.supplier || 'थोक मंडी'}</td>
      <td style="font-weight:800; color:var(--primary);">${qtyStr}</td>
      <td>${rateStr}</td>
      <td style="font-weight:800; color:var(--accent-orange);">₹${(p.totalCost || 0).toFixed(2)}</td>
      <td><button class="action-btn edit" onclick="editPurchaseRecord(${p.id})">✎ सुधार करें</button></td>
      <td><button class="action-btn del" onclick="deleteSinglePurchaseRecord(${p.id})">×</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function editPurchaseRecord(purchaseId) {
  const p = purchaseHistory.find(item => item.id === purchaseId);
  if (!p) return;

  const newQty = prompt(`"${p.productName}" की नई खरीदी मात्रा दर्ज करें:`, p.qty);
  if (newQty === null) return;
  const newRate = prompt(`"${p.productName}" का नया खरीद रेट (₹):`, p.rate);
  if (newRate === null) return;

  const parsedQty = parseFloat(newQty);
  const parsedRate = parseFloat(newRate);

  if (isNaN(parsedQty) || parsedQty <= 0 || isNaN(parsedRate) || parsedRate < 0) {
    alert('अमान्य मान दर्ज किया गया!');
    return;
  }

  const prod = inventory.find(i => i.name === p.productName);
  if (prod) {
    const qtyDiff = parsedQty - p.qty;
    prod.stock = parseFloat(Math.max(0, prod.stock + qtyDiff).toFixed(3));
    prod.costPrice = parsedRate;
  }

  p.qty = parsedQty;
  p.rate = parsedRate;
  p.totalCost = parseFloat((parsedQty * parsedRate).toFixed(2));

  saveState();
  alert('खरीददारी हिसाब सुधर गया!');
}

function deleteSinglePurchaseRecord(purchaseId) {
  if (confirm('क्या आप सचमुच इस खरीद रिकॉर्ड को हटाना चाहते हैं?')) {
    const p = purchaseHistory.find(item => item.id === purchaseId);
    if (p) {
      const prod = inventory.find(i => i.name === p.productName);
      if (prod && p.qty) {
        prod.stock = parseFloat(Math.max(0, prod.stock - p.qty).toFixed(3));
      }
    }
    purchaseHistory = purchaseHistory.filter(item => item.id !== purchaseId);
    saveState();
  }
}

function setTodayPurchaseFilter() {
  const filterInput = document.getElementById('purchaseFilterDate');
  if (filterInput) {
    filterInput.dataset.mode = 'date';
    filterInput.value = getTodayKey();
  }
  renderPurchaseHistory();
}

function setYesterdayPurchaseFilter() {
  const filterInput = document.getElementById('purchaseFilterDate');
  if (filterInput) {
    filterInput.dataset.mode = 'date';
    filterInput.value = getYesterdayKey();
  }
  renderPurchaseHistory();
}

function showAllPurchaseHistory() {
  const filterInput = document.getElementById('purchaseFilterDate');
  if (filterInput) {
    filterInput.dataset.mode = 'all';
    filterInput.value = '';
  }
  renderPurchaseHistory();
}

// ==========================================================
// 8. GEMINI AI OCR BILL SCANNER (CAMERA + GALLERY)
// ==========================================================
async function processBillImage(event) {
  const file = event.target.files[0];
  if (!file) return;

  const statusText = document.getElementById('ocrStatusText');
  statusText.innerHTML = '⏳ AI पर्ची पढ़ रहा है... (3-5 सेकंड रुकें)';
  statusText.style.color = 'var(--primary)';

  try {
    const base64Data = await fileToBase64(file);
    const imageBase64 = base64Data.split(',')[1];

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "यह हाथ से लिखी या छपी हुई किराने की पर्ची है। इसमें से सप्लायर/दुकान का नाम और सभी खरीदे गए सामानों की सूची निकालो। जवाब सिर्फ और सिर्फ मान्य JSON फॉर्मेट में दो: {\"supplier\": \"मार्केट का नाम\", \"items\": [{\"name\": \"सामान का नाम\", \"qty\": संख्या, \"rate\": खरीद रेट}]}" },
            { inline_data: { mime_type: file.type || "image/jpeg", data: imageBase64 } }
          ]
        }]
      })
    });

    const data = await response.json();
    const rawAiText = data.candidates[0].content.parts[0].text;
    const cleanJson = rawAiText.replace(/```json|
