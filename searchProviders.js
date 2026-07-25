const axios = require("axios");
const cheerio = require("cheerio");

const USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";


function cleanText(value) {
    return String(value || "")
        .replace(/\s+/g, " ")
        .trim();
}


function cleanURL(value) {
    try {
        const url = new URL(
            String(value || "")
        );

        if (
            url.protocol !== "http:" &&
            url.protocol !== "https:"
        ) {
            return null;
        }

        return url.toString();

    } catch {
        return null;
    }
}


function addResult(
    results,
    title,
    link,
    snippet,
    limit
) {
    if (
        results.length >= limit
    ) {
        return;
    }

    const cleanTitle =
        cleanText(title);

    const cleanLink =
        cleanURL(link);

    const cleanSnippet =
        cleanText(snippet);

    if (
        !cleanTitle ||
        !cleanLink
    ) {
        return;
    }

    if (
        results.some(
            result =>
                result.link ===
                cleanLink
        )
    ) {
        return;
    }

    let source = "";

    try {
        source =
            new URL(
                cleanLink
            ).hostname;

    } catch {
        source =
            cleanLink;
    }

    results.push({
        title:
            cleanTitle,

        link:
            cleanLink,

        snippet:
            cleanSnippet ||
            "No description available.",

        source
    });
}


function parseBingResults(
    html,
    limit
) {
    const $ =
        cheerio.load(
            html
        );

    const results = [];


    // Normal Bing results
    $("li.b_algo").each(
        (
            _,
            element
        ) => {
            if (
                results.length >=
                limit
            ) {
                return false;
            }

            const link =
                $(element)
                    .find(
                        "h2 a"
                    )
                    .first();

            addResult(
                results,

                link.text(),

                link.attr(
                    "href"
                ),

                $(element)
                    .find(
                        ".b_caption p"
                    )
                    .first()
                    .text(),

                limit
            );
        }
    );


    // Alternative result layouts
    if (
        results.length ===
        0
    ) {
        $("h2 a").each(
            (
                _,
                element
            ) => {
                if (
                    results.length >=
                    limit
                ) {
                    return false;
                }

                const link =
                    $(element);

                const parent =
                    link.closest(
                        "li, article, main, section, div"
                    );

                addResult(
                    results,

                    link.text(),

                    link.attr(
                        "href"
                    ),

                    parent
                        .find(
                            "p"
                        )
                        .first()
                        .text(),

                    limit
                );
            }
        );
    }


    return results;
}


async function searchBing(
    query,
    options = {}
) {
    const limit =
        Math.min(
            Math.max(
                Number(
                    options.limit
                ) || 10,
                1
            ),
            50
        );

    const page =
        Math.max(
            Number(
                options.page
            ) || 1,
            1
        );

    const first =
        (
            page -
            1
        ) *
        limit;


    const searchURL =
        "https://www.bing.com/search?" +
        new URLSearchParams({
            q:
                query,

            count:
                String(
                    limit
                ),

            first:
                String(
                    first
                ),

            setlang:
                "en-US",

            cc:
                "US"
        }).toString();


    const response =
        await axios.get(
            searchURL,
            {
                timeout:
                    20000,

                maxContentLength:
                    20 *
                    1024 *
                    1024,

                maxBodyLength:
                    20 *
                    1024 *
                    1024,

                headers: {
                    "User-Agent":
                        USER_AGENT,

                    "Accept":
                        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",

                    "Accept-Language":
                        "en-US,en;q=0.9",

                    "Cache-Control":
                        "no-cache",

                    "Pragma":
                        "no-cache"
                },

                validateStatus:
                    status =>
                        status >= 200 &&
                        status < 400
            }
        );


    const html =
        String(
            response.data ||
            ""
        );


    const results =
        parseBingResults(
            html,
            limit
        );


    return {
        provider:
            "bing",

        results,

        total:
            results.length
    };
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
                "bing",

            results:
                [],

            total:
                0
        };
    }

    return searchBing(
        cleanQuery,
        options
    );
}


module.exports = {
    search,
    searchBing
};
