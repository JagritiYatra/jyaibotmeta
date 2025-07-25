# Location Dropdown Implementation for WhatsApp Profile Capture

## Overview

The address field has been replaced with separate country, state, and city dropdowns in the WhatsApp profile capture flow, using the Country State City API for real-time data.

## Changes Made

### 1. **Database Schema Update**
- Changed from single `address` field to separate fields:
  - `country` - Selected country name
  - `state` - Selected state/province name  
  - `city` - Selected city name

### 2. **Field Sequence Update** (`/src/models/User.js`)
```javascript
// Before: 'country', 'address', 'phone'
// After:  'country', 'state', 'city', 'phone'
```

### 3. **Location Service** (`/src/services/locationService.js`)
Created new service with:
- API integration with countrystatecity.in
- Caching to reduce API calls
- WhatsApp-friendly formatting
- Selection parsing (number or name)

### 4. **Profile Controller Updates** (`/src/controllers/profileController.js`)
- Added dynamic prompts for country/state/city
- Country shows top 10 countries with option to see more
- State shows available states for selected country
- City shows available cities for selected state
- Falls back to manual entry if no options available

### 5. **Session Management** (`/src/controllers/authenticatedUserController.js`)
- Stores selected country code/name in session
- Pre-loads state options when moving to state field
- Pre-loads city options when moving to city field
- Maintains selection context throughout flow

## How It Works

### WhatsApp Flow:

1. **Country Selection**:
   ```
   🌍 Select your country:
   
   1. 🇮🇳 India
   2. 🇺🇸 United States
   3. 🇬🇧 United Kingdom
   ...
   
   Type "more" to see all countries
   Or type your country name directly
   ```

2. **State Selection** (after country):
   ```
   📍 Select your state/province in India:
   
   1. Maharashtra
   2. Karnataka
   3. Delhi
   ...
   
   Type the number or state name directly
   ```

3. **City Selection** (after state):
   ```
   🏙️ Select your city in Maharashtra:
   
   1. Mumbai
   2. Pune
   3. Nagpur
   ...
   
   If your city is not listed, type it directly
   ```

### Features:

- **Smart Selection**: Users can type number (1, 2, 3) or name
- **Fallback**: If API fails or no options, accepts manual input
- **Caching**: Reduces API calls for better performance
- **Session Context**: Remembers selections for cascading
- **Validation**: Ensures valid selections or manual input

## API Configuration

- **Provider**: countrystatecity.in
- **API Key**: Configured in environment
- **Coverage**: 250+ countries, 4000+ states, 150,000+ cities

## Benefits

1. **Structured Data**: Consistent location format across all profiles
2. **Better Search**: Can now search by specific city/state
3. **User Experience**: Easy selection vs typing full address
4. **Data Quality**: Reduces typos and inconsistencies
5. **Global Coverage**: Works for all countries

## Testing

To test the new flow:
1. Send "hi" to the WhatsApp bot
2. Progress through fields until country
3. Select or type country
4. Select or type state
5. Select or type city

The location data is now captured in a structured format that makes searching and filtering much more effective!