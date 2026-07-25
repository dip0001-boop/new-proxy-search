const axios =
    require("axios");

const http =
    require("http");

const https =
    require("https");

const {
    storeSetCookies,
    getCookieHeader
} =
    require(
        "./proxySession"
    );


const httpAgent =
    new http.Agent({

        keepAlive:
            true,

        maxSockets:
            256,

        maxFreeSockets:
            64

    });


const httpsAgent =
    new https.Agent({

        keepAlive:
            true,

        maxSockets:
            256,

        maxFreeSockets:
            64

    });


const client =
    axios.create({

        httpAgent,

        httpsAgent,

        timeout:
            30000,

        maxRedirects:
            0,

        responseType:
            "arraybuffer",

        decompress:
            true,

        validateStatus:
            () => true

    });


const HOP_BY_HOP =
    new Set([

        "connection",

        "keep-alive",

        "proxy-authenticate",

        "proxy-authorization",

        "te",

        "trailer",

        "transfer-encoding",

        "upgrade",

        "host",

        "content-length"

    ]);


function buildHeaders(
    req,
    session,
    targetURL
) {
    const headers = {};


    const allowed = [

        "accept",

        "accept-language",

        "accept-encoding",

        "content-type",

        "referer",

        "origin",

        "range",

        "if-none-match",

        "if-modified-since",

        "user-agent"

    ];


    for (
        const name
        of allowed
    ) {
        const value =
            req.headers[
                name
            ];


        if (
            value
        ) {
            headers[name] =
                value;
        }
    }


    const cookies =
        getCookieHeader(
            session,
            targetURL
        );


    if (
        cookies
    ) {
        headers.cookie =
            cookies;
    }


    if (
        !headers[
            "user-agent"
        ]
    ) {
        headers[
            "user-agent"
        ] =
            "Mozilla/5.0";
    }


    return headers;
}


function getRequestBody(
    req
) {
    if (
        req.method ===
            "GET" ||

        req.method ===
            "HEAD"
    ) {
        return undefined;
    }


    return req.body;
}


async function request(
    req,
    session,
    targetURL
) {
    const response =
        await client.request({

            method:
                req.method,

            url:
                targetURL.toString(),

            headers:
                buildHeaders(
                    req,
                    session,
                    targetURL
                ),

            data:
                getRequestBody(
                    req
                ),

            validateStatus:
                () => true

        });


    storeSetCookies(

        session,

        response.headers[
            "set-cookie"
        ],

        targetURL

    );


    return response;
}


function copyHeaders(
    response,
    res
) {
    for (
        const [
            name,
            value
        ]
        of Object.entries(
            response.headers
        )
    ) {
        const lower =
            name.toLowerCase();


        if (
            HOP_BY_HOP.has(
                lower
            )
        ) {
            continue;
        }


        if (
            lower ===
            "location"
        ) {
            continue;
        }


        res.setHeader(
            name,
            value
        );
    }
}


module.exports = {
    request,
    copyHeaders
};
