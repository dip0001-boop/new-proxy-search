const config = {
    port: process.env.PORT || 3000,

    search: {
        timeout: 15000,

        maxResults: 20,

        cacheTime: 300,

        defaultCountry: "AU",

        defaultLanguage: "en",

        safeSearch: "moderate"
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
