const express = require("express");
const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");
const http = require("http");
const https = require("https");
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

const app = express();


/* =================================
   PERFORMANCE
================================= */

const httpAgent =
    new http.Agent({
        keepAlive: true,
        maxSockets: 256,
        maxFreeSockets: 64,
        timeout: 60000
    });


const httpsAgent =
    new https.Agent({
        keepAlive: true,
        maxSockets: 256,
        maxFreeSockets: 64,
        timeout: 60000
    });


const proxyClient =
    axios.create({

        httpAgent,

        httpsAgent,

        timeout:
            config.proxy.requestTimeout,

        maxRedirects:
            config.proxy.maxRedirects,

        maxContentLength:
            config.proxy.maxResponseSize,

        maxBodyLength:
            config.proxy.maxResponseSize,

        decompress:
            true,

        validateStatus:
            status =>
                status >= 200 &&
                status < 400

    });


const USER_AGENT =
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36 THE-VAULT";


const HOP_BY_HOP_HEADERS =
    new Set([

        "connection",

        "keep-alive",

        "proxy-authenticate",

        "proxy-authorization",

        "te",

        "trailer",

        "transfer-encoding",

        "upgrade"

    ]);


/* =================================
   APP
================================= */

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


/* =================================
   URL HELPERS
================================= */

function getTargetURL(
    rawURL
) {

    try {

        const parsed =
            new URL(
                String(
                    rawURL ||
                    ""
                )
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


function isSkippableURL(
    value
) {

    const url =
        String(
            value ||
            ""
        )

            .trim()
            .toLowerCase();


    return (

        !url ||

        url.startsWith(
            "data:"
        ) ||

        url.startsWith(
            "blob:"
        ) ||

        url.startsWith(
            "javascript:"
        ) ||

        url.startsWith(
            "mailto:"
        ) ||

        url.startsWith(
            "tel:"
        ) ||

        url.startsWith(
            "#"
        )

    );

}


function rewriteCSSURLs(
    css,
    baseURL
) {

    return String(
        css ||
        ""
    )

        .replace(

            /url\(\s*(['"]?)(.*?)\1\s*\)/gi,

            (

                match,

                quote,

                value

            ) => {

                const trimmed =
                    value.trim();


                if (
                    isSkippableURL(
                        trimmed
                    )
                ) {

                    return match;

                }


                return (

                    `url("${makeProxyURL(
                        trimmed,
                        baseURL
                    )}")`

                );

            }

        );

}


function rewriteSrcset(
    value,
    baseURL
) {

    return String(
        value ||
        ""
    )

        .split(",")

        .map(
            item => {

                const parts =
                    item.trim()
                        .split(
                            /\s+/
                        );


                if (
                    parts.length ===
                    0
                ) {

                    return item;

                }


                if (
                    isSkippableURL(
                        parts[0]
                    )
                ) {

                    return item;

                }


                parts[0] =
                    makeProxyURL(
                        parts[0],
                        baseURL
                    );


                return parts.join(
                    " "
                );

            }
        )

        .join(
            ", "
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

                !isSkippableURL(
                    href
                )

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

                !isSkippableURL(
                    src
                )

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
                        pageURL
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

                !isSkippableURL(
                    action
                )

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
                        pageURL
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
                        pageURL
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
                        pageURL
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
   HEADER HELPERS
================================= */

function getForwardHeaders(
    req
) {

    const headers = {

        "User-Agent":
            req.headers[
                "user-agent"
            ] ||
            USER_AGENT,

        "Accept":
            req.headers[
                "accept"
            ] ||
            "*/*",

        "Accept-Language":
            req.headers[
                "accept-language"
            ] ||
            "en-US,en;q=0.9"

    };


    const allowed = [

        "content-type",

        "content-length",

        "accept-encoding",

        "referer",

        "origin",

        "range",

        "if-none-match",

        "if-modified-since"

    ];


    for (
        const name
        of allowed
    ) {

        const value =
            req.headers[
                name
            ];


        if (
            value
        ) {

            headers[name] =
                value;

        }

    }


    return headers;

}


function copyResponseHeaders(
    response,
    res
) {

    for (

        const [
            name,
            value
        ]

        of Object.entries(
            response.headers
        )

    ) {

        const lower =
            name.toLowerCase();


        if (

            HOP_BY_HOP_HEADERS.has(
                lower
            )

        ) {

            continue;

        }


        if (
            lower ===
            "content-length"
        ) {

            continue;

        }


        if (
            lower ===
            "content-encoding"
        ) {

            continue;

        }


        if (
            lower ===
            "location"
        ) {

            continue;

        }


        res.setHeader(
            name,
            value
        );

    }

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

                .status(
                    400
                )

                .send(
                    "Invalid proxy URL."
                );

        }


        const method =
            req.method;


        const startTime =
            Date.now();


        try {

            console.log(

                `PROXY ${method}: ${target.toString()}`

            );


            const response =
                await proxyClient.request({

                    method,

                    url:
                        target.toString(),

                    responseType:
                        "arraybuffer",

                    headers:
                        getForwardHeaders(
                            req
                        ),

                    data:

                        method ===
                            "GET" ||

                        method ===
                            "HEAD"

                            ? undefined

                            : req.body

                });


            const contentType =
                String(

                    response.headers[
                        "content-type"
                    ] ||

                    ""

                );


            res.status(
                response.status
            );


            res.setHeader(

                "X-Vault-Proxy",

                "THE VAULT"

            );


            res.setHeader(

                "X-Vault-Response-Time",

                `${Date.now() - startTime}ms`

            );


            copyResponseHeaders(
                response,
                res
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


                return res

                    .type(
                        "html"
                    )

                    .send(

                        rewriteHTML(

                            html,

                            target.toString()

                        )

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

                .status(
                    502
                )

                .send(

                    `

                    <h1>
                        THE VAULT PROXY ERROR
                    </h1>

                    <p>
                        ${String(
                            error.message
                        )}

                    </p>

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

                    .status(
                        400
                    )

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

                    .status(
                        400
                    )

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

                    ) ||

                    1,

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


            const search =
                await searchEngine.search(

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

                .status(
                    500
                )

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

            crawlerState.get().running

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


        scheduler.runCrawler();

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

app.listen(

    config.port,

    () => {

        console.log(

            `THE VAULT PROXY running on port ${config.port}`

        );


        scheduler.startScheduler();

    }

);
