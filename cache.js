const NodeCache = require("node-cache");

const cache = new NodeCache({
    stdTTL: 300,
    checkperiod: 60,
    useClones: false
});

function normalizeKey(query) {
    return query
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

function get(query) {
    return cache.get(normalizeKey(query));
}

function set(query, data, ttl = 300) {
    return cache.set(
        normalizeKey(query),
        data,
        ttl
    );
}

function has(query) {
    return cache.has(normalizeKey(query));
}

function del(query) {
    return cache.del(normalizeKey(query));
}

function clear() {
    return cache.flushAll();
}

function stats() {
    return cache.getStats();
}

module.exports = {
    get,
    set,
    has,
    del,
    clear,
    stats
};
