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

// Initialize location selects for forms
async function initializeLocationSelects() {
  console.log('Initializing location selects...');
  
  try {
    // Initialize the service
    await LocationService.init();
    
    // Get the select elements
    const countrySelect = document.getElementById('countrySelect');
    const stateSelect = document.getElementById('stateSelect');
    const citySelect = document.getElementById('citySelect');
    
    if (!countrySelect) {
      console.log('Country select not found');
      return;
    }
    
    // Load countries
    const countries = await LocationService.getCountries();
    console.log('Loaded countries:', countries.length);
    
    // Populate country dropdown
    countrySelect.innerHTML = '<option value="">Select Country</option>';
    countries.forEach(country => {
      const option = document.createElement('option');
      option.value = country.name;
      option.textContent = country.name;
      option.dataset.code = country.id;
      countrySelect.appendChild(option);
    });
    
    // Country change handler
    countrySelect.addEventListener('change', async function() {
      const selectedOption = this.options[this.selectedIndex];
      const countryCode = selectedOption.dataset.code;
      
      // Reset dependent dropdowns
      stateSelect.innerHTML = '<option value="">Select State</option>';
      citySelect.innerHTML = '<option value="">Select City</option>';
      stateSelect.disabled = true;
      citySelect.disabled = true;
      
      if (countryCode) {
        // Load states
        const states = await LocationService.getStates(countryCode);
        console.log('Loaded states for', countryCode, ':', states.length);
        
        if (states.length > 0) {
          stateSelect.disabled = false;
          states.forEach(state => {
            const option = document.createElement('option');
            option.value = state.name;
            option.textContent = state.name;
            option.dataset.code = state.id;
            stateSelect.appendChild(option);
          });
        } else {
          // No states - enable city directly
          stateSelect.innerHTML = '<option value="N/A">N/A</option>';
          stateSelect.value = 'N/A';
          citySelect.disabled = false;
        }
      }
    });
    
    // State change handler
    if (stateSelect) {
      stateSelect.addEventListener('change', async function() {
        const selectedOption = this.options[this.selectedIndex];
        const stateCode = selectedOption.dataset.code;
        const countryOption = countrySelect.options[countrySelect.selectedIndex];
        const countryCode = countryOption.dataset.code;
        
        citySelect.innerHTML = '<option value="">Select City</option>';
        citySelect.disabled = true;
        
        if (stateCode && countryCode) {
          // Try to load cities
          const cities = await LocationService.getCities(countryCode, stateCode);
          console.log('Loaded cities:', cities.length);
          
          citySelect.disabled = false;
          if (cities.length > 0) {
            cities.forEach(city => {
              const option = document.createElement('option');
              option.value = city.name || city;
              option.textContent = city.name || city;
              citySelect.appendChild(option);
            });
          } else {
            // Allow manual entry
            citySelect.innerHTML = '<option value="">Enter city manually</option>';
          }
        } else if (this.value) {
          citySelect.disabled = false;
        }
      });
    }
    
    console.log('Location selects initialized successfully');
  } catch (error) {
    console.error('Error initializing location selects:', error);
  }
}

// Export for use in profile form
window.LocationService = LocationService;
window.getCountries = () => LocationService.getCountries();
window.getStates = (code) => LocationService.getStates(code);
window.getCities = (country, state) => LocationService.getCities(country, state);
window.initializeLocationSelects = initializeLocationSelects;