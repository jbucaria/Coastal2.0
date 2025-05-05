// utils/rephraseText.js
import Constants from 'expo-constants'
import { Alert } from 'react-native' // Import Alert for user feedback

// Retrieve the OpenAI API key directly from the configured extra object
// This relies on app.config.js loading the key from .env into this specific field
const apiKey = Constants.expoConfig?.extra?.openaiApiKey

// If no API key is found after configuration, throw an informative error
// This check ensures the key was loaded correctly from .env via app.config.js
if (!apiKey) {
  // Provide specific guidance
  const errorMessage =
    'Missing OpenAI API key. Ensure OPENAI_API_KEY is set in your .env file and loaded correctly in app.config.js under expo.extra.openaiApiKey. Restart the Expo server (-c) after changes.'
  console.error(errorMessage)
  // Optionally show an alert to the user in development
  if (__DEV__) {
    Alert.alert('Configuration Error', errorMessage)
  }
  // Throwing an error might crash the app, consider returning null or a specific error object
  // depending on how the calling code handles it. For now, we throw.
  throw new Error(errorMessage)
}

/**
 * Rephrases input text using the OpenAI API, tailored for mold remediation context.
 * @param {string} inputText - The text to rephrase.
 * @returns {Promise<string | null>} A promise resolving with the rephrased text, or null if an error occurs.
 * @throws {Error} Can throw if the API key is missing during initialization.
 */
export const rephraseText = async inputText => {
  // Basic input validation
  if (!inputText || typeof inputText !== 'string' || inputText.trim() === '') {
    console.warn('rephraseText received empty or invalid input.')
    return null // Return null for invalid input
  }

  // Construct the messages payload for the chat API
  const messages = [
    {
      role: 'system',
      // *** UPDATED SYSTEM PROMPT ***
      content: `You are an extremely meticulous and thorough mold inspection and remediation consultant, focused on documenting precise observations and findings for official reports. Your task is to rephrase the user's text according to the following instructions:

- Adopt a highly detailed and objective tone.
- Ensure the language is clear, professional, and suitable for a formal report.
- If the user's text describes distinct findings, steps, or items, format them as a clear bulleted list using markdown hyphens (-) or asterisks (*). Use simple, non-nested lists primarily.
- For narrative descriptions or summaries, use concise, well-structured paragraphs.
- Base the rephrased text strictly on the information provided in the user's input. Avoid speculation or adding information not present.
- Focus on factual reporting of observed conditions and actions taken.
- Ensure the rephrased output enhances the clarity and detail of the original text.`,
    },
    {
      role: 'user',
      content: inputText, // The user's original text to be rephrased
    },
  ]

  // Log that the request is being made, masking the key
  console.log(
    `Attempting to rephrase text. API Key: ${apiKey.substring(0, 5)}...`
  )

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`, // Use the key loaded via Constants
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo', // Consider 'gpt-4o-mini' or 'gpt-4o' for potentially better quality/nuance
        messages,
        max_tokens: 1024, // Adjusted max_tokens (can be tuned)
        temperature: 0.5, // Slightly lower temperature for more factual, less creative output
        top_p: 1.0,
        frequency_penalty: 0.1,
        presence_penalty: 0.0,
      }),
    })

    // Log response status for debugging
    console.log(
      'OpenAI API Response Status:',
      response.status,
      response.statusText
    )

    if (!response.ok) {
      let errorDetails = {}
      let errorText = `HTTP error! status: ${response.status}`
      try {
        // Try to parse the error response body from OpenAI
        errorDetails = await response.json()
        errorText = errorDetails.error?.message || JSON.stringify(errorDetails)
        console.error('OpenAI API Error JSON:', errorDetails)
      } catch (e) {
        // If parsing JSON fails, try to get raw text
        try {
          errorText = await response.text()
          console.error('OpenAI API Error Text:', errorText)
        } catch (textError) {
          console.error('Failed to read error response text:', textError)
        }
      }
      // Throw a detailed error
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`)
    }

    // Parse the successful response
    const data = await response.json()
    // console.log('OpenAI API Success Response Data:', data); // Optional: Log full success data for debugging

    // Carefully extract the content from the response structure
    const content = data?.choices?.[0]?.message?.content

    if (content) {
      console.log('Rephrased text received successfully.')
      return content.trim() // Return the rephrased text
    } else {
      // Handle cases where the response structure is unexpected
      console.error('Unexpected API response format:', data)
      throw new Error('Unexpected API response format from OpenAI')
    }
  } catch (error) {
    // Catch any errors from the fetch call or response handling
    console.error('Error during OpenAI API call in rephraseText:', error)
    // Show an alert to the user
    Alert.alert(
      'Rephrasing Failed',
      `Could not rephrase text: ${error.message}`
    )
    // Return null to indicate failure to the calling function
    return null
  }
}
