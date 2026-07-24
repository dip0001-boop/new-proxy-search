const axios = require("axios");
const cheerio = require("cheerio");
const robotsParser = require("robots-parser");

const database = require("./database");


const USER_AGENT =
    "TheVaultSearchBot/1.0 (+search project crawler)";


const MAX_PAGE_SIZE =
    2 * 1024 * 1024;


const REQUEST_DELAY =
    1500;


const MAX_PAGES_PER_RUN =
    100;


const seeds = [

    "https://en.wikipedia.org/wiki/Main_Page",

    "https://www.mozilla.org/en-US/",

    "https://developer.mozilla.org/en-US/",

    "https://www.nasa.gov/",

    "https://www.bbc.com/",

    "https://www.theguardian.com/international",

    "https://www.w3.org/"

];


const queue = [];

const queued = new Set();

const visited = new Set();

const robotsCache = new Map();


function addToQueue(url) {

    try {

        const parsed =
            new URL(url);


        if (
            parsed.protocol !==
                "http:" &&

            parsed.protocol !==
                "https:"
        ) {
            return;
        }


        parsed.hash = "";


        const normalized =
            parsed.toString();


        if (
            !queued.has(normalized) &&
            !visited.has(normalized)
        ) {

            queued.add(normalized);

            queue.push(normalized);
        }

    } catch {
        // Ignore invalid URLs
    }
}


function getDomain(url) {

    return new URL(url).hostname;
}


async function canCrawl(url) {

    const parsed =
        new URL(url);

    const origin =
        parsed.origin;


    if (
        !robotsCache.has(origin)
    ) {

        try {

            const robotsUrl =
                `${origin}/robots.txt`;


            const response =
                await axios.get(
                    robotsUrl,
                    {
                        timeout: 8000,

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
        robotsCache.get(origin);


    if (!robots) {
        return true;
    }


    return robots.isAllowed(
        url,
        USER_AGENT
    ) !== false;
}


function cleanText(text) {

    return text
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 100000);
}


function extractPage(html, url) {

    const $ =
        cheerio.load(html);


    $(
        "script, style, noscript, svg, iframe, nav, footer"
    ).remove();


    const title =
        $("title")
            .first()
            .text()
            .trim();


    const description =
        $('meta[name="description"]')
            .attr("content") ||
        "";


    const content =
        cleanText(
            $("body").text()
        );


    const links =
        [];


    $("a[href]").each(
        (_, element) => {

            const href =
                $(element).attr("href");


            try {

                const absolute =
                    new URL(
                        href,
                        url
                    );


                absolute.hash = "";


                if (
                    absolute.protocol ===
                        "http:" ||

                    absolute.protocol ===
                        "https:"
                ) {

                    links.push(
                        absolute.toString()
                    );
                }

            } catch {
                // Ignore invalid links
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


async function crawlPage(url) {

    if (
        visited.has(url)
    ) {
        return;
    }


    visited.add(url);


    const allowed =
        await canCrawl(url);


    if (!allowed) {

        console.log(
            `ROBOTS BLOCKED: ${url}`
        );

        return;
    }


    console.log(
        `CRAWLING: ${url}`
    );


    try {

        const response =
            await axios.get(
                url,
                {
                    timeout: 15000,

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
            return;
        }


        database.savePage({

            url,

            title:
                page.title,

            description:
                page.description,

            content:
                page.content,

            domain:
                getDomain(url)
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


    } catch (error) {

        console.log(
            `FAILED: ${url} - ${error.message}`
        );
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


    let crawled =
        0;


    while (
        queue.length > 0 &&
        crawled < MAX_PAGES_PER_RUN
    ) {

        const url =
            queue.shift();


        await crawlPage(
            url
        );


        crawled++;


        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    REQUEST_DELAY
                )
        );
    }


    console.log(
        `CRAWLER FINISHED: ${crawled} pages processed`
    );
}


module.exports = {
    startCrawler
};
