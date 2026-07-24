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


db.exec(`
    CREATE TABLE IF NOT EXISTS pages (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        url TEXT UNIQUE NOT NULL,

        title TEXT NOT NULL,

        description TEXT DEFAULT '',

        content TEXT DEFAULT '',

        domain TEXT NOT NULL,

        crawled_at INTEGER NOT NULL

    );

    CREATE INDEX IF NOT EXISTS
    idx_pages_domain

    ON pages(domain);

    CREATE INDEX IF NOT EXISTS
    idx_pages_crawled_at

    ON pages(crawled_at);
`);


function savePage(page) {

    const statement =
        db.prepare(`

        INSERT INTO pages (

            url,

            title,

            description,

            content,

            domain,

            crawled_at

        )

        VALUES (

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


    statement.run({

        url:
            page.url,

        title:
            page.title ||
            "Untitled page",

        description:
            page.description ||
            "",

        content:
            page.content ||
            "",

        domain:
            page.domain,

        crawled_at:
            Date.now()

    });
}


function searchPages(
    query,
    limit = 10,
    offset = 0
) {

    const words =
        query

            .toLowerCase()

            .replace(
                /[^\p{L}\p{N}\s]/gu,
                " "
            )

            .split(/\s+/)

            .filter(Boolean)

            .slice(0, 12);


    if (
        words.length === 0
    ) {

        return [];
    }


    const conditions =
        words.map(
            () => `

            (

                LOWER(title)
                LIKE ?

                OR

                LOWER(description)
                LIKE ?

                OR

                LOWER(content)
                LIKE ?

            )

        `
        );


    const scoreParts =
        words.map(
            () => `

            (

                CASE

                    WHEN
                    LOWER(title)
                    LIKE ?

                    THEN 100

                    ELSE 0

                END

                +

                CASE

                    WHEN
                    LOWER(description)
                    LIKE ?

                    THEN 30

                    ELSE 0

                END

                +

                CASE

                    WHEN
                    LOWER(content)
                    LIKE ?

                    THEN 10

                    ELSE 0

                END

            )

        `
        );


    const sql = `

        SELECT

            url,

            title,

            description,

            content,

            domain,

            crawled_at,

            (

                ${scoreParts.join(" + ")}

            ) AS relevance

        FROM pages

        WHERE

            ${conditions.join(" OR ")}

        ORDER BY

            relevance DESC,

            crawled_at DESC

        LIMIT ?

        OFFSET ?

    `;


    const parameters =
        [];


    for (
        const word
        of words
    ) {

        const pattern =
            `%${word}%`;


        parameters.push(

            pattern,

            pattern,

            pattern

        );

    }


    for (
        const word
        of words
    ) {

        const pattern =
            `%${word}%`;


        parameters.push(

            pattern,

            pattern,

            pattern

        );

    }


    parameters.push(
        limit,
        offset
    );


    return db

        .prepare(sql)

        .all(
            ...parameters
        );

}


function getStats() {

    return db

        .prepare(`

            SELECT

                COUNT(*) AS pages,

                COUNT(
                    DISTINCT domain
                ) AS domains

            FROM pages

        `)

        .get();

}


function close() {

    db.close();

}


module.exports = {

    savePage,

    searchPages,

    getStats,

    close

};
