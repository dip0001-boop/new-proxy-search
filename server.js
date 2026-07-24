const express = require("express");
const path = require("path");
const compression = require("compression");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const config = require("./config");
const logger = require("./logger");
const cache = require("./cache");
const searchProviders = require("./searchProviders");

const app = express();

app.set("trust proxy", 1);

app.use(
    helmet({
        contentSecurityPolicy: false
    })
);

app.use(cors());

app.use(compression());

app.use(
    express.json({
        limit: "1mb"
    })
);

app.use(express.static(__dirname));

const apiLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,

    standardHeaders: true,

    legacyHeaders: false,

    message: {
        error: "Too many requests. Please try again later."
    }
});

app.use("/api/", apiLimiter);


// ================================
// HEALTH CHECK
// ================================

app.get("/health", (req, res) => {

    res.json({
        status: "online",

        service: "THE VAULT SEARCH",

        timestamp: new Date().toISOString()
    });

});


// ================================
// SEARCH
// ================================

app.get("/api/search", async (req, res) => {

    const startTime = Date.now();

    try {

        let query =
            typeof req.query.q === "string"
                ? req.query.q.trim()
                : "";


        if (!query) {

            return res.status(400).json({
                error: "Please enter a search query."
            });

        }


        if (
            query.length <
            config.security.minQueryLength
        ) {

            return res.status(400).json({
                error: "Search query is too short."
            });

        }


        if (
            query.length >
            config.security.maxQueryLength
        ) {

            return res.status(400).json({
                error: "Search query is too long."
            });

        }


        let page =
            Number.parseInt(
                req.query.page,
                10
            );


        if (
            !Number.isInteger(page) ||
            page < 1
        ) {

            page = 1;

        }


        const resultsPerPage =
            10;


        const offset =
            (page - 1) *
            resultsPerPage;


        const cacheKey =
            `${query}:page:${page}`;


        const cached =
            cache.get(cacheKey);


        if (cached) {

            return res.json({

                ...cached,

                cached: true,

                time:
                    Date.now() -
                    startTime

            });

        }


        const search =
            await searchProviders.search(
                query,
                {
                    count:
                        resultsPerPage,

                    offset
                }
            );


        const response = {

            query,

            page,

            resultsPerPage,

            provider:
                search.provider,

            results:
                search.results,

            count:
                search.results.length,

            hasResults:
                search.results.length > 0,

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


        logger.request(

            "GET",

            `/api/search?q=${query}&page=${page}`,

            200,

            Date.now() -
            startTime

        );


        res.json(response);


    } catch (error) {

        logger.error(
            "Search request failed",
            error
        );


        res.status(500).json({

            error:
                "The search service is temporarily unavailable.",

            details:
                process.env.NODE_ENV ===
                "development"

                    ? error.message

                    : undefined

        });

    }

});


// ================================
// WEBSITE
// ================================

app.get("*", (req, res) => {

    res.sendFile(

        path.join(

            __dirname,

            "index.html"

        )

    );

});


// ================================
// START SERVER
// ================================

app.listen(

    config.port,

    () => {

        logger.info(

            `THE VAULT SEARCH running on port ${config.port}`

        );

    }

);
