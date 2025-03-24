# Play.ht Integration Guide

This guide provides detailed instructions for setting up and using Play.ht text-to-speech service with the Business Trucks Sales Assistant.

## Prerequisites

1. A Play.ht account with a paid subscription plan
2. API access enabled in your Play.ht account

## Setting Up Play.ht

### 1. Create a Play.ht Account

1. Go to [Play.ht](https://play.ht) and sign up for an account if you don't have one already
2. Verify your email address

### 2. Upgrade to a Paid Plan

**IMPORTANT**: Play.ht requires a paid subscription to use their API. Even with valid API credentials, a free account will not be able to generate audio.

1. Visit [Play.ht/pricing](https://play.ht/pricing) to view available plans
2. Choose a plan that includes API access:
   - **Creator Plan**: Suitable for most use cases, includes 1,000 characters per month
   - **Pro Plan**: For higher volume needs, includes 50,000 characters per month
   - **Business Plan**: For enterprise-level usage
3. Complete the subscription process
4. Wait for your account to be fully activated (may take a few minutes after payment)

### 3. Get Your API Credentials

1. After upgrading, log in to your Play.ht account
2. Navigate to the API section in your dashboard or visit [Play.ht/studio/api-access](https://play.ht/studio/api-access)
3. Create a new API key if you don't already have one
4. Note both your API key and User ID - you'll need both for integration

### 4. Configure Your Environment Variables

Add the following to your `.env.local` file:

```
PLAYHT_API_KEY=your_playht_api_key_here
PLAYHT_USER_ID=your_playht_user_id_here
PLAYHT_VOICE_ID=s3://voice-cloning-zero-shot/d9ff78ba-d016-47f6-b0ef-dd630f59414e/female-cs/manifest.json
```

The default voice ID provided is a high-quality Russian female voice, but you can change it to any other voice available in Play.ht.

## Testing Your Play.ht Integration

The project includes a test script to verify your Play.ht integration:

1. Ensure your `.env.local` file contains the Play.ht credentials
2. Run the test script:
   ```bash
   npm run test-playht
   ```
3. If successful, a file named `test-audio.mp3` will be created with a Russian spoken message
4. Play this file to verify the voice quality and pronunciation

## Troubleshooting

### Common Errors

#### "API access is not available on your current plan"

This error indicates that your Play.ht account does not have the required subscription level to use the API:

1. Visit [Play.ht/pricing](https://play.ht/pricing) to upgrade your account
2. Choose a plan that includes API access
3. Complete the payment process
4. **Important**: After upgrading, wait a few minutes for your account to be fully activated
5. Try the test script again using `npm run test-playht`

If you continue to receive this error after upgrading:
- Log out and log back into your Play.ht account
- Check your account status in the billing section
- Contact Play.ht support if the issue persists

#### Authentication errors

If you see errors related to authentication:

1. Verify that both `PLAYHT_API_KEY` and `PLAYHT_USER_ID` are correctly copied from your Play.ht dashboard
2. Ensure there are no extra spaces or characters in your environment variables
3. Check if your API key is still active in the Play.ht dashboard
4. Try regenerating your API key if needed

#### Network errors

If you encounter network errors:

1. Check your internet connection
2. Verify that your firewall or network security isn't blocking requests to Play.ht
3. Try running the test script again

## Recommended Russian Voices

The application comes pre-configured with a high-quality Russian female voice, but here are some alternatives you can try:

1. `s3://voice-cloning-zero-shot/d9ff78ba-d016-47f6-b0ef-dd630f59414e/female-cs/manifest.json` - Natasha (clear, professional female)
2. `s3://voice-cloning-zero-shot/8a76116e-2a50-4166-9bb0-0fb43a674373/male-cs/manifest.json` - Viktor (deep, authoritative male)
3. `s3://voice-cloning-zero-shot/7c73835f-c6c9-4b5e-8c91-0aaa63513a73/female-cs/manifest.json` - Elena (warm, friendly female)

To use any of these voices, simply update the `PLAYHT_VOICE_ID` value in your `.env.local` file.

## Understanding Play.ht API Usage and Costs

Play.ht charges based on the number of characters processed. Here's what you should know:

1. **Character counting**: Each character in your text counts toward your monthly limit
2. **Quality settings**: Higher quality settings use more resources but don't count as additional characters
3. **Voice types**: Different voice types may have different pricing structures
4. **Usage tracking**: Monitor your usage in the Play.ht dashboard to avoid unexpected charges

## Customizing Voice Quality

You can adjust the quality of the generated speech by modifying the `quality` parameter in the `lib/playht-service.ts` file. Available options are:

- `draft`: Fastest generation, lower quality (good for testing)
- `low`: Better than draft, still optimized for speed
- `medium`: Balanced between quality and speed (recommended)
- `high`: High-quality voice with more natural intonation
- `premium`: Highest quality available (uses more credits)

Additionally, you can adjust the `speed` parameter (0.5 to 2.0) to make the speech slower or faster.

## Application Fallback Behavior

If Play.ht encounters an error (such as subscription issues), the application will:

1. Gracefully handle the error with an appropriate status code
2. Return a text response instead of audio when possible
3. Display a clear error message to the user
4. Log detailed error information for troubleshooting

This ensures that even if text-to-speech fails, the app will continue to function with text-only responses. 