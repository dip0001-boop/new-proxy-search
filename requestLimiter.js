const active =
    new Map();


const DEFAULT_LIMIT =
    100;


function canStart(
    key,
    limit =
        DEFAULT_LIMIT
) {

    const count =
        active.get(
            key
        ) ||
        0;


    return count <
        limit;

}


function start(
    key
) {

    const count =
        active.get(
            key
        ) ||
        0;


    active.set(

        key,

        count +
        1

    );

}


function finish(
    key
) {

    const count =
        active.get(
            key
        ) ||
        0;


    if (
        count <= 1
    ) {

        active.delete(
            key
        );

        return;

    }


    active.set(

        key,

        count -
        1

    );

}


function get(
    key
) {

    return (
        active.get(
            key
        ) ||
        0
    );

}


function getAll() {

    return Object.fromEntries(
        active
    );

}


module.exports = {

    canStart,

    start,

    finish,

    get,

    getAll

};
