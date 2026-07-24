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

app.use(helmet({
    contentSecurityPolicy: false
}));

app.use(cors());

app.use(compression());

app.use(express.json({
    limit: "1mb"
}));

app.use(express.static(__dirname));

const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    standardHeaders: true,
    legacyHeaders: false
});

app.use("/api/", limiter);


// Health check for Render
app.get("/health", (req, res) => {
    res.json({
        status: "online",
        service: "THE VAULT SEARCH"
    });
});


// Search API
app.get("/api/search", async (req, res) => {

    const start = Date.now();

    try {

        let query = req.query.q;

        if (!query) {
            return res.status(400).json({
                error: "Missing search query"
            });
        }

        query = query.trim();


        if (
            query.length < config.security.minQueryLength ||
            query.length > config.security.maxQueryLength
        ) {
            return res.status(400).json({
                error: "Invalid search length"
            });
        }


        const cached = cache.get(query);

        if (cached) {

            logger.request(
                "GET",
                `/api/search?q=${query}`,
                200,
                Date.now() - start
            );

            return res.json({
                ...cached,
                cached: true
            });
        }


        const search =
            await searchProviders.search(query);


        const response = {
            query,
            provider: search.provider,
            results: search.results,
            count: search.results.length,
            time: Date.now() - start
        };


        cache.set(
            query,
            response
        );


        logger.request(
            "GET",
            `/api/search?q=${query}`,
            200,
            Date.now() - start
        );


        res.json(response);


    } catch (error) {

        logger.error(
            "Search request failed",
            error
        );


        res.status(500).json({
            error: "Search service unavailable"
        });
    }
});


// Serve website
app.get("*", (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "index.html"
        )
    );

});


// Start server
app.listen(
    config.port,
    () => {

        logger.info(
            `THE VAULT SEARCH running on port ${config.port}`
        );

    }
);
