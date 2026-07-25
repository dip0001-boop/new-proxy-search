const express = require("express");
const path = require("path");
const http = require("http");
const cheerio = require("cheerio");
const compression = require("compression");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const config = require("./config");
const cache = require("./cache");
const database = require("./database");
const crawlQueue = require("./crawlQueue");
const crawlerState = require("./crawlerState");
const searchEngine = require("./searchProviders");
const scheduler = require("./scheduler");

const sessionManager = require("./sessionManager");
const proxyRequest = require("./proxyRequest");
const websocketProxy = require("./websocketProxy");

const app = express();
const server = http.createServer(app);

app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(
    helmet({
        contentSecurityPolicy: false
    })
);

app.use(cors());
app.use(compression());

app.use(
    express.json({
        limit: "10mb"
    })
);

app.use(
    express.urlencoded({
        extended: true,
        limit: "10mb"
    })
);

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


/* =================================
   URL HELPERS
================================= */

function getTargetURL(rawURL) {
    try {
        const target = new URL(
            String(rawURL || "")
        );

        if (
            target.protocol !== "http:" &&
            target.protocol !== "https:"
        ) {
            return null;
        }

        return target;
    } catch {
        return null;
    }
}


function shouldSkipURL(value) {
    const url = String(
        value || ""
    )
        .trim()
        .toLowerCase();

    return (
        !url ||
        url.startsWith("data:") ||
        url.startsWith("blob:") ||
        url.startsWith("javascript:") ||
        url.startsWith("mailto:") ||
        url.startsWith("tel:") ||
        url.startsWith("#")
    );
}


function makeProxyURL(
    rawURL,
    baseURL,
    sessionID
) {
    try {
        const absolute = new URL(
            rawURL,
            baseURL
        );

        if (
            absolute.protocol !== "http:" &&
            absolute.protocol !== "https:"
        ) {
            return rawURL;
        }

        return (
            "/proxy?url=" +
            encodeURIComponent(
                absolute.toString()
            ) +
            "&session=" +
            encodeURIComponent(
                sessionID
            )
        );
    } catch {
        return rawURL;
    }
}


/* =================================
   CSS REWRITING
================================= */

function rewriteCSSURLs(
    css,
    baseURL,
    sessionID
) {
    return String(
        css || ""
    ).replace(
        /url\(\s*(['"]?)(.*?)\1\s*\)/gi,
        (
            match,
            quote,
            value
        ) => {
            const clean =
                String(value || "").trim();

            if (
                shouldSkipURL(clean)
            ) {
                return match;
            }

            return `url("${makeProxyURL(
                clean,
                baseURL,
                sessionID
            )}")`;
        }
    );
}


/* =================================
   SRCSET REWRITING
================================= */

function rewriteSrcset(
    value,
    baseURL,
    sessionID
) {
    return String(
        value || ""
    )
        .split(",")
        .map(
            item => {
                const parts =
                    item
                        .trim()
                        .split(/\s+/);

                if (
                    !parts.length ||
                    shouldSkipURL(
                        parts[0]
                    )
                ) {
                    return item;
                }

                parts[0] =
                    makeProxyURL(
                        parts[0],
                        baseURL,
                        sessionID
                    );

                return parts.join(
                    " "
                );
            }
        )
        .join(", ");
}


/* =================================
   HTML REWRITING
================================= */

function rewriteHTML(
    html,
    pageURL,
    sessionID
) {
    const $ =
        cheerio.load(
            html,
            {
                decodeEntities:
                    false
            }
        );

    $("base").remove();

    $("[href]").each(
        (
            _,
            element
        ) => {
            const href =
                $(element).attr(
                    "href"
                );

            if (
                href &&
                !shouldSkipURL(
                    href
                )
            ) {
                $(element).attr(
                    "href",
                    makeProxyURL(
                        href,
                        pageURL,
                        sessionID
                    )
                );
            }
        }
    );

    $("[src]").each(
        (
            _,
            element
        ) => {
            const src =
                $(element).attr(
                    "src"
                );

            if (
                src &&
                !shouldSkipURL(
                    src
                )
            ) {
                $(element).attr(
                    "src",
                    makeProxyURL(
                        src,
                        pageURL,
                        sessionID
                    )
                );
            }
        }
    );

    $("[srcset]").each(
        (
            _,
            element
        ) => {
            const srcset =
                $(element).attr(
                    "srcset"
                );

            if (
                srcset
            ) {
                $(element).attr(
                    "srcset",
                    rewriteSrcset(
                        srcset,
                        pageURL,
                        sessionID
                    )
                );
            }
        }
    );

    $("[action]").each(
        (
            _,
            element
        ) => {
            const action =
                $(element).attr(
                    "action"
                );

            if (
                action &&
                !shouldSkipURL(
                    action
                )
            ) {
                $(element).attr(
                    "action",
                    makeProxyURL(
                        action,
                        pageURL,
                        sessionID
                    )
                );
            }
        }
    );

    $("[style]").each(
        (
            _,
            element
        ) => {
            const style =
                $(element).attr(
                    "style"
                );

            if (
                style
            ) {
                $(element).attr(
                    "style",
                    rewriteCSSURLs(
                        style,
                        pageURL,
                        sessionID
                    )
                );
            }
        }
    );

    $("style").each(
        (
            _,
            element
        ) => {
            const css =
                $(element).html();

            if (
                css
            ) {
                $(element).html(
                    rewriteCSSURLs(
                        css,
                        pageURL,
                        sessionID
                    )
                );
            }
        }
    );

    $("meta[http-equiv='refresh']").each(
        (
            _,
            element
        ) => {
            const content =
                $(element).attr(
                    "content"
                );

            if (
                !content
            ) {
                return;
            }

            const match =
                content.match(
                    /^(\s*\d+\s*;\s*url=)(.*)$/i
                );

            if (
                match
            ) {
                $(element).attr(
                    "content",
                    match[1] +
                    makeProxyURL(
                        match[2],
                        pageURL,
                        sessionID
                    )
                );
            }
        }
    );

    return (
        "<!DOCTYPE html>" +
        $.html()
    );
}


/* =================================
   PROXY
================================= */

app.all(
    "/proxy",
    async (
        req,
        res
    ) => {
        const target =
            getTargetURL(
                req.query.url
            );

        if (
            !target
        ) {
            return res
                .status(400)
                .send(
                    "Invalid proxy URL."
                );
        }

        const session =
            sessionManager.getOrCreate(
                req.query.session
            );

        const sessionID =
            session.id;

        session.currentURL =
            target.toString();

        session.currentOrigin =
            target.origin;

        res.cookie(
            "vault_session",
            sessionID,
            {
                httpOnly:
                    true,

                sameSite:
                    "lax",

                secure:
                    req.secure,

                maxAge:
                    1000 *
                    60 *
                    60 *
                    24
            }
        );

        try {
            const response =
                await proxyRequest.request(
                    req,
                    session,
                    target
                );

            proxyRequest.copyHeaders(
                response,
                res
            );

            res.status(
                response.status
            );

            res.setHeader(
                "X-Vault-Proxy",
                "THE VAULT"
            );

            const contentType =
                String(
                    response.headers[
                        "content-type"
                    ] || ""
                );

            const data =
                Buffer.from(
                    response.data
                );

            if (
                contentType.includes(
                    "text/html"
                )
            ) {
                return res
                    .type("html")
                    .send(
                        rewriteHTML(
                            data.toString(
                                "utf8"
                            ),
                            target.toString(),
                            sessionID
                        )
                    );
            }

            if (
                contentType.includes(
                    "text/css"
                )
            ) {
                return res
                    .type("css")
                    .send(
                        rewriteCSSURLs(
                            data.toString(
                                "utf8"
                            ),
                            target.toString(),
                            sessionID
                        )
                    );
            }

            return res.send(
                data
            );

        } catch (
            error
        ) {
            console.error(
                "PROXY ERROR:",
                error
            );

            return res
                .status(502)
                .send(
                    `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>THE VAULT Proxy Error</title>
                    </head>
                    <body>
                        <h1>THE VAULT PROXY ERROR</h1>
                        <p>${String(
                            error.message ||
                            "Proxy request failed."
                        )}</p>
                    </body>
                    </html>
                    `
                );
        }
    }
);


/* =================================
   HEALTH
================================= */

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
                "THE VAULT PROXY",

            sessions:
                sessionManager.getStats(),

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


/* =================================
   SEARCH
================================= */

app.get(
    "/api/search",
    async (
        req,
        res
    ) => {
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

            const limit =
                config.search.resultsPerPage;

            const cacheKey =
                `live:${query.toLowerCase()}` +
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

            // IMPORTANT:
            // search() is asynchronous.
            const search =
                await searchEngine.search(
                    query,
                    {
                        limit,
                        page
                    }
                );

            const results =
                Array.isArray(
                    search.results
                )
                    ? search.results
                    : [];

            const response = {
                query,

                page,

                provider:
                    search.provider,

                results,

                count:
                    results.length,

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


/* =================================
   STATS
================================= */

app.get(
    "/api/stats",
    (
        req,
        res
    ) => {
        res.json({
            service:
                "THE VAULT PROXY",

            sessions:
                sessionManager.getStats(),

            index:
                database.getStats(),

            crawler:
                crawlerState.get(),

            queue:
                crawlQueue.getStats()
        });
    }
);


/* =================================
   MANUAL CRAWL
================================= */

app.post(
    "/api/crawl",
    (
        req,
        res
    ) => {
        if (
            crawlerState.get()
                .running
        ) {
            return res.json({
                status:
                    "already_running"
            });
        }

        res.json({
            status:
                "started"
        });

        Promise
            .resolve(
                scheduler.runCrawler()
            )
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


/* =================================
   STATIC FILES
================================= */

app.use(
    express.static(
        __dirname
    )
);


/* =================================
   FRONTEND
================================= */

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


/* =================================
   START
================================= */

server.listen(
    config.port,
    () => {
        console.log(
            `THE VAULT PROXY running on port ${config.port}`
        );

        scheduler.startScheduler();
    }
);


/* =================================
   WEBSOCKET PROXY
================================= */

websocketProxy.attachWebSocketProxy(
    server,
    getTargetURL,
    sessionManager.getSession
);
