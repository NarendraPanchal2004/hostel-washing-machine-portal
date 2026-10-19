# SpendWise – Student Expense Tracking & Budget Management Web Application

A Web Technology Project

---

## 1. Project Title
**SpendWise – A Student Expense Tracking and Budget Management Web Application**

---

## 2. Project Description
**SpendWise** is a lightweight, responsive, and intuitive web application built specifically for college students and young professionals to manage their personal finances effectively. It enables users to record daily income and expenses, monitor monthly spending targets, analyze category-wise expenditures, and maintain control over their budget without requiring any backend server or database installation.

The application operates completely client-side in any modern web browser using standard Web Technologies: HTML5, CSS3, and Vanilla JavaScript, with data persistence handled via HTML5 Web Storage (`localStorage`).

---

## 3. Problem Statement
Students often struggle with managing monthly allowances, tracking micro-expenses (such as snacks, local travel, course books, and entertainment), and keeping spending within budget limits. Existing financial apps can be overly complex, require internet Connectivity or subscription services, and risk user privacy by uploading sensitive transaction logs to remote cloud servers.

There is a clear need for a simple, client-side, offline-capable expense tracking tool that provides instant visual financial feedback, budget over-spending alerts, and simple data management directly inside the user's browser.

---

## 4. Objectives
- **Record Transactions**: Provide an intuitive interface to log income and expense entries with category tags, payment methods, and notes.
- **Budget Monitoring**: Calculate remaining monthly budget and display visual progress warnings when spending approaches or exceeds allocated limits.
- **Financial Analytics**: Visualize category-wise expense distributions through dynamic pure CSS and SVG charts.
- **Offline Data Persistence**: Store all user data safely within the browser's `localStorage` so that information persists across page reloads and browser restarts.
- **Responsive & Accessible UI**: Ensure seamless operation across desktops, laptops, tablets, and mobile devices with light/dark theme customizability.

---

## 5. Technologies Used
- **HTML5**: Semantic markup (`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`) for accessibility and document structure.
- **CSS3**: Custom properties (CSS variables), Flexbox, CSS Grid layouts, media queries for responsive design, custom animations, and theme toggling.
- **Vanilla JavaScript (ES6+)**: Event handling, DOM manipulation, state management, form validation, dynamic SVG rendering, and JSON parsing.
- **Browser localStorage**: Browser-native key-value storage for client-side persistence.

---

## 6. Features
- **Dashboard Overview**:
  - Live summary cards displaying **Total Income**, **Total Expenses**, **Available Balance**, and **Monthly Budget**.
  - Monthly Budget Progress Monitor with percentage tracking.
  - Recent 5 transactions quick list.
- **Transaction Management**:
  - Add and edit income/expense records.
  - Form validation with clear error messages.
  - Custom attributes: Transaction Name, Amount (₹), Category (Food, Travel, Education, Shopping, Entertainment, Other), Payment Method (Cash, UPI, Card, Bank Transfer), Date, and Notes.
- **Transaction History**:
  - Interactive table displaying all transactions.
  - Search by transaction title or notes.
  - Real-time multi-criteria filtering by Category, Type (Income/Expense), and Date.
  - Confirmation modals for editing and deleting records.
- **Monthly Budget Control**:
  - Set custom target monthly budget.
  - Real-time remaining balance calculations (`Remaining Budget = Monthly Budget - Monthly Expenses`).
  - Automatic warning banners when budget usage exceeds 80% or 100%.
- **Spending Analysis**:
  - Dynamic SVG Donut Chart representing category spending share.
  - Visual category breakdown progress bars.
  - Payment method usage distribution (Cash, UPI, Card, Bank Transfer).
- **Data Export & Privacy**:
  - One-click **Export to CSV** for offline spreadsheets.
  - **Clear All Data** feature with confirmation safety check.
- **User Authentication & Email OTP Verification**:
  - Secure Student Sign In and Registration system.
  - Email verification with automated 6-digit OTP code generation and simulated delivery inbox banner.
  - 60-second OTP resend countdown timer.
  - Student profile badge with avatar and safe Logout functionality.
  - Persistent login session management using `localStorage`.
- **User Preference**:
  - Toggleable **Light and Dark Modes** saved to `localStorage`.

---

## 7. Hardware Requirements
- **Processor**: Intel Core i3 or equivalent (1.5 GHz or higher).
- **RAM**: 2 GB RAM minimum (4 GB recommended).
- **Hard Disk**: 10 MB free space.
- **Display Resolution**: 320px minimum screen width (Fully Mobile Responsive up to 4K Displays).

---

## 8. Software Requirements
- **Operating System**: Windows 7/10/11, macOS, Linux, Android, or iOS.
- **Web Browser**: Any modern web browser supporting HTML5 and Web Storage API:
  - Google Chrome (v60+)
  - Mozilla Firefox (v55+)
  - Microsoft Edge (v79+)
  - Apple Safari (v11+)
- **Code Editor** (for development/review): Visual Studio Code, Notepad++, or any text editor.

---

## 9. Project Workflow
```
                  [ User Opens index.html ]
                              │
               [ Load script.js & Initial Data ]
                              │
                [ Read from browser localStorage ]
                              │
     ┌────────────────────────┴────────────────────────┐
[ Found Stored Data ]                       [ No Stored Data ]
     │                                               │
[ Parse JSON Data ]                       [ Load Sample Demo Data ]
     │                                               │
     └────────────────────────┬────────────────────────┘
                              │
                 [ Calculate Financial Totals ]
       • Total Income = Sum(Income)
       • Total Expense = Sum(Expense)
       • Available Balance = Income - Expense
       • Remaining Budget = Budget - Monthly Expense
                              │
                 [ Render UI Dashboard Views ]
       • Summary Cards      • Recent Transactions
       • Budget Progress    • Spending Donut Chart
                              │
          ┌───────────────────┴───────────────────┐
  [ Add/Edit Transaction ]                  [ Change Budget / Theme ]
          │                                       │
  [ Form Validation ]                             │
          │                                       │
  [ Save to localStorage ]                        │
          │                                       │
          └───────────────────┬───────────────────┘
                              │
               [ Dynamic Re-calculation & UI Refresh ]
```

---

## 10. LocalStorage Explanation
Browser `localStorage` is used to persist data across browser sessions without backend servers. Data is stored as key-value pairs where values are JSON strings.

### Keys Used in SpendWise:
1. `spendwise_transactions`: Stores the array of transaction objects.
   - Example structure:
     ```json
     [
       {
         "id": "tx-1710000000000",
         "type": "Expense",
         "title": "Web Tech Textbooks",
         "amount": 800,
         "category": "Education",
         "date": "2026-10-09",
         "paymentMethod": "Card",
         "notes": "Reference book"
       }
     ]
     ```
2. `spendwise_monthly_budget`: Stores the numeric budget value (e.g. `5000`).
3. `spendwise_theme_preference`: Stores the string `'light'` or `'dark'`.

### Methods Implemented:
- `localStorage.setItem(key, JSON.stringify(data))` - Saves serializable data.
- `JSON.parse(localStorage.getItem(key))` - Retrieves and parses stored data back to JavaScript objects.
- `localStorage.removeItem(key)` - Clears specific application records upon reset.

---

## 11. How to Run the Project
1. **Download / Extract Project Folder**:
   Ensure all project files are located in the `SpendWise/` directory:
   ```
   SpendWise/
   ├── index.html
   ├── style.css
   ├── script.js
   └── README.md
   ```
2. **Launch Application**:
   - Double-click `index.html` to open it directly in your default web browser (Chrome, Firefox, Edge, Safari).
   - Alternatively, right-click `index.html` -> **Open With** -> Select your web browser.
3. **Usage**:
   - View initial demo sample data on the **Dashboard**.
   - Use **Add Transaction** tab to log new incomes/expenses.
   - Go to **Monthly Budget** to change your monthly budget limit.
   - Check **Spending Analysis** for visual category breakdowns.
   - Toggle Theme using the Sun/Moon button in the top right header.

---

## 12. Future Scope
- **Custom Categories**: Allow users to define custom expense categories beyond the default 6.
- **Recurring Transactions**: Support automated monthly recurring expenses (such as rent or subscription fees).
- **Multi-Currency Support**: Support currency selection (USD, EUR, GBP, INR).
- **PWA (Progressive Web App)**: Add Service Workers and Manifest files to enable installation as a native desktop/mobile application offline.
