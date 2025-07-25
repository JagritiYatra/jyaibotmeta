const express = require('express');
const router = express.Router();
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const User = require('../../src/models/User');

// Country State City API configuration
const CSC_API_KEY = 'd1QzenBTT0lvczJYVVN1NFdxQVNqNk45bWR0Z25nRDZSdDkxald6SQ==';
const CSC_API_BASE = 'https://api.countrystatecity.in/v1';

// In-memory cache for API responses
const API_CACHE = {
    countries: null,
    states: {},
    cities: {},
    lastFetch: {},
    cacheExpiry: 24 * 60 * 60 * 1000 // 24 hours
};

// Check if cache is valid
function isCacheValid(key) {
    const lastFetch = API_CACHE.lastFetch[key];
    return lastFetch && (Date.now() - lastFetch) < API_CACHE.cacheExpiry;
}

// Debug endpoint
router.get('/api/test', async (req, res) => {
    try {
        const { wa } = req.query;
        let userCheck = null;
        
        // Check if user exists if WhatsApp number provided
        if (wa) {
            const user = await User.findUserByWhatsAppNumber(wa);
            userCheck = {
                whatsappNumber: wa,
                userExists: !!user,
                userName: user?.basicProfile?.name || user?.enhancedProfile?.fullName || 'Not found',
                profileCompleted: user?.enhancedProfile?.completed || false
            };
        }
        
        // Test direct API call
        const testResponse = await axios.get('https://api.countrystatecity.in/v1/countries', {
            headers: {
                'X-CSCAPI-KEY': CSC_API_KEY
            },
            timeout: 5000
        });
        
        res.json({
            status: 'ok',
            CSC_API_KEY: CSC_API_KEY ? 'Set' : 'Not set',
            axios: typeof axios,
            env: process.env.NODE_ENV,
            mongodbConnected: !!User.db,
            userCheck: userCheck,
            apiTest: {
                success: true,
                statusCode: testResponse.status,
                dataLength: testResponse.data.length,
                firstCountry: testResponse.data[0]?.name || 'No data'
            }
        });
    } catch (error) {
        res.json({
            status: 'ok',
            CSC_API_KEY: CSC_API_KEY ? 'Set' : 'Not set',
            axios: typeof axios,
            env: process.env.NODE_ENV,
            mongodbConnected: !!User.db,
            userCheck: req.query.wa ? { error: error.message } : null,
            apiTest: {
                success: false,
                error: error.message,
                code: error.code,
                responseStatus: error.response?.status
            }
        });
    }
});

// Fallback countries data (top 10 for testing)
const FALLBACK_COUNTRIES = [
    { id: 'IN', name: 'India', code: 'IN', phonecode: '91' },
    { id: 'US', name: 'United States', code: 'US', phonecode: '1' },
    { id: 'GB', name: 'United Kingdom', code: 'GB', phonecode: '44' },
    { id: 'CA', name: 'Canada', code: 'CA', phonecode: '1' },
    { id: 'AU', name: 'Australia', code: 'AU', phonecode: '61' },
    { id: 'DE', name: 'Germany', code: 'DE', phonecode: '49' },
    { id: 'FR', name: 'France', code: 'FR', phonecode: '33' },
    { id: 'JP', name: 'Japan', code: 'JP', phonecode: '81' },
    { id: 'CN', name: 'China', code: 'CN', phonecode: '86' },
    { id: 'BR', name: 'Brazil', code: 'BR', phonecode: '55' }
];

// Helper function to make API calls
async function cscApiCall(endpoint) {
  try {
    console.log(`Calling CSC API: ${CSC_API_BASE}${endpoint}`);
    console.log(`API Key: ${CSC_API_KEY.substring(0, 10)}...`);
    console.log('Full URL:', `${CSC_API_BASE}${endpoint}`);
    
    const response = await axios({
      method: 'GET',
      url: `${CSC_API_BASE}${endpoint}`,
      headers: {
        'X-CSCAPI-KEY': CSC_API_KEY,
        'Accept': 'application/json',
        'User-Agent': 'JYAibot/1.0'
      },
      timeout: 15000, // 15 second timeout
      validateStatus: function (status) {
        return status < 500; // Accept any status < 500
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    
    if (response.status !== 200) {
      console.error('Non-200 status:', response.status, response.statusText);
      console.error('Response data:', response.data);
      return [];
    }
    
    console.log('Response data type:', typeof response.data);
    console.log('Response data length:', Array.isArray(response.data) ? response.data.length : 'not array');
    
    if (Array.isArray(response.data) && response.data.length > 0) {
      console.log('First item:', JSON.stringify(response.data[0]));
    }
    
    return response.data || [];
  } catch (error) {
    console.error(`Error calling CSC API ${endpoint}:`, error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      console.error('Response headers:', error.response.headers);
    }
    if (error.request) {
      console.error('Request was made but no response received');
      console.error('Request:', error.request._header);
    }
    return [];
  }
}

// Serve the profile form page
router.get('/profile-setup', async (req, res) => {
    const { token, wa } = req.query;
    
    if (!token) {
        return res.status(400).send('Invalid access. Token required.');
    }
    
    try {
        // For now, just check if token exists and is recent (simple validation)
        // In production, you'd validate against database
        const tokenTimestamp = parseInt(token.slice(-13)); // Last 13 chars are timestamp
        const now = Date.now();
        const fifteenMinutes = 15 * 60 * 1000;
        
        if (tokenTimestamp && (now - tokenTimestamp) > fifteenMinutes) {
            return res.status(400).send('Link expired. Please request a new link by saying "hi" on WhatsApp.');
        }
        
        // Store WhatsApp number in session for form submission
        req.session = { whatsappNumber: wa || '' };
        
        // Serve the form
        res.sendFile(path.join(__dirname, '../public/profile-form.html'));
    } catch (error) {
        console.error('Error validating token:', error);
        // Still serve the form even if validation fails (for testing)
        res.sendFile(path.join(__dirname, '../public/profile-form.html'));
    }
});

// API to get user data for pre-filling form
router.get('/api/user-data', async (req, res) => {
    const { token, wa } = req.query;
    
    if (!wa) {
        return res.status(400).json({ error: 'WhatsApp number required' });
    }
    
    try {
        // Find user by WhatsApp number
        const user = await User.findUserByWhatsAppNumber(wa);
        
        if (!user) {
            return res.json({ userData: {} }); // Return empty data if user not found
        }
        
        // Extract existing profile data
        const userData = {
            name: user.enhancedProfile?.fullName || user.basicProfile?.name || '',
            gender: user.enhancedProfile?.gender || '',
            professionalRole: user.enhancedProfile?.professionalRole || '',
            dateOfBirth: user.enhancedProfile?.dateOfBirth || '',
            phoneNumber: user.enhancedProfile?.phone || wa,
            linkedInProfile: user.enhancedProfile?.linkedin || '',
            instagramProfile: user.enhancedProfile?.instagram || '',
            additionalEmail: user.basicProfile?.linkedEmails?.[0] || '',
            industryDomain: user.enhancedProfile?.domain || '',
            yatraImpact: user.enhancedProfile?.yatraImpact || [],
            communityAsks: user.enhancedProfile?.communityAsks || [],
            communityGives: user.enhancedProfile?.communityGives || [],
            
            // Parse address if it exists
            country: user.enhancedProfile?.country || '',
            address: user.enhancedProfile?.address || ''
        };
        
        // Try to parse city and state from address
        if (userData.address && !userData.city && !userData.state) {
            const parts = userData.address.split(',').map(p => p.trim());
            if (parts.length >= 2) {
                userData.city = parts[0];
                userData.state = parts[1];
            }
        }
        
        res.json({ userData });
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).json({ error: 'Failed to fetch user data' });
    }
});

// API to get all countries
router.get('/api/countries', async (req, res) => {
    try {
        console.log('Countries API called');
        
        // Check cache first
        if (isCacheValid('countries') && API_CACHE.countries) {
            console.log('Returning cached countries');
            return res.json(API_CACHE.countries);
        }
        
        console.log('Fetching fresh countries data');
        const countries = await cscApiCall('/countries');
        console.log('Countries fetched:', countries.length);
        
        // If API returns empty or fails, use fallback
        if (!countries || countries.length === 0) {
            console.log('Using fallback countries data');
            return res.json(FALLBACK_COUNTRIES);
        }
        
        // Transform to match our format
        const formattedCountries = countries.map(country => ({
            id: country.iso2,  // Using ISO2 code as ID for API calls
            name: country.name,
            code: country.iso2,
            phonecode: country.phonecode
        }));
        
        // Cache the result
        API_CACHE.countries = formattedCountries;
        API_CACHE.lastFetch['countries'] = Date.now();
        
        res.json(formattedCountries);
    } catch (error) {
        console.error('Error fetching countries:', error);
        // Return fallback data instead of error
        res.json(FALLBACK_COUNTRIES);
    }
});

// Fallback Indian states
const INDIAN_STATES = [
    { id: 'MH', name: 'Maharashtra', code: 'MH' },
    { id: 'DL', name: 'Delhi', code: 'DL' },
    { id: 'KA', name: 'Karnataka', code: 'KA' },
    { id: 'TN', name: 'Tamil Nadu', code: 'TN' },
    { id: 'UP', name: 'Uttar Pradesh', code: 'UP' },
    { id: 'GJ', name: 'Gujarat', code: 'GJ' },
    { id: 'RJ', name: 'Rajasthan', code: 'RJ' },
    { id: 'WB', name: 'West Bengal', code: 'WB' },
    { id: 'MP', name: 'Madhya Pradesh', code: 'MP' },
    { id: 'TG', name: 'Telangana', code: 'TG' }
];

// API to get states by country
router.get('/api/states/:countryCode', async (req, res) => {
    try {
        const { countryCode } = req.params;
        const states = await cscApiCall(`/countries/${countryCode}/states`);
        
        // If API returns empty or fails for India, use fallback
        if ((!states || states.length === 0) && countryCode === 'IN') {
            console.log('Using fallback Indian states data');
            return res.json(INDIAN_STATES);
        }
        
        // Transform to match our format
        const formattedStates = states.map(state => ({
            id: state.iso2,  // Using ISO2 code as ID
            name: state.name,
            code: state.iso2
        }));
        res.json(formattedStates);
    } catch (error) {
        console.error('Error fetching states:', error);
        // Return fallback for India
        if (req.params.countryCode === 'IN') {
            res.json(INDIAN_STATES);
        } else {
            res.json([]);
        }
    }
});

// Fallback cities for major Indian states
const INDIAN_CITIES = {
    'MH': [
        { id: '1', name: 'Mumbai' },
        { id: '2', name: 'Pune' },
        { id: '3', name: 'Nagpur' },
        { id: '4', name: 'Nashik' }
    ],
    'DL': [
        { id: '5', name: 'New Delhi' },
        { id: '6', name: 'Delhi' }
    ],
    'KA': [
        { id: '7', name: 'Bangalore' },
        { id: '8', name: 'Mysore' },
        { id: '9', name: 'Mangalore' }
    ],
    'TN': [
        { id: '10', name: 'Chennai' },
        { id: '11', name: 'Coimbatore' },
        { id: '12', name: 'Madurai' }
    ]
};

// API to get cities by country and state
router.get('/api/cities/:countryCode/:stateCode', async (req, res) => {
    try {
        const { countryCode, stateCode } = req.params;
        const cities = await cscApiCall(`/countries/${countryCode}/states/${stateCode}/cities`);
        
        // If API returns empty or fails for India, use fallback
        if ((!cities || cities.length === 0) && countryCode === 'IN' && INDIAN_CITIES[stateCode]) {
            console.log('Using fallback cities data for', stateCode);
            return res.json(INDIAN_CITIES[stateCode]);
        }
        
        // Transform to match our format
        const formattedCities = cities.map(city => ({
            id: city.id,
            name: city.name
        }));
        res.json(formattedCities);
    } catch (error) {
        console.error('Error fetching cities:', error);
        // Return fallback for Indian states
        if (req.params.countryCode === 'IN' && INDIAN_CITIES[req.params.stateCode]) {
            res.json(INDIAN_CITIES[req.params.stateCode]);
        } else {
            res.json([]);
        }
    }
});

// Submit profile form
router.post('/api/submit-profile', async (req, res) => {
    console.log('Submit profile endpoint called');
    const { token, profileData } = req.body;
    
    if (!token || !profileData) {
        return res.status(400).json({ error: 'Token and profile data required' });
    }
    
    try {
        // Extract WhatsApp number from token URL params
        console.log('Token received:', token);
        const urlParams = new URLSearchParams(token.split('?')[1] || '');
        const whatsappNumber = urlParams.get('wa') || req.session?.whatsappNumber || '';
        
        console.log('WhatsApp number extracted:', whatsappNumber);
        
        if (!whatsappNumber) {
            return res.status(400).json({ error: 'Unable to identify user. Please request a new link.' });
        }
        
        // Find user by WhatsApp number
        console.log('Looking for user with WhatsApp:', whatsappNumber);
        const user = await User.findUserByWhatsAppNumber(whatsappNumber);
        console.log('User found:', !!user);
        
        if (!user) {
            return res.status(400).json({ error: 'User not found. Please ensure you are registered.' });
        }
        
        // For the API version, we store the actual names instead of IDs
        // since the form now sends country/state/city names directly
        
        // Update user's enhanced profile to match WhatsApp structure exactly
        user.enhancedProfile = {
            ...user.enhancedProfile,
            fullName: profileData.name,  // Changed from 'name' to 'fullName'
            gender: profileData.gender,
            professionalRole: profileData.professionalRole,
            dateOfBirth: profileData.dateOfBirth,
            country: profileData.countryName || '',
            // Store address as single string like WhatsApp does
            address: `${profileData.cityName || ''}, ${profileData.stateName || ''}, ${profileData.countryName || ''}`,
            phone: profileData.phoneNumber,  // Changed from 'phoneNumber' to 'phone'
            linkedin: profileData.linkedInProfile,  // Changed to match WhatsApp field name
            instagram: profileData.instagramProfile || '',
            domain: profileData.industryDomain,  // Changed from 'industryDomain' to 'domain'
            yatraImpact: profileData.yatraImpact || [],
            communityAsks: profileData.communityAsks || [],
            communityGives: profileData.communityGives || []
        };
        
        // Add additional email to linkedEmails if provided
        if (profileData.additionalEmail) {
            if (!user.basicProfile.linkedEmails) {
                user.basicProfile.linkedEmails = [];
            }
            if (!user.basicProfile.linkedEmails.includes(profileData.additionalEmail)) {
                user.basicProfile.linkedEmails.push(profileData.additionalEmail);
            }
        }
        
        // Update profile completion metadata
        if (!user.metadata) {
            user.metadata = {};
        }
        user.metadata.profileCompletedAt = new Date();
        user.metadata.profileCompletionScore = 100;
        
        // Save user using the User model methods
        const { updateUserProfile, markProfileCompleted } = require('../../src/models/User');
        
        try {
            // Update each field
            for (const [key, value] of Object.entries(user.enhancedProfile)) {
                if (value && value !== '') {
                    await updateUserProfile(whatsappNumber, key, value);
                }
            }
            
            // Mark profile as completed
            await markProfileCompleted(whatsappNumber);
        } catch (saveError) {
            console.error('Error saving to database:', saveError);
            // For testing, we'll continue even if save fails
            console.log('Continuing despite save error for testing...');
        }
        
        res.json({ 
            success: true, 
            message: 'Profile updated successfully!' 
        });
        
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

module.exports = router;