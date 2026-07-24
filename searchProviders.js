const database = require("./database");

function search(query, options = {}) {
    const limit = Math.min(
        Math.max(Number(options.limit) || 10, 1),
        50
    );

    const results = database.searchPages(
        query,
        limit
    );

    return {
        provider: "THE VAULT INDEX",
        results: results.map(result => ({
            title: result.title,
            link: result.url,
            snippet:
                result.description ||
                result.content?.slice(0, 300) ||
                "No description available.",
            source: result.domain,
            crawledAt: result.crawled_at
        })),
        total: results.length
    };
}

module.exports = {
    search
};
