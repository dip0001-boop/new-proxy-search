const PORT =
    Number(
        process.env.PORT
    ) || 3000;


const CPU_COUNT =
    Number(
        process.env.WEB_CONCURRENCY
    ) || 1;


module.exports = {

    port:
        PORT,


    databasePath:
        process.env.DATABASE_PATH ||
        "./vault.db",


    proxy: {

        requestTimeout:
            Number(
                process.env.PROXY_TIMEOUT
            ) ||

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

        requestTimeout:
            15000,


        maxResponseSize:
            10 *
            1024 *
            1024,


        maxResults:
            50,


        resultsPerPage:
            10,


        cacheTime:
            1000 *
            60 *
            5

    },


    crawler: {

        workers:
            Math.max(

                1,

                Number(
                    process.env.CRAWLER_WORKERS
                ) || 15

            ),


        maxPagesPerRun:
            Number(
                process.env.MAX_PAGES_PER_RUN
            ) || 250,


        requestTimeout:
            Number(
                process.env.CRAWLER_TIMEOUT
            ) || 20000,


        maxPageSize:
            5 *
            1024 *
            1024,


        requestDelay:
            Number(
                process.env.CRAWLER_DELAY
            ) || 0,


        interval:
            Number(
                process.env.CRAWLER_INTERVAL
            ) ||

            15 *
            60 *
            1000,


        maxAttempts:
            3,


        stuckTimeout:
            30 *
            60 *
            1000

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
