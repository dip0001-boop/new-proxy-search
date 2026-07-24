const cache =
    new Map();


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
    ttlSeconds = 120
) {

    const ttl =
        Math.max(

            Number(
                ttlSeconds
            ) ||

            120,

            1

        );


    cache.set(

        key,

        {

            value,

            expiresAt:
                Date.now() +
                (
                    ttl *
                    1000
                )

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

    cleanupExpired

};
