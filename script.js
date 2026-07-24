const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const clearButton = document.getElementById("clearButton");

const homeSection = document.getElementById("homeSection");
const resultsSection = document.getElementById("resultsSection");

const resultsTitle = document.getElementById("resultsTitle");
const resultsMeta = document.getElementById("resultsMeta");
const resultsContainer = document.getElementById("resultsContainer");

const loadingState = document.getElementById("loadingState");
const errorState = document.getElementById("errorState");
const errorMessage = document.getElementById("errorMessage");
const emptyState = document.getElementById("emptyState");

const retryButton = document.getElementById("retryButton");
const newSearchButton = document.getElementById("newSearchButton");

const pagination = document.getElementById("pagination");
const previousPage = document.getElementById("previousPage");
const nextPage = document.getElementById("nextPage");
const pageNumber = document.getElementById("pageNumber");

const quickSearchButtons = document.querySelectorAll(
    ".quick-searches button"
);

let currentQuery = "";
let currentPage = 1;


// ================================
// SEARCH FORM
// ================================

searchForm.addEventListener("submit", event => {
    event.preventDefault();

    const query = searchInput.value.trim();

    if (!query) {
        searchInput.focus();
        return;
    }

    performSearch(query, 1);
});


// ================================
// PERFORM SEARCH
// ================================

async function performSearch(query, page = 1) {

    currentQuery = query;
    currentPage = page;

    resultsSection.classList.remove("hidden");

    loadingState.classList.remove("hidden");
    errorState.classList.add("hidden");
    emptyState.classList.add("hidden");
    pagination.classList.add("hidden");

    resultsContainer.innerHTML = "";

    resultsTitle.textContent = `Results for "${query}"`;
    resultsMeta.textContent = "Searching...";

    searchInput.value = query;

    updateClearButton();

    const url =
        `?q=${encodeURIComponent(query)}&page=${page}`;

    window.history.pushState({}, "", url);

    if (page === 1) {
        homeSection.classList.add("searching");
    }

    resultsSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

    try {

        const response = await fetch(
            `/api/search?q=${encodeURIComponent(query)}&page=${page}`
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "Search request failed."
            );
        }

        loadingState.classList.add("hidden");

        if (
            !data.results ||
            data.results.length === 0
        ) {
            emptyState.classList.remove("hidden");

            resultsMeta.textContent =
                "No results found";

            return;
        }

        const cachedText =
            data.cached
                ? " • CACHED"
                : "";

        resultsMeta.textContent =
            `${data.count} results • ` +
            `${data.time}ms` +
            cachedText;

        renderResults(data.results);

        updatePagination(
            data.results.length
        );

    } catch (error) {

        loadingState.classList.add("hidden");

        errorState.classList.remove("hidden");

        errorMessage.textContent =
            error.message ||
            "The search service is unavailable.";

        resultsMeta.textContent =
            "Search failed";
    }
}


// ================================
// RENDER RESULTS
// ================================

function renderResults(results) {

    const fragment =
        document.createDocumentFragment();

    results.forEach(result => {

        const card =
            document.createElement("article");

        card.className = "result-card";


        const title =
            document.createElement("a");

        title.className = "result-title";

        title.textContent =
            result.title ||
            "Untitled result";

        title.href =
            result.link;

        title.target =
            "_blank";

        title.rel =
            "noopener noreferrer";


        const url =
            document.createElement("div");

        url.className = "result-url";

        url.textContent =
            getDisplayURL(result.link);


        const snippet =
            document.createElement("div");

        snippet.className =
            "result-snippet";

        snippet.textContent =
            result.snippet ||
            "No description available.";


        card.appendChild(title);
        card.appendChild(url);
        card.appendChild(snippet);

        fragment.appendChild(card);
    });

    resultsContainer.appendChild(fragment);
}


// ================================
// PAGINATION
// ================================

function updatePagination(resultCount) {

    pagination.classList.remove("hidden");

    pageNumber.textContent =
        `PAGE ${currentPage}`;

    previousPage.disabled =
        currentPage <= 1;

    /*
     * If we receive fewer than 10 results,
     * we assume this is the final page.
     */

    nextPage.disabled =
        resultCount < 10;
}


previousPage.addEventListener("click", () => {

    if (currentPage > 1) {

        performSearch(
            currentQuery,
            currentPage - 1
        );
    }
});


nextPage.addEventListener("click", () => {

    if (!nextPage.disabled) {

        performSearch(
            currentQuery,
            currentPage + 1
        );
    }
});


// ================================
// QUICK SEARCH BUTTONS
// ================================

quickSearchButtons.forEach(button => {

    button.addEventListener("click", () => {

        const query =
            button.dataset.query;

        searchInput.value = query;

        updateClearButton();

        performSearch(query, 1);
    });

});


// ================================
// CLEAR BUTTON
// ================================

searchInput.addEventListener(
    "input",
    updateClearButton
);


clearButton.addEventListener("click", () => {

    searchInput.value = "";

    updateClearButton();

    searchInput.focus();
});


function updateClearButton() {

    clearButton.classList.toggle(
        "hidden",
        !searchInput.value
    );
}


// ================================
// RETRY
// ================================

retryButton.addEventListener("click", () => {

    if (currentQuery) {

        performSearch(
            currentQuery,
            currentPage
        );
    }
});


// ================================
// NEW SEARCH
// ================================

newSearchButton.addEventListener("click", () => {

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

    searchInput.focus();
});


// ================================
// URL SEARCH SUPPORT
// ================================

const params =
    new URLSearchParams(
        window.location.search
    );

const existingQuery =
    params.get("q");

const existingPage =
    Number.parseInt(
        params.get("page"),
        10
    );


if (existingQuery) {

    const page =
        Number.isInteger(existingPage) &&
        existingPage > 0
            ? existingPage
            : 1;

    searchInput.value =
        existingQuery;

    updateClearButton();

    performSearch(
        existingQuery,
        page
    );
}


// ================================
// KEYBOARD SHORTCUT
// ================================

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "/" &&
            document.activeElement !== searchInput
        ) {

            event.preventDefault();

            searchInput.focus();
        }
    }
);
