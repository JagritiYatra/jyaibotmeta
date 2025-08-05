// Environment configuration and validation for JY Alumni Bot
// Validates all required environment variables and provides configuration defaults

const requiredEnvVars = [
  'OPENAI_API_KEY',
  'MONGODB_URI',
  'DB_NAME',
  'META_APP_ID',
  'META_APP_SECRET',
  'META_PERMANENT_TOKEN',
  'PHONE_NUMBER_ID',
  'WABA_ID',
  'WHATSAPP_PHONE_NUMBER',
  'WEBHOOK_VERIFY_TOKEN',
  'EMAIL_USER',
  'EMAIL_PASS',
];

const optionalEnvVars = {
  AI_MODEL: 'gpt-4o',
  AI_MAX_TOKENS: '3000',
  AI_TEMPERATURE: '0.6',
  MAX_SEARCH_RESULTS: '6',
  DAILY_QUERY_LIMIT: '30',
  SESSION_TIMEOUT_HOURS: '48',
  NODE_ENV: 'development',
  DEBUG_MODE: 'false',
};

function validateEnvironment() {
  console.log('🔍 Validating environment variables...');

  const missingVars = [];

  // Check required variables
  requiredEnvVars.forEach((varName) => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });

  // Set defaults for optional variables
  Object.entries(optionalEnvVars).forEach(([key, defaultValue]) => {
    if (!process.env[key]) {
      process.env[key] = defaultValue;
      console.log(`⚙️  Setting default ${key}: ${defaultValue}`);
    }
  });

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach((varName) => {
      console.error(`   - ${varName}`);
    });
    console.error('\n📋 Please check your .env file and ensure all required variables are set.');
    process.exit(1);
  }

  console.log('✅ Environment validation passed');
  return true;
}

function getConfig() {
  return {
    // Server Configuration
    port: parseInt(process.env.PORT) || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    debugMode: process.env.DEBUG_MODE === 'true',

    // Database Configuration
    mongodb: {
      uri: process.env.MONGODB_URI,
      dbName: process.env.DB_NAME,
      options: {
        maxPoolSize: 50,
        wtimeoutMS: 2500,
        serverSelectionTimeoutMS: 5000,
      },
    },

    // AI Configuration
    ai: {
      model: process.env.AI_MODEL || 'gpt-4o',
      maxTokens: parseInt(process.env.AI_MAX_TOKENS) || 3000,
      temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.6,
      apiKey: process.env.OPENAI_API_KEY,
    },

    // Meta WhatsApp Configuration
    meta: {
      appId: process.env.META_APP_ID,
      appSecret: process.env.META_APP_SECRET,
      accessToken: process.env.META_PERMANENT_TOKEN,
      phoneNumberId: process.env.PHONE_NUMBER_ID,
      wabaId: process.env.WABA_ID,
      whatsappNumber: process.env.WHATSAPP_PHONE_NUMBER,
      webhookVerifyToken: process.env.WEBHOOK_VERIFY_TOKEN,
    },

    // Email Configuration
    email: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
      service: 'gmail',
    },

    // Bot Configuration
    bot: {
      maxSearchResults: parseInt(process.env.MAX_SEARCH_RESULTS) || 6,
      dailyQueryLimit: parseInt(process.env.DAILY_QUERY_LIMIT) || 30,
      sessionTimeoutHours: parseInt(process.env.SESSION_TIMEOUT_HOURS) || 48,
      version: 'v3.0.0-enhanced-profiles',
    },
  };
}

module.exports = {
  validateEnvironment,
  getConfig,
};
