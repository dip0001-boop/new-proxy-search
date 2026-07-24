let running = false;

let pagesProcessed = 0;

let pagesIndexed = 0;

let pagesFailed = 0;

let lastRun = null;

let lastError = null;

function start() {
    running = true;
    pagesProcessed = 0;
    pagesIndexed = 0;
    pagesFailed = 0;
    lastError = null;
}

function finish() {
    running = false;
    lastRun = new Date().toISOString();
}

function processed() {
    pagesProcessed++;
}

function indexed() {
    pagesIndexed++;
}

function failed(error) {
    pagesFailed++;
    lastError = error;
}

function get() {
    return {
        running,
        pagesProcessed,
        pagesIndexed,
        pagesFailed,
        lastRun,
        lastError
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
