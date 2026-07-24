const config = {
    port: process.env.PORT || 10000,

    search: {
        timeout: 15000,

        cacheTime: 300
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
