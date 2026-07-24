const axios = require("axios");
const config = require("./config");
const logger = require("./logger");

const braveClient = axios.create({
    baseURL: "https://api.search.brave.com/res/v1",
    timeout: config.search.timeout,
    headers: {
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token":
            process.env.BRAVE_SEARCH_API_KEY
    }
});

async function search(query, options = {}) {
    const apiKey =
        process.env.BRAVE_SEARCH_API_KEY;

    if (!apiKey) {
        throw new Error(
            "BRAVE_SEARCH_API_KEY is not configured"
        );
    }

    const count =
        Math.min(
            Number(options.count) || 10,
            20
        );

    const offset =
        Math.max(
            Number(options.offset) || 0,
            0
        );

    logger.info(
        `Searching Brave for: "${query}"`
    );

    const response =
        await braveClient.get(
            "/web/search",
            {
                params: {
                    q: query,
                    count,
                    offset,

                    country: "AU",

                    search_lang: "en",

                    safesearch: "moderate",

                    extra_snippets: true
                }
            }
        );


    const webResults =
        response.data?.web?.results || [];


    const results =
        webResults.map(result => ({

            title:
                result.title || "",

            link:
                result.url || "",

            snippet:
                result.description || "",

            extraSnippets:
                result.extra_snippets || [],

            source:
                "Web",

            favicon:
                result.profile?.img || null,

            age:
                result.age || null

        }));


    return {

        provider:
            "Brave Search",

        results,

        total:
            results.length

    };
}


module.exports = {
    search
};
