const config = {
    port: process.env.PORT || 10000,

    search: {
        cacheTime: 300,

        resultsPerPage: 10
    },

    crawler: {
        maxPagesPerRun: 100,

        requestDelay: 1500,

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
