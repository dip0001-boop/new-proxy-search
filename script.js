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


function getDisplayURL(
    url
) {
    try {
        const parsed =
            new URL(
                url
            );

        return (
            parsed.hostname +
            parsed.pathname
        );

    } catch {
        return url;
    }
}


function getProxyURL(
    url
) {
    return (
        "/proxy?url=" +
        encodeURIComponent(
            url
        )
    );
}


function escapeHTML(
    value
) {
    const div =
        document.createElement(
            "div"
        );

    div.textContent =
        value || "";

    return div.innerHTML;
}


function show(
    element
) {
    if (
        element
    ) {
        element.classList.remove(
            "hidden"
        );
    }
}


function hide(
    element
) {
    if (
        element
    ) {
        element.classList.add(
            "hidden"
        );
    }
}


function resetStates() {
    hide(
        loadingState
    );

    hide(
        errorState
    );

    hide(
        emptyState
    );

    hide(
        pagination
    );

    resultsContainer.innerHTML =
        "";
}


function displayResults(
    data
) {
    resultsContainer.innerHTML =
        "";

    const results =
        Array.isArray(
            data.results
        )
            ? data.results
            : [];


    if (
        results.length ===
        0
    ) {
        show(
            emptyState
        );

        resultsMeta.textContent =
            "No results found";

        return;
    }


    for (
        const result
        of results
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
                result.url ||
                ""
            );


        if (
            !originalURL
        ) {
            continue;
        }


        const title =
            escapeHTML(
                result.title ||
                "Untitled page"
            );


        const snippet =
            escapeHTML(
                result.snippet ||
                result.description ||
                "No description available."
            );


        const proxyURL =
            getProxyURL(
                originalURL
            );


        article.innerHTML = `
            <div class="result-url">
                ${escapeHTML(
                    getDisplayURL(
                        originalURL
                    )
                )}
            </div>

            <h3>
                <a
                    href="${escapeHTML(
                        proxyURL
                    )}"
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
        `${results.length} results`;


    pageNumber.textContent =
        `PAGE ${currentPage}`;


    previousPage.disabled =
        currentPage <= 1;


    show(
        pagination
    );
}


async function performSearch(
    query,
    page = 1
) {
    const cleanQuery =
        String(
            query || ""
        ).trim();


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


    hide(
        homeSection
    );

    show(
        resultsSection
    );


    resetStates();

    show(
        loadingState
    );


    resultsTitle.textContent =
        `"${cleanQuery}"`;

    resultsMeta.textContent =
        "Searching...";


    try {
        const response =
            await fetch(
                lastSearchURL,
                {
                    headers: {
                        Accept:
                            "application/json"
                    }
                }
            );


        const text =
            await response.text();


        let data;


        try {
            data =
                JSON.parse(
                    text
                );

        } catch {
            throw new Error(
                "The server returned invalid JSON."
            );
        }


        if (
            !response.ok
        ) {
            throw new Error(
                data.error ||
                `Server returned ${response.status}`
            );
        }


        hide(
            loadingState
        );


        displayResults(
            data
        );


    } catch (
        error
    ) {
        console.error(
            "SEARCH ERROR:",
            error
        );


        hide(
            loadingState
        );


        errorMessage.textContent =
            error.message ||
            "The search request failed.";


        show(
            errorState
        );


        resultsMeta.textContent =
            "Search failed";
    }
}


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


searchInput.addEventListener(
    "input",
    () => {
        if (
            searchInput.value.length >
            0
        ) {
            show(
                clearButton
            );

        } else {
            hide(
                clearButton
            );
        }
    }
);


clearButton.addEventListener(
    "click",
    () => {
        searchInput.value =
            "";

        hide(
            clearButton
        );

        searchInput.focus();
    }
);


newSearchButton.addEventListener(
    "click",
    () => {
        hide(
            resultsSection
        );

        show(
            homeSection
        );

        searchInput.value =
            "";

        searchInput.focus();

        currentQuery =
            "";

        currentPage =
            1;
    }
);


previousPage.addEventListener(
    "click",
    () => {
        if (
            currentPage >
            1
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


retryButton.addEventListener(
    "click",
    () => {
        performSearch(
            currentQuery,
            currentPage
        );
    }
);


quickSearchButtons.forEach(
    button => {
        button.addEventListener(
            "click",
            () => {
                const query =
                    button.dataset.query;

                searchInput.value =
                    query;

                show(
                    clearButton
                );

                performSearch(
                    query,
                    1
                );
            }
        );
    }
);
