function isHTTPURL(
    value
) {

    try {

        const url =
            new URL(
                value
            );


        return (

            url.protocol ===
                "http:" ||

            url.protocol ===
                "https:"

        );

    } catch {

        return false;

    }

}


function getContentType(
    headers
) {

    return String(

        headers?.[
            "content-type"
        ] ||

        ""

    )

        .split(
            ";"
        )[0]

        .trim()

        .toLowerCase();

}


function isHTML(
    contentType
) {

    return (

        contentType ===
            "text/html" ||

        contentType ===
            "application/xhtml+xml"

    );

}


function isCSS(
    contentType
) {

    return (

        contentType ===
            "text/css"

    );

}


function isText(
    contentType
) {

    return (

        isHTML(
            contentType
        ) ||

        isCSS(
            contentType
        ) ||

        contentType.includes(
            "javascript"
        ) ||

        contentType.includes(
            "json"
        ) ||

        contentType.startsWith(
            "text/"
        )

    );

}


function safeHeaderValue(
    value
) {

    return String(
        value ||
        ""
    )

        .replace(
            /[\r\n]/g,
            ""
        );

}


function makeCacheKey(
    method,
    url
) {

    return (

        String(
            method ||
            "GET"
        )

            .toUpperCase() +

        ":" +

        String(
            url ||
            ""
        )

    );

}


module.exports = {

    isHTTPURL,

    getContentType,

    isHTML,

    isCSS,

    isText,

    safeHeaderValue,

    makeCacheKey

};
