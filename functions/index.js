/* eslint-disable max-len */
/* eslint-disable require-jsdoc */
const { onRequest } = require('firebase-functions/v2/https')
const admin = require('firebase-admin')
admin.initializeApp()
const firestore =
  admin.firestore() -
  async function getFetch() {
    const { default: fetch } = await import('node-fetch')
    return fetch
  }

const QUICKBOOKS_CLIENT_ID =
  'BBH3sQV8BaGA4ZxmDTFSXOF94ErNGHh2Iu82TC6eogpXwMlYTe'
const QUICKBOOKS_CLIENT_SECRET = 'J68Jzvy0X5BfcV2do84ef5dPKBeq4SQ1xcJh6NzF'
const QB_TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'

// Handles QuickBooks redirect
exports.quickBooksRedirectHandler = onRequest(async (req, res) => {
  try {
    const { code, state } = req.query // Extract code and state (projectId) from query parameters

    if (!code || !state) {
      return res
        .status(400)
        .send({ error: 'Missing authorization code or state' })
    }

    const redirectUri = 'https://coastalrestorationservice.com/oauth/callback'

    // Exchange authorization code for tokens
    const fetch = await getFetch()
    const tokenResponse = await fetch(QB_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization:
          'Basic ' +
          Buffer.from(
            `${QUICKBOOKS_CLIENT_ID}:${QUICKBOOKS_CLIENT_SECRET}`
          ).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      console.error('Error exchanging tokens:', tokenData)
      return res
        .status(500)
        .send({ error: 'Failed to exchange tokens', details: tokenData })
    }
    const expiresIn = tokenData.expires_in // e.g., 3600 seconds
    const tokenExpiresAt = Date.now() + expiresIn * 1000

    // Store tokens in Firestore under tickets/{projectId}
    await firestore.collection('companyInfo').doc('Vj0FigLyhZCyprQ8iGGV').set(
      {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        tokenExpiresAt,
      },
      { merge: true }
    )

    // Redirect back to the app via a deep link
    const appDeepLink = `myapp://oauthcallback?access_token=${encodeURIComponent(
      tokenData.access_token
    )}&refresh_token=${encodeURIComponent(tokenData.refresh_token)}`

    console.log('Redirecting to app:', appDeepLink)
    return res.redirect(appDeepLink)
  } catch (error) {
    console.error('Error in redirect handler:', error)
    res.status(500).send({ error: 'Internal Server Error' })
  }
})
