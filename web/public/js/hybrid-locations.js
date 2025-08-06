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
          id: name,
          name: name,
          phonecode: ''
        }));
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
        console.log('Successfully loaded', formattedStates.length, 'states for', countryName);
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
  async getCities(countryName, stateName) {
    const cacheKey = `${countryName}_${stateName}`;
    
    // Check cache first
    if (this.citiesCache[cacheKey]) {
      return this.citiesCache[cacheKey];
    }
    
    try {
      // Use the cities API with country and state names
      console.log('Loading cities for', stateName, ',', countryName);
      const response = await fetch(`https://jyaibot-profile-form.vercel.app/api/cities?country=${encodeURIComponent(countryName)}&state=${encodeURIComponent(stateName)}`);
      if (response.ok) {
        const cities = await response.json();
        // API returns array of city names
        const formattedCities = cities.map(name => ({
          id: name,
          name: name
        }));
        this.citiesCache[cacheKey] = formattedCities;
        console.log('Successfully loaded', formattedCities.length, 'cities for', stateName);
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
      option.textContent = country.name;
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