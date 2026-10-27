const { GoogleGenAI } = require("@google/genai");

const {
    isValidCategory
} = require("../rules/categorizer");


/*
====================================================
GEMINI CONFIGURATION
====================================================
*/

const GEMINI_API_KEY =
    process.env.GEMINI_API_KEY;

const GEMINI_MODEL =
    process.env.GEMINI_MODEL ||
    "gemini-3.8-flash";


if (!GEMINI_API_KEY) {
    console.warn(
        "Warning: GEMINI_API_KEY is not configured."
    );
}


const ai = GEMINI_API_KEY
    ? new GoogleGenAI({
        apiKey: GEMINI_API_KEY
    })
    : null;


/*
====================================================
HELPER: WAIT
====================================================
*/

function wait(milliseconds) {
    return new Promise(resolve =>
        setTimeout(resolve, milliseconds)
    );
}


/*
====================================================
HELPER: GENERATE GEMINI RESPONSE
====================================================

This function:
1. Calls Gemini
2. Safely checks response.text
3. Retries temporary 503 errors
4. Returns null if Gemini is unavailable
====================================================
*/

async function generateGeminiText(
    prompt,
    config = {},
    maxRetries = 2
) {

    if (!ai) {
        return null;
    }


    for (
        let attempt = 0;
        attempt <= maxRetries;
        attempt++
    ) {

        try {

            const response =
                await ai.models.generateContent({

                    model: GEMINI_MODEL,

                    contents: prompt,

                    config: config
                });


            /*
            IMPORTANT:
            Do not directly call:

            response.text.trim()

            because response.text may be undefined.
            */

            const text =
                response?.text;


            if (
                typeof text !== "string" ||
                text.trim().length === 0
            ) {

                console.warn(
                    "Gemini returned no usable text."
                );

                return null;
            }


            return text.trim();

        } catch (error) {

            const errorMessage =
                error?.message || "";


            /*
            Retry temporary service errors.
            */

            const isTemporaryError =
                errorMessage.includes("503") ||
                errorMessage.includes(
                    "UNAVAILABLE"
                ) ||
                errorMessage.includes(
                    "high demand"
                );


            if (
                isTemporaryError &&
                attempt < maxRetries
            ) {

                const delay =
                    1000 * Math.pow(
                        2,
                        attempt
                    );


                console.warn(
                    `Gemini temporarily unavailable. ` +
                    `Retrying in ${delay} ms...`
                );


                await wait(delay);

                continue;
            }


            console.error(
                "Gemini API error:",
                errorMessage
            );


            return null;
        }
    }


    return null;
}


/*
====================================================
1. GEMINI TRANSACTION CLASSIFICATION
====================================================
*/

async function classifyAmbiguousTransaction(
    description
) {

    if (!ai) {
        return null;
    }


    const prompt = `
You are a personal finance transaction classifier.

Classify the following transaction into exactly
ONE of these categories:

Food
Transport
Shopping
Education
Entertainment
Bills
Health
Personal
Other

Transaction:
"${description}"

Return ONLY the category name.
Do not provide an explanation.
`;


    const category =
        await generateGeminiText(
            prompt,
            {
                temperature: 0,
                maxOutputTokens: 20
            }
        );


    /*
    Gemini unavailable:
    Let the caller keep the rule-based/default
    category instead of failing the transaction.
    */

    if (!category) {

        console.warn(
            "Gemini classification unavailable. " +
            "Using rule-based/default category."
        );

        return null;
    }


    /*
    Gemini should return exactly one category.
    */

    if (
        isValidCategory(category)
    ) {

        return category;
    }


    /*
    Sometimes an AI response may contain
    extra whitespace or text.
    Try extracting a valid category.
    */

    const validCategories = [
        "Food",
        "Transport",
        "Shopping",
        "Education",
        "Entertainment",
        "Bills",
        "Health",
        "Personal",
        "Other"
    ];


    const matchedCategory =
        validCategories.find(
            validCategory =>
                category
                    .toLowerCase()
                    .includes(
                        validCategory.toLowerCase()
                    )
        );


    if (matchedCategory) {
        return matchedCategory;
    }


    console.warn(
        "Gemini returned an invalid category:",
        category
    );


    return null;
}


/*
====================================================
2. GEMINI SPENDING SUMMARY
====================================================
*/

async function generateAISpendingSummary(
    analytics
) {

    if (!ai) {

        return generateFallbackSummary(
            analytics
        );
    }


    const prompt = `
You are a personal finance assistant.

Analyze the following spending information.

Total Income:
₹${analytics.totalIncome}

Total Expense:
₹${analytics.totalExpense}

Balance:
₹${analytics.balance}

Category-wise Spending:
${JSON.stringify(
    analytics.categoryTotals,
    null,
    2
)}

Monthly Spending:
${JSON.stringify(
    analytics.monthlyTotals,
    null,
    2
)}

Unusual Transactions:
${JSON.stringify(
    analytics.unusualTransactions.map(
        transaction => ({
            description:
                transaction.description,

            amount:
                transaction.amount,

            category:
                transaction.category
        })
    ),
    null,
    2
)}

Generate a concise personal finance summary.
Formatting requirements:
- Format currency using Indian number grouping, e.g. ₹5,800,
  ₹10,000 and ₹4,200.
- Calculate savings rate as (balance / total income) × 100.
- Use the ₹ symbol consistently for every currency amount.
- Return the summary in Markdown with numbered headings
  and bullet points.
- Do not invent data or make unsupported financial claims.
Include:

1. Overall spending pattern
2. Highest spending category
3. Monthly spending observation
4. Unusual spending observation
5. Two practical suggestions

Do not invent transaction data.
Only use the information provided.
`;


    const summary =
        await generateGeminiText(
            prompt,
            {
                temperature: 0.3,
                maxOutputTokens: 400
            }
        );


    /*
    Gemini unavailable:
    Return local fallback instead.
    */

    if (!summary) {

        console.warn(
            "Gemini summary unavailable. " +
            "Using fallback summary."
        );


        return generateFallbackSummary(
            analytics
        );
    }


    return summary;
}


/*
====================================================
3. FALLBACK SUMMARY
====================================================
*/

function generateFallbackSummary(
    analytics
) {

    const categories =
        Object.entries(
            analytics.categoryTotals
        )
        .sort(
            (a, b) => b[1] - a[1]
        );


    if (
        categories.length === 0
    ) {

        return "No expense information is available yet.";
    }


    const topCategory =
        categories[0][0];


    const topAmount =
        categories[0][1];


    return `
Your total recorded spending is
₹${analytics.totalExpense.toFixed(2)}.

Your highest spending category is
${topCategory}, with spending of
₹${topAmount.toFixed(2)}.

Your recorded balance is
₹${analytics.balance.toFixed(2)}.

Review your ${topCategory} expenses regularly
and compare your monthly spending trends.
`;
}


/*
====================================================
EXPORT FUNCTIONS
====================================================
*/

module.exports = {

    classifyAmbiguousTransaction,

    generateAISpendingSummary

};