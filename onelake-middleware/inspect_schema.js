const graphqlService = require('./src/services/graphqlService');

async function inspect() {
    try {
        const token = await graphqlService.getAccessToken();
        const endpoint = graphqlService.endpoint;

        const queryBody = `
        query InspectSchema {
            __type(name: "Query") {
                fields {
                    name
                    args {
                        name
                    }
                }
            }
        }`;

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ query: queryBody })
        });

        const result = await response.json();
        if (!result.data || !result.data.__type) {
            console.log("Error: Schema field 'Query' not found. Response:", JSON.stringify(result));
            return;
        }
        const field = result.data.__type.fields.find(f => f.name === 'executeServiceOrder_Income');

        if (field) {
            console.log("Found executeServiceOrder_Income:");
            console.log("Arguments:", JSON.stringify(field.args, null, 2));
            console.log("Return Type:", JSON.stringify(field.type, null, 2));
        } else {
            console.log("executeServiceOrder_Income NOT found in Query type.");
            // Check Mutation type just in case
            const mutationCheck = `
            query InspectMutation {
                __type(name: "Mutation") {
                    fields {
                        name
                        args {
                            name
                        }
                    }
                }
            }`;
            const res2 = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ query: mutationCheck })
            });
            const result2 = await res2.json();
            const mutField = result2.data?.__type?.fields?.find(f => f.name === 'executeServiceOrder_Income');
            if (mutField) {
                console.log("Found executeServiceOrder_Income in Mutation!");
            } else {
                console.log("Field not found in Mutation either.");
            }
        }
    } catch (e) {
        console.error(e);
    }
}

inspect();
