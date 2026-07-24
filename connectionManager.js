const connections =
    new Map();


let activeConnections =
    0;


function start(
    id
) {

    activeConnections++;


    connections.set(

        id,

        {

            startedAt:
                Date.now(),

            lastActivity:
                Date.now()

        }

    );

}


function activity(
    id
) {

    const connection =
        connections.get(
            id
        );


    if (
        connection
    ) {

        connection.lastActivity =
            Date.now();

    }

}


function finish(
    id
) {

    if (
        connections.delete(
            id
        )
    ) {

        activeConnections =
            Math.max(
                activeConnections -
                1,

                0
            );

    }

}


function getActive() {

    return activeConnections;

}


function getStats() {

    const now =
        Date.now();


    let oldest =
        0;


    for (
        const connection
        of connections.values()
    ) {

        oldest =
            Math.max(

                oldest,

                now -
                connection.startedAt

            );

    }


    return {

        active:
            activeConnections,

        oldestMs:
            oldest

    };

}


function cleanup(
    maxIdleTime =
        5 *
        60 *
        1000
) {

    const now =
        Date.now();


    for (
        const [
            id,
            connection
        ]
        of connections
    ) {

        if (

            now -
            connection.lastActivity >

            maxIdleTime

        ) {

            finish(
                id
            );

        }

    }

}


const cleanupTimer =
    setInterval(
        () => cleanup(),
        60000
    );


if (
    cleanupTimer.unref
) {

    cleanupTimer.unref();

}


module.exports = {

    start,

    activity,

    finish,

    getActive,

    getStats,

    cleanup

};
