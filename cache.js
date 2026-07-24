const DEFAULT_TTL_SECONDS =
    300;


const MAX_CACHE_ENTRIES =
    1000;


const cache =
    new Map();


function get(
    key
) {

    if (
        typeof key !==
        "string"
    ) {

        return null;

    }


    const item =
        cache.get(
            key
        );


    if (
        !item
    ) {

        return null;

    }


    if (
        Date.now() >=
        item.expiresAt
    ) {

        cache.delete(
            key
        );


        return null;

    }


    return item.value;

}


function set(
    key,

    value,

    ttlSeconds =
        DEFAULT_TTL_SECONDS

) {

    if (
        typeof key !==
        "string"
    ) {

        return false;

    }


    const ttl =
        Math.max(

            1,

            Number(
                ttlSeconds
            ) ||

            DEFAULT_TTL_SECONDS

        );


    /*
        Keep the cache bounded.

        This prevents an unlimited
        number of search queries from
        consuming memory forever.
    */

    if (
        cache.size >=
        MAX_CACHE_ENTRIES &&

        !cache.has(
            key
        )
    ) {

        const oldestKey =
            cache.keys()
                .next()
                .value;


        if (
            oldestKey
        ) {

            cache.delete(
                oldestKey
            );

        }

    }


    cache.set(

        key,

        {

            value,

            createdAt:
                Date.now(),

            expiresAt:

                Date.now() +

                (
                    ttl *
                    1000
                )

        }

    );


    return true;

}


function clear() {

    cache.clear();

}


function size() {

    return cache.size;

}


function cleanup() {

    const now =
        Date.now();


    for (
        const [
            key,
            item
        ]

        of cache
    ) {

        if (
            now >=
            item.expiresAt
        ) {

            cache.delete(
                key
            );

        }

    }

}


const cleanupInterval =
    setInterval(

        cleanup,

        60 *
        1000

    );


if (
    cleanupInterval
        .unref
) {

    cleanupInterval
        .unref();

}


module.exports = {

    get,

    set,

    clear,

    size,

    cleanup

};
