# ResAI

<div align="center">

<img src="docs/assets/sign-in.png" alt="ResAI Sign In" width="100%" />

![WIP](https://img.shields.io/badge/Status-Work%20In%20Progress-orange?style=for-the-badge)
![MCP Supported](https://img.shields.io/badge/MCP-Supported-00c853)
![Local First](https://img.shields.io/badge/Local-First-blue)

**Intelligent Conversations Powered by AI**

[![Discord](https://img.shields.io/discord/1374047276074537103?label=Discord&logo=discord&color=5865F2)](https://discord.gg/gCRu69Upnp)

</div>

---

> ⚠️ **Work In Progress**: ResAI is currently under active development. Features may change, and some functionality may be incomplete.

## About ResAI

**ResAI** is an intelligent AI chatbot platform that enables powerful, context-aware conversations powered by advanced AI models. Built with modern web technologies, ResAI combines the best features of leading AI services into one unified platform.

### Key Features

• **Multi-AI Support** - Integrates all major LLMs: OpenAI, Anthropic, Google, xAI, Ollama, and more  
• **Powerful Tools** - MCP protocol, web search, JS/Python code execution, data visualization  
• **Image Generation** - Create and edit images with AI models  
• **Automation** - Custom agents, visual workflows, artifact generation  
• **Collaboration** - Share agents, workflows, and MCP configurations with your team  
• **Voice Assistant** - Realtime voice chat with full MCP tool integration  
• **Intuitive UX** - Instantly invoke any feature with `@mention`  
• **Modern UI** - Beautiful shader backgrounds and smooth animations

## Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- PostgreSQL database
- At least one LLM provider API key (OpenAI, Claude, Gemini, etc.)

### Installation

```bash
# Install dependencies
pnpm i

# Set up environment variables
cp .env.example .env
# Edit .env and add your API keys

# Start PostgreSQL (if not already running)
pnpm docker:pg

# Run database migrations
pnpm db:migrate

# Start the development server
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to get started.

### Docker Compose (Recommended)

```bash
# Install dependencies
pnpm i

# Configure .env file with your API keys

# Start all services (including PostgreSQL)
pnpm docker-compose:up
```

## Environment Variables

The `.env` file is automatically created when you run `pnpm i`. Key variables:

```dotenv
# LLM Provider API Keys (at least one required)
OPENAI_API_KEY=****
ANTHROPIC_API_KEY=****
GOOGLE_GENERATIVE_AI_API_KEY=****

# Authentication
BETTER_AUTH_SECRET=****

# Database
POSTGRES_URL=postgres://user:password@localhost:5432/dbname

# Optional: Web Search
EXA_API_KEY=your_exa_api_key_here
```

See `.env.example` for the complete list of configuration options.

## Tech Stack

- **Framework**: Next.js 15+ with App Router
- **AI SDK**: Vercel AI SDK
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Better Auth
- **UI**: Tailwind CSS, shadcn/ui
- **Protocol**: MCP (Model Context Protocol)

## Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

## Support

- 🐛 **Report Issues**: [GitHub Issues](https://github.com/ResilientEcosystem/ResAI/issues)
- 💬 **Discord**: [Join our community](https://discord.gg/gCRu69Upnp)
- ⭐ **Star** this repository to show your support

## License

[Add your license here]

---

<div align="center">

**Built with ❤️ by the ResAI team**

[![GitHub](https://img.shields.io/badge/GitHub-ResAI-black?logo=github)](https://github.com/ResilientEcosystem/ResAI)

</div>
