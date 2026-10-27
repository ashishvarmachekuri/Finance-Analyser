const CATEGORY_RULES = {

    Food: [
        "swiggy",
        "zomato",
        "restaurant",
        "food",
        "pizza",
        "burger",
        "cafe",
        "coffee",
        "breakfast",
        "lunch",
        "dinner",
        "mess",
        "grocery",
        "groceries",
        "dominos",
        "kfc",
        "mcdonalds"
    ],

    Transport: [
        "uber",
        "ola",
        "rapido",
        "metro",
        "bus",
        "train",
        "cab",
        "taxi",
        "fuel",
        "petrol",
        "diesel",
        "parking",
        "transport",
        "flight",
        "irctc"
    ],

    Shopping: [
        "amazon",
        "flipkart",
        "myntra",
        "ajio",
        "shopping",
        "clothes",
        "shirt",
        "shoes",
        "electronics",
        "laptop",
        "mobile",
        "mall",
        "store"
    ],

    Education: [
        "college",
        "university",
        "education",
        "course",
        "udemy",
        "coursera",
        "book",
        "books",
        "exam",
        "stationery",
        "notebook",
        "tuition",
        "fee"
    ],

    Entertainment: [
        "movie",
        "cinema",
        "netflix",
        "spotify",
        "prime video",
        "game",
        "gaming",
        "concert",
        "hotstar"
    ],

    Bills: [
        "electricity",
        "water bill",
        "electric bill",
        "internet",
        "wifi",
        "mobile bill",
        "recharge",
        "rent",
        "insurance"
    ],

    Health: [
        "hospital",
        "doctor",
        "medicine",
        "pharmacy",
        "medical",
        "health",
        "clinic",
        "apollo"
    ],

    Personal: [
        "salon",
        "haircut",
        "gym",
        "personal care"
    ]
};


const VALID_CATEGORIES = [
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


function normalizeText(text) {

    return String(text)
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}


function categorizeTransaction(description, type) {

    if (type === "income") {
        return "Income";
    }

    const text = normalizeText(description);

    for (const [category, keywords] of Object.entries(CATEGORY_RULES)) {

        for (const keyword of keywords) {

            if (text.includes(keyword)) {
                return category;
            }

        }
    }

    return "Other";
}


function isAmbiguous(description) {

    const category =
        categorizeTransaction(description, "expense");

    return category === "Other";
}


function isValidCategory(category) {

    return VALID_CATEGORIES.includes(category);
}


module.exports = {
    categorizeTransaction,
    isAmbiguous,
    isValidCategory,
    VALID_CATEGORIES
};