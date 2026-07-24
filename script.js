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


let currentQuery =
    "";


let currentPage =
    1;


let activeRequest =
    0;


let currentController =
    null;


function getDisplayURL(
    url
) {
    try {
        const parsed =
            new URL(
                url
            );


        let display =
            parsed.hostname;


        if (
            parsed.pathname &&
            parsed.pathname !== "/"
        ) {
            display +=
                parsed.pathname;
        }


        return display;

    } catch {
        return String(
            url ||
            ""
        );
    }
}


function escapeHTML(
    value
) {
    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        String(
            value ||
            ""
        );


    return div.innerHTML;
}


function show(
    element
) {
    if (
        element
    ) {
        element.classList
            .remove(
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
        element.classList
            .add(
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


    resultsContainer
        .innerHTML =
        "";
}


function setLoading(
    loading
) {
    if (
        loading
    ) {
        show(
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

    } else {
        hide(
            loadingState
        );
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


function displayResults(
    data
) {
    resultsContainer
        .innerHTML =
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


        hide(
            pagination
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
                ""
            );


        const proxyURL =
            getProxyURL(
                originalURL
            );


        const title =
            escapeHTML(
                result.title ||
                "Untitled page"
            );


        const displayURL =
            escapeHTML(
                getDisplayURL(
                    originalURL
                )
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
                    href="${escapeHTML(
                        proxyURL
                    )}"
                    data-proxy-url="${escapeHTML(
                        originalURL
                    )}"
                >
                    ${title}
                </a>
            </h3>

            <p>
                ${snippet}
            </p>
        `;


        const link =
            article.querySelector(
                "a"
            );


        link.addEventListener(
            "click",
            event => {
                event.preventDefault();


                const url =
                    link.dataset
                        .proxyUrl;


                if (
                    url
                ) {
                    window.location.href =
                        getProxyURL(
                            url
                        );
                }
            }
        );


        resultsContainer
            .appendChild(
                article
            );
    }


    resultsMeta.textContent =
        `${results.length} results`;


    pageNumber.textContent =
        `PAGE ${currentPage}`;


    if (
        currentPage >
        1
    ) {
        show(
            previousPage
        );

    } else {
        hide(
            previousPage
        );
    }


    if (
        results.length >=
        10
    ) {
        show(
            nextPage
        );

    } else {
        hide(
            nextPage
        );
    }


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
            query ||
            ""
        )
            .trim();


    if (
        !cleanQuery
    ) {
        searchInput.focus();

        return;
    }


    if (
        currentController
    ) {
        currentController
            .abort();
    }


    currentController =
        new AbortController();


    const requestID =
        ++activeRequest;


    currentQuery =
        cleanQuery;


    currentPage =
        Math.max(
            Number(
                page
            ) || 1,
            1
        );


    const searchURL =
        `/api/search?q=${
            encodeURIComponent(
                cleanQuery
            )
        }&page=${
            currentPage
        }`;


    hide(
        homeSection
    );


    show(
        resultsSection
    );


    resetStates();


    setLoading(
        true
    );


    resultsTitle.textContent =
        `"${cleanQuery}"`;


    resultsMeta.textContent =
        "Searching...";


    try {
        const response =
            await fetch(
                searchURL,
                {
                    signal:
                        currentController
                            .signal,

                    headers: {
                        Accept:
                            "application/json"
                    }
                }
            );


        if (
            !response.ok
        ) {
            let message =
                `Server returned ${
                    response.status
                }`;


            try {
                const errorData =
                    await response
                        .json();


                if (
                    errorData.error
                ) {
                    message =
                        errorData.error;
                }

            } catch {
                // Ignore invalid JSON
            }


            throw new Error(
                message
            );
        }


        const data =
            await response
                .json();


        if (
            requestID !==
            activeRequest
        ) {
            return;
        }


        setLoading(
            false
        );


        displayResults(
            data
        );

    } catch (
        error
    ) {
        if (
            error.name ===
            "AbortError"
        ) {
            return;
        }


        if (
            requestID !==
            activeRequest
        ) {
            return;
        }


        console.error(
            "SEARCH ERROR:",
            error
        );


        setLoading(
            false
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
            searchInput.value
                .length > 0
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
                currentPage -
                1
            );
        }
    }
);


nextPage.addEventListener(
    "click",
    () => {
        performSearch(
            currentQuery,
            currentPage +
            1
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


quickSearchButtons
    .forEach(
        button => {
            button.addEventListener(
                "click",
                () => {
                    const query =
                        button.dataset
                            .query;


                    searchInput.value =
                        query;


                    performSearch(
                        query,
                        1
                    );
                }
            );
        }
    );
