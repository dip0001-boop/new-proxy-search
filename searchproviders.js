const axios = require("axios");
const cheerio = require("cheerio");
const config = require("./config");
const logger = require("./logger");

function createClient() {
    return axios.create({
        timeout: config.search.timeout,
        headers: {
            "User-Agent": config.search.userAgent,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9"
        },
        maxRedirects: 5,
        validateStatus: status => status >= 200 && status < 400
    });
}

function cleanText(text) {
    return String(text || "")
        .replace(/\s+/g, " ")
        .trim();
}

function parseDuckDuckGo(html, maxResults) {
    const $ = cheerio.load(html);
    const results = [];

    $(".result").each((index, element) => {
        if (results.length >= maxResults) {
            return;
        }

        const titleElement = $(element).find(
            ".result__a, .result__title a"
        );

        const snippetElement = $(element).find(
            ".result__snippet"
        );

        let link = titleElement.attr("href");

        const title = cleanText(
            titleElement.text()
        );

        const snippet = cleanText(
            snippetElement.text()
        );

        if (!title || !link) {
            return;
        }

        if (link.startsWith("//")) {
            link = "https:" + link;
        }

        results.push({
            title,
            link,
            snippet,
            source: "DuckDuckGo"
        });
    });

    return results;
}

async function searchDuckDuckGo(query) {
    const client = createClient();

    const url =
        "https://html.duckduckgo.com/html/?q=" +
        encodeURIComponent(query);

    const response = await client.get(url);

    const results = parseDuckDuckGo(
        response.data,
        config.search.maxResults
    );

    if (!results.length) {
        throw new Error(
            "DuckDuckGo returned no usable results"
        );
    }

    return results;
}

async function searchBrave(query) {
    if (!process.env.BRAVE_SEARCH_API_KEY) {
        throw new Error(
            "Brave Search API key is not configured"
        );
    }

    const client = axios.create({
        timeout: config.search.timeout,
        headers: {
            "X-Subscription-Token":
                process.env.BRAVE_SEARCH_API_KEY,
            "Accept": "application/json"
        }
    });

    const response = await client.get(
        "https://api.search.brave.com/res/v1/web/search",
        {
            params: {
                q: query,
                count: config.search.maxResults
            }
        }
    );

    const results =
        response.data?.web?.results || [];

    return results.map(result => ({
        title: cleanText(result.title),
        link: result.url,
        snippet: cleanText(result.description),
        source: "Brave Search"
    }));
}

async function search(query) {
    const providers = [
        {
            name: "DuckDuckGo",
            search: searchDuckDuckGo
        }
    ];

    if (process.env.BRAVE_SEARCH_API_KEY) {
        providers.push({
            name: "Brave Search",
            search: searchBrave
        });
    }

    let lastError = null;

    for (const provider of providers) {
        try {
            logger.info(
                `Trying search provider: ${provider.name}`
            );

            const results =
                await provider.search(query);

            if (results.length > 0) {
                logger.info(
                    `${provider.name} returned ${results.length} results`
                );

                return {
                    provider: provider.name,
                    results
                };
            }

        } catch (error) {
            lastError = error;

            logger.warn(
                `${provider.name} failed`,
                error.message
            );
        }
    }

    throw lastError || new Error(
        "All search providers failed"
    );
}

module.exports = {
    search
};
