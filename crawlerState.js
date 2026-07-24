let running = false;

let pagesProcessed = 0;

let pagesIndexed = 0;

let pagesFailed = 0;

let lastRun = null;

let lastError = null;

let startedAt = null;

let finishedAt = null;


function start() {
    running = true;

    pagesProcessed = 0;

    pagesIndexed = 0;

    pagesFailed = 0;

    lastError = null;

    startedAt =
        new Date()
            .toISOString();

    finishedAt = null;
}


function finish() {
    running = false;

    lastRun =
        new Date()
            .toISOString();

    finishedAt =
        lastRun;
}


function processed() {
    pagesProcessed++;
}


function indexed() {
    pagesIndexed++;
}


function failed(error) {
    pagesFailed++;

    lastError =
        typeof error === "string"
            ? error
            : error?.message ||
              "Unknown crawler error";
}


function get() {
    return {
        running,

        pagesProcessed,

        pagesIndexed,

        pagesFailed,

        lastRun,

        lastError,

        startedAt,

        finishedAt
    };
}


module.exports = {
    start,

    finish,

    processed,

    indexed,

    failed,

    get
};
