const crawler =
    require("./crawler");

const crawlerState =
    require("./crawlerState");

const config =
    require("./config");


let running =
    false;


let schedulerStarted =
    false;


let intervalHandle =
    null;


const CRAWL_INTERVAL =
    Number(

        config.crawler
            ?.interval

    ) ||

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

        return {

            status:
                "already_running"

        };

    }


    running =
        true;


    try {

        await crawler
            .startCrawler();


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


    if (

        intervalHandle.unref

    ) {

        intervalHandle.unref();

    }

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
