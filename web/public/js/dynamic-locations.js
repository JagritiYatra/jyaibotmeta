// Dynamic location loader - loads countries, states, cities on demand
// This approach minimizes initial load time

const LOCATION_API = {
  // Use jsdelivr CDN to load from GitHub
  baseUrl: 'https://cdn.jsdelivr.net/gh/dr5hn/countries-states-cities-database@master/',
  
  // Cache loaded data
  cache: {
    countries: null,
    states: {},
    cities: {}
  },
  
  // Load countries (only ~250KB)
  async getCountries() {
    if (this.cache.countries) {
      return this.cache.countries;
    }
    
    try {
      const response = await fetch(this.baseUrl + 'countries.json');
      const countries = await response.json();
      
      // Transform to our format
      this.cache.countries = countries.map(country => ({
        id: country.iso2,
        name: country.name,
        iso3: country.iso3,
        phonecode: country.phonecode
      }));
      
      return this.cache.countries;
    } catch (error) {
      console.error('Failed to load countries:', error);
      // Return fallback
      return [
        {id: 'IN', name: 'India', phonecode: '91'},
        {id: 'US', name: 'United States', phonecode: '1'}
      ];
    }
  },
  
  // Load states for a specific country
  async getStates(countryCode) {
    if (this.cache.states[countryCode]) {
      return this.cache.states[countryCode];
    }
    
    try {
      // Load all states (1.5MB) - but only once
      if (!this.cache.allStates) {
        const response = await fetch(this.baseUrl + 'states.json');
        this.cache.allStates = await response.json();
      }
      
      // Filter states for this country
      const countryStates = this.cache.allStates
        .filter(state => state.country_code === countryCode)
        .map(state => ({
          id: state.state_code,
          name: state.name
        }));
      
      this.cache.states[countryCode] = countryStates;
      return countryStates;
    } catch (error) {
      console.error('Failed to load states:', error);
      return [];
    }
  },
  
  // Load cities for a specific state
  async getCities(countryCode, stateCode) {
    const cacheKey = `${countryCode}_${stateCode}`;
    
    if (this.cache.cities[cacheKey]) {
      return this.cache.cities[cacheKey];
    }
    
    try {
      // For cities, we'll use a different approach
      // Load cities on demand from our backend API
      // This avoids loading the huge 40MB cities file
      const response = await fetch(`/api/cities/${countryCode}/${stateCode}`);
      if (response.ok) {
        const cities = await response.json();
        this.cache.cities[cacheKey] = cities;
        return cities;
      }
    } catch (error) {
      console.error('Failed to load cities:', error);
    }
    
    // Return empty array if failed
    return [];
  }
};

// Export functions for use in profile form
window.getCountries = () => LOCATION_API.getCountries();
window.getStates = (countryCode) => LOCATION_API.getStates(countryCode);
window.getCities = (countryCode, stateCode) => LOCATION_API.getCities(countryCode, stateCode);