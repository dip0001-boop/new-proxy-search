const timestamp = () => {
    return new Date().toISOString();
};

function info(message, data = null) {
    console.log(
        `[${timestamp()}] [INFO] ${message}`,
        data || ""
    );
}

function warn(message, data = null) {
    console.warn(
        `[${timestamp()}] [WARN] ${message}`,
        data || ""
    );
}

function error(message, err = null) {
    console.error(
        `[${timestamp()}] [ERROR] ${message}`,
        err?.stack || err || ""
    );
}

function request(method, url, status, duration) {
    console.log(
        `[${timestamp()}] [REQUEST] ${method} ${url} → ${status} (${duration}ms)`
    );
}

module.exports = {
    info,
    warn,
    error,
    request
};
