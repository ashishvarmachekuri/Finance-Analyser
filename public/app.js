/* =========================================================
   PERSONAL FINANCE APPLICATION
   Frontend JavaScript
========================================================= */


/* =========================================================
   GLOBAL DATA
========================================================= */
// Firebase-authenticated requests to the Express backend.

const API_BASE_URL = window.location.hostname === "localhost"
    || window.location.hostname === "127.0.0.1"
    ? ""
    : "https://finance-analyser-trqo.onrender.com";

async function apiFetch(url, options = {}) {
    if (!url.startsWith("/api/")) {
        throw new Error("apiFetch can only call /api/ endpoints.");
    }

    if (!window.financeAuth) {
        throw new Error("Authentication is still initializing. Please try again.");
    }

    const token = await window.financeAuth.getToken();

    const headers = new Headers(options.headers || {});
    headers.set("Authorization", `Bearer ${token}`);

    if (options.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    return fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers
    });
}


  
let allTransactions = [];
let isSavingTransaction = false;
let currentPage = "add";
// Chart.js instances
let categoryChartInstance = null;
let monthlyChartInstance = null;
let incomeExpenseChartInstance = null;

const chartColors = [
    "#4776e6",
    "#36a47b",
    "#f3a641",
    "#8b6bd6",
    "#e56b6f",
    "#4ba6b8",
    "#8795a1",
    "#d47eae",
    "#b0a16b",
    "#6574cd"
];


/* =========================================================
   PAGE CONFIGURATION
========================================================= */

const pageConfig = {

    add: {
        title: "Add Transaction",
        element: "addPage"
    },

    transactions: {
        title: "Transactions",
        element: "transactionsPage"
    },

    analytics: {
        title: "Financial Analytics",
        element: "analyticsPage"
    },

    summary: {
        title: "Spending Summary",
        element: "summaryPage"
    }

};


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    // firebase-auth.js dispatches finance-auth-state after checking the session.
    // Do not initialize the dashboard here.
});


/* =========================================================
   INITIALIZE APPLICATION
========================================================= */

function initializeApplication() {
    setDefaultDate();
    setupNavigation();
    setupTransactionForm();
    setupTransactionFilters();
    setupAnalyticsRefresh();
    setupSummaryButton();

    // Load user-specific data after Firebase has authenticated the user.
    loadTransactions();
}

// Avoid initializing the dashboard before Firebase resolves sign-in state.

let appInitialized = false;

window.addEventListener("finance-auth-state", async (event) => {
    const user = event.detail?.user;

    if (user) {
        if (!appInitialized) {
            // Register event handlers only once per page load.
            appInitialized = true;
            initializeApplication();
        } else {
            // Re-login: reload data without registering handlers again.
            await loadTransactions();
            updateAddPageStats();
        }
    } else {
        // Keep appInitialized true so handlers are not registered again.
        allTransactions = [];

        renderTransactions();
        updateAddPageStats();
    }
});

/* =========================================================
   SET DEFAULT DATE
========================================================= */

function setDefaultDate() {

    const dateInput =
        document.getElementById("date");

    if (!dateInput) {
        return;
    }

    const today =
        new Date();

    const year =
        today.getFullYear();

    const month =
        String(
            today.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            today.getDate()
        ).padStart(2, "0");

    dateInput.value =
        `${year}-${month}-${day}`;

}


/* =========================================================
   NAVIGATION
========================================================= */

function setupNavigation() {

    const navItems =
        document.querySelectorAll(
            ".nav-item"
        );


    navItems.forEach(
        (button) => {

            button.addEventListener(
                "click",
                () => {

                    const page =
                        button.dataset.page;

                    if (!page) {
                        return;
                    }

                    navigateToPage(page);

                }
            );

        }
    );

}


/* =========================================================
   NAVIGATE TO PAGE
========================================================= */

function navigateToPage(page) {

    if (!pageConfig[page]) {

        console.error(
            "Unknown page:",
            page
        );

        return;

    }


    currentPage =
        page;


    /* -----------------------------------------
       Hide all pages
    ----------------------------------------- */

    const pages =
        document.querySelectorAll(
            ".page-section"
        );


    pages.forEach(
        (section) => {

            section.classList.remove(
                "active"
            );

        }
    );


    /* -----------------------------------------
       Show selected page
    ----------------------------------------- */

    const selectedPage =
        document.getElementById(
            pageConfig[page].element
        );


    if (selectedPage) {

        selectedPage.classList.add(
            "active"
        );

    }


    /* -----------------------------------------
       Update sidebar
    ----------------------------------------- */

    const navItems =
        document.querySelectorAll(
            ".nav-item"
        );


    navItems.forEach(
        (button) => {

            button.classList.remove(
                "active"
            );


            if (
                button.dataset.page ===
                page
            ) {

                button.classList.add(
                    "active"
                );

            }

        }
    );


    /* -----------------------------------------
       Update topbar title
    ----------------------------------------- */

    const pageTitle =
        document.getElementById(
            "pageTitle"
        );


    if (pageTitle) {

        pageTitle.textContent =
            pageConfig[page].title;

    }


    /* -----------------------------------------
       Load page-specific data
    ----------------------------------------- */

    if (page === "add") {

        updateAddPageStats();

    }


    if (page === "transactions") {

        renderTransactions();

    }


    if (page === "analytics") {

        loadAnalytics();

    }


    if (page === "summary") {

        resetSummaryPage();

    }


    /* -----------------------------------------
       Scroll to top
    ----------------------------------------- */

    window.scrollTo(
        {
            top: 0,
            behavior: "smooth"
        }
    );

}


/* =========================================================
   TRANSACTION FORM
========================================================= */

function setupTransactionForm() {

    const form =
        document.getElementById(
            "transactionForm"
        );


    if (!form) {
        return;
    }


    form.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            await addTransaction();

        }
    );

}


/* =========================================================
   ADD TRANSACTION
========================================================= */

async function addTransaction() {
if (isSavingTransaction) return;
    const description =
        document
            .getElementById("description")
            .value
            .trim();


    const amount =
        Number(
            document
                .getElementById("amount")
                .value
        );


    const type =
        document
            .getElementById("type")
            .value;


    const date =
        document
            .getElementById("date")
            .value;


    const message =
        document.getElementById(
            "transactionMessage"
        );


    /* -----------------------------------------
       Validation
    ----------------------------------------- */

    if (!description) {

        showFormMessage(
            "Please enter a transaction description.",
            true
        );

        return;

    }


    if (
        !amount ||
        amount <= 0
    ) {

        showFormMessage(
            "Please enter a valid amount.",
            true
        );

        return;

    }


    if (!date) {

        showFormMessage(
            "Please select a date.",
            true
        );

        return;

    }


    /* -----------------------------------------
       Disable button
    ----------------------------------------- */

    const button =
        document.querySelector(
            "#transactionForm .primary-button"
        );


    if (button) {

        button.disabled =
            true;

        button.querySelector(
            "span:first-child"
        ).textContent =
            "Saving...";

    }

isSavingTransaction = true;
    try {

        const response = await apiFetch(
    "/api/transactions",
    {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            description,
            amount,
            type,
            date
        })
    }
);


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Failed to save transaction."
            );

        }


        /* -----------------------------------------
           Success
        ----------------------------------------- */

        showFormMessage(
            `Transaction saved as ${data.category}. Categorized using ${data.categorizationMethod}.`,
            false
        );


        /* Clear description and amount */

        document.getElementById(
            "description"
        ).value = "";


        document.getElementById(
            "amount"
        ).value = "";


        /* Reload transactions */

        await loadTransactions();


        /* Update stats */

        updateAddPageStats();


    } catch (error) {

        console.error(
            "Add transaction error:",
            error
        );


        showFormMessage(
            error.message ||
            "Unable to save transaction.",
            true
        );

    } finally {
isSavingTransaction = false;
        if (button) {

            button.disabled =
                false;

            button.querySelector(
                "span:first-child"
            ).textContent =
                "Add Transaction";

        }

    }

}


/* =========================================================
   FORM MESSAGE
========================================================= */

function showFormMessage(
    message,
    isError = false
) {

    const element =
        document.getElementById(
            "transactionMessage"
        );


    if (!element) {
        return;
    }


    element.textContent =
        message;


    element.style.color =
        isError
            ? "#b42318"
            : "#15803d";

}


/* =========================================================
   LOAD TRANSACTIONS
========================================================= */

async function loadTransactions() {

    try {

        const response = await apiFetch("/api/transactions");


        if (!response.ok) {

            throw new Error(
                "Failed to load transactions."
            );

        }


        const data =
            await response.json();


        allTransactions =
            Array.isArray(data)
                ? data
                : [];


        renderTransactions();

        updateAddPageStats();


    } catch (error) {

        console.error(
            "Load transactions error:",
            error
        );

    }

}


/* =========================================================
   TRANSACTION FILTERS
========================================================= */

function setupTransactionFilters() {

    const search =
        document.getElementById(
            "searchInput"
        );


    const category =
        document.getElementById(
            "categoryFilter"
        );


    const type =
        document.getElementById(
            "typeFilter"
        );


    if (search) {

        search.addEventListener(
            "input",
            renderTransactions
        );

    }


    if (category) {

        category.addEventListener(
            "change",
            renderTransactions
        );

    }


    if (type) {

        type.addEventListener(
            "change",
            renderTransactions
        );

    }

}


/* =========================================================
   FILTER TRANSACTIONS
========================================================= */

function getFilteredTransactions() {

    const search =
        document
            .getElementById(
                "searchInput"
            )
            ?.value
            .toLowerCase()
            .trim() || "";


    const category =
        document
            .getElementById(
                "categoryFilter"
            )
            ?.value || "";


    const type =
        document
            .getElementById(
                "typeFilter"
            )
            ?.value || "";


    return allTransactions.filter(
        (transaction) => {

            const matchesSearch =
                !search ||
                String(
                    transaction.description || ""
                )
                    .toLowerCase()
                    .includes(search);


            const matchesCategory =
                !category ||
                transaction.category === category;


            const matchesType =
                !type ||
                transaction.type === type;


            return (
                matchesSearch &&
                matchesCategory &&
                matchesType
            );

        }
    );

}


/* =========================================================
   RENDER TRANSACTIONS
========================================================= */

function renderTransactions() {

    const tbody =
        document.getElementById(
            "transactionsBody"
        );


    const emptyState =
        document.getElementById(
            "emptyTransactions"
        );


    if (!tbody) {
        return;
    }


    const transactions =
        getFilteredTransactions();


    tbody.innerHTML = "";


    /* -----------------------------------------
       Update count
    ----------------------------------------- */

    const count =
        document.getElementById(
            "transactionCount"
        );


    if (count) {

        count.textContent =
            `${transactions.length} ${
                transactions.length === 1
                    ? "transaction"
                    : "transactions"
            }`;

    }


    /* -----------------------------------------
       Empty state
    ----------------------------------------- */

    if (
        transactions.length === 0
    ) {

        if (emptyState) {

            emptyState.style.display =
                "block";

        }

        return;

    }


    if (emptyState) {

        emptyState.style.display =
            "none";

    }


    /* -----------------------------------------
       Render rows
    ----------------------------------------- */

    transactions.forEach(
        (transaction) => {

            const row =
                document.createElement(
                    "tr"
                );


            const date =
                formatDate(
                    transaction.date
                );


            const amount =
                Number(
                    transaction.amount || 0
                );


            const amountText =
                formatCurrency(
                    amount
                );


            const type =
                transaction.type ||
                "expense";


            const category =
                transaction.category ||
                "Other";


            const method =
                transaction.categorizationMethod ||
                "Rule-Based";


            row.innerHTML = `

                <td>
                    ${escapeHTML(date)}
                </td>


                <td>
                    <strong>
                        ${escapeHTML(
                            transaction.description ||
                            ""
                        )}
                    </strong>
                </td>


                <td>

                    <span
                        class="type-badge ${type}"
                    >
                        ${
                            type === "income"
                                ? "Income"
                                : "Expense"
                        }
                    </span>

                </td>


                <td>

                    <span
                        class="category-badge"
                    >
                        ${escapeHTML(category)}
                    </span>

                </td>


                <td>

                    <span
                        class="${
                            type === "income"
                                ? "amount-income"
                                : "amount-expense"
                        }"
                    >
                        ${
                            type === "income"
                                ? "+"
                                : "-"
                        }${amountText}
                    </span>

                </td>


                <td>

                    <span
                        class="method-badge"
                    >
                        ${escapeHTML(method)}
                    </span>

                </td>


                <td>

                    <button
                        class="delete-button"
                        type="button"
                        onclick="deleteTransaction('${transaction._id}')"
                    >
                        Delete
                    </button>

                </td>

            `;


            tbody.appendChild(
                row
            );

        }
    );

}


/* =========================================================
   DELETE TRANSACTION
========================================================= */

async function deleteTransaction(
    id
) {

    if (!id) {
        return;
    }


    const confirmed =
        window.confirm(
            "Are you sure you want to delete this transaction?"
        );


    if (!confirmed) {
        return;
    }


    try {

        const response = await apiFetch(
    `/api/transactions/${id}`,
    {
        method: "DELETE"
    }
);


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Failed to delete transaction."
            );

        }


        await loadTransactions();


        /* Refresh current page */

        if (
            currentPage ===
            "analytics"
        ) {

            await loadAnalytics();

        }


    } catch (error) {

        console.error(
            "Delete transaction error:",
            error
        );


        alert(
            error.message ||
            "Unable to delete transaction."
        );

    }

}


/* =========================================================
   ADD PAGE STATISTICS
========================================================= */

function updateAddPageStats() {

    let income = 0;

    let expenses = 0;


    allTransactions.forEach(
        (transaction) => {

            const amount =
                Number(
                    transaction.amount || 0
                );


            if (
                transaction.type ===
                "income"
            ) {

                income += amount;

            } else {

                expenses += amount;

            }

        }
    );


    const balance =
        income - expenses;


    const incomeElement =
        document.getElementById(
            "addTotalIncome"
        );


    const expenseElement =
        document.getElementById(
            "addTotalExpenses"
        );


    const balanceElement =
        document.getElementById(
            "addBalance"
        );


    if (incomeElement) {

        incomeElement.textContent =
            formatCurrency(income);

    }


    if (expenseElement) {

        expenseElement.textContent =
            formatCurrency(expenses);

    }


    if (balanceElement) {

        balanceElement.textContent =
            formatCurrency(balance);

        balanceElement.style.color =
            balance < 0
                ? "#dc2626"
                : "#172033";

    }

}


/* =========================================================
   ANALYTICS
========================================================= */

function setupAnalyticsRefresh() {

    const button =
        document.getElementById(
            "refreshAnalytics"
        );


    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        async () => {

            await loadAnalytics();

        }
    );

}


/* =========================================================
   LOAD ANALYTICS
========================================================= */

async function loadAnalytics() {

    try {

        const response = await apiFetch("/api/analytics");


        if (!response.ok) {

            throw new Error(
                "Failed to load analytics."
            );

        }


        const analytics =
            await response.json();


        renderAnalytics(
            analytics
        );


    } catch (error) {

        console.error(
            "Analytics error:",
            error
        );

    }

}


/* =========================================================
   RENDER ANALYTICS
========================================================= */

function renderAnalytics(analytics) {
    if (!analytics) return;

    const income = Number(analytics.totalIncome || 0);
    const expenses = Number(analytics.totalExpense || 0);
    const balance = Number(
        analytics.balance ?? income - expenses
    );

    setText("analyticsIncome", formatCurrency(income));
    setText("analyticsExpenses", formatCurrency(expenses));
    setText("analyticsBalance", formatCurrency(balance));

    const unusual = analytics.unusualTransactions || [];

    setText("analyticsUnusual", String(unusual.length));

    renderCategories(analytics.categoryTotals || {});
    renderMonthly(analytics.monthlyTotals || {});
    renderIncomeExpenseChart(income, expenses);
    renderUnusual(unusual);
}


/* =========================================================
   CATEGORY RENDERING
========================================================= */

function renderCategories(categoryTotals) {
    const canvas = document.getElementById("categoryChart");
    const container = document.getElementById("categoryList");

    const categories = Object.entries(categoryTotals || {})
        .map(([name, amount]) => [name, Number(amount) || 0])
        .filter(([, amount]) => amount > 0)
        .sort((a, b) => b[1] - a[1]);

    if (categoryChartInstance) {
        categoryChartInstance.destroy();
        categoryChartInstance = null;
    }

    if (container) container.innerHTML = "";

    if (!categories.length) {
        if (container) {
            container.innerHTML =
                '<div class="no-data">No expense data available yet.</div>';
        }
        return;
    }

    if (!canvas || typeof Chart === "undefined") {
        if (container) {
            container.textContent = categories
                .map(([name, amount]) =>
                    `${name}: ${formatCurrency(amount)}`
                )
                .join(" | ");
        }
        return;
    }

    categoryChartInstance = new Chart(canvas, {
        type: "doughnut",
        data: {
            labels: categories.map(([name]) => name),
            datasets: [{
                data: categories.map(([, amount]) => amount),
                backgroundColor: categories.map(
                    (_, i) => chartColors[i % chartColors.length]
                ),
                borderWidth: 2,
                borderColor: "#ffffff",
                hoverOffset: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "65%",
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label(context) {
                            return `${context.label}: ${formatCurrency(context.raw)}`;
                        }
                    }
                }
            }
        }
    });

    const total = categories.reduce(
        (sum, [, amount]) => sum + amount, 0
    );

    if (container) {
        categories.forEach(([name, amount], i) => {
            const item = document.createElement("div");
            item.className = "chart-legend-item";

            const label = document.createElement("div");
            label.className = "legend-label";

            const dot = document.createElement("span");
            dot.className = "legend-dot";
            dot.style.backgroundColor =
                chartColors[i % chartColors.length];

            const nameElement = document.createElement("span");
            nameElement.textContent = name;

            label.append(dot, nameElement);

            const value = document.createElement("span");
            value.className = "legend-value";
            value.textContent =
                `${formatCurrency(amount)} (${((amount / total) * 100).toFixed(1)}%)`;

            item.append(label, value);
            container.appendChild(item);
        });
    }
}


/* =========================================================
   MONTHLY RENDERING
========================================================= */

function renderMonthly(monthlyTotals) {
    const canvas = document.getElementById("monthlyChart");
    const empty = document.getElementById("monthlyEmpty");
    const container = document.getElementById("monthlyList");

    const months = Object.entries(monthlyTotals || {})
        .map(([month, amount]) => [month, Number(amount) || 0])
        .sort((a, b) => a[0].localeCompare(b[0]));

    if (monthlyChartInstance) {
        monthlyChartInstance.destroy();
        monthlyChartInstance = null;
    }

    if (container) container.innerHTML = "";

    if (!months.length) {
        if (empty) empty.style.display = "block";
        return;
    }

    if (empty) empty.style.display = "none";

    if (!canvas || typeof Chart === "undefined") {
        if (container) {
            container.textContent = months
                .map(([month, amount]) =>
                    `${formatMonth(month)}: ${formatCurrency(amount)}`
                )
                .join(" | ");
        }
        return;
    }

    monthlyChartInstance = new Chart(canvas, {
        type: "bar",
        data: {
            labels: months.map(([month]) => formatMonth(month)),
            datasets: [{
                label: "Monthly Expenses",
                data: months.map(([, amount]) => amount),
                backgroundColor: "#4776e6",
                borderRadius: 6,
                borderSkipped: false,
                maxBarThickness: 45
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label(context) {
                            return formatCurrency(context.raw);
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    border: { display: false }
                },
                y: {
                    beginAtZero: true,
                    border: { display: false },
                    ticks: {
                        callback(value) {
                            return "₹" + Number(value).toLocaleString("en-IN");
                        }
                    }
                }
            }
        }
    });
}
function renderIncomeExpenseChart(income, expenses) {
    const canvas = document.getElementById("incomeExpenseChart");
    const empty = document.getElementById("comparisonEmpty");

    if (incomeExpenseChartInstance) {
        incomeExpenseChartInstance.destroy();
        incomeExpenseChartInstance = null;
    }

    if (Number(income) === 0 && Number(expenses) === 0) {
        if (empty) empty.style.display = "block";
        return;
    }

    if (empty) empty.style.display = "none";

    if (!canvas || typeof Chart === "undefined") return;

    incomeExpenseChartInstance = new Chart(canvas, {
        type: "bar",
        data: {
            labels: ["Financial Overview"],
            datasets: [
                {
                    label: "Income",
                    data: [income],
                    backgroundColor: "#36a47b",
                    borderRadius: 5
                },
                {
                    label: "Expenses",
                    data: [expenses],
                    backgroundColor: "#e56b6f",
                    borderRadius: 5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: "top"
                },
                tooltip: {
                    callbacks: {
                        label(context) {
                            return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
                        }
                    }
                }
            },
            scales: {
                x: { grid: { display: false } },
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback(value) {
                            return "₹" + Number(value).toLocaleString("en-IN");
                        }
                    }
                }
            }
        }
    });
}


/* =========================================================
   UNUSUAL TRANSACTIONS
========================================================= */

function renderUnusual(
    transactions
) {

    const container =
        document.getElementById(
            "unusualList"
        );


    if (!container) {
        return;
    }


    container.innerHTML = "";


    if (
        !transactions ||
        transactions.length === 0
    ) {

        container.innerHTML = `

            <div class="no-unusual">

                <div class="no-unusual-icon">
                    ✓
                </div>

                <strong>
                    No unusual transactions detected
                </strong>

                <p>
                    Your current spending does not contain
                    unusually large transactions.
                </p>

            </div>

        `;

        return;

    }


    transactions.forEach(
        (transaction) => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "unusual-item";


            item.innerHTML = `

                <div>

                    <div class="unusual-description">
                        ${escapeHTML(
                            transaction.description ||
                            "Transaction"
                        )}
                    </div>

                    <div class="unusual-details">

                        ${escapeHTML(
                            transaction.category ||
                            "Other"
                        )}

                        ·

                        ${formatDate(
                            transaction.date
                        )}

                    </div>

                </div>


                <div class="unusual-amount">

                    ${formatCurrency(
                        Number(
                            transaction.amount || 0
                        )
                    )}

                </div>

            `;


            container.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   SUMMARY BUTTON
========================================================= */

function setupSummaryButton() {

    const button =
        document.getElementById(
            "generateSummaryBtn"
        );


    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        generateSummary
    );

}


/* =========================================================
   RESET SUMMARY PAGE
========================================================= */

function resetSummaryPage() {

    const result =
        document.getElementById(
            "summaryResult"
        );


    if (!result) {
        return;
    }


    /*
       We deliberately DO NOT call Gemini here.

       The user must click
       "Generate Summary".
    */


    if (
        result.dataset.generated ===
        "true"
    ) {

        return;

    }


    result.innerHTML = `

        <div class="summary-placeholder">

            <div class="placeholder-icon">
                ✦
            </div>

            <h3>
                Ready when you are
            </h3>

            <p>
                Click "Generate Summary" to analyze
                your recorded financial data.
            </p>

        </div>

    `;

}


/* =========================================================
   GENERATE SUMMARY
========================================================= */

async function generateSummary() {

    const button =
        document.getElementById(
            "generateSummaryBtn"
        );


    const result =
        document.getElementById(
            "summaryResult"
        );


    if (!button || !result) {
        return;
    }


    /* -----------------------------------------
       Disable button
    ----------------------------------------- */

    button.disabled =
        true;

    button.textContent =
        "Generating...";


    result.innerHTML = `

        <div class="loading">

            <span class="loading-dot"></span>

            Generating spending summary...

        </div>

    `;


    try {

        const response = await apiFetch("/api/summary");


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Unable to generate summary."
            );

        }


        const summary =
    data.summary ||
    data.message ||
    "No summary was generated.";

result.dataset.generated = "true";

result.innerHTML = `
    <div class="summary-text">
        ${renderSummaryMarkdown(summary)}
    </div>
`;


    } catch (error) {

        console.error(
            "Summary error:",
            error
        );


        result.innerHTML = `

            <div class="error-message">

                Unable to generate the summary.

                <br><br>

                ${escapeHTML(
                    error.message ||
                    "Please try again later."
                )}

            </div>

        `;

    } finally {

        button.disabled =
            false;

        button.textContent =
            "Generate Summary";

    }

}


/* =========================================================
   HELPER FUNCTIONS
========================================================= */


/* -----------------------------------------
   Set text
----------------------------------------- */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (element) {

        element.textContent =
            value;

    }

}


/* -----------------------------------------
   Currency
----------------------------------------- */

function formatCurrency(
    amount
) {

    const numericAmount =
        Number(amount) || 0;


    return numericAmount.toLocaleString(
        "en-IN",
        {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );

}


/* -----------------------------------------
   Date
----------------------------------------- */

function formatDate(
    value
) {

    if (!value) {
        return "-";
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(value);

    }


    return date.toLocaleDateString(
        "en-IN",
        {
            day: "numeric",
            month: "numeric",
            year: "numeric"
        }
    );

}


/* -----------------------------------------
   Month
----------------------------------------- */

function formatMonth(
    value
) {

    if (!value) {
        return "";
    }


    const parts =
        String(value).split("-");


    if (
        parts.length !== 2
    ) {

        return value;

    }


    const year =
        Number(parts[0]);


    const month =
        Number(parts[1]);


    if (
        !year ||
        !month
    ) {

        return value;

    }


    const date =
        new Date(
            year,
            month - 1,
            1
        );


    return date.toLocaleDateString(
        "en-IN",
        {
            month: "short",
            year: "numeric"
        }
    );

}


/* -----------------------------------------
   Escape HTML
----------------------------------------- */

function escapeHTML(
    value
) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


function renderSummaryMarkdown(markdown) {
    const lines = String(markdown || "").split(/\r?\n/);
    const output = [];
    let inList = false;
    let listType = "";
    let sectionNumber = 0;

    function closeList() {
        if (inList) {
            output.push(listType === "ol" ? "</ol>" : "</ul>");
            inList = false;
            listType = "";
        }
    }

    function formatInline(text) {
        return escapeHTML(text)
            .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
            .replace(/__(.+?)__/g, "<strong>$1</strong>")
            .replace(/\*(.+?)\*/g, "<em>$1</em>")
            .replace(/_(.+?)_/g, "<em>$1</em>");
    }

    for (const rawLine of lines) {
        const line = rawLine.trim();

        if (!line) {
            closeList();
            continue;
        }

        // Treat numbered section headings separately from list items.
        const numbered = line.match(/^\d+\.\s+(.+)$/);
        const bulleted = line.match(/^[-*]\s+(.+)$/);

        if (numbered) {
            closeList();
            sectionNumber++;

            output.push(
                `<p class="summary-section-heading">` +
                `<strong>${sectionNumber}. ${formatInline(numbered[1])}</strong>` +
                `</p>`
            );
            continue;
        }

        if (bulleted) {
            if (!inList || listType !== "ul") {
                closeList();
                output.push("<ul>");
                inList = true;
                listType = "ul";
            }

            output.push(`<li>${formatInline(bulleted[1])}</li>`);
            continue;
        }

        closeList();

        const heading = line.match(/^#{1,3}\s+(.+)$/);

        if (heading) {
            output.push(`<h3>${formatInline(heading[1])}</h3>`);
        } else {
            output.push(`<p>${formatInline(line)}</p>`);
        }
    }

    closeList();
    return output.join("\n");
}



/* =========================================================
   MAKE DELETE FUNCTION AVAILABLE TO HTML
========================================================= */

window.deleteTransaction =
    deleteTransaction;