const cache = new Map();

function get(key) {
    const item = cache.get(key);

    if (!item) {
        return null;
    }

    if (Date.now() > item.expiresAt) {
        cache.delete(key);
        return null;
    }

    return item.value;
}

function set(key, value, ttlSeconds = 300) {
    cache.set(key, {
        value,
        expiresAt:
            Date.now() +
            (ttlSeconds * 1000)
    });
}

function clear() {
    cache.clear();
}

function size() {
    return cache.size;
}

module.exports = {
    get,
    set,
    clear,
    size
};
