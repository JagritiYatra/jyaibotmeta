const https = require('https');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

console.log('📍 Downloading comprehensive geographic data...\n');

// Using the correct GitHub raw URLs
const files = [
  {
    name: 'countries.json',
    url: 'https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/countries.json'
  },
  {
    name: 'states.json', 
    url: 'https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/states.json'
  },
  {
    name: 'cities.json',
    url: 'https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/cities.json'
  }
];

async function downloadFile(url, filename) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(__dirname, '../data', filename);
    const file = fs.createWriteStream(filePath);
    
    console.log(`Downloading ${filename}...`);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${filename}: ${response.statusCode}`));
        return;
      }
      
      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloadedSize = 0;
      
      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        if (totalSize) {
          const percentage = ((downloadedSize / totalSize) * 100).toFixed(2);
          process.stdout.write(`\r${filename}: ${percentage}% (${(downloadedSize / 1024 / 1024).toFixed(2)} MB)`);
        }
      });
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`\n✅ ${filename} downloaded successfully!`);
        resolve(filePath);
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {});
      reject(err);
    });
  });
}

async function combineData() {
  console.log('\n📊 Combining data files...');
  
  const countriesPath = path.join(__dirname, '../data/countries.json');
  const statesPath = path.join(__dirname, '../data/states.json');
  const citiesPath = path.join(__dirname, '../data/cities.json');
  
  // Read all files
  const countries = JSON.parse(fs.readFileSync(countriesPath, 'utf8'));
  const states = JSON.parse(fs.readFileSync(statesPath, 'utf8'));
  const cities = JSON.parse(fs.readFileSync(citiesPath, 'utf8'));
  
  console.log(`\nLoaded:
  - ${countries.length} countries
  - ${states.length} states
  - ${cities.length} cities`);
  
  // Create lookup maps for efficient processing
  const statesByCountry = {};
  const citiesByState = {};
  
  // Group states by country
  states.forEach(state => {
    if (!statesByCountry[state.country_id]) {
      statesByCountry[state.country_id] = [];
    }
    statesByCountry[state.country_id].push({
      id: state.id,
      name: state.name,
      state_code: state.state_code
    });
  });
  
  // Group cities by state
  cities.forEach(city => {
    if (!citiesByState[city.state_id]) {
      citiesByState[city.state_id] = [];
    }
    citiesByState[city.state_id].push({
      id: city.id,
      name: city.name
    });
  });
  
  // Create optimized structure for form dropdowns
  const geoData = {
    countries: countries.map(c => ({
      id: c.id,
      name: c.name,
      code: c.iso2
    })),
    states: statesByCountry,
    cities: citiesByState
  };
  
  // Save combined data
  const outputPath = path.join(__dirname, '../data/geo-data-complete.json');
  fs.writeFileSync(outputPath, JSON.stringify(geoData, null, 2));
  
  const fileSize = fs.statSync(outputPath).size;
  console.log(`\n✅ Combined data saved to: geo-data-complete.json`);
  console.log(`File size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
  
  // Create India-specific file
  const india = countries.find(c => c.name === 'India');
  if (india) {
    const indiaStates = statesByCountry[india.id] || [];
    const indiaCities = {};
    
    indiaStates.forEach(state => {
      indiaCities[state.id] = citiesByState[state.id] || [];
    });
    
    const indiaData = {
      country: { id: india.id, name: india.name, code: india.iso2 },
      states: indiaStates,
      cities: indiaCities
    };
    
    const indiaPath = path.join(__dirname, '../data/india-complete.json');
    fs.writeFileSync(indiaPath, JSON.stringify(indiaData, null, 2));
    console.log(`\n✅ India-specific data saved (${(fs.statSync(indiaPath).size / 1024).toFixed(2)} KB)`);
  }
}

// Alternative: Download using curl (more reliable for large files)
async function downloadWithCurl() {
  console.log('\n🔄 Trying alternative download method with curl...\n');
  
  const commands = [
    'curl -L -o web/data/countries.json https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/countries.json',
    'curl -L -o web/data/states.json https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/states.json',
    'curl -L -o web/data/cities.json https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/cities.json'
  ];
  
  for (const cmd of commands) {
    console.log(`Executing: ${cmd}`);
    await new Promise((resolve, reject) => {
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error: ${error}`);
          reject(error);
        } else {
          console.log('✅ Downloaded successfully\n');
          resolve();
        }
      });
    });
  }
}

// Main download function
async function main() {
  try {
    // Try downloading all files
    for (const file of files) {
      await downloadFile(file.url, file.name);
    }
    
    // Combine the data
    await combineData();
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    // Try curl as fallback
    try {
      await downloadWithCurl();
      await combineData();
    } catch (curlError) {
      console.error('\n❌ Both download methods failed');
      console.log('\n📥 Manual download instructions:');
      console.log('1. Visit: https://github.com/dr5hn/countries-states-cities-database');
      console.log('2. Download countries.json, states.json, and cities.json');
      console.log('3. Place them in web/data/ directory');
      console.log('4. Run this script again');
    }
  }
}

main();