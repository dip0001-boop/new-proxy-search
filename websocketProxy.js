const WebSocket =
    require("ws");


function attachWebSocketProxy(

    server,

    getTargetURL,

    getSession

) {

    const wss =
        new WebSocket.Server({

            noServer:
                true

        });


    server.on(

        "upgrade",

        (

            req,

            socket,

            head

        ) => {

            let parsed;

            let target;


            try {

                parsed =
                    new URL(

                        req.url,

                        "http://localhost"

                    );


                target =
                    getTargetURL(

                        parsed.searchParams.get(
                            "url"
                        )

                    );

            } catch {

                socket.destroy();

                return;

            }


            if (
                !target
            ) {

                socket.destroy();

                return;

            }


            const session =
                getSession(

                    parsed.searchParams.get(
                        "session"
                    )

                );


            wss.handleUpgrade(

                req,

                socket,

                head,

                client => {

                    const headers = {

                        "User-Agent":

                            req.headers[
                                "user-agent"
                            ] ||

                            "Mozilla/5.0",

                        "Origin":

                            target.origin

                    };


                    const upstream =
                        new WebSocket(

                            target.toString(),

                            {

                                headers

                            }

                        );


                    let closed =
                        false;


                    function closeBoth() {

                        if (
                            closed
                        ) {

                            return;

                        }


                        closed =
                            true;


                        if (

                            client.readyState ===
                            WebSocket.OPEN

                        ) {

                            client.close();

                        }


                        if (

                            upstream.readyState ===
                            WebSocket.OPEN

                        ) {

                            upstream.close();

                        }

                    }


                    upstream.on(

                        "open",

                        () => {

                            client.on(

                                "message",

                                data => {

                                    if (

                                        upstream.readyState ===
                                        WebSocket.OPEN

                                    ) {

                                        upstream.send(
                                            data
                                        );

                                    }

                                }

                            );


                            upstream.on(

                                "message",

                                data => {

                                    if (

                                        client.readyState ===
                                        WebSocket.OPEN

                                    ) {

                                        client.send(
                                            data
                                        );

                                    }

                                }

                            );

                        }

                    );


                    upstream.on(

                        "close",

                        closeBoth

                    );


                    client.on(

                        "close",

                        closeBoth

                    );


                    upstream.on(

                        "error",

                        closeBoth

                    );


                    client.on(

                        "error",

                        closeBoth

                    );

                }

            );

        }

    );


    return wss;

}


module.exports = {

    attachWebSocketProxy

};
