// Test CRUD server endpoints
const http = require('http');

const PORT = 4000;
const BASE_URL = `http://localhost:${PORT}`;

async function makeRequest(path) {
    return new Promise((resolve, reject) => {
        http.get(`${BASE_URL}${path}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        data: JSON.parse(data)
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        data: data
                    });
                }
            });
        }).on('error', reject);
    });
}

async function testServer() {
    console.log('Testing CRUD Server Endpoints...\n');
    console.log('Make sure crud-server.js is running on port', PORT);
    console.log('----------------------------------------\n');
    
    try {
        // Test health endpoint
        console.log('1. Testing /api/health');
        const health = await makeRequest('/api/health');
        console.log('   Status:', health.status);
        console.log('   Response:', health.data.status || 'Error');
        
        // Test stats endpoint
        console.log('\n2. Testing /api/stats');
        const stats = await makeRequest('/api/stats');
        console.log('   Status:', stats.status);
        console.log('   Collections:');
        if (stats.data) {
            Object.entries(stats.data).forEach(([key, value]) => {
                console.log(`     ${key}: ${value} documents`);
            });
        }
        
        // Test plain form submissions
        console.log('\n3. Testing /api/plain-form-submissions');
        const formSubmissions = await makeRequest('/api/plain-form-submissions?page=1&limit=10');
        console.log('   Status:', formSubmissions.status);
        if (formSubmissions.data) {
            console.log('   Total submissions:', formSubmissions.data.total);
            console.log('   Data returned:', formSubmissions.data.data ? formSubmissions.data.data.length : 0);
            if (formSubmissions.data.data && formSubmissions.data.data.length > 0) {
                const first = formSubmissions.data.data[0];
                console.log('   Sample submission:');
                console.log('     Name:', first.enhancedProfile?.fullName);
                console.log('     Email:', first.enhancedProfile?.email);
                console.log('     LinkedIn:', first.enhancedProfile?.linkedInProfile);
            }
        }
        
        // Test users endpoint
        console.log('\n4. Testing /api/users');
        const users = await makeRequest('/api/users?page=1&limit=5');
        console.log('   Status:', users.status);
        if (users.data) {
            console.log('   Total users:', users.data.total);
            console.log('   Data returned:', users.data.data ? users.data.data.length : 0);
        }
        
        // Test user_stats endpoint
        console.log('\n5. Testing /api/user_stats');
        const userStats = await makeRequest('/api/user_stats?page=1&limit=5');
        console.log('   Status:', userStats.status);
        if (userStats.data) {
            console.log('   Total stats:', userStats.data.total);
            console.log('   Data returned:', userStats.data.data ? userStats.data.data.length : 0);
        }
        
        // Test queries endpoint
        console.log('\n6. Testing /api/queries');
        const queries = await makeRequest('/api/queries?page=1&limit=5');
        console.log('   Status:', queries.status);
        if (queries.data) {
            console.log('   Total queries:', queries.data.total);
            console.log('   Data returned:', queries.data.data ? queries.data.data.length : 0);
        }
        
        console.log('\n✅ All endpoint tests completed!');
        console.log('\n📊 Dashboard Access:');
        console.log(`   Open http://localhost:${PORT} in your browser`);
        console.log('   The "Form Submissions" tab should show the data');
        
    } catch (error) {
        console.error('\n❌ Error testing server:', error.message);
        console.log('\nMake sure the CRUD server is running:');
        console.log('   node crud-server.js');
    }
}

// Give server time to start if just launched
setTimeout(testServer, 1000);