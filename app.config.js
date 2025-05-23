require('dotenv').config() // Load environment variables from .env file

export default ({ config }) => {
  // Log to verify keys are loaded from process.env *before* returning config
  console.log(
    '[app.config.js] Loaded OPENAI_API_KEY:',
    process.env.OPENAI_API_KEY ? 'Yes' : 'No'
  )
  console.log(
    '[app.config.js] Loaded GOOGLE_MAPS_API_KEY:',
    process.env.GOOGLE_MAPS_API_KEY ? 'Yes' : 'No'
  )

  return {
    ...config, // Spread the existing Expo config
    extra: {
      ...config.extra, // Spread any existing extra config
      // Add your API keys here from the loaded environment variables
      openaiApiKey: process.env.OPENAI_API_KEY,
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY, // Add the maps key

      // Add other environment variables you need here
      eas: {
        // Add EAS Build specific config if needed
        projectId:
          process.env.EAS_PROJECT_ID ||
          config?.eas?.projectId ||
          '618e04fc-22cb-4d24-9bf7-530fb7444d97', // Example with fallback
      },
    },
    // Explicitly define other essential config properties if needed
    // name: config.name || 'YourAppName',
    // slug: config.slug || 'your-app-slug',
    // version: config.version || '1.0.0',
    // ... other config properties
  }
}
