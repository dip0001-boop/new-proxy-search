const axios = require("axios");
const cheerio = require("cheerio");
const robotsParser = require("robots-parser");

const database =
    require("./database");


const USER_AGENT =
    "TheVaultSearchBot/1.0";


const MAX_PAGE_SIZE =
    2 * 1024 * 1024;


const REQUEST_DELAY =
    1200;


const MAX_PAGES_PER_RUN =
    100;


const queue =
    [];


const queued =
    new Set();


const visited =
    new Set();


const robotsCache =
    new Map();


const seeds = [

    "https://en.wikipedia.org/wiki/Main_Page",

    "https://developer.mozilla.org/en-US/",

    "https://www.mozilla.org/en-US/",

    "https://www.w3.org/",

    "https://www.nasa.gov/",

    "https://www.bbc.com/",

    "https://www.theguardian.com/international"

];


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
            url.hostname
                .toLowerCase();


        if (

            url.pathname.length >
            1 &&

            url.pathname.endsWith(
                "/"
            )

        ) {

            url.pathname =
                url.pathname.slice(
                    0,
                    -1
                );
        }


        return url.toString();


    } catch {

        return null;
    }
}


function addToQueue(
    rawUrl
) {

    const url =
        normalizeUrl(
            rawUrl
        );


    if (
        !url
    ) {

        return;
    }


    if (

        !queued.has(
            url
        ) &&

        !visited.has(
            url
        )

    ) {

        queued.add(
            url
        );

        queue.push(
            url
        );
    }
}


function getRobotsUrl(
    url
) {

    const parsed =
        new URL(
            url
        );


    return (

        `${parsed.protocol}//` +

        `${parsed.host}` +

        "/robots.txt"

    );
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

            const robotsUrl =
                getRobotsUrl(
                    url
                );


            const response =
                await axios.get(

                    robotsUrl,

                    {

                        timeout:
                            8000,

                        headers: {

                            "User-Agent":
                                USER_AGENT

                        },

                        validateStatus:
                            status =>

                                status >= 200 &&

                                status < 500

                    }

                );


            const robots =
                robotsParser(

                    robotsUrl,

                    response.status === 200

                        ? response.data

                        : ""

                );


            robotsCache.set(

                origin,

                robots

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

        ) !== false

    );
}


function cleanText(
    text
) {

    return text

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


    $(

        "script," +

        "style," +

        "noscript," +

        "svg," +

        "iframe," +

        "nav," +

        "footer," +

        "header"

    ).remove();


    const title =
        $("title")

            .first()

            .text()

            .trim();


    const description =

        $('meta[name="description"]')

            .attr(
                "content"
            ) ||

        $('meta[property="og:description"]')

            .attr(
                "content"
            ) ||

        "";


    const content =
        cleanText(

            $("body")

                .text()

        );


    const links =
        [];


    $("a[href]")

        .each(

            (_, element) => {

                const href =
                    $(element)

                        .attr(
                            "href"
                        );


                const absolute =
                    normalizeUrl(

                        new URL(

                            href,

                            url

                        ).toString()

                    );


                if (
                    absolute
                ) {

                    links.push(
                        absolute
                    );
                }

            }

        );


    return {

        title:

            title ||

            "Untitled page",


        description:

            cleanText(
                description
            ),


        content,


        links

    };
}


async function crawlPage(
    url
) {

    if (
        visited.has(
            url
        )
    ) {

        return false;
    }


    visited.add(
        url
    );


    if (
        !await canCrawl(
            url
        )
    ) {

        console.log(
            `ROBOTS BLOCKED: ${url}`
        );


        return false;
    }


    console.log(
        `CRAWLING: ${url}`
    );


    try {

        const response =
            await axios.get(

                url,

                {

                    timeout:
                        15000,

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

                            "text/html," +

                            "application/xhtml+xml"

                    },

                    validateStatus:

                        status =>

                            status >= 200 &&

                            status < 300

                }

            );


        const contentType =

            response.headers[

                "content-type"

            ] || "";


        if (

            !contentType.includes(

                "text/html"

            )

        ) {

            return false;
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

            return false;
        }


        const domain =
            new URL(
                url
            ).hostname;


        database.savePage({

            url,

            title:
                page.title,

            description:
                page.description,

            content:
                page.content,

            domain

        });


        for (

            const link

            of page.links

        ) {

            addToQueue(
                link
            );
        }


        console.log(
            `INDEXED: ${url}`
        );


        return true;


    } catch (
        error
    ) {

        console.log(

            `FAILED: ${url} - ` +

            error.message

        );


        return false;
    }
}


async function startCrawler() {

    for (

        const seed

        of seeds

    ) {

        addToQueue(
            seed
        );
    }


    let processed =
        0;


    while (

        queue.length > 0 &&

        processed <
        MAX_PAGES_PER_RUN

    ) {

        const url =
            queue.shift();


        await crawlPage(
            url
        );


        processed++;


        await new Promise(

            resolve =>

                setTimeout(

                    resolve,

                    REQUEST_DELAY

                )

        );

    }


    console.log(

        `CRAWLER FINISHED: ` +

        `${processed} pages processed`

    );

}


module.exports = {

    startCrawler

};
