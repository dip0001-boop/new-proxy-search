const searchForm =
    document.getElementById("searchForm");

const searchInput =
    document.getElementById("searchInput");

const clearButton =
    document.getElementById("clearButton");

const resultsSection =
    document.getElementById("resultsSection");

const resultsTitle =
    document.getElementById("resultsTitle");

const resultsMeta =
    document.getElementById("resultsMeta");

const resultsContainer =
    document.getElementById("resultsContainer");

const loadingState =
    document.getElementById("loadingState");

const errorState =
    document.getElementById("errorState");

const errorMessage =
    document.getElementById("errorMessage");

const emptyState =
    document.getElementById("emptyState");

const retryButton =
    document.getElementById("retryButton");

const newSearchButton =
    document.getElementById("newSearchButton");

const quickSearchButtons =
    document.querySelectorAll(
        ".quick-searches button"
    );


let lastSearch = "";


// ================================
// SEARCH FORM
// ================================

searchForm.addEventListener(
    "submit",
    event => {

        event.preventDefault();

        const query =
            searchInput.value.trim();

        if (!query) {
            searchInput.focus();
            return;
        }

        performSearch(query);
    }
);


// ================================
// SEARCH
// ================================

async function performSearch(query) {

    lastSearch = query;

    resultsSection.classList.remove(
        "hidden"
    );

    loadingState.classList.remove(
        "hidden"
    );

    errorState.classList.add(
        "hidden"
    );

    emptyState.classList.add(
        "hidden"
    );

    resultsContainer.innerHTML = "";

    resultsTitle.textContent =
        `Results for "${query}"`;

    resultsMeta.textContent =
        "Searching...";


    history.pushState(
        {},
        "",
        `?q=${encodeURIComponent(query)}`
    );


    resultsSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });


    try {

        const response =
            await fetch(
                `/api/search?q=${encodeURIComponent(query)}`
            );


        const data =
            await response.json();


        if (!response.ok) {
            throw new Error(
                data.error ||
                "Search request failed"
            );
        }


        loadingState.classList.add(
            "hidden"
        );


        if (
            !data.results ||
            data.results.length === 0
        ) {

            emptyState.classList.remove(
                "hidden"
            );

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


        renderResults(
            data.results
        );


    } catch (error) {

        loadingState.classList.add(
            "hidden"
        );

        errorState.classList.remove(
            "hidden"
        );

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
            document.createElement(
                "article"
            );


        card.className =
            "result-card";


        const title =
            document.createElement(
                "a"
            );

        title.className =
            "result-title";

        title.textContent =
            result.title;

        title.href =
            result.link;

        title.target =
            "_blank";

        title.rel =
            "noopener noreferrer";


        const url =
            document.createElement(
                "div"
            );

        url.className =
            "result-url";

        url.textContent =
            getDisplayURL(
                result.link
            );


        const snippet =
            document.createElement(
                "div"
            );

        snippet.className =
            "result-snippet";

        snippet.textContent =
            result.snippet ||
            "No description available.";


        const source =
            document.createElement(
                "span"
            );

        source.className =
            "result-source";

        source.textContent =
            result.source ||
            "WEB";


        card.appendChild(
            title
        );

        card.appendChild(
            url
        );

        card.appendChild(
            snippet
        );

        card.appendChild(
            source
        );


        fragment.appendChild(
            card
        );

    });


    resultsContainer.appendChild(
        fragment
    );
}


// ================================
// URL DISPLAY
// ================================

function getDisplayURL(url) {

    try {

        return new URL(url).hostname;

    } catch {

        return url;
    }
}


// ================================
// QUICK SEARCH BUTTONS
// ================================

quickSearchButtons.forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                const query =
                    button.dataset.query;

                searchInput.value =
                    query;

                updateClearButton();

                performSearch(
                    query
                );
            }
        );

    }
);


// ================================
// CLEAR BUTTON
// ================================

searchInput.addEventListener(
    "input",
    updateClearButton
);


clearButton.addEventListener(
    "click",
    () => {

        searchInput.value =
            "";

        updateClearButton();

        searchInput.focus();
    }
);


function updateClearButton() {

    clearButton.classList.toggle(
        "hidden",
        !searchInput.value
    );
}


// ================================
// RETRY
// ================================

retryButton.addEventListener(
    "click",
    () => {

        if (lastSearch) {

            performSearch(
                lastSearch
            );
        }
    }
);


// ================================
// NEW SEARCH
// ================================

newSearchButton.addEventListener(
    "click",
    () => {

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

        searchInput.focus();
    }
);


// ================================
// URL SEARCH SUPPORT
// ================================

const params =
    new URLSearchParams(
        window.location.search
    );


const existingQuery =
    params.get("q");


if (existingQuery) {

    searchInput.value =
        existingQuery;

    updateClearButton();

    performSearch(
        existingQuery
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
            document.activeElement !==
            searchInput
        ) {

            event.preventDefault();

            searchInput.focus();
        }

    }
);
