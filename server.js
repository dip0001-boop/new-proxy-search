const express =
    require("express");

const path =
    require("path");

const axios =
    require("axios");

const cheerio =
    require("cheerio");

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


const USER_AGENT =
    "Mozilla/5.0 (compatible; TheVaultProxy/1.0)";


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


/* =================================
   API RATE LIMIT
================================= */

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


/* =================================
   URL VALIDATION
================================= */

function getTargetURL(
    rawURL
) {
    try {
        const parsed =
            new URL(
                rawURL
            );

        if (
            parsed.protocol !==
                "http:" &&

            parsed.protocol !==
                "https:"
        ) {
            return null;
        }

        return parsed;

    } catch {
        return null;
    }
}


function makeProxyURL(
    rawURL,
    baseURL
) {
    try {
        const absolute =
            new URL(
                rawURL,
                baseURL
            );

        if (
            absolute.protocol !==
                "http:" &&

            absolute.protocol !==
                "https:"
        ) {
            return rawURL;
        }

        return (
            "/proxy?url=" +
            encodeURIComponent(
                absolute.toString()
            )
        );

    } catch {
        return rawURL;
    }
}


function rewriteCSSURLs(
    css,
    baseURL
) {
    return css.replace(
        /url\(\s*(['"]?)(.*?)\1\s*\)/gi,
        (
            match,
            quote,
            value
        ) => {
            const trimmed =
                value.trim();

            if (
                !trimmed ||
                trimmed.startsWith(
                    "data:"
                ) ||
                trimmed.startsWith(
                    "blob:"
                ) ||
                trimmed.startsWith(
                    "#"
                )
            ) {
                return match;
            }

            const proxied =
                makeProxyURL(
                    trimmed,
                    baseURL
                );

            return `url("${proxied}")`;
        }
    );
}


function rewriteHTML(
    html,
    pageURL
) {
    const $ =
        cheerio.load(
            html,
            {
                decodeEntities:
                    false
            }
        );


    $(
        "base"
    ).remove();


    $(
        "[href]"
    ).each(
        (
            _,
            element
        ) => {
            const href =
                $(element)
                    .attr(
                        "href"
                    );

            if (
                href
            ) {
                $(element).attr(
                    "href",
                    makeProxyURL(
                        href,
                        pageURL
                    )
                );
            }
        }
    );


    $(
        "[src]"
    ).each(
        (
            _,
            element
        ) => {
            const src =
                $(element)
                    .attr(
                        "src"
                    );

            if (
                src
            ) {
                $(element).attr(
                    "src",
                    makeProxyURL(
                        src,
                        pageURL
                    )
                );
            }
        }
    );


    $(
        "[action]"
    ).each(
        (
            _,
            element
        ) => {
            const action =
                $(element)
                    .attr(
                        "action"
                    );

            if (
                action
            ) {
                $(element).attr(
                    "action",
                    makeProxyURL(
                        action,
                        pageURL
                    )
                );
            }
        }
    );


    $(
        "[style]"
    ).each(
        (
            _,
            element
        ) => {
            const style =
                $(element)
                    .attr(
                        "style"
                    );

            if (
                style
            ) {
                $(element).attr(
                    "style",
                    rewriteCSSURLs(
                        style,
                        pageURL
                    )
                );
            }
        }
    );


    $(
        "style"
    ).each(
        (
            _,
            element
        ) => {
            const css =
                $(element)
                    .html();

            if (
                css
            ) {
                $(element).html(
                    rewriteCSSURLs(
                        css,
                        pageURL
                    )
                );
            }
        }
    );


    $(
        "meta[http-equiv='refresh']"
    ).each(
        (
            _,
            element
        ) => {
            const content =
                $(element)
                    .attr(
                        "content"
                    );

            if (
                content
            ) {
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
                            pageURL
                        )
                    );
                }
            }
        }
    );


    return (
        "<!DOCTYPE html>" +
        $.html()
    );
}


/* =================================
   PROXY ROUTE
================================= */

app.get(
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


        try {
            console.log(
                `PROXY: ${target.toString()}`
            );


            const response =
                await axios.get(
                    target.toString(),
                    {
                        responseType:
                            "arraybuffer",

                        timeout:
                            30000,

                        maxContentLength:
                            50 *
                            1024 *
                            1024,

                        maxBodyLength:
                            50 *
                            1024 *
                            1024,

                        maxRedirects:
                            10,

                        headers: {
                            "User-Agent":
                                USER_AGENT,

                            "Accept":
                                "*/*"
                        },

                        validateStatus:
                            status =>
                                status >=
                                    200 &&
                                status <
                                    400
                    }
                );


            const contentType =
                String(
                    response
                        .headers[
                            "content-type"
                        ] ||
                        ""
                );


            res.status(
                response.status
            );


            res.set(
                "X-Vault-Proxy",
                "THE VAULT"
            );


            if (
                contentType.includes(
                    "text/html"
                )
            ) {
                const html =
                    Buffer
                        .from(
                            response.data
                        )
                        .toString(
                            "utf8"
                        );


                const rewritten =
                    rewriteHTML(
                        html,
                        target.toString()
                    );


                return res
                    .type(
                        "html"
                    )
                    .send(
                        rewritten
                    );
            }


            if (
                contentType.includes(
                    "text/css"
                )
            ) {
                const css =
                    Buffer
                        .from(
                            response.data
                        )
                        .toString(
                            "utf8"
                        );


                return res
                    .type(
                        "css"
                    )
                    .send(
                        rewriteCSSURLs(
                            css,
                            target.toString()
                        )
                    );
            }


            res.set(
                "Content-Type",
                contentType ||
                    "application/octet-stream"
            );


            return res.send(
                Buffer.from(
                    response.data
                )
            );

        } catch (
            error
        ) {
            console.error(
                "PROXY ERROR:",
                error.message
            );


            return res
                .status(502)
                .send(
                    `
                    <h1>THE VAULT PROXY ERROR</h1>
                    <p>${String(
                        error.message
                    )}</p>
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


/* =================================
   FRONTEND
================================= */

app.use(
    express.static(
        __dirname
    )
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


/* =================================
   SERVER
================================= */

const server =
    app.listen(
        config.port,
        () => {
            console.log(
                `THE VAULT PROXY running on port ${config.port}`
            );


            scheduler
                .startScheduler();
        }
    );


function shutdown() {
    console.log(
        "Shutting down THE VAULT PROXY."
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


process.on(
    "SIGTERM",
    shutdown
);


process.on(
    "SIGINT",
    shutdown
);
