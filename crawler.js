const axios = require("axios");
const cheerio = require("cheerio");
const robotsParser = require("robots-parser");

const database = require("./database");
const crawlQueue = require("./crawlQueue");
const crawlerState = require("./crawlerState");
const config = require("./config");

const USER_AGENT =
    "TheVaultSearchBot/1.0";

const robotsCache = new Map();

const MAX_PAGES =
    config.crawler.maxPagesPerRun;

const REQUEST_DELAY =
    config.crawler.requestDelay;

const MAX_PAGE_SIZE =
    config.crawler.maxPageSize;


const seeds = [
    "https://en.wikipedia.org/wiki/Main_Page",
    "https://developer.mozilla.org/en-US/",
    "https://www.mozilla.org/en-US/",
    "https://www.w3.org/",
    "https://www.nasa.gov/",
    "https://www.bbc.com/",
    "https://www.theguardian.com/international"
];


function normalizeUrl(rawUrl) {
    try {
        const url = new URL(rawUrl);

        if (
            url.protocol !== "http:" &&
            url.protocol !== "https:"
        ) {
            return null;
        }

        url.hash = "";

        url.hostname =
            url.hostname.toLowerCase();

        return url.toString();

    } catch {
        return null;
    }
}


function addUrl(url) {
    const normalized =
        normalizeUrl(url);

    if (normalized) {
        crawlQueue.add(normalized);
    }
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

    return (
        robots.isAllowed(
            url,
            USER_AGENT
        ) !== false
    );
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
        "script, style, noscript, svg, iframe, nav, footer, header"
    ).remove();

    const title =
        $("title")
            .first()
            .text()
            .trim();

    const description =
        $('meta[name="description"]')
            .attr("content") ||
        $('meta[property="og:description"]')
            .attr("content") ||
        "";

    const content =
        cleanText(
            $("body").text()
        );

    const links = [];

    $("a[href]").each(
        (_, element) => {
            try {
                const href =
                    $(element)
                        .attr("href");

                const absolute =
                    normalizeUrl(
                        new URL(
                            href,
                            url
                        ).toString()
                    );

                if (absolute) {
                    links.push(
                        absolute
                    );
                }

            } catch {
                // Ignore bad links
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


async function crawlPage(item) {
    const url =
        item.url;

    crawlQueue.markCrawling(
        item.id
    );

    crawlerState.processed();

    try {
        const allowed =
            await canCrawl(url);

        if (!allowed) {
            crawlQueue.markComplete(
                item.id
            );

            return;
        }

        console.log(
            `CRAWLING: ${url}`
        );

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
            page.content.length < 50
        ) {
            crawlQueue.markComplete(
                item.id
            );

            return;
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

        crawlerState.indexed();

        for (
            const link
            of page.links
        ) {
            addUrl(link);
        }

        crawlQueue.markComplete(
            item.id
        );

        console.log(
            `INDEXED: ${url}`
        );

    } catch (error) {
        console.log(
            `FAILED: ${url} - ${error.message}`
        );

        crawlQueue.markFailed(
            item.id
        );

        crawlerState.failed(
            error.message
        );
    }
}


async function startCrawler() {
    if (
        crawlerState.get().running
    ) {
        console.log(
            "Crawler already running."
        );

        return;
    }

    crawlerState.start();

    try {
        crawlQueue.resetStuck();

        crawlQueue.addMany(
            seeds
        );

        let processed = 0;

        while (
            processed < MAX_PAGES
        ) {
            const item =
                crawlQueue.getNext();

            if (!item) {
                console.log(
                    "Crawl queue is empty."
                );

                break;
            }

            await crawlPage(
                item
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

    } catch (error) {
        crawlerState.failed(
            error.message
        );

        console.error(
            "Crawler error:",
            error
        );

    } finally {
        crawlerState.finish();
    }
}


module.exports = {
    startCrawler
};
