const express =
    require("express");


const path =
    require("path");


const compression =
    require("compression");


const cors =
    require("cors");


const helmet =
    require("helmet");


const rateLimit =
    require("express-rate-limit");


const config =
    require("./config");


const cache =
    require("./cache");


const database =
    require("./database");


const crawlQueue =
    require("./crawlQueue");


const crawlerState =
    require("./crawlerState");


const searchEngine =
    require("./searchProviders");


const scheduler =
    require("./scheduler");


const app =
    express();


app.set(
    "trust proxy",
    1
);


app.disable(
    "x-powered-by"
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
    express.json({

        limit:
            "1mb"

    })
);


app.use(
    express.urlencoded({

        extended:
            false,

        limit:
            "1mb"

    })
);


app.use(
    express.static(
        __dirname
    )
);


const apiLimiter =
    rateLimit({

        windowMs:
            config.rateLimit
                .windowMs,

        max:
            config.rateLimit
                .maxRequests,

        standardHeaders:
            true,

        legacyHeaders:
            false,

        message: {

            error:
                "Too many requests. Please try again later."

        }

    });


app.use(
    "/api/",
    apiLimiter
);


app.get(
    "/health",
    (
        req,
        res
    ) => {

        res.json({

            status:
                "online",

            service:
                "THE VAULT SEARCH",

            index:
                database.getStats(),

            crawler:
                crawlerState.get(),

            queue:
                crawlQueue.getStats(),

            timestamp:
                new Date()
                    .toISOString()

        });

    }
);


app.get(
    "/api/search",
    (
        req,
        res
    ) => {

        const startTime =
            Date.now();


        try {

            const query =
                typeof req.query.q ===
                "string"

                    ? req.query.q
                        .trim()

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


            if (
                query.length >
                config.security
                    .maxQueryLength
            ) {

                return res
                    .status(400)
                    .json({

                        error:
                            "Search query is too long."

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


            const limit =
                config.search
                    .resultsPerPage;


            const cacheKey =
                "local:" +

                query
                    .toLowerCase()
                    .replace(
                        /\s+/g,
                        " "
                    ) +

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

                        limit,

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
                    search.results
                        .length,

                cached:
                    false,

                time:
                    Date.now() -
                    startTime

            };


            cache.set(

                cacheKey,

                response,

                config.search
                    .cacheTime

            );


            return res.json(
                response
            );


        } catch (
            error
        ) {

            console.error(
                "SEARCH ERROR:",
                error
            );


            return res
                .status(500)
                .json({

                    error:
                        error.message ||
                        "Search failed."

                });

        }

    }
);


app.get(
    "/api/stats",
    (
        req,
        res
    ) => {

        res.json({

            service:
                "THE VAULT SEARCH",

            index:
                database.getStats(),

            crawler:
                crawlerState.get(),

            queue:
                crawlQueue.getStats()

        });

    }
);


app.post(
    "/api/crawl",
    (
        req,
        res
    ) => {

        if (
            crawlerState
                .get()
                .running
        ) {

            return res.json({

                status:
                    "already_running",

                crawler:
                    crawlerState.get()

            });

        }


        res.json({

            status:
                "started"

        });


        Promise.resolve()
            .then(
                () =>
                    scheduler
                        .runCrawler()
            )
            .catch(
                error => {

                    console.error(
                        "CRAWLER START ERROR:",
                        error
                    );

                }
            );

    }
);


app.get(
    "*",
    (
        req,
        res
    ) => {

        res.sendFile(

            path.join(

                __dirname,

                "index.html"

            )

        );

    }
);


const server =
    app.listen(

        config.port,

        () => {

            console.log(

                `THE VAULT SEARCH running on port ${config.port}`

            );


            scheduler
                .startScheduler();

        }

    );


process.on(
    "SIGTERM",
    () => {

        console.log(
            "SIGTERM received. Shutting down."
        );


        server.close(
            () => {

                try {

                    database.close();

                } catch (
                    error
                ) {

                    console.error(
                        "Database close error:",
                        error
                    );

                }


                process.exit(
                    0
                );

            }
        );

    }
);


process.on(
    "SIGINT",
    () => {

        console.log(
            "SIGINT received. Shutting down."
        );


        server.close(
            () => {

                try {

                    database.close();

                } catch (
                    error
                ) {

                    console.error(
                        "Database close error:",
                        error
                    );

                }


                process.exit(
                    0
                );

            }
        );

    }
);
