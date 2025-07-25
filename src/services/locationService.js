const axios = require('axios');
const { logError, logSuccess } = require('../middleware/logging');

// Country State City API configuration
const CSC_API_KEY = process.env.CSC_API_KEY || 'd1QzenBTT0lvczJYVVN1NFdxQVNqNk45bWR0Z25nRDZSdDkxald6SQ==';
const CSC_API_BASE = 'https://api.countrystatecity.in/v1';

// Cache to reduce API calls
const locationCache = {
  countries: null,
  states: {},
  cities: {},
  lastFetch: {}
};

// Helper function to make API calls
async function cscApiCall(endpoint) {
  try {
    const response = await axios.get(`${CSC_API_BASE}${endpoint}`, {
      headers: {
        'X-CSCAPI-KEY': CSC_API_KEY
      },
      timeout: 5000 // 5 second timeout
    });
    return response.data;
  } catch (error) {
    logError(error, { operation: 'cscApiCall', endpoint });
    return [];
  }
}

// Get all countries
async function getCountries() {
  try {
    // Use cache if available and fresh (1 hour)
    if (locationCache.countries && 
        locationCache.lastFetch.countries && 
        Date.now() - locationCache.lastFetch.countries < 3600000) {
      return locationCache.countries;
    }

    const countries = await cscApiCall('/countries');
    
    // Format for WhatsApp display (limited list for better UX)
    const formattedCountries = countries
      .map(country => ({
        id: country.iso2,
        name: country.name,
        emoji: country.emoji || '🌍'
      }))
      .sort((a, b) => {
        // Prioritize common countries
        const priority = ['IN', 'US', 'GB', 'CA', 'AU', 'AE', 'SG'];
        const aIndex = priority.indexOf(a.id);
        const bIndex = priority.indexOf(b.id);
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return a.name.localeCompare(b.name);
      });

    locationCache.countries = formattedCountries;
    locationCache.lastFetch.countries = Date.now();
    
    return formattedCountries;
  } catch (error) {
    logError(error, { operation: 'getCountries' });
    return [];
  }
}

// Get states by country code
async function getStates(countryCode) {
  try {
    // Use cache if available
    const cacheKey = countryCode.toUpperCase();
    if (locationCache.states[cacheKey] && 
        locationCache.lastFetch[`states_${cacheKey}`] && 
        Date.now() - locationCache.lastFetch[`states_${cacheKey}`] < 3600000) {
      return locationCache.states[cacheKey];
    }

    const states = await cscApiCall(`/countries/${countryCode}/states`);
    
    const formattedStates = states
      .map(state => ({
        id: state.iso2,
        name: state.name
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    locationCache.states[cacheKey] = formattedStates;
    locationCache.lastFetch[`states_${cacheKey}`] = Date.now();
    
    return formattedStates;
  } catch (error) {
    logError(error, { operation: 'getStates', countryCode });
    return [];
  }
}

// Get cities by country and state code
async function getCities(countryCode, stateCode) {
  try {
    // Use cache if available
    const cacheKey = `${countryCode}_${stateCode}`.toUpperCase();
    if (locationCache.cities[cacheKey] && 
        locationCache.lastFetch[`cities_${cacheKey}`] && 
        Date.now() - locationCache.lastFetch[`cities_${cacheKey}`] < 3600000) {
      return locationCache.cities[cacheKey];
    }

    const cities = await cscApiCall(`/countries/${countryCode}/states/${stateCode}/cities`);
    
    // Limit to major cities for WhatsApp (too many options can be overwhelming)
    const formattedCities = cities
      .map(city => ({
        id: city.id,
        name: city.name
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 50); // Limit to 50 cities for WhatsApp

    locationCache.cities[cacheKey] = formattedCities;
    locationCache.lastFetch[`cities_${cacheKey}`] = Date.now();
    
    return formattedCities;
  } catch (error) {
    logError(error, { operation: 'getCities', countryCode, stateCode });
    return [];
  }
}

// Format countries for WhatsApp message
function formatCountriesForWhatsApp(countries, showAll = false) {
  const countriesToShow = showAll ? countries : countries.slice(0, 10);
  
  let message = '🌍 **Select your country:**\n\n';
  
  countriesToShow.forEach((country, index) => {
    message += `${index + 1}. ${country.emoji} ${country.name}\n`;
  });
  
  if (!showAll && countries.length > 10) {
    message += '\n💡 Type "more" to see all countries\n';
    message += '💡 Or type your country name directly';
  }
  
  return message;
}

// Format states for WhatsApp message
function formatStatesForWhatsApp(states, countryName) {
  if (states.length === 0) {
    return `No states/provinces found for ${countryName}.\n\nPlease type your city directly.`;
  }
  
  let message = `📍 **Select your state/province in ${countryName}:**\n\n`;
  
  // Show up to 20 states
  const statesToShow = states.slice(0, 20);
  statesToShow.forEach((state, index) => {
    message += `${index + 1}. ${state.name}\n`;
  });
  
  if (states.length > 20) {
    message += `\n... and ${states.length - 20} more\n`;
    message += '\n💡 Type the number or state name directly';
  }
  
  return message;
}

// Format cities for WhatsApp message
function formatCitiesForWhatsApp(cities, stateName) {
  if (cities.length === 0) {
    return `No cities found for ${stateName}.\n\nPlease type your city name directly.`;
  }
  
  let message = `🏙️ **Select your city in ${stateName}:**\n\n`;
  
  // Show up to 15 cities
  const citiesToShow = cities.slice(0, 15);
  citiesToShow.forEach((city, index) => {
    message += `${index + 1}. ${city.name}\n`;
  });
  
  if (cities.length > 15) {
    message += `\n... and ${cities.length - 15} more\n`;
    message += '\n💡 Type the number or city name directly';
  } else {
    message += '\n💡 If your city is not listed, type it directly';
  }
  
  return message;
}

// Parse user selection (number or name)
function parseUserSelection(input, options) {
  const cleanInput = input.trim();
  
  // Check if it's a number
  const num = parseInt(cleanInput);
  if (!isNaN(num) && num > 0 && num <= options.length) {
    return options[num - 1];
  }
  
  // Try to match by name (case insensitive)
  const lowerInput = cleanInput.toLowerCase();
  return options.find(opt => 
    opt.name.toLowerCase() === lowerInput ||
    opt.name.toLowerCase().includes(lowerInput)
  );
}

// Clear cache (for testing or memory management)
function clearLocationCache() {
  locationCache.countries = null;
  locationCache.states = {};
  locationCache.cities = {};
  locationCache.lastFetch = {};
}

module.exports = {
  getCountries,
  getStates,
  getCities,
  formatCountriesForWhatsApp,
  formatStatesForWhatsApp,
  formatCitiesForWhatsApp,
  parseUserSelection,
  clearLocationCache
};