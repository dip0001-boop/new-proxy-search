const axios =
    require("axios");

const cheerio =
    require("cheerio");

const robotsParser =
    require("robots-parser");


const database =
    require("./database");

const crawlQueue =
    require("./crawlQueue");

const crawlerState =
    require("./crawlerState");

const config =
    require("./config");


const USER_AGENT =
    "TheVaultSearchBot/2.0";


const robotsCache =
    new Map();


const MAX_PAGES =
    Number(
        config.crawler.maxPagesPerRun
    ) || 250;


const REQUEST_DELAY =
    Number(
        config.crawler.requestDelay
    ) || 0;


const MAX_PAGE_SIZE =
    Number(
        config.crawler.maxPageSize
    ) || 5 *
    1024 *
    1024;


const WORKER_COUNT =
    Math.max(

        1,

        Number(
            config.crawler.workers
        ) || 15

    );


const REQUEST_TIMEOUT =
    Number(
        config.crawler.requestTimeout
    ) || 20000;


const seeds = [

    "https://developer.mozilla.org/en-US/",

    "https://www.mozilla.org/en-US/",

    "https://www.w3.org/",

    "https://www.nasa.gov/",

    "https://www.bbc.com/",

    "https://www.theguardian.com/international"

];


const httpClient =
    axios.create({

        timeout:
            REQUEST_TIMEOUT,

        maxContentLength:
            MAX_PAGE_SIZE,

        maxBodyLength:
            MAX_PAGE_SIZE,

        responseType:
            "text",

        headers: {

            "User-Agent":
                USER_AGENT,

            "Accept":
                "text/html,application/xhtml+xml"

        },

        validateStatus:
            status =>
                status >= 200 &&
                status < 400

    });


function sleep(
    ms
) {

    return new Promise(

        resolve =>

            setTimeout(

                resolve,

                ms

            )

    );

}


function normalizeUrl(
    rawUrl
) {

    try {

        const url =
            new URL(
                rawUrl
            );


        if (

            url.protocol !==
                "http:" &&

            url.protocol !==
                "https:"

        ) {

            return null;

        }


        url.hash =
            "";


        url.hostname =
            url.hostname.toLowerCase();


        if (

            (

                url.protocol ===
                "http:" &&

                url.port ===
                "80"

            ) ||

            (

                url.protocol ===
                "https:" &&

                url.port ===
                "443"

            )

        ) {

            url.port =
                "";

        }


        return url.toString();

    } catch {

        return null;

    }

}


function isCrawlableUrl(
    url
) {

    try {

        const parsed =
            new URL(
                url
            );


        const pathname =
            parsed.pathname
                .toLowerCase();


        const blocked =
            [

                ".jpg",

                ".jpeg",

                ".png",

                ".gif",

                ".webp",

                ".svg",

                ".ico",

                ".mp4",

                ".webm",

                ".mp3",

                ".wav",

                ".zip",

                ".rar",

                ".7z",

                ".pdf",

                ".exe",

                ".dmg",

                ".iso"

            ];


        return !

            blocked.some(

                extension =>
                    pathname.endsWith(
                        extension
                    )

            );

    } catch {

        return false;

    }

}


function addUrl(
    url
) {

    const normalized =
        normalizeUrl(
            url
        );


    if (

        normalized &&

        isCrawlableUrl(
            normalized
        )

    ) {

        crawlQueue.add(
            normalized
        );

    }

}


async function canCrawl(
    url
) {

    const parsed =
        new URL(
            url
        );


    const origin =
        parsed.origin;


    if (

        !robotsCache.has(
            origin
        )

    ) {

        try {

            const robotsURL =
                `${origin}/robots.txt`;


            const response =
                await httpClient.get(

                    robotsURL,

                    {

                        timeout:
                            8000,

                        maxContentLength:
                            1024 *
                            1024,

                        maxBodyLength:
                            1024 *
                            1024

                    }

                );


            robotsCache.set(

                origin,

                robotsParser(

                    robotsURL,

                    response.status ===
                    200

                        ?

                    response.data

                        :

                    ""

                )

            );

        } catch {

            robotsCache.set(

                origin,

                null

            );

        }

    }


    const robots =
        robotsCache.get(
            origin
        );


    if (
        !robots
    ) {

        return true;

    }


    return (

        robots.isAllowed(

            url,

            USER_AGENT

        ) !==
        false

    );

}


function cleanText(
    text
) {

    return String(
        text ||
        ""
    )

        .replace(
            /\s+/g,
            " "
        )

        .trim()

        .slice(
            0,
            100000
        );

}


function extractPage(
    html,

    url

) {

    const $ =
        cheerio.load(
            html
        );


    $("script, style, noscript, svg, iframe, canvas, nav, footer, header, form, aside").remove();


    const title =
        cleanText(

            $("title")
                .first()
                .text()

        );


    const description =
        cleanText(

            $(
                'meta[name="description"]'

            ).attr(
                "content"
            ) ||

            $(
                'meta[property="og:description"]'

            ).attr(
                "content"
            ) ||

            ""

        );


    const content =
        cleanText(

            $("body")
                .text()

        );


    const links =
        new Set();


    $("a[href]").each(

        (

            _,

            element

        ) => {

            try {

                const href =
                    $(element).attr(
                        "href"
                    );


                if (
                    !href
                ) {

                    return;

                }


                const absolute =
                    normalizeUrl(

                        new URL(

                            href,

                            url

                        ).toString()

                    );


                if (

                    absolute &&

                    isCrawlableUrl(
                        absolute
                    )

                ) {

                    links.add(
                        absolute
                    );

                }

            } catch {

                // Ignore malformed links.

            }

        }

    );


    return {

        title:
            title ||
            "Untitled page",

        description,

        content,

        links:
            Array.from(
                links
            )

    };

}


async function crawlPage(
    item
) {

    const url =
        item.url;


    crawlerState.processed();


    try {

        if (

            !await canCrawl(
                url
            )

        ) {

            crawlQueue.markComplete(
                item.id
            );


            return;

        }


        const response =
            await httpClient.get(
                url
            );


        const contentType =
            String(

                response.headers[
                    "content-type"
                ] ||

                ""

            ).toLowerCase();


        if (

            !contentType.includes(
                "text/html"
            )

        ) {

            crawlQueue.markComplete(
                item.id
            );


            return;

        }


        const page =
            extractPage(

                response.data,

                url

            );


        if (

            page.content.length <
            50

        ) {

            crawlQueue.markComplete(
                item.id
            );


            return;

        }


        const parsed =
            new URL(
                url
            );


        database.savePage({

            url,

            title:
                page.title,

            description:
                page.description,

            content:
                page.content,

            domain:
                parsed.hostname

        });


        crawlerState.indexed();


        for (

            const link
            of page.links

        ) {

            addUrl(
                link
            );

        }


        crawlQueue.markComplete(
            item.id
        );

    } catch (
        error
    ) {

        crawlQueue.markFailed(
            item.id
        );


        crawlerState.failed(

            error.message

        );

    }

}


async function worker(
    workerId,

    counter

) {

    console.log(

        `Crawler worker ${workerId} started.`

    );


    while (

        counter.count <
        MAX_PAGES

    ) {

        const item =
            crawlQueue.getNext();


        if (
            !item
        ) {

            await sleep(
                500
            );


            if (

                crawlQueue
                    .getPendingCount() ===
                0

            ) {

                break;

            }


            continue;

        }


        counter.count++;


        await crawlPage(
            item
        );


        if (

            REQUEST_DELAY >
            0

        ) {

            await sleep(
                REQUEST_DELAY
            );

        }

    }

}


async function startCrawler() {

    if (

        crawlerState
            .get()
            .running

    ) {

        return;

    }


   crawlerState.start(WORKER_COUNT);


    try {

        crawlQueue.resetStuck();


        crawlQueue.addMany(
            seeds
        );


        const counter =
            {
                count:
                    0
            };


        const workers =
            Array.from(

                {

                    length:
                        WORKER_COUNT

                },

                (

                    _,

                    index

                ) =>

                    worker(

                        index +
                        1,

                        counter

                    )

            );


        await Promise.all(
            workers
        );


    } catch (
        error
    ) {

        crawlerState.failed(

            error.message

        );

    } finally {

        crawlerState.stop();

    }

}


module.exports = {

    startCrawler

};
