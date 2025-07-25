// Get token and WhatsApp number from URL
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');
const whatsappNumber = urlParams.get('wa');

// Token is optional for testing
if (!token) {
    console.warn('No token provided - form may not save correctly');
}

// Store selected names for submission
let selectedCountryName = '';
let selectedStateName = '';
let selectedCityName = '';

// Function to fetch and pre-fill user data
async function loadUserData() {
    if (!token || !whatsappNumber) {
        console.log('No token or WhatsApp number for pre-filling');
        return;
    }
    
    try {
        const response = await fetch(`/api/user-data?token=${token}&wa=${encodeURIComponent(whatsappNumber)}`);
        const { userData } = await response.json();
        
        if (userData && Object.keys(userData).length > 0) {
            // Pre-fill basic fields
            if (userData.name) document.getElementById('name').value = userData.name;
            if (userData.gender) document.getElementById('gender').value = userData.gender;
            if (userData.professionalRole) document.getElementById('professionalRole').value = userData.professionalRole;
            if (userData.dateOfBirth) document.getElementById('dateOfBirth').value = userData.dateOfBirth;
            if (userData.phoneNumber) document.getElementById('phoneNumber').value = userData.phoneNumber;
            if (userData.linkedInProfile) document.getElementById('linkedInProfile').value = userData.linkedInProfile;
            if (userData.instagramProfile) document.getElementById('instagramProfile').value = userData.instagramProfile;
            if (userData.additionalEmail) document.getElementById('additionalEmail').value = userData.additionalEmail;
            if (userData.industryDomain) document.getElementById('industryDomain').value = userData.industryDomain;
            
            // Pre-fill checkboxes
            if (userData.yatraImpact && Array.isArray(userData.yatraImpact)) {
                userData.yatraImpact.forEach(impact => {
                    const checkbox = document.querySelector(`input[name="yatraImpact"][value="${impact}"]`);
                    if (checkbox) checkbox.checked = true;
                });
            }
            
            if (userData.communityAsks && Array.isArray(userData.communityAsks)) {
                userData.communityAsks.forEach(ask => {
                    const checkbox = document.querySelector(`input[name="communityAsks"][value="${ask}"]`);
                    if (checkbox) checkbox.checked = true;
                });
            }
            
            if (userData.communityGives && Array.isArray(userData.communityGives)) {
                userData.communityGives.forEach(give => {
                    const checkbox = document.querySelector(`input[name="communityGives"][value="${give}"]`);
                    if (checkbox) checkbox.checked = true;
                });
            }
            
            // Store location names if available
            if (userData.country) selectedCountryName = userData.country;
            if (userData.state) selectedStateName = userData.state;
            if (userData.city) selectedCityName = userData.city;
            
            console.log('User data pre-filled successfully');
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        // Continue without pre-filling
    }
}

// Country State City API configuration
const CSC_API_KEY = 'd1QzenBTT0lvczJYVVN1NFdxQVNqNk45bWR0Z25nRDZSdDkxald6SQ==';
const CSC_API_BASE = 'https://api.countrystatecity.in/v1';

// Helper function to get location data
async function fetchLocationData(endpoint) {
    try {
        // First try our backend API which has better error handling
        let apiUrl = '';
        if (endpoint === '/countries') {
            apiUrl = '/api/countries';
        } else if (endpoint.includes('/states')) {
            const countryCode = endpoint.split('/')[2];
            apiUrl = `/api/states/${countryCode}`;
        } else if (endpoint.includes('/cities')) {
            const parts = endpoint.split('/');
            const countryCode = parts[2];
            const stateCode = parts[4];
            apiUrl = `/api/cities/${countryCode}/${stateCode}`;
        }
        
        console.log('Fetching from:', apiUrl);
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error(`Backend API responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Received data:', data.length, 'items');
        return data;
    } catch (error) {
        console.error('Location API Error:', error);
        // Return empty array on error
        return [];
    }
}

// Load countries on page load
window.addEventListener('DOMContentLoaded', async () => {
    // First load user data
    await loadUserData();
    
    try {
        // Get countries from static data
        const countries = await getCountries();
        
        const countrySelect = document.getElementById('countrySelect');
        countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country.iso2 || country.id;  // ISO2 code
            option.textContent = country.name;
            option.dataset.name = country.name;  // Store name for later use
            countrySelect.appendChild(option);
        });
        
        // If we have pre-filled country, select it and load states
        if (selectedCountryName) {
            const countryOption = Array.from(countrySelect.options).find(opt => 
                opt.textContent === selectedCountryName
            );
            if (countryOption) {
                countrySelect.value = countryOption.value;
                // Trigger change event to load states
                countrySelect.dispatchEvent(new Event('change'));
            }
        }
    } catch (error) {
        console.error('Error loading countries:', error);
        alert('Failed to load countries. Please refresh the page.');
    }
});

// Handle country selection
document.getElementById('countrySelect').addEventListener('change', async function() {
    const countryCode = this.value;
    const stateSelect = document.getElementById('stateSelect');
    const citySelect = document.getElementById('citySelect');
    
    // Mark as user changed after initial load
    this.dataset.userChanged = 'true';
    
    // Store selected country name
    const selectedOption = this.options[this.selectedIndex];
    selectedCountryName = selectedOption.dataset.name || selectedOption.textContent;
    
    // Reset state and city
    stateSelect.innerHTML = '<option value="">Loading states...</option>';
    citySelect.innerHTML = '<option value="">Select City</option>';
    stateSelect.disabled = true;
    citySelect.disabled = true;
    
    if (countryCode) {
        try {
            // Get states from static data
            const states = await getStates(countryCode);
            
            stateSelect.innerHTML = '<option value="">Select State</option>';
            
            if (states.length === 0) {
                stateSelect.innerHTML = '<option value="">No states available</option>';
            } else {
                states.forEach(state => {
                    const option = document.createElement('option');
                    option.value = state.iso2 || state.id;  // ISO2 code
                    option.textContent = state.name;
                    option.dataset.name = state.name;  // Store name for later use
                    stateSelect.appendChild(option);
                });
                stateSelect.disabled = false;
                
                // If we have pre-filled state and this is initial load, select it
                if (selectedStateName && !this.dataset.userChanged) {
                    const stateOption = Array.from(stateSelect.options).find(opt => 
                        opt.textContent === selectedStateName
                    );
                    if (stateOption) {
                        stateSelect.value = stateOption.value;
                        // Trigger change event to load cities
                        stateSelect.dispatchEvent(new Event('change'));
                    }
                }
            }
        } catch (error) {
            console.error('Error loading states:', error);
            stateSelect.innerHTML = '<option value="">Error loading states</option>';
        }
    }
});

// Handle state selection
document.getElementById('stateSelect').addEventListener('change', async function() {
    const stateCode = this.value;
    const countryCode = document.getElementById('countrySelect').value;
    const citySelect = document.getElementById('citySelect');
    
    // Mark as user changed after initial load
    this.dataset.userChanged = 'true';
    
    // Store selected state name
    const selectedOption = this.options[this.selectedIndex];
    selectedStateName = selectedOption.dataset.name || selectedOption.textContent;
    
    // Reset city
    citySelect.innerHTML = '<option value="">Loading cities...</option>';
    citySelect.disabled = true;
    
    if (stateCode && countryCode) {
        try {
            // Get cities from static data
            const cities = await getCities(countryCode, stateCode);
            
            citySelect.innerHTML = '<option value="">Select City</option>';
            
            if (cities.length === 0) {
                citySelect.innerHTML = '<option value="">No cities available</option>';
            } else {
                cities.forEach(city => {
                    const option = document.createElement('option');
                    option.value = city.id;
                    option.textContent = city.name;
                    option.dataset.name = city.name;  // Store name for later use
                    citySelect.appendChild(option);
                });
                citySelect.disabled = false;
                
                // If we have pre-filled city and this is initial load, select it
                if (selectedCityName && !this.dataset.userChanged) {
                    const cityOption = Array.from(citySelect.options).find(opt => 
                        opt.textContent === selectedCityName
                    );
                    if (cityOption) {
                        citySelect.value = cityOption.value;
                    }
                }
            }
        } catch (error) {
            console.error('Error loading cities:', error);
            citySelect.innerHTML = '<option value="">Error loading cities</option>';
        }
    }
});

// Handle city selection to store name
document.getElementById('citySelect').addEventListener('change', function() {
    const selectedOption = this.options[this.selectedIndex];
    selectedCityName = selectedOption.dataset.name || selectedOption.textContent;
});

// Limit checkbox selections
function limitCheckboxes(groupId, maxSelections) {
    const checkboxes = document.querySelectorAll(`#${groupId} input[type="checkbox"]`);
    
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const checkedBoxes = document.querySelectorAll(`#${groupId} input[type="checkbox"]:checked`);
            
            if (checkedBoxes.length >= maxSelections) {
                checkboxes.forEach(cb => {
                    if (!cb.checked) {
                        cb.disabled = true;
                        cb.parentElement.style.opacity = '0.5';
                    }
                });
            } else {
                checkboxes.forEach(cb => {
                    cb.disabled = false;
                    cb.parentElement.style.opacity = '1';
                });
            }
        });
    });
}

// Apply checkbox limits
limitCheckboxes('communityAsks', 3);
limitCheckboxes('communityGives', 3);

// Handle form submission
document.getElementById('profileForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = 'Submitting... <span class="loader"></span>';
    submitBtn.disabled = true;
    
    // Validate location fields
    if (!selectedCountryName || !selectedStateName || !selectedCityName) {
        alert('Please select country, state, and city');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        return;
    }
    
    // Collect form data
    const formData = new FormData(this);
    const profileData = {};
    
    // Get all form fields
    for (let [key, value] of formData.entries()) {
        if (profileData[key]) {
            // Handle multiple values (checkboxes)
            if (!Array.isArray(profileData[key])) {
                profileData[key] = [profileData[key]];
            }
            profileData[key].push(value);
        } else {
            profileData[key] = value;
        }
    }
    
    // Add location names (not IDs)
    profileData.countryName = selectedCountryName;
    profileData.stateName = selectedStateName;
    profileData.cityName = selectedCityName;
    
    // Ensure arrays for checkbox fields
    ['yatraImpact', 'communityAsks', 'communityGives'].forEach(field => {
        if (!profileData[field]) {
            profileData[field] = [];
        } else if (!Array.isArray(profileData[field])) {
            profileData[field] = [profileData[field]];
        }
    });
    
    try {
        const response = await fetch('/api/submit-profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: window.location.href, // Send full URL with token and wa params
                profileData: profileData
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            // Show success message
            const successDiv = document.createElement('div');
            successDiv.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg';
            successDiv.innerHTML = '<i class="fas fa-check-circle mr-2"></i> Profile completed successfully!';
            document.body.appendChild(successDiv);
            
            // Redirect after 2 seconds
            setTimeout(() => {
                window.location.href = 'https://wa.me/919555512345?text=Profile%20completed%20successfully!';
            }, 2000);
        } else {
            throw new Error(result.error || 'Failed to submit profile');
        }
    } catch (error) {
        console.error('Error submitting form:', error);
        alert('Error submitting profile. Please try again.');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
});