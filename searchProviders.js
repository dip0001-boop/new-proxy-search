const axios =
    require(
        "axios"
    );

const cheerio =
    require(
        "cheerio"
    );


const USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";


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


function decodeGoogleURL(
    href
) {
    try {

        if (
            href.startsWith(
                "/url?q="
            )
        ) {

            href =
                href.substring(
                    7
                );

            href =
                href.split(
                    "&"
                )[0];

            return decodeURIComponent(
                href
            );
        }


        if (
            href.startsWith(
                "http://"
            ) ||
            href.startsWith(
                "https://"
            )
        ) {
            return href;
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
            String(
                link ||
                ""
            )
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


    if (
        cleanLink.includes(
            "google.com"
        )
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


    let source =
        "";


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


async function searchGoogle(
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
            50
        );


    const page =
        Math.max(
            Number(
                options.page
            ) ||
            1,
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
                "en"

        }).toString();


    const response =
        await axios.get(

            searchURL,

            {

                timeout:
                    20000,

                headers: {

                    "User-Agent":
                        USER_AGENT,

                    "Accept":
                        "text/html,application/xhtml+xml",

                    "Accept-Language":
                        "en-US,en;q=0.9"

                }

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


            const href =
                $(element)
                    .attr(
                        "href"
                    );


            const title =
                $(element)
                    .find(
                        "h3"
                    )
                    .first()
                    .text();


            if (
                !href ||
                !title
            ) {
                return;
            }


            const container =
                $(element)
                    .closest(
                        "div"
                    );


            const snippet =
                container
                    .find(
                        "div"
                    )
                    .filter(
                        (
                            _,
                            node
                        ) => {

                            const text =
                                $(node)
                                    .text();

                            return (
                                text.length >
                                40 &&
                                text.length <
                                500
                            );

                        }
                    )
                    .first()
                    .text();


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
