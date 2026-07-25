function normaliseDomain(
    domain
) {

    return String(
        domain ||
        ""
    )
        .toLowerCase()
        .replace(
            /^\./,
            ""
        );

}


function domainMatches(
    cookieDomain,
    hostname
) {

    const domain =
        normaliseDomain(
            cookieDomain
        );


    const host =
        String(
            hostname ||
            ""
        )
            .toLowerCase();


    return (

        host ===
        domain ||

        host.endsWith(
            "." +
            domain
        )

    );

}


function pathMatches(
    cookiePath,
    requestPath
) {

    const cookie =
        cookiePath ||
        "/";


    const request =
        requestPath ||
        "/";


    if (
        request ===
        cookie
    ) {

        return true;

    }


    if (
        request.startsWith(
            cookie.endsWith(
                "/"
            )
                ? cookie
                : cookie + "/"
        )
    ) {

        return true;

    }


    return false;

}


function parseSetCookie(
    header,
    targetURL
) {

    const parts =
        String(
            header ||
            ""
        )
            .split(
                ";"
            )
            .map(
                part =>
                    part.trim()
            );


    if (
        !parts.length
    ) {

        return null;

    }


    const first =
        parts.shift();


    const separator =
        first.indexOf(
            "="
        );


    if (
        separator <=
        0
    ) {

        return null;

    }


    const cookie = {

        name:
            first
                .slice(
                    0,
                    separator
                )
                .trim(),

        value:
            first
                .slice(
                    separator + 1
                )
                .trim(),

        domain:
            targetURL.hostname,

        path:
            "/",

        secure:
            false,

        httpOnly:
            false,

        expiresAt:
            null

    };


    for (

        const part
        of parts

    ) {

        const separatorIndex =
            part.indexOf(
                "="
            );


        const key =
            (

                separatorIndex >=
                0

                    ?

                part.slice(
                    0,
                    separatorIndex
                )

                    :

                part

            )
                .trim()
                .toLowerCase();


        const value =
            separatorIndex >=
            0

                ?

            part
                .slice(
                    separatorIndex +
                    1
                )
                .trim()

                :

            "";


        if (
            key ===
            "domain"
        ) {

            cookie.domain =
                normaliseDomain(
                    value
                );

        }


        if (

            key ===
            "path" &&

            value

        ) {

            cookie.path =
                value;

        }


        if (
            key ===
            "secure"
        ) {

            cookie.secure =
                true;

        }


        if (
            key ===
            "httponly"
        ) {

            cookie.httpOnly =
                true;

        }


        if (
            key ===
            "max-age"
        ) {

            const seconds =
                Number(
                    value
                );


            if (

                Number.isFinite(
                    seconds
                )

            ) {

                cookie.expiresAt =

                    Date.now() +

                    seconds *
                    1000;

            }

        }


        if (
            key ===
            "expires"
        ) {

            const date =
                Date.parse(
                    value
                );


            if (

                Number.isFinite(
                    date
                )

            ) {

                cookie.expiresAt =
                    date;

            }

        }

    }


    return cookie;

}


function storeSetCookies(

    session,

    setCookieHeaders,

    targetURL

) {

    if (

        !setCookieHeaders

    ) {

        return;

    }


    const headers =
        Array.isArray(
            setCookieHeaders
        )

            ?

        setCookieHeaders

            :

        [

            setCookieHeaders

        ];


    for (

        const header
        of headers

    ) {

        const cookie =
            parseSetCookie(

                header,

                targetURL

            );


        if (
            !cookie
        ) {

            continue;

        }


        const key =

            cookie.domain +

            "|" +

            cookie.path +

            "|" +

            cookie.name;


        if (

            cookie.expiresAt &&

            cookie.expiresAt <=
            Date.now()

        ) {

            session.cookies.delete(
                key
            );


            continue;

        }


        session.cookies.set(

            key,

            cookie

        );

    }

}


function getCookieHeader(

    session,

    targetURL

) {

    const cookies =
        [];


    const now =
        Date.now();


    for (

        const [

            key,

            cookie

        ]

        of session.cookies

    ) {

        if (

            cookie.expiresAt &&

            cookie.expiresAt <=
            now

        ) {

            session.cookies.delete(
                key
            );


            continue;

        }


        if (

            !domainMatches(

                cookie.domain,

                targetURL.hostname

            )

        ) {

            continue;

        }


        if (

            !pathMatches(

                cookie.path,

                targetURL.pathname

            )

        ) {

            continue;

        }


        if (

            cookie.secure &&

            targetURL.protocol !==
            "https:"

        ) {

            continue;

        }


        cookies.push(

            cookie.name +

            "=" +

            cookie.value

        );

    }


    return cookies.join(
        "; "
    );

}


function getSessionCookieCount(
    session
) {

    return session.cookies.size;

}


module.exports = {

    storeSetCookies,

    getCookieHeader,

    getSessionCookieCount

};
