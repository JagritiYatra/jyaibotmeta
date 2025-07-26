# JyAibot Test Scenarios

## Location-Specific Search Tests

### Test 1: Basic Location Search
- **Query**: "web developers from bengaluru"
- **Expected**: Should show ONLY developers located in Bengaluru
- **Verify**: All results have location containing "Bengaluru" or "Bangalore"

### Test 2: Complex Location Search
- **Query**: "AI experts from Mumbai"
- **Expected**: Should show ONLY AI experts located in Mumbai
- **Verify**: Results match both criteria (AI skills AND Mumbai location)

### Test 3: Location Follow-up
- **Scenario**: 
  1. Search: "developers"
  2. Follow-up: "more matches from pune"
- **Expected**: Should filter existing results to show only Pune developers
- **Verify**: Location filtering works on stored results

## Follow-up Query Tests

### Test 4: Show More Results
- **Query**: "show more" (after a search)
- **Expected**: Should show next batch of results (3-4 more)
- **Verify**: Different profiles than initially shown

### Test 5: Location-Specific More
- **Query**: "more matches from bengaluru" (after searching "web developers")
- **Expected**: Should show more Bengaluru developers specifically
- **Verify**: Results are from Bengaluru and not previously shown

### Test 6: Contact Details Request
- **Query**: "show contact details" (after search)
- **Expected**: Should show email and LinkedIn for displayed profiles
- **Verify**: Contact info is accurate

## Self-Reflection Tests

### Test 7: Who Am I Query
- **Query**: "who am I?"
- **Expected**: Personalized motivational message using user's actual data
- **Verify**: Message includes user's name, skills, role, and Yatra year

### Test 8: About Me Query
- **Query**: "tell me about myself"
- **Expected**: Similar to Test 7, shows user's profile info inspirationally
- **Verify**: Uses real database data, not generic response

## Session Persistence Tests

### Test 9: Session Context
- **Scenario**:
  1. Search for "entrepreneurs"
  2. Wait 2 minutes
  3. Ask "tell me more"
- **Expected**: Should remember previous search and show details
- **Verify**: Session persists for at least 30 minutes

### Test 10: User ID Consistency
- **Scenario**: Multiple searches and follow-ups
- **Expected**: Results are properly stored and retrieved
- **Verify**: No "no recent search results" errors when there should be results

## Edge Cases

### Test 11: No Results Location
- **Query**: "developers from antarctica"
- **Expected**: Appropriate "no results" message
- **Verify**: Doesn't crash, gives helpful response

### Test 12: Mixed Queries
- **Query**: "show me more" (without prior search)
- **Expected**: "Please search for alumni first" message
- **Verify**: Handles missing context gracefully

## Profile Completion Tests

### Test 13: Incomplete Profile
- **Scenario**: User with incomplete profile tries to search
- **Expected**: Profile completion link is shown
- **Verify**: Search is blocked until profile is complete

### Test 14: Completed Profile Flag
- **Scenario**: User with completed=true flag
- **Expected**: All features accessible
- **Verify**: No profile completion prompts

## AND Query Logic Tests

### Test 15: Skill + Location
- **Query**: "Python developers from Delhi"
- **Expected**: Results must have BOTH Python skills AND Delhi location
- **Verify**: No results from other cities

### Test 16: Multiple Skills + Location
- **Query**: "AI ML experts from Hyderabad"
- **Expected**: Results with AI/ML skills AND from Hyderabad
- **Verify**: Proper AND condition application