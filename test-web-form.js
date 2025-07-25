// Test script to verify web form setup
const express = require('express');
const app = express();

// Test if web routes are accessible
app.use(express.static('web/public'));

// Simple test endpoint
app.get('/test', (req, res) => {
  res.json({ 
    status: 'Web server is running',
    formUrl: 'http://localhost:3000/profile-setup?token=test123&wa=+919876543210'
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`);
  console.log(`\nTest the form at:`);
  console.log(`http://localhost:${PORT}/profile-form.html`);
  console.log(`\nOr check the test endpoint:`);
  console.log(`http://localhost:${PORT}/test`);
});