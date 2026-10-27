
function round(value) {
    return Math.round(value * 100) / 100;
}

function median(values) {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
        return (sorted[middle - 1] + sorted[middle]) / 2;
    }

    return sorted[middle];
}

function calculateAnalytics(transactions) {

    // Separate income and expenses.
    const expenses = transactions.filter(
        transaction => transaction.type === "expense"
    );

    const incomes = transactions.filter(
        transaction => transaction.type === "income"
    );

    // Total income.
    const totalIncome = incomes.reduce(
        (sum, transaction) => sum + Number(transaction.amount),
        0
    );

    // Total expenses.
    const totalExpense = expenses.reduce(
        (sum, transaction) => sum + Number(transaction.amount),
        0
    );

    // Balance.
    const balance = totalIncome - totalExpense;

    // Category-wise spending.
    const categoryTotals = {};

    for (const transaction of expenses) {
        const category = transaction.category || "Other";
        const amount = Number(transaction.amount);

        if (!Number.isFinite(amount)) continue;

        if (!categoryTotals[category]) {
            categoryTotals[category] = 0;
        }

        categoryTotals[category] += amount;
    }

    // Monthly spending.
    const monthlyTotals = {};

    for (const transaction of expenses) {
        const date = new Date(transaction.date);
        const amount = Number(transaction.amount);

        if (Number.isNaN(date.getTime()) ||
            !Number.isFinite(amount)) {
            continue;
        }

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const monthKey = `${year}-${month}`;

        if (!monthlyTotals[monthKey]) {
            monthlyTotals[monthKey] = 0;
        }

        monthlyTotals[monthKey] += amount;
    }

    /*
     * CATEGORY-SPECIFIC UNUSUAL TRANSACTION DETECTION
     *
     * Each expense is compared with other transactions
     * in the same category, excluding itself.
     *
     * A transaction is flagged if:
     * 1. At least 4 other valid category transactions exist.
     * 2. Its amount exceeds the category threshold.
     *
     * Threshold = max(category minimum, 2 x peer median)
     */

    const MIN_PEER_TRANSACTIONS = 4;
    const MULTIPLIER = 2;

    const MINIMUM_THRESHOLDS = {
        Food: 500,
        Transport: 1000,
        Shopping: 2000,
        Entertainment: 1000,
        Bills: 2000,
        Health: 2000,
        Education: 5000,
        Personal: 1500,
        Other: 2000
    };

    const expensesByCategory = {};

    for (const transaction of expenses) {
        const amount = Number(transaction.amount);

        if (!Number.isFinite(amount) || amount <= 0) continue;

        const category = transaction.category || "Other";

        if (!expensesByCategory[category]) {
            expensesByCategory[category] = [];
        }

        expensesByCategory[category].push(transaction);
    }

    const unusualTransactions = [];
    const categoryThresholds = {};

    for (const [category, categoryTransactions] of
        Object.entries(expensesByCategory)) {

        const categoryMinimum =
            MINIMUM_THRESHOLDS[category] ??
            MINIMUM_THRESHOLDS.Other;

        for (const transaction of categoryTransactions) {

            const amount = Number(transaction.amount);

            // Exclude the transaction being evaluated.
            const peerAmounts = categoryTransactions
                .filter(other => other !== transaction)
                .map(other => Number(other.amount))
                .filter(value =>
                    Number.isFinite(value) && value > 0
                );

            // Require sufficient history besides this transaction.
            if (peerAmounts.length < MIN_PEER_TRANSACTIONS) {
                continue;
            }

            const peerMedian = median(peerAmounts);

            const threshold = Math.max(
                categoryMinimum,
                MULTIPLIER * peerMedian
            );

            categoryThresholds[category] = round(threshold);

            if (amount > threshold) {
                unusualTransactions.push(transaction);
            }
        }
    }

    /*
     * Retain the legacy global threshold for compatibility.
     * Actual detection uses category-specific thresholds.
     */

    const allExpenseAmounts = expenses
        .map(transaction => Number(transaction.amount))
        .filter(amount =>
            Number.isFinite(amount) && amount > 0
        );

    let unusualThreshold = 0;

    if (allExpenseAmounts.length > 0) {
        const mean = allExpenseAmounts.reduce(
            (sum, amount) => sum + amount,
            0
        ) / allExpenseAmounts.length;

        const variance = allExpenseAmounts.reduce(
            (sum, amount) => sum + Math.pow(amount - mean, 2),
            0
        ) / allExpenseAmounts.length;

        unusualThreshold = mean + 2 * Math.sqrt(variance);
    }

    // Return analytics.
    return {
        totalIncome: round(totalIncome),
        totalExpense: round(totalExpense),
        balance: round(balance),

        categoryTotals: Object.fromEntries(
            Object.entries(categoryTotals).map(
                ([category, amount]) => [
                    category,
                    round(amount)
                ]
            )
        ),

        monthlyTotals: Object.fromEntries(
            Object.entries(monthlyTotals)
                .sort(([monthA], [monthB]) =>
                    monthA.localeCompare(monthB)
                )
                .map(([month, amount]) => [
                    month,
                    round(amount)
                ])
        ),

        unusualThreshold: round(unusualThreshold),
        categoryThresholds,
        unusualTransactions
    };
}

module.exports = {
    calculateAnalytics
};
