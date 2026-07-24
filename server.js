const express = require("express");
const path = require("path");
const compression = require("compression");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const config =
    require("./config");

const cache =
    require("./cache");

const database =
    require("./database");

const searchEngine =
    require("./searchProviders");

const crawler =
    require("./crawler");


const app =
    express();


app.set(
    "trust proxy",
    1
);


app.use(

    helmet({

        contentSecurityPolicy:
            false

    })

);


app.use(
    cors()
);


app.use(
    compression()
);


app.use(
    express.json()
);


app.use(

    express.static(
        __dirname
    )

);


const apiLimiter =

    rateLimit({

        windowMs:

            config.rateLimit.windowMs,


        max:

            config.rateLimit.maxRequests,


        standardHeaders:
            true,


        legacyHeaders:
            false

    });


app.use(
    "/api/",
    apiLimiter
);


// ================================
// HEALTH
// ================================

app.get(

    "/health",

    (req, res) => {

        res.json({

            status:
                "online",

            service:
                "THE VAULT SEARCH",

            index:
                database.getStats(),

            timestamp:
                new Date()
                    .toISOString()

        });

    }

);


// ================================
// SEARCH
// ================================

app.get(

    "/api/search",

    (req, res) => {

        const startTime =
            Date.now();


        try {

            const query =

                typeof req.query.q ===
                "string"

                    ? req.query.q.trim()

                    : "";


            if (
                !query
            ) {

                return res

                    .status(400)

                    .json({

                        error:

                            "Please enter a search query."

                    });

            }


            const page =

                Math.max(

                    Number.parseInt(

                        req.query.page,

                        10

                    ) || 1,

                    1

                );


            const resultsPerPage =
                10;


            const cacheKey =

                `local:${query.toLowerCase()}` +

                `:page:${page}`;


            const cached =

                cache.get(
                    cacheKey
                );


            if (
                cached
            ) {

                return res.json({

                    ...cached,

                    cached:
                        true,

                    time:

                        Date.now() -

                        startTime

                });

            }


            const search =

                searchEngine.search(

                    query,

                    {

                        limit:
                            resultsPerPage,

                        page

                    }

                );


            const response = {

                query,

                page,

                provider:

                    search.provider,


                results:

                    search.results,


                count:

                    search.results.length,


                cached:
                    false,


                time:

                    Date.now() -

                    startTime

            };


            cache.set(

                cacheKey,

                response,

                config.search.cacheTime

            );


            res.json(
                response
            );


        } catch (
            error
        ) {

            console.error(

                "SEARCH ERROR:",

                error

            );


            res

                .status(500)

                .json({

                    error:

                        error.message ||

                        "Search failed."

                });

        }

    }

);


// ================================
// INDEX STATS
// ================================

app.get(

    "/api/stats",

    (req, res) => {

        res.json({

            service:
                "THE VAULT SEARCH",

            index:

                database.getStats()

        });

    }

);


// ================================
// MANUAL CRAWL
// ================================

app.post(

    "/api/crawl",

    async (req, res) => {

        res.json({

            status:
                "started",

            message:
                "Crawler started in background."

        });


        crawler

            .startCrawler()

            .catch(

                error => {

                    console.error(

                        "CRAWLER ERROR:",

                        error

                    );

                }

            );

    }

);


// ================================
// FRONTEND
// ================================

app.get(

    "*",

    (req, res) => {

        res.sendFile(

            path.join(

                __dirname,

                "index.html"

            )

        );

    }

);


// ================================
// START
// ================================

app.listen(

    config.port,

    () => {

        console.log(

            `THE VAULT SEARCH running ` +

            `on port ${config.port}`

        );


        console.log(

            "Starting web crawler..."

        );


        crawler

            .startCrawler()

            .catch(

                error => {

                    console.error(

                        "CRAWLER ERROR:",

                        error

                    );

                }

            );

    }

); const express = require("express");
const path = require("path");
const compression = require("compression");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const config =
    require("./config");

const cache =
    require("./cache");

const database =
    require("./database");

const searchEngine =
    require("./searchProviders");

const crawler =
    require("./crawler");


const app =
    express();


app.set(
    "trust proxy",
    1
);


app.use(

    helmet({

        contentSecurityPolicy:
            false

    })

);


app.use(
    cors()
);


app.use(
    compression()
);


app.use(
    express.json()
);


app.use(

    express.static(
        __dirname
    )

);


const apiLimiter =

    rateLimit({

        windowMs:

            config.rateLimit.windowMs,


        max:

            config.rateLimit.maxRequests,


        standardHeaders:
            true,


        legacyHeaders:
            false

    });


app.use(
    "/api/",
    apiLimiter
);


// ================================
// HEALTH
// ================================

app.get(

    "/health",

    (req, res) => {

        res.json({

            status:
                "online",

            service:
                "THE VAULT SEARCH",

            index:
                database.getStats(),

            timestamp:
                new Date()
                    .toISOString()

        });

    }

);


// ================================
// SEARCH
// ================================

app.get(

    "/api/search",

    (req, res) => {

        const startTime =
            Date.now();


        try {

            const query =

                typeof req.query.q ===
                "string"

                    ? req.query.q.trim()

                    : "";


            if (
                !query
            ) {

                return res

                    .status(400)

                    .json({

                        error:

                            "Please enter a search query."

                    });

            }


            const page =

                Math.max(

                    Number.parseInt(

                        req.query.page,

                        10

                    ) || 1,

                    1

                );


            const resultsPerPage =
                10;


            const cacheKey =

                `local:${query.toLowerCase()}` +

                `:page:${page}`;


            const cached =

                cache.get(
                    cacheKey
                );


            if (
                cached
            ) {

                return res.json({

                    ...cached,

                    cached:
                        true,

                    time:

                        Date.now() -

                        startTime

                });

            }


            const search =

                searchEngine.search(

                    query,

                    {

                        limit:
                            resultsPerPage,

                        page

                    }

                );


            const response = {

                query,

                page,

                provider:

                    search.provider,


                results:

                    search.results,


                count:

                    search.results.length,


                cached:
                    false,


                time:

                    Date.now() -

                    startTime

            };


            cache.set(

                cacheKey,

                response,

                config.search.cacheTime

            );


            res.json(
                response
            );


        } catch (
            error
        ) {

            console.error(

                "SEARCH ERROR:",

                error

            );


            res

                .status(500)

                .json({

                    error:

                        error.message ||

                        "Search failed."

                });

        }

    }

);


// ================================
// INDEX STATS
// ================================

app.get(

    "/api/stats",

    (req, res) => {

        res.json({

            service:
                "THE VAULT SEARCH",

            index:

                database.getStats()

        });

    }

);


// ================================
// MANUAL CRAWL
// ================================

app.post(

    "/api/crawl",

    async (req, res) => {

        res.json({

            status:
                "started",

            message:
                "Crawler started in background."

        });


        crawler

            .startCrawler()

            .catch(

                error => {

                    console.error(

                        "CRAWLER ERROR:",

                        error

                    );

                }

            );

    }

);


// ================================
// FRONTEND
// ================================

app.get(

    "*",

    (req, res) => {

        res.sendFile(

            path.join(

                __dirname,

                "index.html"

            )

        );

    }

);


// ================================
// START
// ================================

app.listen(

    config.port,

    () => {

        console.log(

            `THE VAULT SEARCH running ` +

            `on port ${config.port}`

        );


        console.log(

            "Starting web crawler..."

        );


        crawler

            .startCrawler()

            .catch(

                error => {

                    console.error(

                        "CRAWLER ERROR:",

                        error

                    );

                }

            );

    }

); 
