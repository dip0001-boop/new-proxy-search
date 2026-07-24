const express = require("express");
const path = require("path");
const fetch = require("node-fetch");
const cheerio = require("cheerio");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve index.html, style.css, and script.js
// directly from the root folder
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

        const response = await fetch(
            `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
            {
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Search request failed with status ${response.status}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        const results = [];

        $(".result").each((index, element) => {
            if (results.length >= 20) {
                return;
            }

            const titleElement = $(element).find(".result__a");
            const snippetElement = $(element).find(".result__snippet");
            const urlElement = $(element).find(".result__url");

            const title = titleElement.text().trim();
            const snippet = snippetElement.text().trim();
            const url = urlElement.text().trim();

            let link = titleElement.attr("href");

            if (!title || !link) {
                return;
            }

            if (link.startsWith("//")) {
                link = "https:" + link;
            }

            results.push({
                title,
                url,
                link,
                snippet
            });
        });

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

// Always serve index.html for normal page requests
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
    console.log(`THE VAULT SEARCH running on port ${PORT}`);
});
