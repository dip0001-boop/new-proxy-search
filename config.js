const config = {
    port: process.env.PORT || 3000,

    search: {
        maxResults: 20,
        timeout: 10000,
        cacheTime: 300,

        userAgent:
            "THE-VAULT-SEARCH/1.0"
    },

    security: {
        maxQueryLength: 300,
        minQueryLength: 1
    },

    rateLimit: {
        windowMs: 60 * 1000,
        maxRequests: 60
    }
};

module.exports = config;
