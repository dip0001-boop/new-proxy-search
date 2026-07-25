function normaliseCookieDomain(
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
        normaliseCookieDomain(
            cookieDomain
        );

    const host =
        String(
            hostname ||
            ""
        )
            .toLowerCase();


    return (
        host === domain ||
        host.endsWith(
            "." +
            domain
        )
    );
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
            .split(";")
            .map(
                part =>
                    part.trim()
            );


    if (
        parts.length === 0
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
        separator <= 0
    ) {
        return null;
    }


    const name =
        first
            .slice(
                0,
                separator
            )
            .trim();


    const value =
        first
            .slice(
                separator + 1
            )
            .trim();


    const cookie = {

        name,

        value,

        domain:
            targetURL.hostname,

        path:
            "/",

        secure:
            false,

        expiresAt:
            null

    };


    for (
        const part
        of parts
    ) {
        const index =
            part.indexOf(
                "="
            );


        const key =
            (
                index >= 0
                    ? part.slice(
                        0,
                        index
                    )
                    : part
            )
                .trim()
                .toLowerCase();


        const val =
            index >= 0
                ? part
                    .slice(
                        index + 1
                    )
                    .trim()
                : "";


        if (
            key ===
            "domain"
        ) {
            cookie.domain =
                normaliseCookieDomain(
                    val
                );
        }


        if (
            key ===
            "path" &&
            val
        ) {
            cookie.path =
                val;
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
            "max-age"
        ) {
            const seconds =
                Number(
                    val
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
                    val
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
            ? setCookieHeaders
            : [
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
            `${cookie.domain}|` +
            `${cookie.path}|` +
            `${cookie.name}`;


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
    const cookies = [];

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
            !targetURL.pathname.startsWith(
                cookie.path
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
            `${cookie.name}=` +
            `${cookie.value}`
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
