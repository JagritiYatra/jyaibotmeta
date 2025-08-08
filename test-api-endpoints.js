// Test API endpoints
const { MongoClient } = require('mongodb');

async function testEndpoints() {
    const uri = process.env.MONGODB_URI || 'mongodb+srv://jy_bot_user:JY2025Bot@cluster0.1tbvvum.mongodb.net/jagriti_yatra_community?retryWrites=true&w=majority';
    const client = new MongoClient(uri);
    
    try {
        await client.connect();
        const db = client.db('jagriti_yatra_community');
        
        console.log('Testing API endpoints...\n');
        
        // Test plain form submissions query
        const query = {
            'enhancedProfile.formFilledVia': 'plain_form'
        };
        
        const formSubmissions = await db.collection('users')
            .find(query)
            .sort({ 'enhancedProfile.formFilledAt': -1 })
            .limit(20)
            .toArray();
            
        console.log('Plain Form Submissions Query:');
        console.log('Query:', JSON.stringify(query));
        console.log('Results found:', formSubmissions.length);
        
        formSubmissions.forEach(user => {
            console.log('\nUser:', user._id);
            console.log('  Name:', user.enhancedProfile?.fullName);
            console.log('  Email:', user.enhancedProfile?.email);
            console.log('  LinkedIn:', user.enhancedProfile?.linkedInProfile);
            console.log('  Form filled via:', user.enhancedProfile?.formFilledVia);
            console.log('  Form filled at:', user.enhancedProfile?.formFilledAt);
        });
        
        // Check system_logs collection (might not exist)
        try {
            const systemLogs = await db.collection('system_logs').find({}).limit(5).toArray();
            console.log('\nSystem Logs found:', systemLogs.length);
        } catch (e) {
            console.log('\nSystem Logs collection not found or empty');
        }
        
        // Check user_stats collection
        const userStats = await db.collection('user_stats').find({}).limit(5).toArray();
        console.log('User Stats found:', userStats.length);
        
        if (userStats.length > 0) {
            console.log('Sample user stat:', JSON.stringify(userStats[0], null, 2));
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

testEndpoints();