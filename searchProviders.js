const axios = require("axios");
const cheerio = require("cheerio");

const USER_AGENT =
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";


function cleanText(value) {
    return String(value || "")
        .replace(/\s+/g, " ")
        .trim();
}


function decodeGoogleURL(href) {
    try {
        if (!href) {
            return null;
        }

        const value =
            String(href).trim();


        /*
         * Google redirect URLs:
         *
         * /url?q=https://example.com
         * /url?url=https://example.com
         * /url?sa=t&url=https://example.com
         */

        if (
            value.startsWith(
                "/url?"
            )
        ) {
            const parsed =
                new URL(
                    "https://www.google.com" +
                    value
                );


            const possibleURLs = [
                parsed.searchParams.get(
                    "url"
                ),

                parsed.searchParams.get(
                    "q"
                ),

                parsed.searchParams.get(
                    "uddg"
                )
            ];


            for (
                const possibleURL
                of possibleURLs
            ) {
                if (
                    possibleURL &&
                    /^https?:\/\//i.test(
                        possibleURL
                    )
                ) {
                    return decodeURIComponent(
                        possibleURL
                    );
                }
            }
        }


        /*
         * Direct external URL
         */

        if (
            /^https?:\/\//i.test(
                value
            )
        ) {
            return value;
        }


        return null;

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
        results.length >=
        limit
    ) {
        return;
    }


    const cleanTitle =
        cleanText(
            title
        );


    const cleanLink =
        decodeGoogleURL(
            link
        );


    const cleanSnippet =
        cleanText(
            snippet
        );


    if (
        !cleanTitle ||
        !cleanLink
    ) {
        return;
    }


    let parsedURL;


    try {
        parsedURL =
            new URL(
                cleanLink
            );

    } catch {
        return;
    }


    if (
        parsedURL.hostname ===
            "www.google.com" ||
        parsedURL.hostname ===
            "google.com"
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


    results.push({
        title:
            cleanTitle,

        link:
            cleanLink,

        snippet:
            cleanSnippet ||
            "No description available.",

        source:
            parsedURL.hostname
    });
}


function extractSnippet(
    $,
    element
) {
    const parent =
        $(element)
            .closest(
                "div"
            );


    const text =
        parent
            .text();


    const title =
        cleanText(
            $(element)
                .find(
                    "h3"
                )
                .first()
                .text()
        );


    return cleanText(
        text
            .replace(
                title,
                ""
            )
    );
}


async function searchGoogle(
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


    const start =
        (
            page -
            1
        ) *
        limit;


    const searchURL =
        "https://www.google.com/search?" +
        new URLSearchParams({

            q:
                query,

            num:
                String(
                    limit
                ),

            start:
                String(
                    start
                ),

            hl:
                "en",

            filter:
                "0"

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


    const $ =
        cheerio.load(
            html
        );


    const results =
        [];


    /*
     * Standard Google result layout
     */

    $("a").each(
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


            const title =
                $(element)
                    .find(
                        "h3"
                    )
                    .first()
                    .text();


            if (
                !title
            ) {
                return;
            }


            const href =
                $(element)
                    .attr(
                        "href"
                    );


            if (
                !href
            ) {
                return;
            }


            const snippet =
                extractSnippet(
                    $,
                    element
                );


            addResult(
                results,

                title,

                href,

                snippet,

                limit
            );
        }
    );


    return {
        provider:
            "google",

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
                "google",

            results:
                [],

            total:
                0
        };
    }


    return searchGoogle(
        cleanQuery,
        options
    );
}


module.exports = {
    search,
    searchGoogle
};
