const path = require("path");


const config = {

    port:
        process.env.PORT ||
        10000,


    databasePath:
        process.env.DATABASE_PATH ||
        path.join(
            __dirname,
            "vault-search.db"
        ),


    search: {

        cacheTime:
            120,

        resultsPerPage:
            10,

        maxResults:
            50,

        requestTimeout:
            15000,

        maxResponseSize:
            5 *
            1024 *
            1024

    },


    proxy: {

        requestTimeout:
            30000,

        maxResponseSize:
            50 *
            1024 *
            1024,

        maxRedirects:
            10

    },


    security: {

        maxQueryLength:
            300

    },


    rateLimit: {

        windowMs:
            60 *
            1000,

        maxRequests:
            120

    }

};


module.exports =
    config;
