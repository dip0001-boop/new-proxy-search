const path =
    require("path");


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
            300,


        resultsPerPage:
            10,


        maxQueryLength:
            300

    },


    crawler: {

        /*
            Maximum number of pages
            processed in one crawler run.
        */

        maxPagesPerRun:
            100,


        /*
            Delay after each page
            processed by a worker.

            With 15 workers, this still
            prevents each worker from
            hammering websites continuously.
        */

        requestDelay:
            1200,


        /*
            Maximum response size.

            500 MB is intentionally very
            high for HTML pages.

            This is used by Axios as both
            maxContentLength and
            maxBodyLength.
        */

        maxPageSize:
            500 *
            1024 *
            1024,


        /*
            Number of simultaneous crawler
            workers.
        */

        workerCount:
            15,


        /*
            Maximum number of times a URL
            can fail before being permanently
            marked as failed.
        */

        maxAttempts:
            3,


        /*
            Maximum time allowed for a
            page request.
        */

        requestTimeout:
            20000,


        /*
            Maximum amount of extracted
            text saved from one page.
        */

        maxTextLength:
            100000

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
            60

    }

};


module.exports =
    config;
