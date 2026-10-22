# 📊 Automated Courier RTO Alerts & Dashboard

An end-to-end automated logistics analytics and alert system built using **Google Looker Studio**, **Google Sheets**, and **Google Apps Script**.

---

## 🔗 Live Interactive Dashboard
👉 **[View Live Looker Studio Dashboard](https://datastudio.google.com/reporting/6ae8964e-6196-4443-ba0b-766798a3790a)**

---

## 🛠️ Tech Stack & Architecture

- **Data Tier:** Google Sheets (Optimized with `ARRAYFORMULA` memory layouts for real-time metric updates).
- **Automation Engine:** Google Apps Script / JavaScript (Event-driven background processes utilizing MailApp APIs and concurrency execution locks).
- **Analytics Layer:** Google Looker Studio (Multi-page cross-filtered dashboard with custom ratio aggregation engines).

---

## 📊 Core Features & System Automation

### 1. Intelligent Data Grid & Processing
- Manages a large-scale database of 50,000 active delivery rows tracking global metrics seamlessly.
- Features a zero-latency backend calculated engine providing core KPIs like **88.37% Delivery Success Rate** and **11.63% In-transit/Delayed Rate** instantly.

### 2. Bulk Email Automation Engine (Apps Script)
- Scans transactional sheets dynamically to identify failed courier exceptions.
- Leverages a grouping matrix to bundle multiple failed orders into a single, clean HTML digest table per merchant.
- Bypasses server execution limits and saves daily system quotas by eliminating generic loop counts.
- Equipped with duplicate protection rules using live transactional timestamps to avoid multi-email spamming.

### 3. Premium Interactive BI Dashboard (Looker Studio)
- **Executive Overview (Page 1):** Displays 5 key summary panels (Total Orders, COD Collection, Success Rate %, Failed COD, Delayed Ratio) styled with smooth card borders.
- **Time-Series Analysis:** Built-in monthly calendar charts visualizing delivery trends cleanly by hiding unnecessary noise gridlines.
- **Merchant Analytics & Leaderboard (Page 2):** A dedicated tracking layout containing merchant performance lists sorting top contributors via descending ranks.
- **Dynamic Controls:** Real-time interactive dropdowns allowing management to filter the global dashboard by specific hubs and calendar windows instantly.

---

## ⚙️ How to Setup & Deploy

1. **Database Connection:** Import your raw transport delivery dataset into a Google Sheet tab named `e-commerce_Delivery_Shipping_Data_2026`.
2. **Deploy Script:** Open `Extensions > Apps Script`, wipe default boilerplate scripts, copy the official engine code from `src/Code.gs`, and select `sendAlerts` to authorize security permissions.
3. **Automate Engine:** Navigate to the Script Triggers icon (⏰), click **+ Add Trigger**, choose `sendAlerts`, set the source to **Time-driven (Day timer)**, and pick **8 AM to 9 AM** to establish automated daily cron runs.
4. **Connect BI View:** Launch Looker Studio, connect the spreadsheet as your primary data source, map custom ratio fields using SQL count boundaries, and apply layout border styling values to replicate the premium theme perfectly.

---

## 📂 Project Structure

Automated-Courier-RTO-Alerts-Dashboard/
├── src/
│   └── Code.gs
├── data/
│   └── E-commerce_Delivery_Shipping...
├── docs/
│   └── Automated_Logistics_Perfor...
├── index.html                           # 👈 এই ওয়েবসাইট ফাইলটি যোগ হলো
├── .gitignore
└── README.md