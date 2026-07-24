const searchForm =
    document.getElementById(
        "searchForm"
    );

const searchInput =
    document.getElementById(
        "searchInput"
    );

const clearButton =
    document.getElementById(
        "clearButton"
    );

const homeSection =
    document.getElementById(
        "homeSection"
    );

const resultsSection =
    document.getElementById(
        "resultsSection"
    );

const resultsTitle =
    document.getElementById(
        "resultsTitle"
    );

const resultsMeta =
    document.getElementById(
        "resultsMeta"
    );

const loadingState =
    document.getElementById(
        "loadingState"
    );

const errorState =
    document.getElementById(
        "errorState"
    );

const errorMessage =
    document.getElementById(
        "errorMessage"
    );

const emptyState =
    document.getElementById(
        "emptyState"
    );

const resultsContainer =
    document.getElementById(
        "resultsContainer"
    );

const pagination =
    document.getElementById(
        "pagination"
    );

const previousPage =
    document.getElementById(
        "previousPage"
    );

const nextPage =
    document.getElementById(
        "nextPage"
    );

const pageNumber =
    document.getElementById(
        "pageNumber"
    );

const newSearchButton =
    document.getElementById(
        "newSearchButton"
    );

const retryButton =
    document.getElementById(
        "retryButton"
    );

const quickSearchButtons =
    document.querySelectorAll(
        "[data-query]"
    );


let currentQuery = "";

let currentPage = 1;

let lastSearchURL = "";


/* =================================
   HELPERS
================================= */

function getDisplayURL(url) {
    try {
        const parsed =
            new URL(url);

        return (
            parsed.hostname +
            parsed.pathname
        );

    } catch {
        return url;
    }
}


function getProxyURL(url) {
    return (
        "/proxy?url=" +
        encodeURIComponent(
            url
        )
    );
}


function escapeHTML(value) {
    const div =
        document.createElement(
            "div"
        );

    div.textContent =
        value || "";

    return div.innerHTML;
}


function show(element) {
    element.classList.remove(
        "hidden"
    );
}


function hide(element) {
    element.classList.add(
        "hidden"
    );
}


function resetStates() {
    hide(loadingState);

    hide(errorState);

    hide(emptyState);

    hide(pagination);

    resultsContainer.innerHTML =
        "";
}


/* =================================
   DISPLAY RESULTS
================================= */

function displayResults(data) {
    resultsContainer.innerHTML =
        "";

    if (
        !data.results ||
        data.results.length === 0
    ) {
        show(emptyState);

        resultsMeta.textContent =
            "No results found";

        return;
    }

    for (
        const result
        of data.results
    ) {
        const article =
            document.createElement(
                "article"
            );

        article.className =
            "search-result";

        const originalURL =
            String(
                result.link ||
                ""
            );

        const proxyURL =
            getProxyURL(
                originalURL
            );

        const safeProxyURL =
            escapeHTML(
                proxyURL
            );

        const displayURL =
            escapeHTML(
                getDisplayURL(
                    originalURL
                )
            );

        const title =
            escapeHTML(
                result.title ||
                "Untitled page"
            );

        const snippet =
            escapeHTML(
                result.snippet ||
                "No description available."
            );

        article.innerHTML = `
            <div class="result-url">
                ${displayURL}
            </div>

            <h3>
                <a
                    href="${safeProxyURL}"
                    class="proxy-result-link"
                >
                    ${title}
                </a>
            </h3>

            <p>
                ${snippet}
            </p>
        `;

        resultsContainer.appendChild(
            article
        );
    }

    resultsMeta.textContent =
        `${data.count || 0} results`;

    pageNumber.textContent =
        `PAGE ${currentPage}`;

    if (
        currentPage > 1
    ) {
        previousPage.disabled =
            false;

        show(previousPage);

    } else {
        previousPage.disabled =
            true;
    }

    show(pagination);
}


/* =================================
   SEARCH
================================= */

async function performSearch(
    query,
    page = 1
) {
    const cleanQuery =
        query.trim();

    if (
        !cleanQuery
    ) {
        return;
    }

    currentQuery =
        cleanQuery;

    currentPage =
        page;

    lastSearchURL =
        `/api/search?q=${encodeURIComponent(
            cleanQuery
        )}&page=${page}`;

    hide(homeSection);

    show(resultsSection);

    resetStates();

    show(loadingState);

    resultsTitle.textContent =
        `"${cleanQuery}"`;

    resultsMeta.textContent =
        "Searching...";

    window.scrollTo({
        top: 0,
        behavior: "instant"
    });

    try {
        const response =
            await fetch(
                lastSearchURL
            );

        if (
            !response.ok
        ) {
            throw new Error(
                `Server returned ${response.status}`
            );
        }

        const data =
            await response.json();

        hide(loadingState);

        displayResults(
            data
        );

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    } catch (error) {
        console.error(
            "SEARCH ERROR:",
            error
        );

        hide(loadingState);

        errorMessage.textContent =
            error.message ||
            "The search request failed.";

        show(errorState);

        resultsMeta.textContent =
            "Search failed";
    }
}


/* =================================
   SEARCH FORM
================================= */

searchForm.addEventListener(
    "submit",
    event => {
        event.preventDefault();

        performSearch(
            searchInput.value,
            1
        );
    }
);


/* =================================
   INPUT
================================= */

searchInput.addEventListener(
    "input",
    () => {
        if (
            searchInput.value.length > 0
        ) {
            show(clearButton);

        } else {
            hide(clearButton);
        }
    }
);


clearButton.addEventListener(
    "click",
    () => {
        searchInput.value =
            "";

        hide(clearButton);

        searchInput.focus();
    }
);


/* =================================
   NEW SEARCH
================================= */

newSearchButton.addEventListener(
    "click",
    () => {
        hide(resultsSection);

        show(homeSection);

        searchInput.value =
            "";

        searchInput.focus();

        currentQuery =
            "";

        currentPage =
            1;

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }
);


/* =================================
   PAGINATION
================================= */

previousPage.addEventListener(
    "click",
    () => {
        if (
            currentPage > 1
        ) {
            performSearch(
                currentQuery,
                currentPage - 1
            );
        }
    }
);


nextPage.addEventListener(
    "click",
    () => {
        performSearch(
            currentQuery,
            currentPage + 1
        );
    }
);


/* =================================
   RETRY
================================= */

retryButton.addEventListener(
    "click",
    () => {
        performSearch(
            currentQuery,
            currentPage
        );
    }
);


/* =================================
   QUICK SEARCHES
================================= */

quickSearchButtons.forEach(
    button => {
        button.addEventListener(
            "click",
            () => {
                const query =
                    button.dataset.query;

                searchInput.value =
                    query;

                show(clearButton);

                performSearch(
                    query,
                    1
                );
            }
        );
    }
);
