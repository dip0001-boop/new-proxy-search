const Database =
    require("better-sqlite3");

const config =
    require("./config");


const db =
    new Database(
        config.databasePath
    );


db.pragma(
    "journal_mode = WAL"
);

db.pragma(
    "synchronous = NORMAL"
);

db.pragma(
    "busy_timeout = 10000"
);


db.exec(`

    CREATE TABLE IF NOT EXISTS crawl_queue(

        id
            INTEGER PRIMARY KEY AUTOINCREMENT,

        url
            TEXT UNIQUE NOT NULL,

        status
            TEXT DEFAULT 'pending',

        attempts
            INTEGER DEFAULT 0,

        added_at
            INTEGER NOT NULL,

        last_attempt
            INTEGER DEFAULT 0,

        next_attempt
            INTEGER DEFAULT 0

    );

    CREATE INDEX IF NOT EXISTS
        idx_queue_status
    ON crawl_queue(status);

    CREATE INDEX IF NOT EXISTS
        idx_queue_next_attempt
    ON crawl_queue(next_attempt);

`);


try {

    db.exec(`

        ALTER TABLE crawl_queue

        ADD COLUMN next_attempt
        INTEGER DEFAULT 0

    `);

} catch {
    // Column already exists.
}


const MAX_ATTEMPTS =
    Number(
        config.crawler?.maxAttempts
    ) || 3;


const RETRY_BASE =
    5000;


function add(
    url
) {

    if (

        typeof url !==
        "string" ||

        !url.trim()

    ) {

        return false;

    }


    const result =
        db.prepare(`

            INSERT OR IGNORE INTO crawl_queue(

                url,

                status,

                added_at,

                next_attempt

            )

            VALUES(

                ?,

                'pending',

                ?,

                0

            )

        `).run(

            url.trim(),

            Date.now()

        );


    return (
        result.changes >
        0
    );

}


function addMany(
    urls
) {

    if (

        !Array.isArray(
            urls
        )

    ) {

        return 0;

    }


    const insert =
        db.prepare(`

            INSERT OR IGNORE INTO crawl_queue(

                url,

                status,

                added_at,

                next_attempt

            )

            VALUES(

                ?,

                'pending',

                ?,

                0

            )

        `);


    let added =
        0;


    const transaction =
        db.transaction(

            list => {

                for (

                    const url
                    of list

                ) {

                    if (

                        typeof url !==
                        "string" ||

                        !url.trim()

                    ) {

                        continue;

                    }


                    const result =
                        insert.run(

                            url.trim(),

                            Date.now()

                        );


                    added +=
                        result.changes;

                }

            }

        );


    transaction(
        urls
    );


    return added;

}


function getNext() {

    const transaction =
        db.transaction(

            () => {

                const item =
                    db.prepare(`

                        SELECT *

                        FROM crawl_queue

                        WHERE status =
                            'pending'

                        AND attempts < ?

                        AND (

                            next_attempt = 0

                            OR

                            next_attempt <= ?

                        )

                        ORDER BY

                            added_at ASC

                        LIMIT 1

                    `).get(

                        MAX_ATTEMPTS,

                        Date.now()

                    );


                if (
                    !item
                ) {

                    return null;

                }


                const updated =
                    db.prepare(`

                        UPDATE crawl_queue

                        SET

                            status =
                                'crawling',

                            attempts =
                                attempts + 1,

                            last_attempt =
                                ?,

                            next_attempt =
                                0

                        WHERE

                            id = ?

                        AND

                            status =
                                'pending'

                    `).run(

                        Date.now(),

                        item.id

                    );


                if (

                    updated.changes !==
                    1

                ) {

                    return null;

                }


                return {

                    ...item,

                    status:
                        "crawling",

                    attempts:
                        item.attempts + 1

                };

            }

        );


    return transaction();

}


function markCrawling(
    id
) {

    db.prepare(`

        UPDATE crawl_queue

        SET

            status =
                'crawling',

            attempts =
                attempts + 1,

            last_attempt =
                ?

        WHERE

            id = ?

        AND

            status =
                'pending'

    `).run(

        Date.now(),

        id

    );

}


function markComplete(
    id
) {

    db.prepare(`

        UPDATE crawl_queue

        SET

            status =
                'complete'

        WHERE id = ?

    `).run(
        id
    );

}


function markFailed(
    id
) {

    const item =
        db.prepare(`

            SELECT attempts

            FROM crawl_queue

            WHERE id = ?

        `).get(
            id
        );


    if (
        !item
    ) {

        return;

    }


    if (

        item.attempts >=
        MAX_ATTEMPTS

    ) {

        db.prepare(`

            UPDATE crawl_queue

            SET status =
                'failed'

            WHERE id = ?

        `).run(
            id
        );


        return;

    }


    const delay =
        RETRY_BASE *

        Math.pow(

            2,

            Math.max(

                item.attempts -
                1,

                0

            )

        );


    db.prepare(`

        UPDATE crawl_queue

        SET

            status =
                'pending',

            next_attempt =
                ?

        WHERE id = ?

    `).run(

        Date.now() +
        delay,

        id

    );

}


function resetStuck() {

    const timeout =
        Number(

            config.crawler
                ?.stuckTimeout

        ) ||

        30 *
        60 *
        1000;


    return db.prepare(`

        UPDATE crawl_queue

        SET

            status =
                'pending',

            next_attempt =
                0

        WHERE

            status =
                'crawling'

        AND

            last_attempt < ?

        AND

            attempts < ?

    `).run(

        Date.now() -
        timeout,

        MAX_ATTEMPTS

    ).changes;

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

    return db.prepare(`

        SELECT

            COUNT(*) AS count

        FROM crawl_queue

        WHERE

            status =
                'pending'

        AND

            attempts < ?

        AND (

            next_attempt = 0

            OR

            next_attempt <= ?

        )

    `).get(

        MAX_ATTEMPTS,

        Date.now()

    ).count;

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
