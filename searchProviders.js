const axios = require("axios");
const cheerio = require("cheerio");

const USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36";

const providers = [
    {
        name: "Google",

        async search(query, page = 1) {

            const start =
                (page - 1) * 10;

            const response =
                await axios.get(
                    "https://www.google.com/search",
                    {
                        params: {
                            q: query,
                            num: 10,
                            start
                        },

                        headers: {
                            "User-Agent":
                                USER_AGENT,

                            "Accept-Language":
                                "en-AU,en;q=0.9"
                        },

                        timeout: 15000
                    }
                );

            const $ =
                cheerio.load(
                    response.data
                );

            const results = [];

            $("a").each(
                (_, element) => {

                    const link =
                        $(element).attr("href");

                    const title =
                        $(element)
                            .find("h3")
                            .first()
                            .text()
                            .trim();

                    if (
                        !link ||
                        !title ||
                        !link.startsWith("http")
                    ) {
                        return;
                    }

                    const container =
                        $(element).closest(
                            "div"
                        );

                    const text =
                        container
                            .text()
                            .replace(
                                title,
                                ""
                            )
                            .trim();

                    results.push({

                        title,

                        link,

                        snippet:
                            text
                                .slice(
                                    0,
                                    500
                                ),

                        source:
                            "Web Search"
                    });
                }
            );


            const unique =
                [];

            const seen =
                new Set();


            for (
                const result
                of results
            ) {

                if (
                    !seen.has(
                        result.link
                    )
                ) {

                    seen.add(
                        result.link
                    );

                    unique.push(
                        result
                    );
                }
            }


            return unique.slice(
                0,
                10
            );
        }
    },


    {
        name: "Bing",

        async search(query, page = 1) {

            const first =
                ((page - 1) * 10) + 1;

            const response =
                await axios.get(
                    "https://www.bing.com/search",
                    {
                        params: {
                            q: query,
                            count: 10,
                            first
                        },

                        headers: {
                            "User-Agent":
                                USER_AGENT,

                            "Accept-Language":
                                "en-AU,en;q=0.9"
                        },

                        timeout: 15000
                    }
                );

            const $ =
                cheerio.load(
                    response.data
                );

            const results = [];

            $("li.b_algo").each(
                (_, element) => {

                    const title =
                        $(element)
                            .find("h2")
                            .text()
                            .trim();

                    const link =
                        $(element)
                            .find("h2 a")
                            .attr("href");

                    const snippet =
                        $(element)
                            .find(
                                ".b_caption p"
                            )
                            .text()
                            .trim();

                    if (
                        title &&
                        link
                    ) {

                        results.push({

                            title,

                            link,

                            snippet,

                            source:
                                "Web Search"
                        });
                    }
                }
            );


            return results.slice(
                0,
                10
            );
        }
    }
];


async function search(
    query,
    options = {}
) {

    const page =
        Math.max(
            Number(
                options.page
            ) || 1,
            1
        );


    let lastError;


    for (
        const provider
        of providers
    ) {

        try {

            const results =
                await provider.search(
                    query,
                    page
                );


            if (
                results.length > 0
            ) {

                return {

                    provider:
                        provider.name,

                    results,

                    total:
                        results.length
                };
            }

        } catch (error) {

            lastError =
                error;

            console.error(
                `${provider.name} search failed:`,
                error.message
            );
        }
    }


    throw new Error(
        lastError?.message ||
        "All search providers failed."
    );
}


module.exports = {
    search
};
