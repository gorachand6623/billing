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
// 2. ROBUST SECURITY PIN LOGIC
// ==============================================
let currentSecurityPin = localStorage.getItem('mandal_app_pin') || '1234';

function unlockApp() {
  const pinInput = document.getElementById('inputPinField');
  const enteredPin = pinInput ? pinInput.value.trim() : '';

  // 1234 या सेव किए गए पिन दोनों से खुलेगा
  if (enteredPin === currentSecurityPin || enteredPin === '1234') {
    const secScreen = document.getElementById('securityScreen');
    const mainApp = document.getElementById('mainApp');

    if (secScreen) secScreen.style.display = 'none';
    if (mainApp) mainApp.style.display = 'block';

    initAppWithCloudSync();
  } else {
    alert('गलत पिन! डिफ़ॉल्ट पिन "1234" दर्ज करें।');
    if (pinInput) {
      pinInput.value = '';
      pinInput.focus();
    }
  }
}

function lockApp() {
  const secScreen = document.getElementById('securityScreen');
  const mainApp = document.getElementById('mainApp');
  const pinInput = document.getElementById('inputPinField');

  if (mainApp) mainApp.style.display = 'none';
  if (secScreen) secScreen.style.display = 'flex';
  if (pinInput) {
    pinInput.value = '';
    pinInput.focus();
  }
}

function changePinPrompt() {
  const oldPin = prompt('वर्तमान सुरक्षा पिन दर्ज करें:');
  if (oldPin === currentSecurityPin || oldPin === '1234') {
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
// ध्यान दें: Gemini API Key हमेशा "AIzaSy..." से शुरू होती है
const GEMINI_API_KEY = "AQ.Ab8RN6LwW_J52aJ4ZGfB1rk4zmVc5WQHgViDxiDm5G2VfiuxYA";

async function processBillImage(event) {
  const file = event.target.files[0];
  if (!file) return;

  const statusText = document.getElementById('ocrStatusText');
  statusText.innerHTML = '⏳ AI पर्ची पढ़ रहा है... (कृपया 4-5 सेकंड रुकें)';
  statusText.style.color = 'var(--primary)';

  try {
    const base64Data = await fileToBase64(file);
    const base64Content = base64Data.split(',')[1];
    const mimeType = file.type || 'image/jpeg';

    const promptText = `Analyze this grocery supply slip/bill (printed or handwritten Hindi/English). 
Extract the supplier name and an array of items with name, quantity (number only), and purchase rate (number only).
Return ONLY a valid raw JSON object matching this structure with NO markdown or formatting:
{"supplier": "string", "items": [{"name": "string", "qty": 0, "rate": 0}]}`;

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: promptText },
            { inline_data: { mime_type: mimeType, data: base64Content } }
          ]
        }]
      })
    });

    if (!response.ok) {
      const errRes = await response.json();
      throw new Error(errRes.error ? errRes.error.message : 'API Key Invalid or Expired');
    }

    const resJson = await response.json();
    let rawText = resJson.candidates[0].content.parts[0].text;

    // JSON को साफ़ करें
    rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(rawText);

    if (parsedData.supplier) {
      const supEl = document.getElementById('bulkSupplierName');
      if (supEl) supEl.value = parsedData.supplier;
    }

    let matchedCount = 0;
    let newAddedCount = 0;

    if (parsedData.items && Array.isArray(parsedData.items)) {
      parsedData.items.forEach(item => {
        const iName = (item.name || '').trim();
        const iQty = parseFloat(item.qty) || 0;
        const iRate = parseFloat(item.rate) || 0;

        if (!iName || iQty <= 0) return;

        let existing = inventory.find(p => 
          p.name.toLowerCase().includes(iName.toLowerCase()) || 
          iName.toLowerCase().includes(p.name.toLowerCase())
        );

        if (existing) {
          const qtyInput = document.getElementById(`bulk_qty_${existing.id}`);
          const rateInput = document.getElementById(`bulk_rate_${existing.id}`);
          if (qtyInput) qtyInput.value = iQty;
          if (rateInput && iRate > 0) rateInput.value = iRate;
          matchedCount++;
        } else {
          inventory.unshift({
            id: Date.now() + Math.random(),
            name: iName,
            unit: 'Kg',
            costPrice: iRate,
            price: Math.round(iRate * 1.15) || (iRate + 5),
            stock: 0
          });
          newAddedCount++;
        }
      });
    }

    saveState();
    renderBulkPurchaseSheet();
    calculateBulkSummary();

    statusText.innerText = '✅ पर्ची सफलतापूर्वक पढ़ ली गई!';
    alert(`🎉 AI ने पर्ची पढ़ ली!\n\n• पुराने सामान टेबल में भरे: ${matchedCount}\n• नए सामान इन्वेंट्री में लिस्ट हुए: ${newAddedCount}\n\nनीचे मात्रा और रेट चेक करके "💾 सभी भरे गए सामान का नया स्टॉक एक साथ जोड़ें" दबाएँ।`);

  } catch (error) {
    console.error("AI Scan Error:", error);
    statusText.innerText = `❌ त्रुटि: ${error.message}`;
    statusText.style.color = 'var(--danger)';
  }
}

// ==============================================
// 9. PRINT & CHECKOUT ENGINE
// ==============================================
function generatePrintHTML(order, mode) {
  let rowsHtml = '';
  order.items.forEach((item, idx) => {
    const tot = (item.qty * item.price).toFixed(2);
    rowsHtml += `
      <tr>
        ${mode === 'a4' ? `<td style="text-align:center; padding:6px; border:1px solid #000;">${idx+1}</td>` : ''}
        <td style="text-align:left; padding:4px 0; border-bottom:1px dotted #ccc;">${item.name}</td>
        <td style="text-align:center; padding:4px 0; border-bottom:1px dotted #ccc;">${item.qty} ${item.unit}</td>
        <td style="text-align:center; padding:4px 0; border-bottom:1px dotted #ccc;">₹${item.price}</td>
        <td style="text-align:right; padding:4px 0; border-bottom:1px dotted #ccc;">₹${tot}</td>
      </tr>
    `;
  });

  const upiUrl = getOneTimeUPIString(order.grandTotal, order.billNo);
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(upiUrl)}`;

  if (mode === 'thermal') {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Thermal Bill</title>
        <style>
          @page { size: auto; margin: 0mm; }
          body { 
            font-family: 'Courier New', monospace, sans-serif; 
            margin: 0; 
            padding: 6px 8px; 
            color: #000; 
            width: 74mm; 
            background: #fff;
          }
          h2 { font-size: 15px; text-align: center; margin: 0 0 2px 0; }
          p { font-size: 10.5px; text-align: center; line-height: 1.25; margin: 2px 0; }
          .meta-line { display: flex; justify-content: space-between; font-size: 10.5px; border-bottom: 1px dashed #000; padding-bottom: 3px; margin: 4px 0; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; margin: 4px 0; }
          th { border-bottom: 1px dashed #000; padding: 3px 0; text-align: center; }
          .total-line { font-size: 13.5px; font-weight: bold; text-align: right; border-top: 1px dashed #000; padding-top: 4px; margin-top: 2px; }
          .qr-box { text-align: center; margin: 6px 0 4px 0; }
          .qr-box img { width: 85px; height: 85px; margin: auto; display: block; }
          .terms { font-size: 9px; border-top: 1px dashed #000; margin-top: 4px; padding-top: 4px; line-height: 1.2; text-align: left; }
        </style>
      </head>
      <body>
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
        ${order.discountAmount > 0 ? `<div style="font-size:11px; text-align:right; color:#333;">छूट: -₹${order.discountAmount.toFixed(2)}</div>` : ''}
        <div class="total-line">कुल देय राशि: ₹${order.grandTotal.toFixed(2)}</div>
        
        <div class="qr-box">
          <img src="${qrApiUrl}" alt="UPI QR">
          <p style="font-size:8.5px; margin-top:2px;">Scan & Pay UPI (${upiID})</p>
        </div>

        <div class="terms">
          <b>नियम व शर्तें:</b><br>
          1. बिका माल 48 घंटे के भीतर रसीद के साथ ही वापस होगा।<br>
          2. खुला/फटा हुआ पैकेट वापस नहीं होगा।
        </div>
        <p style="margin-top:6px; font-size:10px; text-align:center;">*** धन्यवाद! फिर पधारें ***</p>
      </body>
      </html>
    `;
  } else {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Retail Invoice</title>
        <style>
          @page { size: auto; margin: 0mm; }
          body { 
            font-family: system-ui, -apple-system, sans-serif; 
            margin: 0; 
            padding: 18px 22px; 
            color: #000; 
            width: 210mm; 
            background: #fff;
          }
          .a4-header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; margin: 8px 0; }
          th { border: 1px solid #000; background: #f1f5f9; padding: 6px; }
          .total-box { font-size: 14.5px; font-weight: bold; text-align: right; margin-top: 6px; }
        </style>
      </head>
      <body>
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
              <th style="text-align:left; padding:6px;">सामान का विवरण</th>
              <th>मात्रा</th>
              <th>दर (₹)</th>
              <th style="text-align:right; padding:6px;">कुल राशि (₹)</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        ${order.discountAmount > 0 ? `<div style="font-size:12px; text-align:right; font-weight:bold; margin-top:4px;">छूट: -₹${order.discountAmount.toFixed(2)}</div>` : ''}
        <div class="total-box">कुल देय राशि: ₹${order.grandTotal.toFixed(2)}</div>
        
        <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:12px;">
          <div style="font-size:11px; line-height:1.3; max-width:65%;">
            <b>नियम एवं शर्तें:</b><br>
            1. बिका हुआ माल 48 घंटे के अंदर बिल के साथ लाने पर ही वापस/बदला जाएगा।<br>
            2. फटा या इस्तेमाल किया हुआ सामान वापस नहीं लिया जाएगा।
          </div>
          <div style="text-align:center;">
            <img src="${qrApiUrl}" style="width:95px; height:95px; border-radius:4px;" alt="UPI QR">
            <p style="font-size:10px; margin-top:2px;">Scan & Pay UPI (${upiID})</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

function triggerPrintEngine(orderRecord, mode) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('कृपया ब्राउज़र में पॉप-अप (Pop-up) की अनुमति दें!');
    return;
  }

  const billHTML = generatePrintHTML(orderRecord, mode);
  
  printWindow.document.open();
  printWindow.document.write(billHTML);
  printWindow.document.close();

  printWindow.onload = function() {
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      setTimeout(() => {
        printWindow.close();
      }, 1000);
    }, 400);
  };
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

  let subtotal = 0;
  let subtotalCost = 0;

  currentBill.forEach(b => {
    const prod = inventory.find(p => p.id === b.id);
    if (prod) prod.stock = parseFloat(Math.max(0, prod.stock - b.qty).toFixed(3));
    
    subtotal += (b.qty * b.price);
    subtotalCost += (b.qty * (b.price - b.costPrice));
  });

  const actualDiscAmount = calculateActualDiscount(subtotal);
  const finalAmount = Math.max(0, subtotal - actualDiscAmount);
  const finalProfit = Math.max(0, subtotalCost - actualDiscAmount);

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
    discountAmount: actualDiscAmount,
    grandTotal: parseFloat(finalAmount.toFixed(2)),
    profit: parseFloat(finalProfit.toFixed(2))
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
  if (!tbody) return;
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
  if (!tbody) return;
  tbody.innerHTML = '';
  
  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="padding:15px; color:var(--text-muted);">कोई उधारी खाता उपलब्ध नहीं है।</td></tr>`;
    return;
  }

  list.forEach((k, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td style="text-align:left; font-weight:700;">${k.name}</td>
      <td>${k.phone || '-'}</td>
      <td style="font-weight:800; color:var(--danger);">₹${(k.balance || 0).toFixed(2)}</td>
      <td>
        <button class="action-btn edit" onclick="openCustomerQRModal(${k.id})">🔍 परमानेंट QR</button>
      </td>
      <td>
        ${k.phone ? `<button class="action-btn whatsapp" onclick="sendWhatsAppReminder('${k.name}', '${k.phone}', ${k.balance})">📲 तकादा</button>` : '-'}
      </td>
      <td>
        <button class="action-btn stock" onclick="quickClearKhata(${k.id})">✅ पूरा चुकता</button>
      </td>
      <td><button class="action-btn del" onclick="deleteKhata(${k.id})">हटाएं</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function quickClearKhata(id) {
  const customer = khataLedger.find(k => k.id === id);
  if (!customer) return;

  if (confirm(`क्या "${customer.name}" ने पूरा ₹${customer.balance} ऑनलाइन/नकद चुका दिया है?`)) {
    customer.balance = 0;
    customer.lastUpdated = getTodayKey();
    saveState();
    alert(`"${customer.name}" का पूरा खाता चुकता हो गया! बकाया: ₹0`);
  }
}

function openCustomerQRModal(id) {
  const customer = khataLedger.find(k => k.id === id);
  if (!customer) return;

  selectedKhataCustomer = customer;
  document.getElementById('qrModalCustName').innerText = customer.name;
  document.getElementById('qrModalCustBal').innerText = `कुल बकाया: ₹${(customer.balance || 0).toFixed(2)}`;

  const upiUrl = `upi://pay?pa=${encodeURIComponent(upiID)}&pn=${encodeURIComponent('Best To Best Kirana')}&am=${customer.balance.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Udhar Payment - ' + customer.name)}`;
  
  drawQRCodeToElement('customerModalQRCodeContainer', upiUrl, 160, 160);
  document.getElementById('customerQRModal').classList.add('active');
}

function closeCustomerQRModal() {
  document.getElementById('customerQRModal').classList.remove('active');
}

function shareCustomerQROnWhatsApp() {
  if (!selectedKhataCustomer || !selectedKhataCustomer.phone) {
    alert('ग्राहक का मोबाइल नंबर दर्ज नहीं है!');
    return;
  }
  const payUrl = `upi://pay?pa=${encodeURIComponent(upiID)}&pn=${encodeURIComponent('Best To Best Kirana')}&am=${selectedKhataCustomer.balance.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Udhar - ' + selectedKhataCustomer.name)}`;
  const msg = encodeURIComponent(`नमस्ते ${selectedKhataCustomer.name} जी, बेस्ट टू बेस्ट किराना स्टोर से आपका कुल बकाया ₹${selectedKhataCustomer.balance.toFixed(2)} है।\n\nइस लिंक पर क्लिक करके सीधे UPI से भुगतान करें:\n${payUrl}\n\nधन्यवाद!`);
  window.open(`https://wa.me/91${selectedKhataCustomer.phone}?text=${msg}`, '_blank');
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
  if (filterInput && !filterInput.value) filterInput.value = getTodayKey();

  const selectedDate = filterInput ? filterInput.value : getTodayKey();
  const filteredSales = salesHistory.filter(s => s.dateKey === selectedDate);
  
  let totSales = 0;
  let totProfit = 0;
  const tbody = document.getElementById('salesHistoryBody');
  if (!tbody) return;
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

  const statSalesEl = document.getElementById('statTodaySales');
  if (statSalesEl) statSalesEl.innerText = todaySales.toFixed(2);
  
  const repSalesEl = document.getElementById('repTotalSales');
  if (repSalesEl) repSalesEl.innerText = totSales.toFixed(2);
  
  const repProfEl = document.getElementById('repTotalProfit');
  if (repProfEl) repProfEl.innerText = totProfit.toFixed(2);
  
  const repOrdersEl = document.getElementById('repTotalOrders');
  if (repOrdersEl) repOrdersEl.innerText = filteredSales.length;
}

function setTodaySalesFilter() {
  const filterInput = document.getElementById('salesFilterDate');
  if (filterInput) filterInput.value = getTodayKey();
  renderSalesReport();
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
        alert('बैकअप डेटा लोड हो गया!');
      }
    } catch(err) {
      alert('अमान्य बैकअप फाइल!');
    }
  };
  reader.readAsText(file);
}

// Window Onload Auto Focus
window.addEventListener('DOMContentLoaded', () => {
  const secScreen = document.getElementById('securityScreen');
  if (secScreen && secScreen.style.display !== 'none') {
    const pinInp = document.getElementById('inputPinField');
    if (pinInp) pinInp.focus();
  }
});
