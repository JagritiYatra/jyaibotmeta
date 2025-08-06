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
        console.log('API response:', data);
        
        // The API returns an array of objects directly
        if (Array.isArray(data)) {
          this.countries = data.map(country => ({
            id: country.id || country.code || country.name,
            name: country.name,
            phonecode: country.phonecode || ''
          }));
        } else {
          console.error('Unexpected data format:', data);
          throw new Error('Invalid data format');
        }
        
        console.log('Successfully loaded', this.countries.length, 'countries from API');
        return this.countries;
      } else {
        console.error('API returned error:', response.status);
        throw new Error('API failed');
      }
    } catch (e) {
      console.error('Failed to load countries from API:', e);
      // Simple fallback
      this.countries = [
        {id: 'India', name: 'India', phonecode: '91'},
        {id: 'United States', name: 'United States', phonecode: '1'}
      ];
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
  async getStates(countryId) {
    // Check cache first - using country ID as key
    if (this.statesCache[countryId]) {
      return this.statesCache[countryId];
    }
    
    try {
      // Use the states API with country code
      console.log('Loading states for country code:', countryId);
      const response = await fetch(`https://jyaibot-profile-form.vercel.app/api/states/${countryId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('States API response:', data);
        
        // The API returns an array of objects directly
        let formattedStates = [];
        if (Array.isArray(data)) {
          formattedStates = data.map(state => ({
            id: state.id || state.code || state.name,
            name: state.name
          }));
        }
        
        this.statesCache[countryId] = formattedStates;
        console.log('Successfully loaded', formattedStates.length, 'states for', countryId);
        return formattedStates;
      } else {
        console.error('States API returned error:', response.status);
        return [];
      }
    } catch (error) {
      console.error('Failed to load states:', error);
      return [];
    }
  },
  
  // Get cities for a state (load on demand)
  async getCities(countryId, stateId) {
    const cacheKey = `${countryId}_${stateId}`;
    
    // Check cache first
    if (this.citiesCache[cacheKey]) {
      return this.citiesCache[cacheKey];
    }
    
    try {
      // Use the cities API with country and state codes
      console.log('Loading cities for state:', stateId, ', country:', countryId);
      const response = await fetch(`https://jyaibot-profile-form.vercel.app/api/cities/${countryId}/${stateId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Cities API response:', data);
        
        // The API returns an array of objects directly
        let formattedCities = [];
        if (Array.isArray(data)) {
          formattedCities = data.map(city => ({
            id: city.id || city.name,
            name: city.name
          }));
        }
        
        this.citiesCache[cacheKey] = formattedCities;
        console.log('Successfully loaded', formattedCities.length, 'cities for', stateId);
        return formattedCities;
      } else {
        console.error('Cities API returned error:', response.status);
        return [];
      }
    } catch (error) {
      console.error('Failed to load cities:', error);
      return [];
    }
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
      option.dataset.countryId = country.id; // Store the country ID for API calls
      option.textContent = country.name;
      countrySelect.appendChild(option);
    });
    
    // Country change handler
    countrySelect.addEventListener('change', async function() {
      const selectedOption = this.options[this.selectedIndex];
      const countryName = selectedOption.value;
      const countryId = selectedOption.dataset.countryId; // Get the country ID for API
      
      // Reset dependent dropdowns
      stateSelect.innerHTML = '<option value="">Select State</option>';
      citySelect.innerHTML = '<option value="">Select City</option>';
      stateSelect.disabled = true;
      citySelect.disabled = true;
      
      if (countryName && countryId) {
        // Load states using country ID
        const states = await LocationService.getStates(countryId);
        console.log('Loaded states for', countryName, '(', countryId, '):', states.length);
        
        if (states.length > 0) {
          stateSelect.disabled = false;
          states.forEach(state => {
            const option = document.createElement('option');
            option.value = state.name;
            option.dataset.stateId = state.id; // Store the state ID for API calls
            option.textContent = state.name;
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
        const stateName = selectedOption.value;
        const stateId = selectedOption.dataset.stateId; // Get the state ID for API
        const countryOption = countrySelect.options[countrySelect.selectedIndex];
        const countryId = countryOption.dataset.countryId; // Get the country ID
        
        citySelect.innerHTML = '<option value="">Select City</option>';
        citySelect.disabled = true;
        
        if (stateName && stateId && countryId) {
          // Load cities using IDs
          const cities = await LocationService.getCities(countryId, stateId);
          console.log('Loaded cities for', stateName, ':', cities.length);
          
          citySelect.disabled = false;
          if (cities.length > 0) {
            cities.forEach(city => {
              const option = document.createElement('option');
              option.value = city.name;
              option.textContent = city.name;
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