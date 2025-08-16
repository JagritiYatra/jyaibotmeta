// Test Enhanced Memory Service with Follow-up Capabilities
const EnhancedMemoryService = require('../src/services/enhancedMemoryService');

async function testMemoryService() {
    console.log('🧪 Testing Enhanced Memory Service\n');
    
    const testNumber = '+919999999999'; // Test number
    
    try {
        // Test 1: Initialize session
        console.log('Test 1: Initializing session...');
        const session = await EnhancedMemoryService.initializeSession(testNumber);
        console.log('✅ Session created:', session.sessionId);
        console.log('');
        
        // Test 2: Add first search conversation
        console.log('Test 2: Adding first search conversation...');
        const conv1 = await EnhancedMemoryService.addConversation(
            testNumber,
            'web developers in Mumbai',
            'Here are 5 web developers in Mumbai...',
            {
                intent: 'search',
                searchQuery: 'web developers in Mumbai',
                searchResults: ['Dev1', 'Dev2', 'Dev3', 'Dev4', 'Dev5']
            }
        );
        console.log('✅ First search added');
        console.log('   Follow-up detected:', conv1.followUpInfo.isFollowUp);
        console.log('');
        
        // Test 3: Add follow-up search
        console.log('Test 3: Adding follow-up search...');
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
        
        const conv2 = await EnhancedMemoryService.addConversation(
            testNumber,
            'any more profiles',
            'Here are more web developers...',
            {
                intent: 'search',
                searchQuery: 'web developers in Mumbai',
                searchResults: ['Dev6', 'Dev7', 'Dev8']
            }
        );
        console.log('✅ Follow-up search added');
        console.log('   Follow-up detected:', conv2.followUpInfo.isFollowUp);
        console.log('   Related to:', conv2.followUpInfo.relatedTo);
        console.log('');
        
        // Test 4: Add another follow-up
        console.log('Test 4: Adding specific follow-up...');
        const conv3 = await EnhancedMemoryService.addConversation(
            testNumber,
            'show me senior developers',
            'Here are senior web developers...',
            {
                intent: 'search',
                searchQuery: 'senior web developers in Mumbai',
                searchResults: ['SeniorDev1', 'SeniorDev2']
            }
        );
        console.log('✅ Specific follow-up added');
        console.log('   Follow-up detected:', conv3.followUpInfo.isFollowUp);
        console.log('');
        
        // Test 5: Get response context
        console.log('Test 5: Getting response context...');
        const context = await EnhancedMemoryService.getResponseContext(testNumber);
        console.log('✅ Context retrieved:');
        console.log('   Current topic:', context.currentTopic);
        console.log('   Last search:', context.lastSearch);
        console.log('   Follow-up count:', context.followUpCount);
        console.log('   User interests:', JSON.stringify(context.userInterests, null, 2));
        console.log('');
        
        // Test 6: Generate follow-up suggestions
        console.log('Test 6: Generating follow-up suggestions...');
        const suggestions = await EnhancedMemoryService.generateFollowUpSuggestions(testNumber);
        console.log('✅ Suggestions:', suggestions);
        console.log('');
        
        // Test 7: Get user analytics
        console.log('Test 7: Getting user analytics...');
        const analytics = await EnhancedMemoryService.getUserAnalytics(testNumber);
        console.log('✅ Analytics:');
        console.log('   Total searches:', analytics.totalSearches);
        console.log('   Follow-up rate:', analytics.followUpRate);
        console.log('   Engagement level:', analytics.engagementLevel);
        console.log('');
        
        // Test 8: Export session
        console.log('Test 8: Exporting session...');
        const exported = await EnhancedMemoryService.exportSession(testNumber);
        console.log('✅ Session exported');
        console.log('   Total conversations:', exported.session.conversationFlow.length);
        console.log('   Behavior metrics:', exported.analytics.behaviorMetrics);
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run tests
testMemoryService().then(() => {
    console.log('\n✅ All tests completed!');
}).catch(console.error);