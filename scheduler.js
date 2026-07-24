const crawler = require("./crawler");

let running = false;

const CRAWL_INTERVAL =
    15 * 60 * 1000; // 15 minutes


async function runCrawler() {
    if (running) {
        console.log(
            "Crawler already running. Skipping."
        );

        return;
    }

    running = true;

    console.log(
        "Scheduled crawler run started."
    );

    try {
        await crawler.startCrawler();

        console.log(
            "Scheduled crawler run finished."
        );

    } catch (error) {
        console.error(
            "Scheduled crawler error:",
            error.message
        );

    } finally {
        running = false;
    }
}


function startScheduler() {
    console.log(
        "Crawler scheduler started."
    );

    runCrawler();

    setInterval(
        runCrawler,
        CRAWL_INTERVAL
    );
}


function isRunning() {
    return running;
}


module.exports = {
    startScheduler,
    runCrawler,
    isRunning
};
