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

db.pragma(
    "cache_size = -64000"
);

db.pragma(
    "temp_store = MEMORY"
);


db.exec(`

    CREATE TABLE IF NOT EXISTS pages (

        id
            INTEGER PRIMARY KEY AUTOINCREMENT,

        url
            TEXT UNIQUE NOT NULL,

        title
            TEXT NOT NULL,

        description
            TEXT DEFAULT '',

        content
            TEXT DEFAULT '',

        domain
            TEXT NOT NULL,

        crawled_at
            INTEGER NOT NULL

    );

    CREATE INDEX IF NOT EXISTS
        idx_pages_domain
    ON pages(domain);

    CREATE INDEX IF NOT EXISTS
        idx_pages_crawled_at
    ON pages(crawled_at);

    CREATE INDEX IF NOT EXISTS
        idx_pages_url
    ON pages(url);

`);


let ftsAvailable =
    false;


try {

    db.exec(`

        CREATE VIRTUAL TABLE IF NOT EXISTS pages_fts
        USING fts5(

            title,

            description,

            content,

            url UNINDEXED,

            domain UNINDEXED,

            crawled_at UNINDEXED,

            content='pages',

            content_rowid='id'

        );

    `);


    db.exec(`

        CREATE TRIGGER IF NOT EXISTS
            pages_ai

        AFTER INSERT ON pages

        BEGIN

            INSERT INTO pages_fts(

                rowid,

                title,

                description,

                content,

                url,

                domain,

                crawled_at

            )

            VALUES(

                new.id,

                new.title,

                new.description,

                new.content,

                new.url,

                new.domain,

                new.crawled_at

            );

        END;

    `);


    db.exec(`

        CREATE TRIGGER IF NOT EXISTS
            pages_ad

        AFTER DELETE ON pages

        BEGIN

            INSERT INTO pages_fts(

                pages_fts,

                rowid,

                title,

                description,

                content,

                url,

                domain,

                crawled_at

            )

            VALUES(

                'delete',

                old.id,

                old.title,

                old.description,

                old.content,

                old.url,

                old.domain,

                old.crawled_at

            );

        END;

    `);


    db.exec(`

        CREATE TRIGGER IF NOT EXISTS
            pages_au

        AFTER UPDATE ON pages

        BEGIN

            INSERT INTO pages_fts(

                pages_fts,

                rowid,

                title,

                description,

                content,

                url,

                domain,

                crawled_at

            )

            VALUES(

                'delete',

                old.id,

                old.title,

                old.description,

                old.content,

                old.url,

                old.domain,

                old.crawled_at

            );

            INSERT INTO pages_fts(

                rowid,

                title,

                description,

                content,

                url,

                domain,

                crawled_at

            )

            VALUES(

                new.id,

                new.title,

                new.description,

                new.content,

                new.url,

                new.domain,

                new.crawled_at

            );

        END;

    `);


    const count =
        db.prepare(`

            SELECT COUNT(*) AS count

            FROM pages_fts

        `).get().count;


    const pageCount =
        db.prepare(`

            SELECT COUNT(*) AS count

            FROM pages

        `).get().count;


    if (
        count !==
        pageCount
    ) {

        db.exec(`

            INSERT INTO pages_fts(

                pages_fts

            )

            VALUES(

                'rebuild'

            );

        `);

    }


    ftsAvailable =
        true;


} catch (
    error
) {

    console.warn(

        "FTS5 unavailable. Using fallback search:",

        error.message

    );

}


const savePageStatement =
    db.prepare(`

        INSERT INTO pages(

            url,

            title,

            description,

            content,

            domain,

            crawled_at

        )

        VALUES(

            @url,

            @title,

            @description,

            @content,

            @domain,

            @crawled_at

        )

        ON CONFLICT(url)

        DO UPDATE SET

            title =
                excluded.title,

            description =
                excluded.description,

            content =
                excluded.content,

            domain =
                excluded.domain,

            crawled_at =
                excluded.crawled_at

    `);


function savePage(
    page
) {

    if (

        !page ||

        typeof page.url !==
        "string" ||

        !page.url.trim()

    ) {

        return false;

    }


    let domain =
        page.domain ||
        "";


    if (
        !domain
    ) {

        try {

            domain =
                new URL(
                    page.url
                ).hostname;

        } catch {

            domain =
                "";

        }

    }


    savePageStatement.run({

        url:
            page.url.trim(),

        title:
            String(
                page.title ||
                "Untitled page"
            ).slice(
                0,
                1000
            ),

        description:
            String(
                page.description ||
                ""
            ).slice(
                0,
                10000
            ),

        content:
            String(
                page.content ||
                ""
            ).slice(
                0,
                1000000
            ),

        domain,

        crawled_at:
            Date.now()

    });


    return true;

}


function tokenize(
    query
) {

    return String(
        query ||
        ""
    )

        .toLowerCase()

        .replace(
            /[^\p{L}\p{N}\s]/gu,
            " "
        )

        .split(
            /\s+/
        )

        .filter(
            Boolean
        )

        .slice(
            0,
            30
        );

}


function makeFTSQuery(
    words
) {

    return words

        .map(
            word => {

                const safe =
                    word.replace(
                        /["*:^()-]/g,
                        " "
                    );


                return `"${safe}"*`;

            }

        )

        .join(
            " AND "
        );

}


function searchPages(
    query,

    limit =
        config.search.resultsPerPage,

    offset =
        0

) {

    const words =
        tokenize(
            query
        );


    if (
        words.length ===
        0
    ) {

        return [];

    }


    const safeLimit =
        Math.min(

            Math.max(

                Number(
                    limit
                ) || 10,

                1

            ),

            100

        );


    const safeOffset =
        Math.max(

            Number(
                offset
            ) || 0,

            0

        );


    if (
        ftsAvailable
    ) {

        const match =
            makeFTSQuery(
                words
            );


        try {

            return db.prepare(`

                SELECT

                    p.url,

                    p.title,

                    p.description,

                    p.content,

                    p.domain,

                    p.crawled_at,

                    bm25(

                        pages_fts,

                        10.0,

                        4.0,

                        1.0

                    ) AS rank

                FROM pages_fts

                JOIN pages p

                    ON p.id =
                    pages_fts.rowid

                WHERE pages_fts MATCH ?

                ORDER BY

                    rank ASC,

                    p.crawled_at DESC

                LIMIT ?

                OFFSET ?

            `).all(

                match,

                safeLimit,

                safeOffset

            );

        } catch {

            // Fall through to LIKE search.

        }

    }


    const patterns =
        words.map(
            word =>
                `%${word}%`
        );


    const conditions =
        words.map(
            () => `

                LOWER(title)
                LIKE ?

                OR

                LOWER(description)
                LIKE ?

                OR

                LOWER(content)
                LIKE ?

            `
        );


    const params =
        [];


    for (
        const pattern
        of patterns
    ) {

        params.push(

            pattern,

            pattern,

            pattern

        );

    }


    const sql = `

        SELECT

            url,

            title,

            description,

            content,

            domain,

            crawled_at

        FROM pages

        WHERE

            ${conditions.join(
                " AND "
            )}

        ORDER BY

            crawled_at DESC

        LIMIT ?

        OFFSET ?

    `;


    params.push(

        safeLimit,

        safeOffset

    );


    return db
        .prepare(
            sql
        )
        .all(
            ...params
        );

}


function getStats() {

    return db.prepare(`

        SELECT

            COUNT(*) AS pages,

            COUNT(

                DISTINCT domain

            ) AS domains

        FROM pages

    `).get();

}


function close() {

    if (
        db.open
    ) {

        db.close();

    }

}


module.exports = {

    savePage,

    searchPages,

    getStats,

    close

};
