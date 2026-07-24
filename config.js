const path = require("path");

const config = {
    port: process.env.PORT || 10000,

    databasePath:
        process.env.DATABASE_PATH ||
        path.join(
            __dirname,
            "vault-search.db"
        ),

    search: {
        cacheTime: 300,

        resultsPerPage: 10
    },

    crawler: {
        maxPagesPerRun: 100,

        requestDelay: 1200,

        maxPageSize:
            2 * 1024 * 1024
    },

    security: {
        maxQueryLength: 300
    },

    rateLimit: {
        windowMs: 60 * 1000,

        maxRequests: 60
    }
};

module.exports = config;
