import { InteractiveBrowserCredential } from "@azure/identity";

// Acquire a token
let app = new InteractiveBrowserCredential({});
let tokenPromise = app.getToken('https://analysis.windows.net/powerbi/api/user_impersonation');
let accessToken = await tokenPromise;

const endpoint = 'https://7b2a2b840f674d1f8e9f65abfa88501d.z7b.graphql.fabric.microsoft.com/v1/workspaces/7b2a2b84-0f67-4d1f-8e9f-65abfa88501d/graphqlapis/47a192e2-8902-46e4-baee-c0ec18c3d629/graphql';

const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken.token}`
};

// Define queries for all 4 views
const queries = [
    {
        name: 'service_BN4_NB2C',
        query: `{
      service_BN4_NB2Cs(first: 5) {
        items {
          Id
        }
      }
    }`
    },
    {
        name: 'Service_BN4_New',
        query: `{
      service_BN4_News(first: 5) {
        items {
          Id
        }
      }
    }`
    },
    {
        name: 'service_BN09_NB2',
        query: `{
      service_BN09_NB2s(first: 5) {
        items {
          Id
        }
      }
    }`
    },
    {
        name: 'Service_BN09_New',
        query: `{
      service_BN09_News(first: 5) {
        items {
          Id
        }
      }
    }`
    }
];

async function fetchData(queryObj) {
    try {
        console.log(`\n========== Fetching: ${queryObj.name} ==========`);
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ query: queryObj.query, variables: {} }),
        });

        const result = await response.json();
        console.log(JSON.stringify(result, null, 2));
        return result;
    } catch (error) {
        console.log(`Error fetching ${queryObj.name}:`, error);
        return null;
    }
}

// Fetch all views
async function fetchAllViews() {
    for (const queryObj of queries) {
        await fetchData(queryObj);
    }
}

fetchAllViews();
