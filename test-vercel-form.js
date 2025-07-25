// Script to test profile form submission on Vercel
const baseUrl = process.argv[2] || 'https://jyaibot-profile-form.vercel.app';
const testNumber = process.argv[3] || '+919876543210';

console.log('Testing profile form on:', baseUrl);
console.log('With WhatsApp number:', testNumber);

const testData = {
    token: `${baseUrl}/profile-setup?token=test123&wa=${encodeURIComponent(testNumber)}`,
    profileData: {
        name: "Test User Vercel",
        gender: "Male",
        professionalRole: "Working Professional",
        dateOfBirth: "1990-01-01",
        phoneNumber: testNumber,
        linkedInProfile: "https://linkedin.com/in/test",
        industryDomain: "Technology",
        yatraImpact: ["Started Enterprise Post-Yatra"],
        communityAsks: ["Mentorship & Guidance"],
        communityGives: ["Industry Insights & Best Practices"],
        countryName: "India",
        stateName: "Maharashtra",
        cityName: "Mumbai"
    }
};

async function testSubmission() {
    try {
        const response = await fetch(`${baseUrl}/api/submit-profile`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testData)
        });
        
        const result = await response.json();
        console.log('Response status:', response.status);
        console.log('Response:', result);
        
        if (response.ok && result.success) {
            console.log('✅ Profile submission successful!');
        } else {
            console.log('❌ Profile submission failed');
            console.log('Error:', result.error || 'Unknown error');
        }
    } catch (error) {
        console.error('Network error:', error.message);
    }
}

testSubmission();