const cache =
    new Map();


const MAX_ITEMS =
    500;


const DEFAULT_TTL =
    60 *
    1000;


function canCache(
    contentType
) {

    const type =
        String(
            contentType ||
            ""
        ).toLowerCase();


    return (

        type.includes(
            "text/css"
        ) ||

        type.includes(
            "javascript"
        ) ||

        type.includes(
            "font/"
        ) ||

        type.includes(
            "image/"
        ) ||

        type.includes(
            "text/plain"
        )

    );

}


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


    return item;

}


function set(
    key,
    value,
    contentType,
    ttl =
        DEFAULT_TTL
) {

    if (
        cache.size >=
        MAX_ITEMS
    ) {

        const oldest =
            cache.keys()
                .next()
                .value;


        if (
            oldest
        ) {

            cache.delete(
                oldest
            );

        }

    }


    cache.set(

        key,

        {

            value,

            contentType,

            expiresAt:
                Date.now() +
                ttl

        }

    );

}


function remove(
    key
) {

    cache.delete(
        key
    );

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


const cleanupTimer =
    setInterval(
        cleanup,
        60000
    );


cleanupTimer.unref();


module.exports = {

    canCache,

    get,

    set,

    remove,

    clear,

    size,

    cleanup

};
