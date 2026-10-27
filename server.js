const express = require("express");
const path = require("path");
const {
    ObjectId
} = require("mongodb");
const {
    initializeApp,
    getApps,
    cert
} = require("firebase-admin/app");

const {
    getAuth
} = require("firebase-admin/auth");

require("dotenv").config();


 // Firebase Admin SDK: server-side token verification.
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

const serviceAccount = serviceAccountJson
    ? JSON.parse(serviceAccountJson)
    : require(
        serviceAccountPath || path.join(__dirname, "serviceAccountKey.json")
      );


if (getApps().length === 0) {
    initializeApp({
        credential: cert(serviceAccount)
    });
}


/*
====================================================
DATABASE
====================================================
*/

const {
    connectDatabase,
    getTransactionsCollection
} = require("./src/db/database");


/*
====================================================
RULE ENGINE
====================================================
*/

const {
    categorizeTransaction,
    isAmbiguous
} = require("./src/rules/categorizer");


/*
====================================================
GEMINI
====================================================
*/

const {
    classifyAmbiguousTransaction,
    generateAISpendingSummary
} = require("./src/ai/gemini");


/*
====================================================
ANALYTICS
====================================================
*/

const {
    calculateAnalytics
} = require("./src/services/analytics");


/*
====================================================
EXPRESS APPLICATION
====================================================
*/

const app = express();

const PORT =
    process.env.PORT || 5000;


app.use(
    express.json()
);
async function verifyFirebaseToken(req, res, next) {
    try {
        const authHeader = req.headers.authorization || "";

        if (!authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                error: "Authentication required."
            });
        }

        const token = authHeader.slice("Bearer ".length);
        req.user = await getAuth().verifyIdToken(token);

        next();
    } catch (error) {
        console.error("Firebase authentication failed:", error.message);

        return res.status(401).json({
            error: "Invalid or expired authentication token."
        });
    }
}

// All /api routes registered after this line require a valid Firebase token.
app.use("/api", verifyFirebaseToken);

app.use(
    express.static(
        path.join(
            __dirname,
            "public"
        )
    )
);


/*
====================================================
VALIDATE TRANSACTION
====================================================
*/

function validateTransaction(body) {

    const description =
        String(
            body.description || ""
        ).trim();


    const amount =
        Number(body.amount);


    const type =
        body.type === "income"
            ? "income"
            : "expense";


    const date =
        body.date
            ? new Date(body.date)
            : new Date();


    if (!description) {

        throw new Error(
            "Description is required."
        );
    }


    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {

        throw new Error(
            "Amount must be greater than zero."
        );
    }


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        throw new Error(
            "Invalid date."
        );
    }


    return {

        description,

        amount:
            Math.round(
                amount * 100
            ) / 100,

        type,

        date,

        createdAt:
            new Date()
    };
}


/*
====================================================
GET ALL TRANSACTIONS
====================================================
*/

app.get(
    "/api/transactions",
    async (req, res) => {

        try {

            const collection =
                getTransactionsCollection();


            const transactions =
    await collection
        .find({
            userId: req.user.uid
        })
        .sort({
            date: -1,
            createdAt: -1
        })
        .toArray();


            res.json(
                transactions
            );

        } catch (error) {

            console.error(error);

            res.status(500).json({
                error:
                    "Unable to fetch transactions."
            });
        }
    }
);


/*
====================================================
ADD TRANSACTION
====================================================
*/

app.post(
    "/api/transactions",
    async (req, res) => {

        try {

            const collection =
                getTransactionsCollection();


            /*
            STEP 1:
            Validate input
            */

            const transaction =
                validateTransaction(
                    req.body
                );


            /*
            STEP 2:
            RULE-BASED CATEGORIZATION
            */

            let category =
                categorizeTransaction(
                    transaction.description,
                    transaction.type
                );


            let categorizationMethod =
                "Rule-Based";


            /*
            STEP 3:
            GEMINI FOR AMBIGUOUS EXPENSE
            */

            if (
                transaction.type ===
                    "expense" &&
                isAmbiguous(
                    transaction.description
                )
            ) {

                console.log(
                    "Transaction ambiguous. Calling Gemini..."
                );


                const aiCategory =
                    await classifyAmbiguousTransaction(
                        transaction.description
                    );


                if (aiCategory) {

                    category =
                        aiCategory;

                    categorizationMethod =
                        "Gemini";
                }
            }


            /*
            STEP 4:
            CREATE DATABASE DOCUMENT
            */

            const document = {
    ...transaction,
    category,
    categorizationMethod,
    userId: req.user.uid
};


            /*
            STEP 5:
            SAVE TO MONGODB
            */

            const result =
                await collection.insertOne(
                    document
                );


            const savedTransaction =
    await collection.findOne({
        _id: result.insertedId,
        userId: req.user.uid
    });


            /*
            STEP 6:
            SEND RESPONSE
            */

            res.status(201).json(
                savedTransaction
            );

        } catch (error) {

            console.error(error);

            res.status(400).json({
                error:
                    error.message
            });
        }
    }
);


/*
====================================================
DELETE TRANSACTION
====================================================
*/

app.delete(
    "/api/transactions/:id",
    async (req, res) => {

        try {

            if (
                !ObjectId.isValid(
                    req.params.id
                )
            ) {

                return res.status(400).json({
                    error:
                        "Invalid transaction ID."
                });
            }


            const collection =
                getTransactionsCollection();


            const result =
    await collection.deleteOne({
        _id: new ObjectId(req.params.id),
        userId: req.user.uid
    });


            if (
                result.deletedCount === 0
            ) {

                return res.status(404).json({
                    error:
                        "Transaction not found."
                });
            }


            res.json({
                message:
                    "Transaction deleted successfully."
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                error:
                    "Unable to delete transaction."
            });
        }
    }
);


/*
====================================================
ANALYTICS API
====================================================
*/

app.get(
    "/api/analytics",
    async (req, res) => {

        try {

            const collection =
                getTransactionsCollection();


            const transactions =
    await collection
        .find({
            userId: req.user.uid
        })
        .toArray();


            const analytics =
                calculateAnalytics(
                    transactions
                );


            res.json(
                analytics
            );

        } catch (error) {

            console.error(error);

            res.status(500).json({
                error:
                    "Unable to calculate analytics."
            });
        }
    }
);


/*
====================================================
AI SUMMARY API
====================================================
*/

app.get(
    "/api/summary",
    async (req, res) => {

        try {

            const collection =
                getTransactionsCollection();


            const transactions =
    await collection
        .find({
            userId: req.user.uid
        })
        .toArray();


            /*
            First calculate structured analytics.
            */

            const analytics =
                calculateAnalytics(
                    transactions
                );


            /*
            Then send the analytics to Gemini.
            */

            const summary =
                await generateAISpendingSummary(
                    analytics
                );


            res.json({

                summary,

                analytics
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                error:
                    "Unable to generate summary."
            });
        }
    }
);


/*
====================================================
SERVE FRONTEND
====================================================
*/

app.get(
    "*",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "public",
                "index.html"
            )
        );
    }
);


/*
====================================================
START APPLICATION
====================================================
*/

async function startServer() {

    try {

        await connectDatabase();


        app.listen(
            PORT,
            () => {

                console.log(
                    `Server running at http://localhost:${PORT}`
                );
            }
        );

    } catch (error) {

        console.error(
            "Unable to start application:"
        );

        console.error(
            error.message
        );

        process.exit(1);
    }
}


startServer();