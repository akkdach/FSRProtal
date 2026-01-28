const graphqlService = require('./src/services/graphqlService');

async function inspect() {
    try {
        const token = await graphqlService.getAccessToken();
        const endpoint = graphqlService.endpoint;

        console.log("Starting Query Candidate Tests...");

        // Candidates to test
        const candidates = [
            'performance_Matrices',
            'performance_Matrixs',
            'performance_Matrix_Tables',
            'Performance_Matrix',
            'performance_matrix'
        ];

        for (const queryName of candidates) {
            console.log(`Testing candidate: ${queryName}`);

            const queryBody = `
            query {
                ${queryName}(first: 1) {
                    items {
                        OrderType
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

            if (result.data && result.data[queryName]) {
                console.log(`✅ SUCCESS! Valid Query Name is: ${queryName}`);
                return; // Stop on first match
            } else {
                // Check if it's a field error
                const isFieldError = result.errors && result.errors.some(e => e.message.includes(`field "${queryName}"`));
                if (isFieldError) {
                    console.log(`❌ Failed: ${queryName} does not exist.`);
                } else {
                    console.log(`⚠️  Error with ${queryName}:`, JSON.stringify(result.errors?.[0]?.message || result));
                }
            }
        }

    } catch (e) {
        console.error("Script execution error:", e);
    }
}

inspect();
