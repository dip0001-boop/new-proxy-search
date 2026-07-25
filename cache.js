const cache =
    new Map();


const MAX_ENTRIES =
    5000;


let hits =
    0;


let misses =
    0;


function get(
    key
) {

    const item =
        cache.get(
            key
        );


    if (
        !item
    ) {

        misses++;


        return null;

    }


    if (

        Date.now() >=
        item.expiresAt

    ) {

        cache.delete(
            key
        );


        misses++;


        return null;

    }


    cache.delete(
        key
    );


    cache.set(

        key,

        item

    );


    hits++;


    return item.value;

}


function set(

    key,

    value,

    ttlSeconds =
        120

) {

    const ttl =
        Math.max(

            Number(
                ttlSeconds
            ) || 120,

            1

        );


    if (

        cache.has(
            key
        )

    ) {

        cache.delete(
            key
        );

    }


    while (

        cache.size >=
        MAX_ENTRIES

    ) {

        const oldest =
            cache.keys()
                .next()
                .value;


        if (
            oldest ===
            undefined
        ) {

            break;

        }


        cache.delete(
            oldest
        );

    }


    cache.set(

        key,

        {

            value,

            expiresAt:

                Date.now() +

                ttl *
                1000

        }

    );

}


function clear() {

    cache.clear();

}


function size() {

    return cache.size;

}


function deleteKey(
    key
) {

    return cache.delete(
        key
    );

}


function cleanupExpired() {

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


function getStats() {

    return {

        entries:
            cache.size,

        maxEntries:
            MAX_ENTRIES,

        hits,

        misses,

        hitRate:

            hits +
            misses >

            0

                ?

            hits /
            (

                hits +
                misses

            )

                :

            0

    };

}


const cleanupTimer =
    setInterval(

        cleanupExpired,

        60 *
        1000

    );


if (

    cleanupTimer.unref

) {

    cleanupTimer.unref();

}


module.exports = {

    get,

    set,

    clear,

    size,

    delete:
        deleteKey,

    cleanupExpired,

    getStats

};
