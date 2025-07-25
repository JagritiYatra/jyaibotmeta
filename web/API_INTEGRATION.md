# Country State City API Integration

The profile form now uses the Country State City API to fetch real-time geographic data.

## API Details

- **API Provider**: countrystatecity.in
- **API Key**: `d1QzenBTT0lvczJYVVN1NFdxQVNqNk45bWR0Z25nRDZSdDkxald6SQ==`
- **Documentation**: https://countrystatecity.in/docs/api/all-countries/

## Features

1. **Real-time Data**: Always up-to-date country, state, and city information
2. **Comprehensive Coverage**: 
   - 250+ Countries
   - 4,000+ States/Provinces
   - 150,000+ Cities
3. **No Local Storage**: No need to maintain large JSON files

## API Endpoints Used

1. **Get All Countries**: `GET /api/countries`
   - Returns all countries with ISO2 codes

2. **Get States by Country**: `GET /api/states/{countryCode}`
   - Returns states for a specific country
   - Uses ISO2 country code (e.g., "IN" for India)

3. **Get Cities by State**: `GET /api/cities/{countryCode}/{stateCode}`
   - Returns cities for a specific state
   - Uses ISO2 codes for both country and state

## Environment Variable

Add to your `.env` file:
```
CSC_API_KEY=d1QzenBTT0lvczJYVVN1NFdxQVNqNk45bWR0Z25nRDZSdDkxald6SQ==
```

## How It Works

1. When the form loads, it fetches all countries from the API
2. When a country is selected, it fetches states for that country
3. When a state is selected, it fetches cities for that state
4. All data is fetched in real-time, ensuring accuracy

## Benefits Over Static JSON

- **Always Updated**: No need to update local files
- **Smaller Deployment**: No large JSON files to deploy
- **Better Performance**: Only loads data as needed
- **Scalable**: Works for all countries without additional setup

## Rate Limits

The API has generous rate limits suitable for form usage. Check the official documentation for current limits.

## Error Handling

The form gracefully handles API errors:
- Shows "Loading..." while fetching data
- Shows "No states/cities available" if none exist
- Shows "Error loading" if API fails
- Falls back to manual entry if needed