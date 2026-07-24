const Database = require("better-sqlite3");
const config = require("./config");

const db = new Database(
    config.databasePath
);

db.pragma(
    "journal_mode = WAL"
);

db.pragma(
    "busy_timeout = 10000"
);

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

    CREATE INDEX IF NOT EXISTS idx_queue_attempts
    ON crawl_queue(attempts);
`);


const MAX_ATTEMPTS = 3;


function add(url) {
    if (
        typeof url !== "string" ||
        !url.trim()
    ) {
        return false;
    }

    const result =
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

    return (
        result.changes > 0
    );
}


function addMany(urls) {
    if (
        !Array.isArray(urls)
    ) {
        return;
    }

    const transaction =
        db.transaction(
            () => {
                for (
                    const url
                    of urls
                ) {
                    add(url);
                }
            }
        );

    transaction();
}


/*
    Atomically claim one URL.

    This is important because
    15 workers can call this at
    almost the exact same time.

    A worker receives the row
    only after it has been changed
    from pending to crawling.
*/
function getNext() {
    const transaction =
        db.transaction(
            () => {
                const item =
                    db.prepare(`
                        SELECT *
                        FROM crawl_queue
                        WHERE status = 'pending'
                        AND attempts < ?
                        ORDER BY added_at ASC
                        LIMIT 1
                    `).get(
                        MAX_ATTEMPTS
                    );

                if (!item) {
                    return null;
                }

                const updated =
                    db.prepare(`
                        UPDATE crawl_queue
                        SET
                            status = 'crawling',
                            attempts = attempts + 1,
                            last_attempt = ?
                        WHERE id = ?
                        AND status = 'pending'
                    `).run(
                        Date.now(),
                        item.id
                    );

                if (
                    updated.changes !== 1
                ) {
                    return null;
                }

                return {
                    ...item,
                    status: "crawling",
                    attempts:
                        item.attempts + 1
                };
            }
        );

    return transaction();
}


function markCrawling(id) {
    /*
        Kept for compatibility
        with any existing code.

        getNext() already claims
        the item atomically, so this
        function is normally not needed.
    */

    db.prepare(`
        UPDATE crawl_queue
        SET
            status = 'crawling',
            attempts = attempts + 1,
            last_attempt = ?
        WHERE id = ?
        AND status = 'pending'
    `).run(
        Date.now(),
        id
    );
}


function markComplete(id) {
    db.prepare(`
        UPDATE crawl_queue
        SET
            status = 'complete'
        WHERE id = ?
    `).run(
        id
    );
}


function markFailed(id) {
    const item =
        db.prepare(`
            SELECT attempts
            FROM crawl_queue
            WHERE id = ?
        `).get(
            id
        );

    if (!item) {
        return;
    }

    if (
        item.attempts >= MAX_ATTEMPTS
    ) {
        db.prepare(`
            UPDATE crawl_queue
            SET status = 'failed'
            WHERE id = ?
        `).run(
            id
        );

        return;
    }

    db.prepare(`
        UPDATE crawl_queue
        SET
            status = 'pending'
        WHERE id = ?
    `).run(
        id
    );
}


function resetStuck() {
    db.prepare(`
        UPDATE crawl_queue
        SET
            status = 'pending'
        WHERE status = 'crawling'
        AND last_attempt < ?
        AND attempts < ?
    `).run(
        Date.now() -
            30 * 60 * 1000,

        MAX_ATTEMPTS
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


function getPendingCount() {
    const result =
        db.prepare(`
            SELECT COUNT(*) AS count
            FROM crawl_queue
            WHERE status = 'pending'
            AND attempts < ?
        `).get(
            MAX_ATTEMPTS
        );

    return result.count;
}


module.exports = {
    add,
    addMany,
    getNext,
    markCrawling,
    markComplete,
    markFailed,
    resetStuck,
    getStats,
    getPendingCount
};
