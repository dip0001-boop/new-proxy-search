const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");

const resultsSection = document.getElementById("resultsSection");
const resultsContainer = document.getElementById("results");

const resultsTitle = document.getElementById("resultsTitle");
const resultsInfo = document.getElementById("resultsInfo");

const loading = document.getElementById("loading");
const noResults = document.getElementById("noResults");

const newSearchButton = document.getElementById("newSearchButton");

searchForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const query = searchInput.value.trim();

    if (!query) return;

    performSearch(query);
});

newSearchButton.addEventListener("click", function () {
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

    searchInput.focus();
});

async function performSearch(query) {

    resultsSection.classList.remove("hidden");

    resultsContainer.innerHTML = "";

    noResults.classList.add("hidden");

    loading.classList.remove("hidden");

    resultsTitle.textContent = `Results for "${query}"`;

    resultsInfo.textContent = "Searching...";

    history.pushState(
        {},
        "",
        `?q=${encodeURIComponent(query)}`
    );

    try {

        const response = await fetch(
            `/api/search?q=${encodeURIComponent(query)}`
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Search failed");
        }

        loading.classList.add("hidden");

        resultsInfo.textContent =
            `${data.resultCount} results • ${data.searchTime}ms`;

        if (!data.results || data.results.length === 0) {
            noResults.classList.remove("hidden");
            return;
        }

        data.results.forEach(result => {

            const resultElement = document.createElement("article");

            resultElement.className = "result";

            resultElement.innerHTML = `
                <a
                    class="result-title"
                    href="${escapeAttribute(result.link)}"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    ${escapeHTML(result.title)}
                </a>

                <div class="result-url">
                    ${escapeHTML(result.url)}
                </div>

                <div class="result-snippet">
                    ${escapeHTML(result.snippet)}
                </div>
            `;

            resultsContainer.appendChild(resultElement);
        });

        resultsSection.scrollIntoView({
            behavior: "smooth"
        });

    } catch (error) {

        loading.classList.add("hidden");

        resultsInfo.textContent = "Search failed";

        resultsContainer.innerHTML = `
            <div class="no-results">
                <div class="empty-icon">!</div>
                <h2>Search unavailable</h2>
                <p>${escapeHTML(error.message)}</p>
            </div>
        `;
    }
}

function quickSearch(query) {
    searchInput.value = query;
    performSearch(query);
}

function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {

    return String(value)
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

const params = new URLSearchParams(window.location.search);
const existingQuery = params.get("q");

if (existingQuery) {
    searchInput.value = existingQuery;
    performSearch(existingQuery);
}
