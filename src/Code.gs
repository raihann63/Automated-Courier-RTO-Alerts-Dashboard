const CFG = {
  TEST_MODE: true,          
  TEST_EMAIL: '',           
  MAX_EMAILS_PER_RUN: 20,
  ORDERS_PER_EMAIL: 100,
  CURRENCY: 'টাকা',
  ORDERS: 'e-commerce_Delivery_Shipping_Data_2026', 
  MERCHANTS: 'merchants',   
  LOG: 'run_log'            
};

function sendAlerts() { runAlerts_(true); }
function previewAlerts() { runAlerts_(false); }

function runAlerts_(reallySend) {
  const started = new Date();
  const ss = SpreadsheetApp.getActive();
  const tz = Session.getScriptTimeZone();
  const stats = { pending: 0, merchants: 0, emails: 0, marked: 0, skipped: 0, error: '' };
  const lock = LockService.getScriptLock();
  
  if (!lock.tryLock(30000)) {
    throw new Error('Another run is in progress');
  }
  
  let sheet = null, alertCol = [], idx = {};
  try {
    sheet = ss.getSheetByName(CFG.ORDERS);
    const data = sheet.getDataRange().getValues();
    const head = data.shift();
    
    head.forEach((h, i) => { 
      idx[String(h).trim().toLowerCase()] = i; 
    });
    
    const orderIdIdx = idx['order_id'];
    const statusIdx = idx['delivery_status'];
    const emailIdx = idx['merchant_email'];
    const merchantIdIdx = idx['merchant_id'];
    const alertSentIdx = idx['alert_sent'];
    const codIdx = idx['cod_amount'];
    const hubIdx = idx['hub_name'];

    if (orderIdIdx === undefined || statusIdx === undefined || alertSentIdx === undefined) {
      throw new Error('Required columns are missing! Check header configuration.');
    }
    
    // সিএসই ফিক্স: ২D এরে ম্যাট্রিক্স ইনিশিয়ালাইজেশন (গুগল শিট ফ্রেন্ডলি ফরম্যাট)
    alertCol = data.map(r => [r[alertSentIdx]]);

    const pending = {};
    data.forEach((r, i) => {
      if (r[orderIdIdx] === '') return;
      
      let rawStatus = String(r[statusIdx]).trim().toLowerCase();
      let isRto = rawStatus.indexOf("fail") !== -1 || rawStatus.indexOf("return") !== -1;
      
      if (!isRto) return;
      
      let a = String(r[alertSentIdx]).trim().toLowerCase();
      let isPending = a === '' || a === 'no' || a === 'blanks' || a.indexOf('no') !== -1 || (!CFG.TEST_MODE && a.indexOf('test ') === 0);
      if (!isPending) return;
      
      const m = String(r[merchantIdIdx]).trim();
      (pending[m] = pending[m] || []).push(i);
      stats.pending++;
    });
    stats.merchants = Object.keys(pending).length;

    const mrows = ss.getSheetByName(CFG.MERCHANTS).getDataRange().getValues();
    const mh = mrows.shift();
    const mi = {};
    mh.forEach((h, i) => { mi[String(h).trim().toLowerCase()] = i; });
    const merchants = {};
    mrows.forEach(r => {
      merchants[String(r[mi['merchant_id']]).trim()] = {
        email: String(r[mi['merchant_email']]).trim(),
        active: r[mi['active']] === true || String(r[mi['active']]).toUpperCase() === 'TRUE'
      };
    });

    const me = Session.getEffectiveUser().getEmail();
    const stamp = (CFG.TEST_MODE ? 'TEST ' : '') + Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm');
    outer:
    for (const mid of Object.keys(pending)) {
      const m = merchants[mid];
      if (!m || !m.active || !m.email) { stats.skipped += pending[mid].length; continue; }
      const to = CFG.TEST_MODE ? (CFG.TEST_EMAIL || me) : m.email;
      for (const rows of chunk_(pending[mid], CFG.ORDERS_PER_EMAIL)) {
        if (stats.emails >= CFG.MAX_EMAILS_PER_RUN) break outer;
        if (reallySend && MailApp.getRemainingDailyQuota() < 1) break outer;
        const mail = buildMail_(mid, rows.map(i => data[i]), orderIdIdx, idx['order_date'], idx['customer_city'], idx['return_reason'], codIdx, tz, m.email);
        if (reallySend) {
          MailApp.sendEmail({ to: to, subject: mail.subject, body: mail.body });
          // সিএসই ফিক্স: ২D এরে ডাবল ব্র্যাকেটে মান স্টোর করা
          rows.forEach(i => { alertCol[i] = [stamp]; });
          stats.marked += rows.length;
        } else {
          Logger.log(mid + ' -> ' + to + ' : ' + rows.length + ' orders');
        }
        stats.emails++;
      }
    }
  } catch (e) {
    stats.error = String(e);
  } finally {
    if (reallySend && sheet && stats.marked > 0) {
      const alertSentColNum = idx['alert_sent'] + 1;
      sheet.getRange(2, alertSentColNum, alertCol.length, 1).setValues(alertCol);
    }
    if (reallySend) logRun_(ss, CFG.TEST_MODE ? 'TEST' : 'LIVE', stats, started);
    lock.releaseLock();
  }
  Logger.log(JSON.stringify(stats));
  if (stats.error) throw new Error(stats.error);
}

function buildMail_(mid, rows, orderIdIdx, dateIdx, cityIdx, reasonIdx, codIdx, tz, realEmail) {
  let total = 0;
  const lines = rows.map((r, k) => {
    const d = r[dateIdx];
    const date = d instanceof Date ? Utilities.formatDate(d, tz, 'yyyy-MM-dd') : String(d);
    const cod = Number(r[codIdx]) || 0;
    total += cod;
    const reason = String(r[reasonIdx]).trim() || '-';
    return (k + 1) + '. Order ID: ' + r[orderIdIdx] + ' | তারিখ: ' + date +
           ' | শহর: ' + r[cityIdx] + ' | COD: ' + cod + ' ' + CFG.CURRENCY +
           ' | কারণ: ' + reason;
  });
  const banner = CFG.TEST_MODE ? '[TEST MODE] এই মেইল আসলে যেত: ' + realEmail + '\n\n' : '';
  const body = banner + 'প্রিয় মার্চেন্ট (' + mid + '),\n\n' +
    'আপনার নিচের ' + rows.length + 'টি অর্ডার ডেলিভারি করা যায়নি বা ফেরত এসেছে:\n\n' +
    lines.join('\n') + '\n\nমোট COD: ' + total + ' ' + CFG.CURRENCY +
    '\n\nবিস্তারিত জানতে আমাদের অপারেশনস টিমের সাথে যোগাযোগ করুন।\n\nধন্যবাদ,\nCourier Operations Team';
  const subject = (CFG.TEST_MODE ? '[TEST] ' : '') + 'ডেলিভারি ব্যর্থ: ' + rows.length + 'টি অর্ডার (' + mid + ')';
  return { subject: subject, body: body };
}

function chunk_(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

function logRun_(ss, mode, stats, started) {
  let log = ss.getSheetByName(CFG.LOG);
  if (!log) {
    log = ss.insertSheet(CFG.LOG);
    log.appendRow(['run_time', 'mode', 'pending_orders', 'merchants', 'emails',
                   'orders_marked', 'skipped', 'error', 'seconds']);
  }
  log.appendRow([started, mode, stats.pending, stats.merchants, stats.emails,
                 stats.marked, stats.skipped, stats.error, (new Date() - started) / 1000]);
}

function clearTestMarks() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(CFG.ORDERS);
  const data = sheet.getDataRange().getValues();
  const head = data.map(h => String(h).trim().toLowerCase());
  const col = head.indexOf('alert_sent');
  if (col < 0) throw new Error('Alert_Sent column not found');
  const vals = data.slice(1).map(r => [String(r[col]).indexOf('TEST ') === 0 ? '' : r[col]]);
  sheet.getRange(2, col + 1, vals.length, 1).setValues(vals);
  Logger.log("Test marks cleared successfully.");
}
