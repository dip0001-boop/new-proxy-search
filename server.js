const express = require("express");
const path = require("path");
const compression = require("compression");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const config = require("./config");
const cache = require("./cache");
const searchProviders = require("./searchProviders");

const app = express();

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
    express.json({
        limit: "1mb"
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
            config.rateLimit.windowMs,

        max:
            config.rateLimit.maxRequests,

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


// ================================
// HEALTH CHECK
// ================================

app.get(
    "/health",
    (req, res) => {

        res.json({

            status:
                "online",

            service:
                "THE VAULT SEARCH",

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
    async (req, res) => {

        const startTime =
            Date.now();


        try {

            const query =
                typeof req.query.q ===
                "string"

                    ? req.query.q.trim()

                    : "";


            if (!query) {

                return res
                    .status(400)
                    .json({

                        error:
                            "Please enter a search query."
                    });
            }


            if (
                query.length >
                config.security.maxQueryLength
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


            const cacheKey =
                `${query.toLowerCase()}:page:${page}`;


            const cached =
                cache.get(
                    cacheKey
                );


            if (cached) {

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
                await searchProviders.search(

                    query,

                    {
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


        } catch (error) {

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

            `THE VAULT SEARCH running on port ${config.port}`
        );
    }
);
