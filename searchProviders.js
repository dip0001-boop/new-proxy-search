const axios = require("axios");
const cheerio = require("cheerio");

const USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36";


function cleanText(
    value
) {
    return String(
        value || ""
    )
        .replace(
            /\s+/g,
            " "
        )
        .trim();
}


function cleanURL(
    value
) {
    try {
        const url =
            new URL(
                value
            );

        if (
            url.protocol !==
                "http:" &&
            url.protocol !==
                "https:"
        ) {
            return null;
        }

        return url.toString();

    } catch {
        return null;
    }
}


async function searchBing(
    query,
    options = {}
) {
    const limit =
        Math.min(
            Number(
                options.limit
            ) || 10,
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


    const url =
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
                "en-US"

        }).toString();


    const response =
        await axios.get(
            url,
            {
                timeout:
                    15000,

                maxContentLength:
                    10 *
                    1024 *
                    1024,

                headers: {

                    "User-Agent":
                        USER_AGENT,

                    "Accept":
                        "text/html,application/xhtml+xml",

                    "Accept-Language":
                        "en-US,en;q=0.9"

                },

                validateStatus:
                    status =>
                        status >=
                            200 &&
                        status <
                            400

            }
        );


    const $ =
        cheerio.load(
            response.data
        );


    const results =
        [];


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


            const title =
                cleanText(
                    link.text()
                );


            const href =
                cleanURL(
                    link.attr(
                        "href"
                    )
                );


            const description =
                cleanText(
                    $(element)
                        .find(
                            ".b_caption p"
                        )
                        .first()
                        .text()
                );


            if (
                !title ||
                !href
            ) {
                return;
            }


            results.push({

                title,

                url:
                    href,

                description,

                source:
                    new URL(
                        href
                    ).hostname

            });

        }
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
