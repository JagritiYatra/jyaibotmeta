// Enhanced Profile Form JavaScript with better UX and validation

// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');
const whatsappNumber = urlParams.get('wa');

// Global variables
let timerInterval;
let formStartTime = Date.now();
let selectedCountryName = '';
let selectedStateName = '';
let selectedCityName = '';
let completedFields = 0;
const totalRequiredFields = 12;

// Initialize form
document.addEventListener('DOMContentLoaded', function() {
    initializeTimer();
    initializeFieldTracking();
    loadUserData();
    loadCountries();
    setupCheckboxLimits();
    updateProgress();
});

// Timer functionality
function initializeTimer() {
    let timeRemaining = 15 * 60; // 15 minutes in seconds
    
    timerInterval = setInterval(() => {
        timeRemaining--;
        
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        document.getElementById('timer').textContent = display;
        
        // Warning at 2 minutes
        if (timeRemaining === 120) {
            showNotification('⏰ Only 2 minutes remaining!', 'warning');
        }
        
        // Expired
        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            handleLinkExpired();
        }
    }, 1000);
}

// Handle expired link
function handleLinkExpired() {
    document.getElementById('profileForm').style.display = 'none';
    document.getElementById('expiredMessage').classList.remove('hidden');
    showNotification('❌ Link expired! Please request a new one.', 'error');
}

// Field tracking for progress
function initializeFieldTracking() {
    const requiredFields = document.querySelectorAll('[required]');
    
    requiredFields.forEach(field => {
        field.addEventListener('change', () => {
            updateProgress();
            updateFieldCounter();
        });
        
        // Real-time validation
        field.addEventListener('blur', () => {
            validateField(field);
        });
    });
}

// Validate individual fields
function validateField(field) {
    const value = field.value.trim();
    let isValid = true;
    let errorMessage = '';
    
    // Remove existing error state
    field.classList.remove('border-red-500');
    const existingError = field.parentElement.querySelector('.error-message');
    if (existingError) existingError.remove();
    
    // Field-specific validation
    switch(field.name) {
        case 'phoneNumber':
            const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{4,6}$/;
            if (!phoneRegex.test(value)) {
                isValid = false;
                errorMessage = 'Please enter a valid phone number';
            }
            break;
            
        case 'linkedInProfile':
            if (!value.includes('linkedin.com')) {
                isValid = false;
                errorMessage = 'Please enter a valid LinkedIn URL';
            }
            break;
            
        case 'additionalEmail':
            if (value && !value.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
                isValid = false;
                errorMessage = 'Please enter a valid email address';
            }
            break;
    }
    
    // Show error if invalid
    if (!isValid) {
        field.classList.add('border-red-500');
        const error = document.createElement('p');
        error.className = 'error-message text-red-500 text-sm mt-1';
        error.textContent = errorMessage;
        field.parentElement.appendChild(error);
    }
    
    return isValid;
}

// Update progress bar and counter
function updateProgress() {
    const requiredFields = document.querySelectorAll('[required]');
    let filled = 0;
    
    requiredFields.forEach(field => {
        if (field.value.trim() !== '') {
            filled++;
        }
    });
    
    completedFields = filled;
    const percentage = (filled / totalRequiredFields) * 100;
    
    document.getElementById('progressBar').style.width = percentage + '%';
    
    // Update field counter
    updateFieldCounter();
    
    // Celebrate milestones
    if (percentage === 25) {
        showNotification('🎯 Great start! 25% complete', 'success');
    } else if (percentage === 50) {
        showNotification('⭐ Halfway there! Keep going', 'success');
    } else if (percentage === 75) {
        showNotification('🚀 Almost done! 75% complete', 'success');
    }
}

// Update field counter display
function updateFieldCounter() {
    document.getElementById('fieldCounter').textContent = `${completedFields}/${totalRequiredFields}`;
}

// Show notification toast
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-20 right-4 p-4 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300`;
    
    // Style based on type
    switch(type) {
        case 'success':
            notification.classList.add('bg-green-500', 'text-white');
            break;
        case 'warning':
            notification.classList.add('bg-yellow-500', 'text-white');
            break;
        case 'error':
            notification.classList.add('bg-red-500', 'text-white');
            break;
        default:
            notification.classList.add('bg-blue-500', 'text-white');
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Load user data for pre-filling
async function loadUserData() {
    if (!token || !whatsappNumber) {
        console.log('No token or WhatsApp number for pre-filling');
        return;
    }
    
    try {
        const response = await fetch(`/api/user-data?token=${token}&wa=${encodeURIComponent(whatsappNumber)}`);
        const { userData } = await response.json();
        
        if (userData && Object.keys(userData).length > 0) {
            // Pre-fill all fields
            Object.keys(userData).forEach(key => {
                const field = document.querySelector(`[name="${key}"]`);
                if (field) {
                    field.value = userData[key];
                }
            });
            
            // Handle checkboxes
            ['yatraImpact', 'communityAsks', 'communityGives'].forEach(fieldName => {
                if (userData[fieldName] && Array.isArray(userData[fieldName])) {
                    userData[fieldName].forEach(value => {
                        const checkbox = document.querySelector(`input[name="${fieldName}"][value="${value}"]`);
                        if (checkbox) {
                            checkbox.checked = true;
                            checkbox.nextElementSibling.classList.add('bg-purple-600', 'text-white', 'border-purple-600');
                        }
                    });
                }
            });
            
            // Store location names
            if (userData.country) selectedCountryName = userData.country;
            if (userData.state) selectedStateName = userData.state;
            if (userData.city) selectedCityName = userData.city;
            
            updateProgress();
            showNotification('✨ We\'ve pre-filled your existing information', 'info');
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Load countries with enhanced error handling
async function loadCountries() {
    const countrySelect = document.getElementById('countrySelect');
    
    try {
        const response = await fetch('/api/countries');
        if (!response.ok) throw new Error('Failed to load countries');
        
        const countries = await response.json();
        
        countrySelect.innerHTML = '<option value="">Select Country</option>';
        countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country.id;
            option.textContent = country.name;
            option.dataset.name = country.name;
            countrySelect.appendChild(option);
        });
        
        // Pre-select if we have data
        if (selectedCountryName) {
            const option = Array.from(countrySelect.options).find(opt => 
                opt.dataset.name === selectedCountryName
            );
            if (option) {
                countrySelect.value = option.value;
                loadStates(option.value);
            }
        }
    } catch (error) {
        console.error('Error loading countries:', error);
        countrySelect.innerHTML = '<option value="">Error loading countries</option>';
        showNotification('❌ Error loading location data', 'error');
    }
}

// Country change handler
document.getElementById('countrySelect').addEventListener('change', async function() {
    const countryCode = this.value;
    const selectedOption = this.options[this.selectedIndex];
    selectedCountryName = selectedOption.dataset.name || selectedOption.textContent;
    
    // Reset dependent fields
    const stateSelect = document.getElementById('stateSelect');
    const citySelect = document.getElementById('citySelect');
    
    stateSelect.innerHTML = '<option value="">Select State</option>';
    stateSelect.disabled = true;
    citySelect.innerHTML = '<option value="">Select City</option>';
    citySelect.disabled = true;
    
    if (countryCode) {
        await loadStates(countryCode);
    }
});

// Load states
async function loadStates(countryCode) {
    const stateSelect = document.getElementById('stateSelect');
    stateSelect.innerHTML = '<option value="">Loading states...</option>';
    
    try {
        const response = await fetch(`/api/states/${countryCode}`);
        if (!response.ok) throw new Error('Failed to load states');
        
        const states = await response.json();
        
        stateSelect.innerHTML = '<option value="">Select State</option>';
        states.forEach(state => {
            const option = document.createElement('option');
            option.value = state.id;
            option.textContent = state.name;
            option.dataset.name = state.name;
            stateSelect.appendChild(option);
        });
        
        stateSelect.disabled = false;
        
        // Pre-select if we have data
        if (selectedStateName) {
            const option = Array.from(stateSelect.options).find(opt => 
                opt.dataset.name === selectedStateName
            );
            if (option) {
                stateSelect.value = option.value;
                loadCities(countryCode, option.value);
            }
        }
    } catch (error) {
        console.error('Error loading states:', error);
        stateSelect.innerHTML = '<option value="">Error loading states</option>';
    }
}

// State change handler
document.getElementById('stateSelect').addEventListener('change', async function() {
    const stateCode = this.value;
    const selectedOption = this.options[this.selectedIndex];
    selectedStateName = selectedOption.dataset.name || selectedOption.textContent;
    
    const countryCode = document.getElementById('countrySelect').value;
    const citySelect = document.getElementById('citySelect');
    
    citySelect.innerHTML = '<option value="">Select City</option>';
    citySelect.disabled = true;
    
    if (stateCode && countryCode) {
        await loadCities(countryCode, stateCode);
    }
});

// Load cities
async function loadCities(countryCode, stateCode) {
    const citySelect = document.getElementById('citySelect');
    citySelect.innerHTML = '<option value="">Loading cities...</option>';
    
    try {
        const response = await fetch(`/api/cities/${countryCode}/${stateCode}`);
        if (!response.ok) throw new Error('Failed to load cities');
        
        const cities = await response.json();
        
        citySelect.innerHTML = '<option value="">Select City</option>';
        cities.forEach(city => {
            const option = document.createElement('option');
            option.value = city.id;
            option.textContent = city.name;
            option.dataset.name = city.name;
            citySelect.appendChild(option);
        });
        
        citySelect.disabled = false;
        
        // Pre-select if we have data
        if (selectedCityName) {
            const option = Array.from(citySelect.options).find(opt => 
                opt.dataset.name === selectedCityName
            );
            if (option) {
                citySelect.value = option.value;
            }
        }
    } catch (error) {
        console.error('Error loading cities:', error);
        citySelect.innerHTML = '<option value="">Error loading cities</option>';
    }
}

// City change handler
document.getElementById('citySelect').addEventListener('change', function() {
    const selectedOption = this.options[this.selectedIndex];
    selectedCityName = selectedOption.dataset.name || selectedOption.textContent;
});

// Setup checkbox limits
function setupCheckboxLimits() {
    limitCheckboxes('communityAsks', 3);
    limitCheckboxes('communityGives', 3);
}

// Limit checkbox selections with visual feedback
function limitCheckboxes(groupId, maxSelections) {
    const checkboxes = document.querySelectorAll(`#${groupId} input[type="checkbox"]`);
    
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const checkedBoxes = document.querySelectorAll(`#${groupId} input[type="checkbox"]:checked`);
            
            // Update visual state
            if (this.checked) {
                this.nextElementSibling.classList.add('bg-purple-600', 'text-white', 'border-purple-600');
            } else {
                this.nextElementSibling.classList.remove('bg-purple-600', 'text-white', 'border-purple-600');
            }
            
            // Disable unchecked boxes if limit reached
            if (checkedBoxes.length >= maxSelections) {
                checkboxes.forEach(cb => {
                    if (!cb.checked) {
                        cb.disabled = true;
                        cb.nextElementSibling.classList.add('opacity-50', 'cursor-not-allowed');
                    }
                });
                showNotification(`Maximum ${maxSelections} selections allowed`, 'warning');
            } else {
                checkboxes.forEach(cb => {
                    cb.disabled = false;
                    cb.nextElementSibling.classList.remove('opacity-50', 'cursor-not-allowed');
                });
            }
        });
    });
}

// Form submission handler
document.getElementById('profileForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    const originalContent = submitBtn.innerHTML;
    
    // Validate all required fields
    const requiredFields = document.querySelectorAll('[required]');
    let allValid = true;
    
    requiredFields.forEach(field => {
        if (!validateField(field) || field.value.trim() === '') {
            allValid = false;
            field.classList.add('border-red-500');
        }
    });
    
    if (!allValid) {
        showNotification('❌ Please fill all required fields correctly', 'error');
        return;
    }
    
    // Validate location fields
    if (!selectedCountryName || !selectedStateName || !selectedCityName) {
        showNotification('❌ Please select country, state, and city', 'error');
        return;
    }
    
    // Update button state
    submitBtn.innerHTML = '<span class="loader"></span> Submitting...';
    submitBtn.disabled = true;
    
    // Collect form data
    const formData = new FormData(this);
    const profileData = {};
    
    // Convert FormData to object
    for (let [key, value] of formData.entries()) {
        if (profileData[key]) {
            if (!Array.isArray(profileData[key])) {
                profileData[key] = [profileData[key]];
            }
            profileData[key].push(value);
        } else {
            profileData[key] = value;
        }
    }
    
    // Add location names
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
    
    // Calculate time taken
    const timeTaken = Math.round((Date.now() - formStartTime) / 1000);
    profileData.formCompletionTime = timeTaken;
    
    try {
        const response = await fetch('/api/submit-profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: window.location.href,
                profileData: profileData
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            // Clear timer
            clearInterval(timerInterval);
            
            // Check if custom success handler exists (for WebView)
            if (typeof window.handleFormSuccess === 'function') {
                window.handleFormSuccess(result);
                return;
            }
            
            // Default behavior - show success modal
            document.getElementById('successModal').classList.remove('hidden');
            
            // Countdown and redirect
            let countdown = 3;
            const countdownInterval = setInterval(() => {
                countdown--;
                document.getElementById('redirectCounter').textContent = countdown;
                
                if (countdown <= 0) {
                    clearInterval(countdownInterval);
                    window.location.href = 'https://wa.me/918522068158?text=Profile%20completed%20successfully!%20Ready%20to%20connect%20with%20alumni.';
                }
            }, 1000);
            
        } else {
            throw new Error(result.error || 'Failed to submit profile');
        }
    } catch (error) {
        console.error('Error submitting form:', error);
        showNotification('❌ Error submitting profile. Please try again.', 'error');
        submitBtn.innerHTML = originalContent;
        submitBtn.disabled = false;
    }
});

// Add smooth scrolling for better UX
document.querySelectorAll('input, select, textarea').forEach(element => {
    element.addEventListener('focus', function() {
        setTimeout(() => {
            this.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    });
});

// Prevent accidental form closure
window.addEventListener('beforeunload', function(e) {
    if (completedFields > 0 && completedFields < totalRequiredFields) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
    }
});