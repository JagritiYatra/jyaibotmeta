# Enhanced Memory System Documentation

## Overview

The Enhanced Memory System provides intelligent conversation tracking and context-aware follow-up capabilities for the WhatsApp bot. Each user gets a unique session that tracks their entire conversation history, search patterns, and behavioral analytics.

## Key Features

### 1. Unique Session Management
- Each user gets a unique session file stored in `/sessions/memory/{phone_number}/`
- Sessions persist across conversations
- Tracks complete conversation flow with timestamps

### 2. Context-Aware Follow-ups
The system automatically detects and handles follow-up queries:
- "any more" → Shows additional results from the same search
- "senior developers" → Refines previous developer search
- "different profiles" → Excludes previously shown results
- "same city" → Adds location filter based on user's profile

### 3. Intelligent Pattern Recognition
Follow-up indicators detected:
- Phrases: "more", "another", "any more", "else", "similar", "like this"
- Short queries within 5 minutes of last search
- Context-based query expansion

### 4. Behavioral Analytics
Tracks and analyzes:
- Total searches and follow-up rate
- User interests (domains, skills, locations)
- Engagement level (new_user, moderate, engaged, highly_engaged)
- Search patterns and preferences

## Implementation Components

### 1. EnhancedMemoryService (`src/services/enhancedMemoryService.js`)
Core service for memory management:
```javascript
// Initialize session for new user
await EnhancedMemoryService.initializeSession(whatsappNumber);

// Add conversation with context
await EnhancedMemoryService.addConversation(
    whatsappNumber,
    userMessage,
    botResponse,
    { intent, searchQuery, searchResults }
);

// Get context for response generation
const context = await EnhancedMemoryService.getResponseContext(whatsappNumber);

// Get user analytics
const analytics = await EnhancedMemoryService.getUserAnalytics(whatsappNumber);
```

### 2. ContextAwareSearchService (`src/services/contextAwareSearchService.js`)
Handles search with follow-up capabilities:
```javascript
// Process contextual search
const results = await ContextAwareSearchService.processContextualSearch(
    whatsappNumber,
    userMessage,
    intent
);
```

### 3. Session Structure
```json
{
    "sessionId": "unique-id",
    "userId": "+919999999999",
    "conversationFlow": [
        {
            "id": "conv-id",
            "timestamp": "2024-01-18T10:00:00Z",
            "userMessage": "web developers",
            "botResponse": "Here are developers...",
            "context": {
                "intent": "search",
                "isFollowUp": false,
                "searchQuery": "web developers",
                "searchResults": ["Dev1", "Dev2"]
            }
        }
    ],
    "currentContext": {
        "topic": "web developers",
        "searchQuery": "web developers",
        "followUpCount": 2
    },
    "profileInterests": {
        "domains": {"tech": 5, "finance": 2},
        "skills": {"developer": 10, "designer": 3},
        "locations": {"mumbai": 8, "delhi": 4}
    },
    "behaviorMetrics": {
        "totalSearches": 15,
        "followUpSearches": 8,
        "engagementLevel": "engaged"
    }
}
```

## Usage Examples

### 1. Basic Search → Follow-up Flow
```
User: "web developers in Mumbai"
Bot: Shows 5 web developers

User: "any more"  // Detected as follow-up
Bot: Shows 5 different web developers
System: Tracks this as follow-up search

User: "senior ones" // Contextual refinement
Bot: Shows senior web developers in Mumbai
System: Enhances query with previous context
```

### 2. Context Switching
```
User: "marketing experts"
Bot: Shows marketing professionals

User: "developers" // New search, not follow-up
Bot: Shows developers (new search)

User: "more" // Follow-up on developers
Bot: Shows more developers
```

### 3. Smart Suggestions
After searches, the system suggests:
- "Type 'senior' for experienced professionals"
- "Type 'startup' for those with startup experience"
- "Type 'different' to see other profiles"

## Integration Points

### 1. Webhook Handler (`src/routes/webhook.js`)
Tracks conversations automatically:
```javascript
await EnhancedMemoryService.addConversation(
    whatsappNumber,
    userMessage,
    responseMessage,
    { intent, topic, sessionState }
);
```

### 2. Authenticated User Controller
Uses context for search handling:
```javascript
const searchResult = await ContextAwareSearchService.processContextualSearch(
    whatsappNumber,
    userMessage,
    intent
);
```

## Analytics & Monitoring

### User Analytics Available:
- Session duration
- Total interactions
- Search patterns
- Follow-up rate
- Engagement level
- Top interests

### Export Capabilities:
```javascript
const fullExport = await EnhancedMemoryService.exportSession(whatsappNumber);
// Returns complete session data, analytics, and recommendations
```

## Benefits

1. **Better User Experience**: Natural follow-up conversations without repeating search terms
2. **Personalization**: Understands user interests over time
3. **Analytics**: Track user behavior for improving service
4. **Context Retention**: Remembers conversation context for better responses
5. **Smart Suggestions**: Provides relevant follow-up options

## Testing

Run tests with:
```bash
# Test memory service
node scripts/test-memory-service.js

# Demo follow-up searches
node scripts/demo-follow-up-search.js
```

## Future Enhancements

1. Machine learning for better intent detection
2. Personalized recommendations based on history
3. Cross-session learning
4. Advanced analytics dashboard
5. Export to CRM systems