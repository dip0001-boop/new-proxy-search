function getHeader(
    headers,
    name
) {

    if (
        !headers
    ) {

        return "";

    }


    const target =
        name.toLowerCase();


    for (
        const key
        of Object.keys(
            headers
        )
    ) {

        if (
            key.toLowerCase() ===
            target
        ) {

            return headers[
                key
            ];

        }

    }


    return "";

}


function contentType(
    headers
) {

    return String(

        getHeader(
            headers,
            "content-type"
        )

    )

        .split(
            ";"
        )[0]

        .trim()

        .toLowerCase();

}


function isCompressible(
    type
) {

    return (

        type.startsWith(
            "text/"
        ) ||

        type.includes(
            "javascript"
        ) ||

        type.includes(
            "json"
        ) ||

        type.includes(
            "xml"
        ) ||

        type.includes(
            "svg"
        )

    );

}


function isStream(
    value
) {

    return (

        value &&

        typeof value.pipe ===
            "function"

    );

}


function byteLength(
    value
) {

    if (
        Buffer.isBuffer(
            value
        )
    ) {

        return value.length;

    }


    if (
        typeof value ===
        "string"
    ) {

        return Buffer.byteLength(
            value
        );

    }


    return 0;

}


function removeHopByHopHeaders(
    headers
) {

    const result =
        {};


    const blocked =
        new Set([

            "connection",

            "keep-alive",

            "proxy-authenticate",

            "proxy-authorization",

            "te",

            "trailer",

            "transfer-encoding",

            "upgrade"

        ]);


    for (
        const [
            key,
            value
        ]
        of Object.entries(
            headers ||
            {}
        )
    ) {

        if (
            !blocked.has(
                key.toLowerCase()
            )
        ) {

            result[
                key
            ] =
                value;

        }

    }


    return result;

}


module.exports = {

    getHeader,

    contentType,

    isCompressible,

    isStream,

    byteLength,

    removeHopByHopHeaders

};
