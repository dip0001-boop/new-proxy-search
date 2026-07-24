const axios =
    require("axios");

const cheerio =
    require("cheerio");

const config =
    require("./config");


const USER_AGENT =
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36";


const searchClient =
    axios.create({

        timeout:
            config.search.requestTimeout,

        maxContentLength:
            config.search.maxResponseSize,

        maxBodyLength:
            config.search.maxResponseSize,

        headers: {

            "User-Agent":
                USER_AGENT,

            "Accept":
                "text/html,application/xhtml+xml",

            "Accept-Language":
                "en-US,en;q=0.9",

            "Accept-Encoding":
                "gzip, deflate, br"

        },

        validateStatus:
            status =>
                status >= 200 &&
                status < 400

    });


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


function decodeSearchURL(
    rawURL
) {

    try {

        let url =
            String(
                rawURL ||
                ""
            );


        if (
            url.startsWith(
                "//"
            )
        ) {

            url =
                "https:" +
                url;

        }


        const parsed =
            new URL(
                url,
                "https://html.duckduckgo.com"
            );


        const encoded =
            parsed.searchParams.get(
                "uddg"
            );


        if (
            encoded
        ) {

            return decodeURIComponent(
                encoded
            );

        }


        return parsed.toString();

    } catch {

        return null;

    }

}


function getSearchOffset(
    page
) {

    return (

        Math.max(
            Number(
                page
            ) ||
            1,

            1

        ) -

        1

    ) *

    30;

}


function validTargetURL(
    value
) {

    try {

        const parsed =
            new URL(
                value
            );


        if (

            parsed.protocol !==
                "http:" &&

            parsed.protocol !==
                "https:"

        ) {

            return null;

        }


        return parsed;

    } catch {

        return null;

    }

}


async function search(
    query,
    options = {}
) {

    const limit =
        Math.min(

            Math.max(

                Number(
                    options.limit
                ) ||
                10,

                1

            ),

            config.search.maxResults

        );


    const page =
        Math.max(

            Number(
                options.page
            ) ||
            1,

            1

        );


    const searchURL =
        "https://html.duckduckgo.com/html/?" +

        new URLSearchParams({

            q:
                query,

            s:
                String(
                    getSearchOffset(
                        page
                    )
                )

        });


    const response =
        await searchClient.get(
            searchURL
        );


    const $ =
        cheerio.load(
            response.data
        );


    const results =
        [];


    $(".result").each(

        (
            _,
            element
        ) => {

            if (

                results.length >=
                limit

            ) {

                return;

            }


            const titleElement =
                $(element)
                    .find(
                        ".result__a"
                    )
                    .first();


            const snippetElement =
                $(element)
                    .find(
                        ".result__snippet"
                    )
                    .first();


            const rawURL =
                titleElement.attr(
                    "href"
                );


            if (
                !rawURL
            ) {

                return;

            }


            const link =
                decodeSearchURL(
                    rawURL
                );


            const target =
                validTargetURL(
                    link
                );


            if (
                !target
            ) {

                return;

            }


            results.push({

                title:
                    cleanText(
                        titleElement.text()
                    ) ||

                    "Untitled result",


                link:
                    target.toString(),


                snippet:
                    cleanText(
                        snippetElement.text()
                    ) ||

                    "No description available.",


                source:
                    target.hostname

            });

        }

    );


    return {

        provider:
            "LIVE WEB SEARCH",


        results,


        total:
            results.length

    };

}


module.exports = {

    search

};
