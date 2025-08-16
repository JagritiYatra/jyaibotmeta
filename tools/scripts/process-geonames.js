// Script to process GeoNames allCountries.txt into optimized JSON
const fs = require('fs');
const readline = require('readline');
const path = require('path');

async function processGeoNames() {
  const countries = new Map();
  const states = new Map();
  const cities = new Map();
  
  // Country codes mapping
  const countryNames = {
    'IN': 'India',
    'US': 'United States',
    'GB': 'United Kingdom',
    'CA': 'Canada',
    'AU': 'Australia',
    'DE': 'Germany',
    'FR': 'France',
    'IT': 'Italy',
    'ES': 'Spain',
    'BR': 'Brazil',
    'MX': 'Mexico',
    'JP': 'Japan',
    'CN': 'China',
    'KR': 'South Korea',
    'SG': 'Singapore',
    'MY': 'Malaysia',
    'TH': 'Thailand',
    'ID': 'Indonesia',
    'PH': 'Philippines',
    'VN': 'Vietnam',
    'AE': 'United Arab Emirates',
    'SA': 'Saudi Arabia',
    'EG': 'Egypt',
    'ZA': 'South Africa',
    'NG': 'Nigeria',
    'KE': 'Kenya',
    'NZ': 'New Zealand',
    'AR': 'Argentina',
    'CL': 'Chile',
    'CO': 'Colombia'
  };
  
  const fileStream = fs.createReadStream(path.join(__dirname, '../allCountries.txt'));
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  
  let lineCount = 0;
  let cityCount = 0;
  
  for await (const line of rl) {
    lineCount++;
    if (lineCount % 100000 === 0) {
      console.log(`Processed ${lineCount} lines, found ${cityCount} cities...`);
    }
    
    const parts = line.split('\t');
    const name = parts[1];
    const countryCode = parts[8];
    const admin1Code = parts[10]; // State/Province code
    const featureClass = parts[6];
    const featureCode = parts[7];
    const population = parseInt(parts[14]) || 0;
    
    // Skip if not in our country list
    if (!countryNames[countryCode]) continue;
    
    // Add country
    if (!countries.has(countryCode)) {
      countries.set(countryCode, {
        id: countryCode,
        name: countryNames[countryCode]
      });
    }
    
    // Add cities (populated places with population > 5000)
    if (featureClass === 'P' && population > 5000) {
      cityCount++;
      const stateKey = `${countryCode}_${admin1Code}`;
      
      if (!cities.has(stateKey)) {
        cities.set(stateKey, []);
      }
      
      cities.get(stateKey).push({
        id: String(cityCount),
        name: name,
        population: population
      });
    }
    
    // Add states/provinces (administrative divisions)
    if (featureCode === 'ADM1' && admin1Code) {
      const stateKey = `${countryCode}_${admin1Code}`;
      if (!states.has(countryCode)) {
        states.set(countryCode, []);
      }
      
      const stateList = states.get(countryCode);
      if (!stateList.find(s => s.id === admin1Code)) {
        stateList.push({
          id: admin1Code,
          name: name
        });
      }
    }
  }
  
  // Sort cities by population and keep top 100 per state
  const citiesObj = {};
  for (const [key, cityList] of cities) {
    citiesObj[key] = cityList
      .sort((a, b) => b.population - a.population)
      .slice(0, 100)
      .map(({id, name}) => ({id, name}));
  }
  
  // Create output object
  const locationData = {
    countries: Array.from(countries.values()),
    states: Object.fromEntries(states),
    cities: citiesObj
  };
  
  // Write to file
  const outputPath = path.join(__dirname, '../web/public/data/locations-full.json');
  fs.writeFileSync(outputPath, JSON.stringify(locationData, null, 2));
  
  console.log(`
    Processing complete!
    - Countries: ${countries.size}
    - States: ${Array.from(states.values()).reduce((sum, s) => sum + s.length, 0)}
    - Cities: ${cityCount}
    - Output file: ${outputPath}
    - File size: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)}MB
  `);
}

processGeoNames().catch(console.error);