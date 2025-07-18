// Demonstration of Context-Aware Search with Follow-up Capabilities
const { detectUserIntent } = require('../src/services/intentDetection');
const ContextAwareSearchService = require('../src/services/contextAwareSearchService');
const EnhancedMemoryService = require('../src/services/enhancedMemoryService');

async function simulateConversation() {
    console.log('🎯 Demonstrating Context-Aware Search with Follow-ups\n');
    
    const testNumber = '+919876543210';
    
    // Conversation scenarios
    const conversations = [
        {
            message: 'web developers in Mumbai',
            description: 'Initial search query'
        },
        {
            message: 'any more profiles',
            description: 'Simple follow-up for more results'
        },
        {
            message: 'show me senior developers',
            description: 'Refined follow-up for senior developers'
        },
        {
            message: 'developers with startup experience',
            description: 'Another refinement for startup experience'
        },
        {
            message: 'marketing experts',
            description: 'New search topic'
        },
        {
            message: 'more',
            description: 'Follow-up on marketing experts'
        }
    ];
    
    try {
        // Initialize session
        console.log('Initializing user session...\n');
        await EnhancedMemoryService.initializeSession(testNumber);
        
        // Process each conversation
        for (const conv of conversations) {
            console.log(`User: "${conv.message}"`);
            console.log(`(${conv.description})`);
            
            // Get conversation context
            const context = await EnhancedMemoryService.getResponseContext(testNumber);
            
            // Check if it's a follow-up
            const isFollowUp = await ContextAwareSearchService.isFollowUpQuery(
                conv.message, 
                context
            );
            
            console.log(`System Analysis:`);
            console.log(`  - Is follow-up: ${isFollowUp}`);
            if (context.lastSearch) {
                console.log(`  - Previous search: "${context.lastSearch}"`);
            }
            console.log(`  - Follow-up count: ${context.followUpCount || 0}`);
            
            // Process the search
            if (isFollowUp && context.lastSearch) {
                const followUpData = await ContextAwareSearchService.processFollowUpSearch(
                    conv.message,
                    context,
                    testNumber
                );
                console.log(`  - Enhanced query: "${followUpData.enhancedQuery}"`);
                console.log(`  - Follow-up type: ${followUpData.context.followUpType}`);
            }
            
            // Add to conversation memory
            await EnhancedMemoryService.addConversation(
                testNumber,
                conv.message,
                'Mock search results...',
                {
                    intent: 'search',
                    searchQuery: conv.message,
                    searchResults: ['Profile1', 'Profile2', 'Profile3']
                }
            );
            
            console.log('---\n');
        }
        
        // Show final analytics
        console.log('📊 Session Analytics:');
        const analytics = await EnhancedMemoryService.getUserAnalytics(testNumber);
        console.log(`  - Total searches: ${analytics.totalSearches}`);
        console.log(`  - Follow-up rate: ${analytics.followUpRate}`);
        console.log(`  - Engagement level: ${analytics.engagementLevel}`);
        console.log(`  - Top interests:`, analytics.topInterests);
        
        // Show follow-up suggestions
        console.log('\n💡 Generated Suggestions:');
        const suggestions = await EnhancedMemoryService.generateFollowUpSuggestions(testNumber);
        suggestions.forEach(s => console.log(`  - ${s}`));
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Run demonstration
simulateConversation().then(() => {
    console.log('\n✅ Demonstration completed!');
}).catch(console.error);