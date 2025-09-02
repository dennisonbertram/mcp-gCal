# Get Google Calendar API Access Token

## Method 1: Google OAuth2 Playground (Recommended for Testing)

1. Go to [Google OAuth2 Playground](https://developers.google.com/oauthplayground/)

2. In "Step 1: Select & authorize APIs":
   - Scroll down to "Calendar API v3"
   - Check these scopes:
     - `https://www.googleapis.com/auth/calendar`
     - `https://www.googleapis.com/auth/calendar.events` 
     - `https://www.googleapis.com/auth/calendar.readonly`
   - Click "Authorize APIs"

3. Sign in with your Google account and grant permissions

4. In "Step 2: Exchange authorization code for tokens":
   - Click "Exchange authorization code for tokens"
   
5. Copy the `access_token` from the response

6. Run the API tests:
   ```bash
   export ACCESS_TOKEN='your_access_token_here'
   ./test-calendar-api.sh
   ```

## Method 2: Use Custom OAuth Client

If you need to use the custom client credentials:

1. Add redirect URI to Google Cloud Console:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to APIs & Services > Credentials
   - Edit your OAuth 2.0 Client ID
   - Add `http://localhost:3001/oauth2callback` to Authorized redirect URIs
   - Save changes

2. Run the OAuth flow:
   ```bash
   npm run auth
   ```

3. Follow the browser prompts to authorize

## Required Scopes for Full Calendar MCP Server

```
https://www.googleapis.com/auth/calendar
https://www.googleapis.com/auth/calendar.events  
https://www.googleapis.com/auth/calendar.readonly
https://www.googleapis.com/auth/calendar.settings.readonly
```

## Security Notes

- Never commit tokens to git
- Tokens expire after 1 hour (access_token) 
- Refresh tokens can be used to get new access tokens
- Store tokens securely using encryption (see TokenStorage.ts example)