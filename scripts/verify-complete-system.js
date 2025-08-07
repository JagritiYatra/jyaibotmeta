#!/usr/bin/env node

const { MongoClient } = require('mongodb');
const crypto = require('crypto');

const MONGODB_URI = 'mongodb+srv://jy_bot_user:JY2025Bot@cluster0.1tbvvum.mongodb.net/jagriti_yatra_community?retryWrites=true&w=majority';

async function verifyCompleteSystem() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db('jagriti_yatra_community');
    const TEST_EMAIL = 'techakash@jagritiyatra.com';
    const TEST_WHATSAPP = '919035304140';
    
    console.log('🔄 COMPLETE SYSTEM VERIFICATION');
    console.log('=' .repeat(60));
    
    // 1. Check current state
    console.log('\n📊 Current Profile State:');
    const user = await db.collection('users').findOne({
      $or: [
        { 'metadata.email': TEST_EMAIL },
        { 'basicProfile.email': TEST_EMAIL },
        { 'enhancedProfile.email': TEST_EMAIL }
      ]
    });
    
    if (user) {
      console.log(`  ID: ${user._id}`);
      console.log(`  Name: ${user.enhancedProfile?.fullName || user.basicProfile?.name || 'Not set'}`);
      console.log(`  Email: ${user.enhancedProfile?.email || user.metadata?.email}`);
      console.log(`  WhatsApp: ${user.whatsappNumber || 'Not set'}`);
      console.log(`  Profile Completed: ${user.enhancedProfile?.completed ? '✅ YES' : '❌ NO'}`);
      
      // 2. Simulate what bot would do
      console.log('\n🤖 Bot Response Simulation:');
      if (user.enhancedProfile?.completed === true) {
        const fullName = user.enhancedProfile?.fullName || user.basicProfile?.name || 'there';
        const firstName = fullName.split(' ')[0];
        console.log('  If user sends "hi" to bot:');
        console.log(`  Bot will respond: "Hello ${firstName}! 👋"`);
        console.log('  ✅ User can access all features');
      } else {
        console.log('  If user sends "hi" to bot:');
        console.log('  Bot will ask to complete profile');
        console.log('  ❌ User needs to fill plain form first');
      }
      
      // 3. Check by WhatsApp number (how bot finds users)
      console.log('\n📱 WhatsApp Lookup Test:');
      const userByWhatsApp = await db.collection('users').findOne({
        whatsappNumber: TEST_WHATSAPP
      });
      
      if (userByWhatsApp) {
        console.log(`  ✅ User found by WhatsApp: ${TEST_WHATSAPP}`);
        console.log(`  Profile complete: ${userByWhatsApp.enhancedProfile?.completed ? 'YES' : 'NO'}`);
      } else {
        console.log(`  ❌ No user found with WhatsApp: ${TEST_WHATSAPP}`);
      }
      
    } else {
      console.log('  ❌ No user found with email:', TEST_EMAIL);
    }
    
    // 4. Summary
    console.log('\n' + '=' .repeat(60));
    console.log('📋 SYSTEM STATUS SUMMARY');
    console.log('=' .repeat(60));
    
    const stats = {
      totalUsers: await db.collection('users').countDocuments(),
      completedProfiles: await db.collection('users').countDocuments({ 'enhancedProfile.completed': true }),
      usersWithWhatsApp: await db.collection('users').countDocuments({ whatsappNumber: { $exists: true, $ne: null } }),
      authorizedEmails: 156
    };
    
    console.log(`Total Users: ${stats.totalUsers}`);
    console.log(`Completed Profiles: ${stats.completedProfiles}`);
    console.log(`Users with WhatsApp: ${stats.usersWithWhatsApp}`);
    console.log(`Authorized Emails: ${stats.authorizedEmails}`);
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n✅ Done');
  }
}

// Run verification
verifyCompleteSystem();