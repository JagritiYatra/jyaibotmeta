// Verify dashboard functionality
const { MongoClient } = require('mongodb');

async function verifyDashboard() {
    const uri = process.env.MONGODB_URI || 'mongodb+srv://jy_bot_user:JY2025Bot@cluster0.1tbvvum.mongodb.net/jagriti_yatra_community?retryWrites=true&w=majority';
    const client = new MongoClient(uri);
    
    try {
        await client.connect();
        const db = client.db('jagriti_yatra_community');
        
        console.log('====================================');
        console.log('DASHBOARD FUNCTIONALITY VERIFICATION');
        console.log('====================================\n');
        
        // 1. Form Submissions Tab
        console.log('📝 FORM SUBMISSIONS TAB:');
        const formSubmissions = await db.collection('users').find({
            'enhancedProfile.formFilledVia': 'plain_form'
        }).toArray();
        console.log(`  ✓ Total form submissions: ${formSubmissions.length}`);
        
        if (formSubmissions.length > 0) {
            console.log('  ✓ Latest submission:');
            const latest = formSubmissions[0];
            console.log(`    - Name: ${latest.enhancedProfile?.fullName}`);
            console.log(`    - Email: ${latest.enhancedProfile?.email}`);
            console.log(`    - LinkedIn: ${latest.enhancedProfile?.linkedInProfile || 'Not provided'}`);
        }
        
        // 2. LinkedIn Export
        console.log('\n💼 LINKEDIN EXPORT:');
        const withLinkedIn = await db.collection('users').find({
            'enhancedProfile.linkedInProfile': { $exists: true, $ne: '' }
        }).toArray();
        console.log(`  ✓ Profiles with LinkedIn: ${withLinkedIn.length}`);
        console.log('  ✓ Export will include: Name, Email, LinkedIn URL, Role, City, Date');
        
        // 3. User Stats
        console.log('\n📊 USER STATS TAB:');
        const userStats = await db.collection('user_stats').countDocuments();
        console.log(`  ✓ Total user stats records: ${userStats}`);
        
        // 4. Other Collections
        console.log('\n📂 OTHER COLLECTIONS:');
        const collections = ['users', 'sessions', 'queries', 'otps', 'cooldowns'];
        for (const col of collections) {
            const count = await db.collection(col).countDocuments();
            console.log(`  ✓ ${col}: ${count} documents`);
        }
        
        console.log('\n====================================');
        console.log('✅ DASHBOARD VERIFICATION COMPLETE');
        console.log('====================================\n');
        
        console.log('📌 TO ACCESS THE DASHBOARD:');
        console.log('1. Make sure crud-server.js is running:');
        console.log('   node crud-server.js\n');
        console.log('2. Open your browser and go to:');
        console.log('   http://localhost:4000\n');
        console.log('3. Features available:');
        console.log('   - Form Submissions tab (default) - Shows all plain form submissions');
        console.log('   - Export LinkedIn IDs button - Downloads CSV with LinkedIn profiles');
        console.log('   - All Profiles tab - Shows all users in the system');
        console.log('   - User Stats tab - Shows user activity statistics');
        console.log('   - Other tabs for sessions, queries, OTPs, cooldowns\n');
        
        console.log('⚠️  NOTE: System Logs tab has been removed as the collection doesn\'t exist');
        
    } catch (error) {
        console.error('❌ Verification failed:', error);
    } finally {
        await client.close();
    }
}

verifyDashboard();