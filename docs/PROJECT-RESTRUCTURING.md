# Project Restructuring Plan

This document outlines the plan for restructuring the Business Trucks AI Assistant project to make it more maintainable and easier to deploy on GitHub.

## Current Issues

1. The project contains multiple large components that make it difficult to maintain and deploy.
2. The MCP server is embedded within the main project, creating unnecessary complexity.
3. Test files, documentation, and configuration files are mixed together at the root level.
4. Large component files (like VoiceRecorder) should be broken down into smaller, more manageable pieces.

## Restructuring Plan

### 1. Split into Multiple Repositories

The project should be split into separate repositories:

#### Repository 1: Business Trucks Assistant (Main Web App)
```
business-trucks-assistant/
├── app/                      # Next.js app directory and pages
├── components/               # React components
├── lib/                      # Utility functions and service integrations
├── public/                   # Static assets
├── styles/                   # CSS and styling
├── types/                    # TypeScript type definitions
├── tests/                    # Test files
└── docs/                     # Documentation
```

#### Repository 2: MCP Server (Optional ElevenLabs Proxy)
```
mcp-server/
├── src/                      # Server source code
├── scripts/                  # Deployment and setup scripts
├── docs/                     # Documentation
└── tests/                    # Test files
```

### 2. Organize Main Repository Structure

#### Clean up the root directory
- Move all test scripts to a `/tests` directory
- Move documentation files to a `/docs` directory
- Keep only essential configuration files at the root

#### Break down large components
- Split `VoiceRecorder.tsx` into smaller components:
  - `VoiceRecorderControls.tsx` - Recording buttons and UI
  - `VoicePlayback.tsx` - Audio playback functionality
  - `VoiceTranscript.tsx` - Transcript display
  - `VoiceSettings.tsx` - Voice selection and settings

#### Organize API routes
- Create a consistent structure for API endpoints
- Add proper error handling and validation

### 3. Extract MCP Server

- Move the MCP server to its own repository
- Create proper documentation for standalone deployment
- Provide integration instructions for the main app

### 4. Implementation Steps

1. **Create new repositories**
   - Initialize the main project repository
   - Initialize the MCP server repository

2. **Restructure the main application**
   - Reorganize files according to the new structure
   - Break down large components
   - Clean up the API routes

3. **Extract the MCP server**
   - Move MCP server files to the new repository
   - Update documentation and scripts

4. **Update documentation**
   - Update README.md files in both repositories
   - Create deployment guides

5. **Test deployments**
   - Ensure the restructured application works correctly
   - Verify the MCP server functions as a standalone service

## Deployment Considerations

### GitHub Pages Deployment (for static content)
- Configure Next.js for static export if static deployment is desired
- Set up GitHub Actions for automated deployment

### Vercel/Netlify Deployment (for full functionality)
- Create deployment configuration for Vercel or Netlify
- Set up environment variables in the deployment platform

### MCP Server Deployment
- Document deployment options (Digital Ocean, Heroku, etc.)
- Provide setup scripts for common hosting environments

## Timeline

1. Repository setup and initial restructuring: 1 day
2. Component refactoring: 2 days
3. API cleanup: 1 day
4. MCP server extraction: 1 day
5. Documentation updates: 1 day
6. Testing and fixes: 2 days

Total estimated time: 8 days 