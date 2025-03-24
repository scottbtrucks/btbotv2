# Business Trucks AI Assistant

A Next.js-based AI assistant for Business Trucks commercial vehicle sales, featuring both text and voice interactions in Russian language.

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/business-trucks-assistant.git
cd business-trucks-assistant

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🏗️ Project Structure

```
business-trucks-assistant/
├── app/                      # Next.js app directory
│   ├── api/                  # API routes
│   ├── chat/                # Chat interface
│   ├── voice/               # Voice interface
│   └── debug/               # Debug interface
├── components/              # React components
│   ├── ui/                  # Base UI components
│   └── features/           # Feature-specific components
├── lib/                     # Utility libraries
│   ├── services/           # External service integrations
│   ├── hooks/              # Custom React hooks
│   └── utils/              # Helper functions
├── public/                 # Static assets
├── styles/                 # Global styles
├── tests/                  # Test files
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   └── e2e/              # End-to-end tests
└── types/                 # TypeScript definitions
```

## 🛠️ Development

### Prerequisites

- Node.js 18.x or later
- npm 8.x or later
- Git

### Installation

1. Clone and install dependencies:
   ```bash
   git clone https://github.com/yourusername/business-trucks-assistant.git
   cd business-trucks-assistant
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API keys
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

### Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

## 🧪 Testing

We use Jest and React Testing Library for testing. Run tests with:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 🔧 Configuration

- `.env.local` - Environment variables
- `project.config.js` - Project-wide settings
- `next.config.mjs` - Next.js configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `tsconfig.json` - TypeScript configuration

## 🎯 Features

- **AI Chat**: Text-based chat interface with AI assistant
- **Voice Interface**: Voice chat with speech-to-text and text-to-speech
- **Multiple TTS Providers**:
  - Azure Speech Services (recommended)
  - VoiceRSS (free alternative)
  - Play.ht (paid option)
  - ElevenLabs (with geo-restriction bypass)
- **Debug Tools**: Comprehensive debugging interface

## 🔒 Security

See [SECURITY.md](SECURITY.md) for security policies and procedures.

## 👥 Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

### Commit Convention

We follow conventional commits specification:

```bash
# Format
type(scope): description

# Examples
feat(voice): add voice recognition support
fix(api): handle chat timeout errors
docs(readme): update installation steps
```

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file.

## 🤝 Support

For support, please:

1. Check the [documentation](docs/)
2. Use the [debug interface](http://localhost:3000/debug)
3. Open an issue on GitHub

## ✨ Acknowledgments

- Next.js team for the amazing framework
- Azure Speech Services for voice capabilities
- All contributors to the project