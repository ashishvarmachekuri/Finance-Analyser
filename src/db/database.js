const { MongoClient } = require("mongodb");

let client;
let database;

async function connectDatabase() {
    const mongoURI =
        process.env.MONGODB_URI ||
        "mongodb://127.0.0.1:27017";

    const databaseName =
        process.env.DB_NAME ||
        "finance_analyser";

    client = new MongoClient(mongoURI);

    await client.connect();

    database = client.db(databaseName);

    console.log("MongoDB connected successfully");

    return database;
}

function getDatabase() {
    if (!database) {
        throw new Error("Database is not connected");
    }

    return database;
}

function getTransactionsCollection() {
    return getDatabase().collection("transactions");
}

module.exports = {
    connectDatabase,
    getDatabase,
    getTransactionsCollection
};