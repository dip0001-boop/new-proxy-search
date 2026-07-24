const database =
    require("./database");


function cleanText(
    value
) {

    return String(
        value || ""
    )

        .replace(
            /\s+/g,
            " "
        )

        .trim();

}


function createSnippet(
    result
) {

    const description =
        cleanText(
            result.description
        );


    if (
        description
    ) {

        return description
            .slice(
                0,
                320
            );

    }


    const content =
        cleanText(
            result.content
        );


    if (
        content
    ) {

        return content
            .slice(
                0,
                320
            );

    }


    return (

        "No description available."

    );

}


function search(
    query,

    options = {}

) {

    const limit =
        Math.min(

            Math.max(

                Number(
                    options.limit
                ) || 10,

                1

            ),

            50

        );


    const page =
        Math.max(

            Number(
                options.page
            ) || 1,

            1

        );


    const offset =
        (

            page -

            1

        ) *

        limit;


    const results =
        database.searchPages(

            query,

            limit,

            offset

        );


    return {

        provider:

            "THE VAULT INDEX",


        results:

            results.map(

                result => ({

                    title:

                        cleanText(

                            result.title

                        ) ||

                        "Untitled page",


                    link:

                        result.url,


                    snippet:

                        createSnippet(

                            result

                        ),


                    source:

                        cleanText(

                            result.domain

                        ),


                    relevance:

                        Number(

                            result.relevance

                        ) || 0,


                    crawledAt:

                        result.crawled_at

                })

            ),


        total:

            results.length

    };

}


module.exports = {

    search

};
