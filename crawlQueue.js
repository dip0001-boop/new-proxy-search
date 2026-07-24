const Database = require("better-sqlite3");
const config = require("./config");

const db = new Database(config.databasePath);

db.exec(`
    CREATE TABLE IF NOT EXISTS crawl_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'pending',
        attempts INTEGER DEFAULT 0,
        added_at INTEGER NOT NULL,
        last_attempt INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_queue_status
    ON crawl_queue(status);

    CREATE INDEX IF NOT EXISTS idx_queue_added_at
    ON crawl_queue(added_at);
`);

function add(url) {
    db.prepare(`
        INSERT OR IGNORE INTO crawl_queue (
            url,
            status,
            added_at
        )
        VALUES (
            ?,
            'pending',
            ?
        )
    `).run(
        url,
        Date.now()
    );
}

function addMany(urls) {
    const transaction = db.transaction(() => {
        for (const url of urls) {
            add(url);
        }
    });

    transaction();
}

function getNext() {
    return db.prepare(`
        SELECT *
        FROM crawl_queue
        WHERE status = 'pending'
        ORDER BY added_at ASC
        LIMIT 1
    `).get();
}

function markCrawling(id) {
    db.prepare(`
        UPDATE crawl_queue
        SET
            status = 'crawling',
            attempts = attempts + 1,
            last_attempt = ?
        WHERE id = ?
    `).run(
        Date.now(),
        id
    );
}

function markComplete(id) {
    db.prepare(`
        UPDATE crawl_queue
        SET status = 'complete'
        WHERE id = ?
    `).run(id);
}

function markFailed(id) {
    db.prepare(`
        UPDATE crawl_queue
        SET status = 'pending'
        WHERE id = ?
    `).run(id);
}

function resetStuck() {
    db.prepare(`
        UPDATE crawl_queue
        SET status = 'pending'
        WHERE status = 'crawling'
        AND last_attempt < ?
    `).run(
        Date.now() - 30 * 60 * 1000
    );
}

function getStats() {
    return db.prepare(`
        SELECT
            status,
            COUNT(*) AS count
        FROM crawl_queue
        GROUP BY status
    `).all();
}

module.exports = {
    add,
    addMany,
    getNext,
    markCrawling,
    markComplete,
    markFailed,
    resetStuck,
    getStats
};
