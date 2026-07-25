const PORT =
    Number(
        process.env.PORT
    ) || 3000;


module.exports = {

    port:
        PORT,


    proxy: {

        requestTimeout:
            30000,

        maxRedirects:
            10,

        maxResponseSize:
            100 *
            1024 *
            1024,

        maxRequestSize:
            50 *
            1024 *
            1024,

        maxSessions:
            5000,

        sessionTTL:
            1000 *
            60 *
            60 *
            24

    },


    search: {

        resultsPerPage:
            10,

        cacheTime:
            1000 *
            60 *
            5

    },


    security: {

        maxQueryLength:
            300,

        maxURLLength:
            8192

    },


    rateLimit: {

        windowMs:
            1000 *
            60,

        maxRequests:
            120

    }

};
