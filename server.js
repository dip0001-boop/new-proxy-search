const express = require("express");
const path = require("path");
const fetch = require("node-fetch");
const cheerio = require("cheerio");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

app.get("/api/search", async (req, res) => {
    try {
        const query = req.query.q;

        if (!query || !query.trim()) {
            return res.status(400).json({
                error: "Search query is required"
            });
        }

        const startTime = Date.now();

        const searchURL =
            "https://html.duckduckgo.com/html/?q=" +
            encodeURIComponent(query);

        const response = await fetch(searchURL, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                "Accept":
                    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9"
            }
        });

        if (!response.ok) {
            throw new Error(
                `DuckDuckGo returned status ${response.status}`
            );
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        const results = [];

        $(".result").each((index, element) => {
            if (results.length >= 20) return;

            const titleElement = $(element).find(
                ".result__title a, .result__a"
            );

            const snippetElement = $(element).find(
                ".result__snippet"
            );

            const urlElement = $(element).find(
                ".result__url"
            );

            const title = titleElement.text().trim();
            const snippet = snippetElement.text().trim();

            let link = titleElement.attr("href") || "";

            let url = urlElement.text().trim();

            if (!title || !link) return;

            if (link.startsWith("//")) {
                link = "https:" + link;
            }

            results.push({
                title,
                link,
                url,
                snippet
            });
        });

        console.log(
            `Search: "${query}" | Results found: ${results.length}`
        );

        res.json({
            query,
            results,
            resultCount: results.length,
            searchTime: Date.now() - startTime
        });

    } catch (error) {
        console.error("Search error:", error);

        res.status(500).json({
            error: "Search failed",
            message: error.message
        });
    }
});

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
    console.log(`THE VAULT SEARCH running on port ${PORT}`);
});
