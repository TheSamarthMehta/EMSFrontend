export type TourStep = {
  target: string;
  title: string;
  body: string;
};

export const TOUR_CONFIG: Record<string, TourStep[]> = {
  global: [
    {
      target: 'aside[aria-label="Navigation"]',
      title: "Your navigation hub",
      body: "Every section of the app lives here. Jump between Dashboard, Expenses, Categories, Reports, and Settings at any time.",
    },
    {
      target: ".summary-cards",
      title: "Spending at a glance",
      body: "These cards show your total expenses, monthly spend, and remaining budget — updated in real time.",
    },
    {
      target: "#add-expense-btn",
      title: "Log an expense",
      body: "Tap here whenever you spend. Fill in amount, category, date, and an optional note.",
    },
    {
      target: ".recent-expenses",
      title: "Your latest transactions",
      body: "The five most recent expenses appear here. Click any row to edit or delete it.",
    },
    {
      target: 'a[href="/reports"]',
      title: "Understand your patterns",
      body: "Reports break down your spending by category and time range so you can spot trends and cut costs.",
    },
  ],
  "/dashboard": [
    {
      target: ".date-range-picker",
      title: "Filter by date",
      body: "Switch between This Week, This Month, and custom ranges to see spending for any period.",
    },
    {
      target: ".category-breakdown-chart",
      title: "Category breakdown",
      body: "The donut chart shows which categories eat most of your budget. Click a slice to drill down.",
    },
    {
      target: ".budget-progress-bar",
      title: "Budget progress",
      body: "The bar fills as you spend. It turns amber at 80 % and red when you exceed the budget.",
    },
    {
      target: ".export-btn",
      title: "Export your data",
      body: "Download a CSV or PDF of all expenses shown in the current date range.",
    },
  ],
  "/add-expense": [
    { target: "#amount-field", title: "Enter the amount", body: "Type the exact amount spent. Use your local currency — the app stores it as-is." },
    { target: "#category-select", title: "Pick a category", body: "Assign the expense to a category like Food, Transport, or Utilities. You can add custom categories in Settings." },
    { target: "#date-picker", title: "Set the date", body: "Defaults to today. Change it if you are logging a past expense." },
    { target: "#note-field", title: "Add a note (optional)", body: "Jot down what the expense was for — great for reviewing later." },
    { target: "#receipt-upload", title: "Attach a receipt", body: "Upload a photo or PDF of your receipt for record-keeping." },
    { target: "#submit-expense-btn", title: "Save the expense", body: "Tap Save to record the expense. It appears instantly in your Dashboard and Expense List." },
  ],
  "/expenses": [
    { target: ".search-bar", title: "Search expenses", body: "Type a keyword, amount, or category to filter the list instantly." },
    { target: ".filter-panel", title: "Advanced filters", body: "Narrow results by category, date range, or amount range. Filters stack — combine as many as you need." },
    { target: ".sort-controls", title: "Sort the list", body: "Sort by date, amount, or category ascending or descending." },
    { target: ".expense-row", title: "Tap a row to edit", body: "Click any expense to open a drawer where you can update or delete it." },
    { target: ".bulk-select-checkbox", title: "Bulk actions", body: "Select multiple expenses to delete or export them all at once." },
  ],
  "/categories": [
    { target: ".category-list", title: "Your categories", body: "All built-in and custom categories live here. Each shows total spend this month." },
    { target: "#add-category-btn", title: "Create a category", body: "Give it a name, pick an icon, and assign a monthly budget limit — optional but useful." },
    { target: ".category-budget-bar", title: "Category budget", body: "The bar shows how much of the category's monthly budget you have used." },
  ],
  "/budget": [
    { target: ".category-list", title: "Your categories", body: "All built-in and custom categories live here. Each shows total spend this month." },
    { target: "#add-category-btn", title: "Create a category", body: "Give it a name, pick an icon, and assign a monthly budget limit — optional but useful." },
    { target: ".category-budget-bar", title: "Category budget", body: "The bar shows how much of the category's monthly budget you have used." },
  ],
  "/reports": [
    { target: ".report-type-tabs", title: "Report types", body: "Switch between Monthly Summary, Category Analysis, and Trend View." },
    { target: ".time-range-selector", title: "Choose a period", body: "Compare any month, quarter, or custom range. Results update instantly." },
    { target: ".chart-area", title: "Interactive chart", body: "Hover data points for exact figures. Click legend items to show or hide categories." },
    { target: ".insights-panel", title: "Automated insights", body: "The app flags your top spending category, biggest single expense, and month-over-month change." },
  ],
  "/groups": [
    {
      target: "main",
      title: "Shared groups",
      body: "Create a group for trips, roommates, or events. Invite members, split expenses, and settle balances from one place.",
    },
  ],
  "/group-detail": [
    {
      target: "main",
      title: "This group workspace",
      body: "Switch tabs for overview, expenses, balances, activity, and analytics. Add expenses and settlements so everyone stays even.",
    },
  ],
  "/settings": [
    { target: ".currency-selector", title: "Set your currency", body: "Choose your local currency. All existing amounts are re-labelled (not converted)." },
    { target: ".budget-limit-input", title: "Monthly budget", body: "Set an overall monthly spending limit. The dashboard progress bar tracks against this." },
    { target: ".notification-toggles", title: "Notifications", body: "Get alerts when you hit 80 % of your budget or log an unusually large expense." },
    { target: ".data-export-section", title: "Export all data", body: "Download everything as CSV or JSON for backup or migration." },
    { target: ".reset-data-btn", title: "Reset data", body: "Permanently deletes all expenses and settings. This cannot be undone." },
  ],
};

