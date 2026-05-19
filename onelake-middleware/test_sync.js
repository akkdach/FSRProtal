const syncController = require('./src/controllers/syncController');

async function testSync() {
    const req = {};
    const res = {
        json: (data) => console.log('Response JSON:', data),
        status: (code) => ({
            json: (data) => console.log(`Error Response (${code}):`, data)
        })
    };

    console.log("Calling syncServiceOrderTable...");
    await syncController.syncServiceOrderTable(req, res);
}

testSync();
