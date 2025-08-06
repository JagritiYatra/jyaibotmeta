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
  
  // Initialize with countries from API
  async init() {
    try {
      // Load countries from the API endpoint
      console.log('Loading countries from API...');
      const response = await fetch('https://jyaibot-profile-form.vercel.app/api/countries');
      if (response.ok) {
        const data = await response.json();
        // The API returns an array of country names
        this.countries = data.map(name => ({
          id: name.substring(0, 2).toUpperCase(), // Simple ID from name
          name: name,
          phonecode: ''
        }));
        console.log('Loaded', this.countries.length, 'countries from API');
      }
    } catch (e) {
      console.log('API failed, loading from local/CDN...');
      
      // Fallback to local file
      try {
        const localResponse = await fetch('/data/locations-minimal.json');
        if (localResponse.ok) {
          const data = await localResponse.json();
          this.countries = data.countries;
        }
      } catch (e2) {
        console.log('Loading countries from CDN...');
      }
      
      // If still no data, load from CDN
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
  async getStates(countryName) {
    // Check cache first - now using country name as key
    if (this.statesCache[countryName]) {
      return this.statesCache[countryName];
    }
    
    try {
      // Use the states API with country name
      console.log('Loading states for', countryName);
      const response = await fetch(`https://jyaibot-profile-form.vercel.app/api/states?country=${encodeURIComponent(countryName)}`);
      if (response.ok) {
        const states = await response.json();
        // API returns array of state names
        const formattedStates = states.map(name => ({
          id: name,
          name: name
        }));
        this.statesCache[countryName] = formattedStates;
        console.log('Loaded', formattedStates.length, 'states for', countryName);
        return formattedStates;
      }
    } catch (error) {
      console.log('States API failed, trying CDN...');
    }
    
    // Fallback to CDN
    try {
      const response = await fetch(this.CDN_BASE + 'states.json');
      const allStates = await response.json();
      
      // Filter for this country by name
      const countryStates = allStates
        .filter(s => s.country_name === countryName)
        .map(s => ({
          id: s.state_code || s.name,
          name: s.name
        }));
      
      this.statesCache[countryName] = countryStates;
      return countryStates;
    } catch (error) {
      console.error('Failed to load states:', error);
      return [];
    }
  },
  
  // Get cities for a state (load on demand)
  async getCities(countryName, stateName) {
    const cacheKey = `${countryName}_${stateName}`;
    
    // Check cache first
    if (this.citiesCache[cacheKey]) {
      return this.citiesCache[cacheKey];
    }
    
    try {
      // Use the cities API with country and state names
      console.log('Loading cities for', stateName, countryName);
      const response = await fetch(`https://jyaibot-profile-form.vercel.app/api/cities?country=${encodeURIComponent(countryName)}&state=${encodeURIComponent(stateName)}`);
      if (response.ok) {
        const cities = await response.json();
        // API returns array of city names
        const formattedCities = cities.map(name => ({
          id: name,
          name: name
        }));
        this.citiesCache[cacheKey] = formattedCities;
        console.log('Loaded', formattedCities.length, 'cities for', stateName);
        return formattedCities;
      }
    } catch (error) {
      console.log('Cities API failed:', error);
    }
    
    // For cities, we return empty array as CDN file is too large (40MB)
    // Allow manual entry
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
      const countryName = selectedOption.value; // Use name instead of code
      
      // Reset dependent dropdowns
      stateSelect.innerHTML = '<option value="">Select State</option>';
      citySelect.innerHTML = '<option value="">Select City</option>';
      stateSelect.disabled = true;
      citySelect.disabled = true;
      
      if (countryName) {
        // Load states using country name
        const states = await LocationService.getStates(countryName);
        console.log('Loaded states for', countryName, ':', states.length);
        
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
        const stateName = this.value; // Use state name
        const countryName = countrySelect.value; // Use country name
        
        citySelect.innerHTML = '<option value="">Select City</option>';
        citySelect.disabled = true;
        
        if (stateName && countryName) {
          // Try to load cities using names
          const cities = await LocationService.getCities(countryName, stateName);
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