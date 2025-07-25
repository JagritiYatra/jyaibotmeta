// Static location data loader
let LOCATION_DATA = null;

// Load location data once
async function loadLocationData() {
    if (LOCATION_DATA) return LOCATION_DATA;
    
    try {
        const response = await fetch('/data/locations-minimal.json');
        LOCATION_DATA = await response.json();
        return LOCATION_DATA;
    } catch (error) {
        console.error('Failed to load location data:', error);
        // Return minimal fallback
        return {
            countries: [
                {id: 'IN', name: 'India'},
                {id: 'US', name: 'United States'}
            ],
            states: {
                'IN': [{id: 'MH', name: 'Maharashtra'}, {id: 'DL', name: 'Delhi'}]
            },
            cities: {
                'MH': [{id: '1', name: 'Mumbai'}, {id: '2', name: 'Pune'}],
                'DL': [{id: '3', name: 'New Delhi'}]
            }
        };
    }
}

// Get all countries
async function getCountries() {
    const data = await loadLocationData();
    return data.countries;
}

// Get states for a country
async function getStates(countryId) {
    const data = await loadLocationData();
    return data.states[countryId] || [];
}

// Get cities for a state
async function getCities(countryId, stateId) {
    const data = await loadLocationData();
    return data.cities[stateId] || [];
}