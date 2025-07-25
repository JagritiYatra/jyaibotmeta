// Hybrid approach: Load countries locally, fetch states/cities from CDN on demand
// This gives you ALL data while keeping initial load fast

const LocationService = {
  // Countries stored locally (small file)
  countries: null,
  
  // Cache for states and cities
  statesCache: {},
  citiesCache: {},
  
  // CDN URLs for dr5hn database
  CDN_BASE: 'https://cdn.jsdelivr.net/npm/countries-states-cities-json@2.0.0/',
  
  // Initialize with local countries data
  async init() {
    try {
      // Load countries from local file first
      const localResponse = await fetch('/data/locations-minimal.json');
      if (localResponse.ok) {
        const data = await localResponse.json();
        this.countries = data.countries;
      }
    } catch (e) {
      console.log('Loading countries from CDN...');
    }
    
    // If no local data, load from CDN
    if (!this.countries) {
      try {
        const response = await fetch(this.CDN_BASE + 'countries.json');
        const data = await response.json();
        this.countries = data.map(c => ({
          id: c.iso2,
          name: c.name,
          phonecode: c.phonecode
        }));
      } catch (error) {
        console.error('Failed to load countries:', error);
        // Ultimate fallback
        this.countries = [
          {id: 'IN', name: 'India', phonecode: '91'},
          {id: 'US', name: 'United States', phonecode: '1'}
        ];
      }
    }
    
    return this.countries;
  },
  
  // Get all countries
  async getCountries() {
    if (!this.countries) {
      await this.init();
    }
    return this.countries;
  },
  
  // Get states for a country (load on demand)
  async getStates(countryCode) {
    // Check cache first
    if (this.statesCache[countryCode]) {
      return this.statesCache[countryCode];
    }
    
    try {
      // Try backend API first (with caching)
      const response = await fetch(`/api/states/${countryCode}`);
      if (response.ok) {
        const states = await response.json();
        this.statesCache[countryCode] = states;
        return states;
      }
    } catch (error) {
      console.log('Backend API failed, trying CDN...');
    }
    
    // Fallback to CDN
    try {
      const response = await fetch(this.CDN_BASE + 'states.json');
      const allStates = await response.json();
      
      // Filter for this country
      const countryStates = allStates
        .filter(s => s.country_code === countryCode)
        .map(s => ({
          id: s.state_code,
          name: s.name
        }));
      
      this.statesCache[countryCode] = countryStates;
      return countryStates;
    } catch (error) {
      console.error('Failed to load states:', error);
      return [];
    }
  },
  
  // Get cities for a state (load on demand)
  async getCities(countryCode, stateCode) {
    const cacheKey = `${countryCode}_${stateCode}`;
    
    // Check cache first
    if (this.citiesCache[cacheKey]) {
      return this.citiesCache[cacheKey];
    }
    
    try {
      // Try backend API first
      const response = await fetch(`/api/cities/${countryCode}/${stateCode}`);
      if (response.ok) {
        const cities = await response.json();
        this.citiesCache[cacheKey] = cities;
        return cities;
      }
    } catch (error) {
      console.log('Backend API failed for cities');
    }
    
    // For cities, we return empty array as CDN file is too large (40MB)
    // You can implement pagination or search if needed
    return [];
  }
};

// Export for use in profile form
window.LocationService = LocationService;
window.getCountries = () => LocationService.getCountries();
window.getStates = (code) => LocationService.getStates(code);
window.getCities = (country, state) => LocationService.getCities(country, state);