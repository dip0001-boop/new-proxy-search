const database =
    require("./database");

const config =
    require("./config");


function cleanText(
    value
) {
    return String(
        value ||
        ""
    )
        .replace(
            /\s+/g,
            " "
        )
        .trim();
}


function getSearchLimit(
    options
) {
    const requested =
        Number(
            options.limit
        );


    const defaultLimit =
        Number(
            config.search.resultsPerPage
        ) || 10;


    const maxLimit =
        Number(
            config.search.maxResults
        ) || 100;


    return Math.min(

        Math.max(

            Number.isFinite(
                requested
            )

                ? requested

                : defaultLimit,

            1

        ),

        maxLimit

    );
}


function getSearchPage(
    options
) {
    const page =
        Number(
            options.page
        );


    return Math.max(

        Number.isFinite(
            page
        )

            ? Math.floor(
                page
            )

            : 1,

        1

    );
}


function normaliseResult(
    page
) {
    let source =
        page.domain ||
        "";


    if (
        !source
    ) {
        try {

            source =
                new URL(
                    page.url
                ).hostname;

        } catch {

            source =
                "";

        }
    }


    source =
        source
            .replace(
                /^www\./i,
                ""
            );


    return {

        title:
            cleanText(
                page.title
            ) ||

            "Untitled page",


        link:
            page.url,


        snippet:
            cleanText(
                page.description
            ) ||

            cleanText(
                page.content
            )
                .slice(
                    0,
                    300
                ) ||

            "No description available.",


        source,


        relevance:
            Number(
                page.relevance
            ) || 0,


        crawledAt:
            page.crawled_at

    };
}


function removeDuplicateURLs(
    results
) {
    const seen =
        new Set();


    return results.filter(

        result => {

            const url =
                String(
                    result.link
                )
                    .trim()
                    .toLowerCase();


            if (
                !url ||
                seen.has(
                    url
                )
            ) {

                return false;

            }


            seen.add(
                url
            );


            return true;

        }

    );
}


async function search(
    query,
    options = {}
) {
    const cleanQuery =
        cleanText(
            query
        );


    if (
        !cleanQuery
    ) {

        return {

            provider:
                "THE VAULT INDEX",

            results:
                [],

            total:
                0

        };

    }


    const limit =
        getSearchLimit(
            options
        );


    const page =
        getSearchPage(
            options
        );


    const offset =
        (

            page -
            1

        ) *

        limit;


    const indexedPages =
        database.searchPages(

            cleanQuery,

            limit,

            offset

        );


    const results =
        removeDuplicateURLs(

            indexedPages.map(

                normaliseResult

            )

        );


    return {

        provider:
            "THE VAULT INDEX",

        results,

        total:
            results.length

    };

}


module.exports = {

    search

};
