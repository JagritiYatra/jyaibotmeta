// Static location data cache to avoid API calls
// This data rarely changes, so we can cache it client-side

const LOCATION_CACHE = {
  countries: null,
  states: {},
  cities: {},
  lastFetch: null,
  cacheExpiry: 24 * 60 * 60 * 1000 // 24 hours
};

// Save cache to localStorage
function saveCache() {
  try {
    localStorage.setItem('locationCache', JSON.stringify(LOCATION_CACHE));
  } catch (e) {
    console.error('Failed to save cache:', e);
  }
}

// Load cache from localStorage
function loadCache() {
  try {
    const cached = localStorage.getItem('locationCache');
    if (cached) {
      const data = JSON.parse(cached);
      if (data.lastFetch && (Date.now() - data.lastFetch) < LOCATION_CACHE.cacheExpiry) {
        Object.assign(LOCATION_CACHE, data);
        return true;
      }
    }
  } catch (e) {
    console.error('Failed to load cache:', e);
  }
  return false;
}

// Get countries with caching
async function getCachedCountries() {
  loadCache();
  
  if (LOCATION_CACHE.countries) {
    console.log('Using cached countries');
    return LOCATION_CACHE.countries;
  }
  
  try {
    const response = await fetch('/api/countries');
    if (response.ok) {
      const countries = await response.json();
      LOCATION_CACHE.countries = countries;
      LOCATION_CACHE.lastFetch = Date.now();
      saveCache();
      return countries;
    }
  } catch (error) {
    console.error('Failed to fetch countries:', error);
  }
  
  // Return fallback data if API fails
  return [
    { id: 'IN', name: 'India', code: 'IN', phonecode: '91' },
    { id: 'US', name: 'United States', code: 'US', phonecode: '1' },
    { id: 'GB', name: 'United Kingdom', code: 'GB', phonecode: '44' },
    { id: 'CA', name: 'Canada', code: 'CA', phonecode: '1' },
    { id: 'AU', name: 'Australia', code: 'AU', phonecode: '61' }
  ];
}

// Get states with caching
async function getCachedStates(countryCode) {
  loadCache();
  
  if (LOCATION_CACHE.states[countryCode]) {
    console.log('Using cached states for', countryCode);
    return LOCATION_CACHE.states[countryCode];
  }
  
  try {
    const response = await fetch(`/api/states/${countryCode}`);
    if (response.ok) {
      const states = await response.json();
      LOCATION_CACHE.states[countryCode] = states;
      saveCache();
      return states;
    }
  } catch (error) {
    console.error('Failed to fetch states:', error);
  }
  
  // Return fallback for India
  if (countryCode === 'IN') {
    return [
      { id: 'MH', name: 'Maharashtra', code: 'MH' },
      { id: 'DL', name: 'Delhi', code: 'DL' },
      { id: 'KA', name: 'Karnataka', code: 'KA' },
      { id: 'TN', name: 'Tamil Nadu', code: 'TN' },
      { id: 'UP', name: 'Uttar Pradesh', code: 'UP' }
    ];
  }
  
  return [];
}

// Get cities with caching
async function getCachedCities(countryCode, stateCode) {
  loadCache();
  
  const cacheKey = `${countryCode}_${stateCode}`;
  if (LOCATION_CACHE.cities[cacheKey]) {
    console.log('Using cached cities for', cacheKey);
    return LOCATION_CACHE.cities[cacheKey];
  }
  
  try {
    const response = await fetch(`/api/cities/${countryCode}/${stateCode}`);
    if (response.ok) {
      const cities = await response.json();
      LOCATION_CACHE.cities[cacheKey] = cities;
      saveCache();
      return cities;
    }
  } catch (error) {
    console.error('Failed to fetch cities:', error);
  }
  
  // Return fallback cities
  const fallbackCities = {
    'IN_MH': [
      { id: '1', name: 'Mumbai' },
      { id: '2', name: 'Pune' },
      { id: '3', name: 'Nagpur' }
    ],
    'IN_DL': [
      { id: '4', name: 'New Delhi' },
      { id: '5', name: 'Delhi' }
    ],
    'IN_KA': [
      { id: '6', name: 'Bangalore' },
      { id: '7', name: 'Mysore' }
    ]
  };
  
  return fallbackCities[cacheKey] || [];
}