const crypto = require("crypto");

const sessions = new Map();

const SESSION_TTL =
    1000 * 60 * 60 * 24;

const MAX_SESSIONS = 5000;


function generateSessionId() {
    return crypto
        .randomBytes(32)
        .toString("hex");
}


function createSession() {
    if (
        sessions.size >=
        MAX_SESSIONS
    ) {
        cleanup();
    }

    const id =
        generateSessionId();

    const session = {
        id,

        createdAt:
            Date.now(),

        lastUsedAt:
            Date.now(),

        cookies:
            new Map(),

        currentURL:
            null,

        currentOrigin:
            null
    };

    sessions.set(
        id,
        session
    );

    return session;
}


function getSession(id) {
    if (
        !id ||
        typeof id !== "string"
    ) {
        return null;
    }

    const session =
        sessions.get(id);

    if (!session) {
        return null;
    }

    if (
        Date.now() -
        session.lastUsedAt >
        SESSION_TTL
    ) {
        sessions.delete(id);

        return null;
    }

    session.lastUsedAt =
        Date.now();

    return session;
}


function getOrCreate(id) {
    return (
        getSession(id) ||
        createSession()
    );
}


function deleteSession(id) {
    sessions.delete(id);
}


function cleanup() {
    const now =
        Date.now();

    for (
        const [
            id,
            session
        ]
        of sessions
    ) {
        if (
            now -
            session.lastUsedAt >
            SESSION_TTL
        ) {
            sessions.delete(
                id
            );
        }
    }
}


function getStats() {
    return {
        active:
            sessions.size,

        max:
            MAX_SESSIONS
    };
}


setInterval(
    cleanup,
    1000 * 60 * 15
).unref();


module.exports = {
    createSession,
    getSession,
    getOrCreate,
    deleteSession,
    getStats
};
