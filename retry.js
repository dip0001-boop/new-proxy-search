function sleep(
    milliseconds
) {

    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                milliseconds
            )
    );

}


function isRetryable(
    error
) {

    const status =
        error?.response?.status;


    if (
        !status
    ) {

        return true;

    }


    return (

        status === 408 ||

        status === 425 ||

        status === 429 ||

        status >= 500

    );

}


async function withRetry(
    operation,
    options = {}
) {

    const attempts =
        Math.max(

            Number(
                options.attempts
            ) ||

            3,

            1

        );


    const baseDelay =
        Math.max(

            Number(
                options.delay
            ) ||

            250,

            0

        );


    let lastError;


    for (
        let attempt = 0;

        attempt < attempts;

        attempt++

    ) {

        try {

            return await operation(
                attempt
            );

        } catch (
            error
        ) {

            lastError =
                error;


            if (

                attempt ===
                attempts -
                1

            ) {

                break;

            }


            if (
                !isRetryable(
                    error
                )
            ) {

                break;

            }


            const delay =
                baseDelay *
                Math.pow(
                    2,
                    attempt
                );


            await sleep(
                delay
            );

        }

    }


    throw lastError;

}


module.exports = {

    sleep,

    isRetryable,

    withRetry

};
