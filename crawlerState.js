let running =
    false;


let pagesProcessed =
    0;


let pagesIndexed =
    0;


let pagesFailed =
    0;


let pagesSkipped =
    0;


let workersActive =
    0;


let workersTotal =
    0;


let lastRun =
    null;


let lastError =
    null;


let startedAt =
    null;


let finishedAt =
    null;


let lastPageAt =
    null;


let lastURL =
    null;


let totalBytes =
    0;


let runStartedTimestamp =
    0;


function start(
    workerCount = 0
) {

    running =
        true;


    pagesProcessed =
        0;


    pagesIndexed =
        0;


    pagesFailed =
        0;


    pagesSkipped =
        0;


    workersActive =
        0;


    workersTotal =
        Number(
            workerCount
        ) || 0;


    totalBytes =
        0;


    lastError =
        null;


    lastURL =
        null;


    lastPageAt =
        null;


    runStartedTimestamp =
        Date.now();


    startedAt =
        new Date()
            .toISOString();


    finishedAt =
        null;

}


function finish() {

    running =
        false;


    workersActive =
        0;


    lastRun =
        new Date()
            .toISOString();


    finishedAt =
        lastRun;

}


function processed(
    url = null
) {

    pagesProcessed++;


    lastPageAt =
        Date.now();


    if (
        url
    ) {

        lastURL =
            url;

    }

}


function indexed(
    bytes = 0
) {

    pagesIndexed++;


    totalBytes +=

        Number(
            bytes
        ) || 0;

}


function skipped() {

    pagesSkipped++;

}


function failed(
    error
) {

    pagesFailed++;


    lastError =

        typeof error ===
        "string"

            ?

        error

            :

        error?.message ||

        "Unknown crawler error";

}


function workerStarted() {

    workersActive++;


}


function workerFinished() {

    workersActive =

        Math.max(

            workersActive -
            1,

            0

        );

}


function setWorkerCount(
    count
) {

    workersTotal =

        Math.max(

            Number(
                count
            ) || 0,

            0

        );

}


function getRate() {

    if (

        !runStartedTimestamp

    ) {

        return 0;

    }


    const elapsed =
        Date.now() -
        runStartedTimestamp;


    if (

        elapsed <=
        0

    ) {

        return 0;

    }


    return (

        pagesProcessed /
        (

            elapsed /
            60000

        )

    );

}


function get() {

    return {

        running,


        pagesProcessed,


        pagesIndexed,


        pagesFailed,


        pagesSkipped,


        workersActive,


        workersTotal,


        pagesPerMinute:

            Number(

                getRate()
                    .toFixed(
                        2
                    )

            ),


        totalBytes,


        lastRun,


        lastError,


        startedAt,


        finishedAt,


        lastPageAt:


            lastPageAt

                ?

            new Date(
                lastPageAt
            ).toISOString()

                :

            null,


        lastURL

    };

}


module.exports = {

    start,

    finish,

    processed,

    indexed,

    skipped,

    failed,

    workerStarted,

    workerFinished,

    setWorkerCount,

    get

};
