// Plain Profile Form JavaScript
let verifiedEmail = null;
let sessionToken = null;

// API endpoints
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:3001/api' 
    : 'https://jyaibot-meta.vercel.app/api';

// Initialize the form
document.addEventListener('DOMContentLoaded', function() {
    initializeOTPInputs();
    initializeEmailVerification();
    initializeFormValidation();
    // Don't initialize location dropdowns here - will do after OTP verification
    // initializeLocationDropdowns();
    initializeCheckboxLimits();
});

// OTP Input handling
function initializeOTPInputs() {
    const otpInputs = [
        document.getElementById('otp1'),
        document.getElementById('otp2'),
        document.getElementById('otp3'),
        document.getElementById('otp4'),
        document.getElementById('otp5'),
        document.getElementById('otp6')
    ];

    otpInputs.forEach((input, index) => {
        if (!input) return;
        
        input.addEventListener('input', function(e) {
            const value = e.target.value;
            
            // Only allow digits
            if (!/^\d*$/.test(value)) {
                e.target.value = '';
                return;
            }
            
            // Move to next input
            if (value && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
        });

        input.addEventListener('keydown', function(e) {
            // Handle backspace
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                otpInputs[index - 1].focus();
            }
        });

        // Handle paste
        input.addEventListener('paste', function(e) {
            e.preventDefault();
            const pastedData = e.clipboardData.getData('text').replace(/\D/g, '');
            
            for (let i = 0; i < Math.min(pastedData.length, otpInputs.length); i++) {
                if (otpInputs[i]) {
                    otpInputs[i].value = pastedData[i];
                }
            }
        });
    });
}

// Email verification
function initializeEmailVerification() {
    const sendOtpBtn = document.getElementById('sendOtpBtn');
    const verifyOtpBtn = document.getElementById('verifyOtpBtn');
    const resendOtpBtn = document.getElementById('resendOtpBtn');
    
    sendOtpBtn?.addEventListener('click', sendOTP);
    verifyOtpBtn?.addEventListener('click', verifyOTP);
    resendOtpBtn?.addEventListener('click', sendOTP);
}

async function sendOTP() {
    const emailInput = document.getElementById('emailInput');
    const email = emailInput.value.trim();
    const emailError = document.getElementById('emailError');
    
    // Clear previous errors
    emailError.classList.add('hidden');
    
    if (!email) {
        emailError.textContent = 'Please enter your email';
        emailError.classList.remove('hidden');
        return;
    }
    
    if (!validateEmail(email)) {
        emailError.textContent = 'Please enter a valid email';
        emailError.classList.remove('hidden');
        return;
    }
    
    const sendOtpBtn = document.getElementById('sendOtpBtn');
    sendOtpBtn.disabled = true;
    sendOtpBtn.innerHTML = '<span class="loader"></span> Sending...';
    
    try {
        const response = await fetch(`${API_BASE}/email-verification/send-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            // Show OTP input section
            document.getElementById('emailInputStep').classList.add('hidden');
            document.getElementById('otpInputStep').classList.remove('hidden');
            document.getElementById('sentEmailDisplay').textContent = email;
            
            // Focus first OTP input
            document.getElementById('otp1').focus();
        } else {
            emailError.textContent = data.error || 'Failed to send OTP';
            emailError.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error sending OTP:', error);
        emailError.textContent = 'Network error. Please try again.';
        emailError.classList.remove('hidden');
    } finally {
        sendOtpBtn.disabled = false;
        sendOtpBtn.innerHTML = 'Send OTP';
    }
}

async function verifyOTP() {
    const email = document.getElementById('emailInput').value.trim();
    const otpInputs = [
        document.getElementById('otp1'),
        document.getElementById('otp2'),
        document.getElementById('otp3'),
        document.getElementById('otp4'),
        document.getElementById('otp5'),
        document.getElementById('otp6')
    ];
    
    const otp = otpInputs.map(input => input.value).join('');
    const otpError = document.getElementById('otpError');
    
    // Clear previous errors
    otpError.classList.add('hidden');
    
    if (otp.length !== 6) {
        otpError.textContent = 'Please enter the complete 6-digit OTP';
        otpError.classList.remove('hidden');
        return;
    }
    
    const verifyOtpBtn = document.getElementById('verifyOtpBtn');
    verifyOtpBtn.disabled = true;
    verifyOtpBtn.innerHTML = '<span class="loader"></span> Verifying...';
    
    try {
        const response = await fetch(`${API_BASE}/email-verification/verify-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, otp })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            // Store verified email and session token
            verifiedEmail = data.email;
            sessionToken = data.sessionToken;
            
            // Hide email verification section
            document.getElementById('emailVerificationSection').classList.add('hidden');
            
            // Show main form
            document.getElementById('mainFormSection').classList.add('active');
            
            // Initialize location dropdowns NOW that the form is visible
            if (window.initializeLocationSelects) {
                console.log('Calling initializeLocationSelects...');
                await window.initializeLocationSelects();
            } else {
                console.error('initializeLocationSelects not found');
            }
            
            // Update progress bar
            updateProgressBar(20);
        } else {
            otpError.textContent = data.error || 'Invalid OTP';
            otpError.classList.remove('hidden');
            
            // Clear OTP inputs on error
            if (data.attemptsRemaining === 0) {
                otpInputs.forEach(input => input.value = '');
            }
        }
    } catch (error) {
        console.error('Error verifying OTP:', error);
        otpError.textContent = 'Network error. Please try again.';
        otpError.classList.remove('hidden');
    } finally {
        verifyOtpBtn.disabled = false;
        verifyOtpBtn.innerHTML = 'Verify OTP';
    }
}

// Instagram validation function - accepts both URLs and handles
function validateInstagramHandle(input) {
    if (!input || input.trim() === '') {
        return true; // Empty is valid (optional field)
    }
    
    input = input.trim();
    
    // Check if it's a URL
    if (input.includes('instagram.com/') || input.includes('instagr.am/')) {
        // Extract username from URL
        const urlPattern = /(?:(?:http|https):\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/([A-Za-z0-9._]+)/;
        const match = input.match(urlPattern);
        if (match && match[1]) {
            const username = match[1];
            // Validate the extracted username
            const usernameRegex = /^[a-zA-Z0-9._]{1,30}$/;
            return usernameRegex.test(username);
        }
        return false;
    }
    
    // Otherwise treat as username/handle
    // Remove @ if present at the beginning
    const handle = input.replace(/^@/, '');
    
    // Instagram username rules (simplified for better compatibility):
    // - 1-30 characters
    // - Only letters, numbers, periods, and underscores
    const instagramRegex = /^[a-zA-Z0-9._]{1,30}$/;
    
    return instagramRegex.test(handle);
}

// Extract clean Instagram handle from input
function cleanInstagramInput(input) {
    if (!input || input.trim() === '') {
        return '';
    }
    
    input = input.trim();
    
    // Extract from URL if it's a link
    if (input.includes('instagram.com/') || input.includes('instagr.am/')) {
        const urlPattern = /(?:(?:http|https):\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/([A-Za-z0-9._]+)/;
        const match = input.match(urlPattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    
    // Remove @ if present
    return input.replace(/^@/, '');
}

// Form validation and submission
function initializeFormValidation() {
    const form = document.getElementById('profileForm');
    
    // Add real-time Instagram validation
    const instagramInput = document.querySelector('input[name="instagramProfile"]');
    if (instagramInput) {
        instagramInput.addEventListener('blur', function() {
            const value = this.value.trim();
            if (value && !validateInstagramHandle(value)) {
                this.setCustomValidity('Please enter a valid Instagram handle or profile URL');
                this.classList.add('border-red-500');
            } else {
                this.setCustomValidity('');
                this.classList.remove('border-red-500');
            }
        });
    }
    
    form?.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!verifiedEmail || !sessionToken) {
            alert('Please verify your email first');
            return;
        }
        
        // Get form data
        const formData = new FormData(form);
        
        // Validate Instagram handle before submission
        const instagramHandle = formData.get('instagramProfile');
        if (instagramHandle && !validateInstagramHandle(instagramHandle)) {
            alert('Please enter a valid Instagram handle');
            document.querySelector('input[name="instagramProfile"]').focus();
            return;
        }
        
        // Get checkbox values
        const yatraImpact = [];
        document.querySelectorAll('input[name="yatraImpact"]:checked').forEach(cb => {
            yatraImpact.push(cb.value);
        });
        
        const communityAsks = [];
        document.querySelectorAll('input[name="communityAsks"]:checked').forEach(cb => {
            communityAsks.push(cb.value);
        });
        
        const communityGives = [];
        document.querySelectorAll('input[name="communityGives"]:checked').forEach(cb => {
            communityGives.push(cb.value);
        });
        
        // Get feedback value explicitly
        const feedbackValue = formData.get('feedbackSuggestions') || '';
        console.log('Feedback textarea value:', feedbackValue ? `"${feedbackValue.substring(0, 50)}..."` : '(empty)');
        
        const data = {
            email: verifiedEmail,
            sessionToken: sessionToken,
            name: formData.get('name'),
            gender: formData.get('gender'),
            dateOfBirth: formData.get('dateOfBirth'),
            professionalRole: formData.get('professionalRole'),
            country: formData.get('country'),
            state: formData.get('state'),
            city: formData.get('city'),
            phoneNumber: formData.get('phoneNumber'),
            additionalEmail: formData.get('additionalEmail'),
            linkedInProfile: formData.get('linkedInProfile'),
            instagramProfile: cleanInstagramInput(formData.get('instagramProfile')),
            industryDomain: formData.get('industryDomain'),
            yatraImpact,
            communityAsks,
            communityGives,
            feedbackSuggestions: feedbackValue
        };
        
        console.log('Sending data with feedback:', data.feedbackSuggestions ? 'YES' : 'NO');
        
        // Submit form
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loader"></span> Submitting...';
        
        try {
            const response = await fetch(`${API_BASE}/plain-form/submit-plain-form`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                // Show success modal
                document.getElementById('successModal').classList.remove('hidden');
                updateProgressBar(100);
            } else {
                alert(result.error || 'Failed to submit form. Please try again.');
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            alert('Network error. Please try again.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span class="mr-2">Complete Profile</span><i class="fas fa-arrow-right"></i>';
        }
    });
    
    // Track form progress
    const inputs = form?.querySelectorAll('input[required], select[required]');
    inputs?.forEach(input => {
        input.addEventListener('change', updateFieldCounter);
    });
}

// Location dropdowns will be initialized by hybrid-locations.js

// Checkbox limits
function initializeCheckboxLimits() {
    limitCheckboxes('communityAsks', 3);
    limitCheckboxes('communityGives', 3);
}

function limitCheckboxes(groupId, maxChecked) {
    const container = document.getElementById(groupId);
    if (!container) return;
    
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const checkedCount = container.querySelectorAll('input[type="checkbox"]:checked').length;
            
            if (checkedCount >= maxChecked) {
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

// Helper functions
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function updateProgressBar(percentage) {
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        progressBar.style.width = percentage + '%';
    }
}

function updateFieldCounter() {
    const form = document.getElementById('profileForm');
    if (!form) return;
    
    const requiredInputs = form.querySelectorAll('input[required], select[required]');
    const filledInputs = Array.from(requiredInputs).filter(input => {
        if (input.type === 'checkbox' || input.type === 'radio') {
            return input.checked;
        }
        return input.value.trim() !== '';
    });
    
    const counter = document.getElementById('fieldCounter');
    if (counter) {
        counter.textContent = `${filledInputs.length}/${requiredInputs.length}`;
    }
    
    // Update progress bar
    const percentage = Math.round((filledInputs.length / requiredInputs.length) * 80) + 20; // Start from 20% after email verification
    updateProgressBar(percentage);
}