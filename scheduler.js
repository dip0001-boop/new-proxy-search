const crawler =
    require("./crawler");


const crawlerState =
    require("./crawlerState");


let running =
    false;


let schedulerStarted =
    false;


let intervalHandle =
    null;


const CRAWL_INTERVAL =
    15 *
    60 *
    1000;


async function runCrawler() {

    if (
        running ||
        crawlerState
            .get()
            .running
    ) {

        console.log(

            "Crawler already running. Skipping."

        );

        return {

            status:
                "already_running"

        };

    }


    running =
        true;


    console.log(

        "Crawler run started."

    );


    try {

        await crawler
            .startCrawler();


        console.log(

            "Crawler run finished."

        );


        return {

            status:
                "finished"

        };


    } catch (
        error
    ) {

        console.error(

            "Crawler error:",

            error

        );


        return {

            status:
                "failed",

            error:
                error.message

        };


    } finally {

        running =
            false;

    }

}


function startScheduler() {

    if (
        schedulerStarted
    ) {

        console.log(

            "Crawler scheduler already started."

        );

        return;

    }


    schedulerStarted =
        true;


    console.log(

        "Crawler scheduler started."

    );


    runCrawler();


    intervalHandle =
        setInterval(

            () => {

                runCrawler();

            },

            CRAWL_INTERVAL

        );


}


function stopScheduler() {

    if (
        intervalHandle
    ) {

        clearInterval(

            intervalHandle

        );


        intervalHandle =
            null;

    }


    schedulerStarted =
        false;


    console.log(

        "Crawler scheduler stopped."

    );

}


function isRunning() {

    return (

        running ||

        crawlerState
            .get()
            .running

    );

}


module.exports = {

    startScheduler,

    stopScheduler,

    runCrawler,

    isRunning

};
