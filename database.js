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
    "busy_timeout = 10000"
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


    CREATE INDEX IF NOT EXISTS
    idx_pages_title

    ON pages(title);


    CREATE INDEX IF NOT EXISTS
    idx_pages_url

    ON pages(url);

`);


const savePageStatement =
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


function savePage(
    page
) {

    if (
        !page ||
        !page.url
    ) {

        return false;

    }


    savePageStatement.run({

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
            page.domain ||
            "",


        crawled_at:
            Date.now()

    });


    return true;

}


function searchPages(
    query,

    limit =
        config.search
            .resultsPerPage,

    offset =
        0

) {


    if (
        typeof query !==
        "string"
    ) {

        return [];

    }


    const words =
        query

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
                20
            );


    if (
        words.length ===
        0
    ) {

        return [];

    }


    const phrase =
        words.join(
            " "
        );


    const phrasePattern =
        `%${phrase}%`;


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

                        THEN 35

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

                CASE

                    WHEN
                    LOWER(title)
                    LIKE ?

                    THEN 300

                    ELSE 0

                END


                +


                CASE

                    WHEN
                    LOWER(description)
                    LIKE ?

                    THEN 100

                    ELSE 0

                END


                +


                ${scoreParts.join(
                    " + "
                )}

            ) AS relevance


        FROM pages


        WHERE

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


            OR


            ${conditions.join(
                " OR "
            )}


        ORDER BY

            relevance DESC,

            crawled_at DESC


        LIMIT ?

        OFFSET ?

    `;


    const parameters =
        [];


    /*
        Exact phrase scoring.
    */

    parameters.push(

        phrasePattern,

        phrasePattern

    );


    /*
        Per-word relevance scoring.
    */

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


    /*
        Exact phrase matching
        in the WHERE clause.
    */

    parameters.push(

        phrasePattern,

        phrasePattern,

        phrasePattern

    );


    /*
        Individual word matching
        in the WHERE clause.
    */

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

        Math.max(
            1,
            Math.min(
                Number(
                    limit
                ) || 10,
                100
            )
        ),


        Math.max(
            0,
            Number(
                offset
            ) || 0
        )

    );


    return db

        .prepare(
            sql
        )

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
