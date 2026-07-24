const axios = require("axios");
const http = require("http");
const https = require("https");

const config =
    require("./config");


const httpAgent =
    new http.Agent({

        keepAlive:
            true,

        maxSockets:
            256,

        maxFreeSockets:
            64,

        timeout:
            60000

    });


const httpsAgent =
    new https.Agent({

        keepAlive:
            true,

        maxSockets:
            256,

        maxFreeSockets:
            64,

        timeout:
            60000

    });


const client =
    axios.create({

        httpAgent,

        httpsAgent,

        timeout:
            config.proxy.requestTimeout,

        maxRedirects:
            config.proxy.maxRedirects,

        maxContentLength:
            config.proxy.maxResponseSize,

        maxBodyLength:
            config.proxy.maxResponseSize,

        decompress:
            true,

        validateStatus:
            status =>
                status >= 200 &&
                status < 400

    });


module.exports = {

    client,

    httpAgent,

    httpsAgent

};
