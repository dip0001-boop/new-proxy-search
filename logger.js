function timestamp() {
    return new Date().toISOString();
}

function info(message) {
    console.log(
        `[${timestamp()}] INFO: ${message}`
    );
}

function warn(message) {
    console.warn(
        `[${timestamp()}] WARN: ${message}`
    );
}

function error(message, err = null) {
    console.error(
        `[${timestamp()}] ERROR: ${message}`
    );

    if (err) {
        console.error(err);
    }
}

function request(
    method,
    url,
    status,
    time
) {
    console.log(
        `[${timestamp()}] ` +
        `${method} ${url} ` +
        `${status} ` +
        `${time}ms`
    );
}

module.exports = {
    info,
    warn,
    error,
    request
};
