# Security Policy

## Supported Versions

The following versions of Business Trucks AI Assistant are currently being supported with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of Business Trucks AI Assistant seriously. If you believe you have found a security vulnerability, please follow these steps:

1. **DO NOT** open a public issue on GitHub.
2. Send a description of the vulnerability to [security@example.com]
3. Include the following information:
   - Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting, etc.)
   - Full paths of source file(s) related to the manifestation of the issue
   - The location of the affected source code (tag/branch/commit or direct URL)
   - Any special configuration required to reproduce the issue
   - Step-by-step instructions to reproduce the issue
   - Proof-of-concept or exploit code (if possible)
   - Impact of the issue, including how an attacker might exploit it

## Response Process

1. Your report will be acknowledged within 48 hours.
2. We will provide a more detailed response within 72 hours, indicating next steps.
3. We will keep you informed about our progress throughout the process.

## Security Best Practices

When deploying Business Trucks AI Assistant, please follow these security best practices:

### API Keys and Secrets
- Never commit API keys or secrets to the repository
- Use environment variables for all sensitive credentials
- Rotate API keys regularly
- Use separate API keys for development and production

### Environment Configuration
- Set appropriate CORS policies
- Enable rate limiting for API endpoints
- Use HTTPS in production
- Configure security headers properly

### Authentication
- Keep authentication tokens secure
- Implement proper session management
- Use secure password hashing
- Enable MFA where possible

### Voice Service Security
- Validate all audio input
- Implement rate limiting for voice API calls
- Monitor usage patterns for abuse
- Encrypt stored audio data

## Secured Services

The following services require secure configuration:

1. OpenAI API
2. Azure Speech Services
3. VoiceRSS API
4. Play.ht API
5. ElevenLabs API
6. MCP Server

## Disclosure Policy

When we receive a security vulnerability report, we will:

1. Confirm the vulnerability and determine its scope
2. Fix the issue and prepare an update
3. Release a security advisory and update
4. Credit the reporter (if desired) when disclosing the issue

## Comments on this Policy

If you have suggestions on how this process could be improved, please submit a pull request.