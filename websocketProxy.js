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

            let target;


            try {
                const parsed =
                    new URL(
                        req.url,
                        "http://localhost"
                    );


                const rawURL =
                    parsed.searchParams.get(
                        "url"
                    );


                target =
                    getTargetURL(
                        rawURL
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


            wss.handleUpgrade(

                req,

                socket,

                head,

                clientSocket => {

                    const upstream =
                        new WebSocket(
                            target.toString()
                        );


                    upstream.on(
                        "open",
                        () => {

                            clientSocket.on(
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
                                        clientSocket.readyState ===
                                        WebSocket.OPEN
                                    ) {
                                        clientSocket.send(
                                            data
                                        );
                                    }

                                }
                            );

                        }
                    );


                    upstream.on(
                        "close",
                        () => {

                            if (
                                clientSocket.readyState !==
                                WebSocket.CLOSED
                            ) {
                                clientSocket.close();
                            }

                        }
                    );


                    clientSocket.on(
                        "close",
                        () => {

                            if (
                                upstream.readyState !==
                                WebSocket.CLOSED
                            ) {
                                upstream.close();
                            }

                        }
                    );


                    upstream.on(
                        "error",
                        () => {

                            clientSocket.close();

                        }
                    );


                    clientSocket.on(
                        "error",
                        () => {

                            upstream.close();

                        }
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
