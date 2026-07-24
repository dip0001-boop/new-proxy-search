const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const resultsContainer = document.getElementById("results");
const statusElement = document.getElementById("status");

let currentPage = 1;
let currentQuery = "";

function getDisplayURL(url) {
    try {
        const parsed = new URL(url);

        return (
            parsed.hostname +
            parsed.pathname
        );

    } catch {
        return url;
    }
}

function escapeHTML(value) {
    const div =
        document.createElement("div");

    div.textContent =
        value || "";

    return div.innerHTML;
}

function showStatus(message) {
    if (statusElement) {
        statusElement.textContent =
            message;
    }
}

function renderResults(data) {
    if (!resultsContainer) {
        return;
    }

    resultsContainer.innerHTML = "";

    if (
        !data.results ||
        data.results.length === 0
    ) {
        resultsContainer.innerHTML = `
            <div class="no-results">
                No results found.
            </div>
        `;

        return;
    }

    for (
        const result
        of data.results
    ) {
        const resultElement =
            document.createElement("article");

        resultElement.className =
            "search-result";

        resultElement.innerHTML = `
            <div class="result-url">
                ${escapeHTML(
                    getDisplayURL(
                        result.link
                    )
                )}
            </div>

            <h2>
                <a
                    href="${escapeHTML(
                        result.link
                    )}"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    ${escapeHTML(
                        result.title
                    )}
                </a>
            </h2>

            <p>
                ${escapeHTML(
                    result.snippet
                )}
            </p>
        `;

        resultsContainer.appendChild(
            resultElement
        );
    }
}

async function search(query, page = 1) {
    const cleanQuery =
        query.trim();

    if (!cleanQuery) {
        return;
    }

    currentQuery =
        cleanQuery;

    currentPage =
        page;

    showStatus(
        "Searching..."
    );

    if (resultsContainer) {
        resultsContainer.innerHTML = "";
    }

    try {
        const response =
            await fetch(
                `/api/search?q=${encodeURIComponent(
                    cleanQuery
                )}&page=${page}`
            );

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}`
            );
        }

        const data =
            await response.json();

        renderResults(
            data
        );

        showStatus(
            `${data.count || 0} results`
        );

    } catch (error) {
        console.error(
            "SEARCH ERROR:",
            error
        );

        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="search-error">
                    Search failed.
                    Please try again.
                </div>
            `;
        }

        showStatus(
            "Search failed"
        );
    }
}

if (searchButton) {
    searchButton.addEventListener(
        "click",
        () => {
            search(
                searchInput.value,
                1
            );
        }
    );
}

if (searchInput) {
    searchInput.addEventListener(
        "keydown",
        event => {
            if (
                event.key === "Enter"
            ) {
                search(
                    searchInput.value,
                    1
                );
            }
        }
    );
}
