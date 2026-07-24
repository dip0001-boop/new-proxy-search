let requests =
    0;


let successful =
    0;


let failed =
    0;


let cacheHits =
    0;


let active =
    0;


let totalResponseTime =
    0;


let bytesSent =
    0;


function startRequest() {

    requests++;

    active++;

}


function finishRequest(
    duration,
    success
) {

    active--;

    totalResponseTime +=
        Math.max(
            Number(
                duration
            ) ||
            0,

            0
        );


    if (
        success
    ) {

        successful++;

    } else {

        failed++;

    }

}


function cacheHit() {

    cacheHits++;

}


function addBytes(
    bytes
) {

    bytesSent +=
        Math.max(
            Number(
                bytes
            ) ||
            0,

            0
        );

}


function get() {

    return {

        requests,

        successful,

        failed,

        active,

        cacheHits,

        bytesSent,

        averageResponseTime:

            requests > 0

                ? Math.round(
                    totalResponseTime /
                    requests
                )

                : 0

    };

}


function reset() {

    requests =
        0;

    successful =
        0;

    failed =
        0;

    cacheHits =
        0;

    active =
        0;

    totalResponseTime =
        0;

    bytesSent =
        0;

}


module.exports = {

    startRequest,

    finishRequest,

    cacheHit,

    addBytes,

    get,

    reset

};
