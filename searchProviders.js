const axios = require("axios");
const config = require("./config");
const logger = require("./logger");

async function search(query, options = {}) {
    const apiKey = process.env.BRAVE_SEARCH_API_KEY;

    if (!apiKey || !apiKey.trim()) {
        throw new Error(
            "BRAVE_SEARCH_API_KEY is missing from the server environment"
        );
    }

    const count = Math.min(
        Math.max(Number(options.count) || 10, 1),
        20
    );

    const offset = Math.min(
        Math.max(Number(options.offset) || 0, 0),
        9
    );

    const response = await axios.get(
        "https://api.search.brave.com/res/v1/web/search",
        {
            params: {
                q: query,
                count,
                offset,
                country: config.search.defaultCountry,
                search_lang: config.search.defaultLanguage,
                extra_snippets: true
            },

            headers: {
                Accept: "application/json",
                "Accept-Encoding": "gzip",
                "X-Subscription-Token": apiKey.trim()
            },

            timeout: config.search.timeout,

            validateStatus: () => true
        }
    );

    if (response.status < 200 || response.status >= 300) {
        const apiMessage =
            response.data?.message ||
            response.data?.error ||
            `Brave API returned HTTP ${response.status}`;

        throw new Error(apiMessage);
    }

    const webResults =
        response.data?.web?.results || [];

    const results = webResults.map(result => ({
        title: result.title || "Untitled result",

        link: result.url || "",

        snippet: result.description || "",

        extraSnippets:
            result.extra_snippets || [],

        source:
            result.profile?.long_name ||
            result.profile?.name ||
            "Web",

        favicon:
            result.profile?.img || null,

        age:
            result.age || null
    }));

    return {
        provider: "Brave Search",

        results,

        total: results.length,

        moreResultsAvailable:
            response.data?.query?.more_results_available === true
    };
}

module.exports = {
    search
};
