# Qwen Code - Local Models Edition

<div align="center">

![Qwen Code Screenshot](./docs/assets/qwen-screenshot.png)

[![npm version](https://img.shields.io/npm/v/@qwen-code/qwen-code.svg)](https://www.npmjs.com/package/@qwen-code/qwen-code)
[![License](https://img.shields.io/github/license/QwenLM/qwen-code.svg)](./LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)

**AI-powered command-line workflow tool for developers - 100% Local & Private**

[Installation](#installation) • [Quick Start](#quick-start) • [Features](#key-features) • [Documentation](./docs/) • [Contributing](./CONTRIBUTING.md)

</div>

Qwen Code Local Edition is a powerful command-line AI workflow tool adapted from [**Gemini CLI**](https://github.com/google-gemini/gemini-cli) ([details](./README.gemini.md)), specifically optimized for running [Qwen3-Coder](https://github.com/QwenLM/Qwen3-Coder) models **completely locally**. It enhances your development workflow with advanced code understanding, automated tasks, and intelligent assistance - all while keeping your code private on your machine.

## 💡 100% Local & Private

Run Qwen models completely on your machine with **zero API costs** and **full privacy**:

### 🦙 Local Providers (Privacy-First)

- **Ollama**: Easiest local setup - `ollama pull qwen2.5-coder:7b` and you're ready
- **LM Studio**: User-friendly GUI for local models
- **HuggingFace**: Run local Text Generation Inference server

**Benefits:**
- ✅ **100% Private** - All inference happens locally, no data leaves your machine
- ✅ **Zero Cost** - No API fees, no rate limits
- ✅ **Offline Support** - Works without internet connection
- ✅ **Full Control** - Choose your model size and quantization

See [Local Provider Setup](#-local-provider-setup) for installation guide.

## Key Features

- **Code Understanding & Editing** - Query and edit large codebases beyond traditional context window limits
- **Workflow Automation** - Automate operational tasks like handling pull requests and complex rebases
- **Enhanced Parser** - Adapted parser specifically optimized for Qwen-Coder models
- **Vision Model Support** - Automatically detect images in your input and seamlessly switch to vision-capable models for multimodal analysis
- **Complete Privacy** - All processing happens on your local machine

## Installation

### Prerequisites

Ensure you have [Node.js version 20](https://nodejs.org/en/download) or higher installed.

```bash
curl -qL https://www.npmjs.com/install.sh | sh
```

### Install from source

```bash
git clone https://github.com/elchulito88/qwen-code.git
cd qwen-code
npm install
npm install -g .
```

### Install globally with Homebrew (macOS/Linux)

```bash
brew install qwen-code
```

## 🦙 Local Provider Setup

This fork includes support for running Qwen models locally through Ollama, LM Studio, or HuggingFace. Perfect for privacy-conscious users or offline development.

### Quick Start with Ollama (Recommended)

**1. Install Ollama:**
```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Windows
# Download from https://ollama.ai
```

**2. Pull a Qwen model:**
```bash
ollama pull qwen2.5-coder:7b     # 7B model (8GB+ RAM)
ollama pull qwen2.5-coder:14b    # 14B model (16GB+ RAM)
ollama pull qwen2.5-coder:32b    # 32B model (32GB+ RAM)
```

**3. Start using Qwen Code:**
```bash
qwen

# Check available providers
/providers

# Start chatting
> Help me write a Python function
```

### Alternative: LM Studio

1. Download from https://lmstudio.ai
2. Open LM Studio and download a Qwen model
3. Start the local server (click server icon)
4. Run `qwen` - it will auto-detect LM Studio

### Alternative: HuggingFace Local TGI

```bash
docker run -p 8080:80 \
  ghcr.io/huggingface/text-generation-inference:latest \
  --model-id Qwen/Qwen2.5-Coder-7B-Instruct
```

### Configuration

Create or edit `.qwen/settings.json` in your home directory:

```json
{
  "providers": {
    "preferred": "auto",
    "ollama": {
      "enabled": true,
      "endpoint": "http://localhost:11434",
      "defaultModel": "qwen2.5-coder:7b"
    },
    "lmstudio": {
      "enabled": true,
      "endpoint": "http://127.0.0.1:1234",
      "defaultModel": "qwen2.5-coder-14b"
    }
  }
}
```

### Provider Commands

```bash
/providers        # List available providers and their models
/models list      # List models from active provider
/models pull      # Download a model
```

**For complete documentation**, see [LOCAL_PROVIDERS.md](./LOCAL_PROVIDERS.md)

## Quick Start

```bash
# Start Qwen Code
qwen

# Example commands
> Explain this codebase structure
> Help me refactor this function
> Generate unit tests for this module
```

### Session Management

Control your token usage with configurable session limits to optimize memory and performance.

#### Configure Session Token Limit

Create or edit `.qwen/settings.json` in your home directory:

```json
{
  "sessionTokenLimit": 32000
}
```

#### Session Commands

- **`/compress`** - Compress conversation history to continue within token limits
- **`/clear`** - Clear all conversation history and start fresh
- **`/stats`** - Check current token usage and limits

> 📝 **Note**: Session token limit applies to a single conversation.

### Vision Model Configuration

Qwen Code includes intelligent vision model auto-switching that detects images in your input and can automatically switch to vision-capable models for multimodal analysis. **This feature is enabled by default** - when you include images in your queries, you'll see a dialog asking how you'd like to handle the vision model switch.

#### Skip the Switch Dialog (Optional)

If you don't want to see the interactive dialog each time, configure the default behavior in your `.qwen/settings.json`:

```json
{
  "experimental": {
    "vlmSwitchMode": "once"
  }
}
```

**Available modes:**

- **`"once"`** - Switch to vision model for this query only, then revert
- **`"session"`** - Switch to vision model for the entire session
- **`"persist"`** - Continue with current model (no switching)
- **Not set** - Show interactive dialog each time (default)

#### Command Line Override

You can also set the behavior via command line:

```bash
# Switch once per query
qwen --vlm-switch-mode once

# Switch for entire session
qwen --vlm-switch-mode session

# Never switch automatically
qwen --vlm-switch-mode persist
```

#### Disable Vision Models (Optional)

To completely disable vision model support, add to your `.qwen/settings.json`:

```json
{
  "experimental": {
    "visionModelPreview": false
  }
}
```

> 💡 **Tip**: In YOLO mode (`--yolo`), vision switching happens automatically without prompts when images are detected.

## Usage Examples

### 🔍 Explore Codebases

```bash
cd your-project/
qwen

# Architecture analysis
> Describe the main pieces of this system's architecture
> What are the key dependencies and how do they interact?
> Find all API endpoints and their authentication methods
```

### 💻 Code Development

```bash
# Refactoring
> Refactor this function to improve readability and performance
> Convert this class to use dependency injection
> Split this large module into smaller, focused components

# Code generation
> Create a REST API endpoint for user management
> Generate unit tests for the authentication module
> Add error handling to all database operations
```

### 🔄 Automate Workflows

```bash
# Git automation
> Analyze git commits from the last 7 days, grouped by feature
> Create a changelog from recent commits
> Find all TODO comments and create GitHub issues

# File operations
> Convert all images in this directory to PNG format
> Rename all test files to follow the *.test.ts pattern
> Find and remove all console.log statements
```

### 🐛 Debugging & Analysis

```bash
# Performance analysis
> Identify performance bottlenecks in this React component
> Find all N+1 query problems in the codebase

# Security audit
> Check for potential SQL injection vulnerabilities
> Find all hardcoded credentials or API keys
```

## Popular Tasks

### 📚 Understand New Codebases

```text
> What are the core business logic components?
> What security mechanisms are in place?
> How does the data flow through the system?
> What are the main design patterns used?
> Generate a dependency graph for this module
```

### 🔨 Code Refactoring & Optimization

```text
> What parts of this module can be optimized?
> Help me refactor this class to follow SOLID principles
> Add proper error handling and logging
> Convert callbacks to async/await pattern
> Implement caching for expensive operations
```

### 📝 Documentation & Testing

```text
> Generate comprehensive JSDoc comments for all public APIs
> Write unit tests with edge cases for this component
> Create API documentation in OpenAPI format
> Add inline comments explaining complex algorithms
> Generate a README for this module
```

### 🚀 Development Acceleration

```text
> Set up a new Express server with authentication
> Create a React component with TypeScript and tests
> Implement a rate limiter middleware
> Add database migrations for new schema
> Configure CI/CD pipeline for this project
```

## Commands & Shortcuts

### Session Commands

- `/help` - Display available commands
- `/clear` - Clear conversation history
- `/compress` - Compress history to save tokens
- `/stats` - Show current session information
- `/providers` - List available local providers
- `/models list` - List available models
- `/exit` or `/quit` - Exit Qwen Code

### Keyboard Shortcuts

- `Ctrl+C` - Cancel current operation
- `Ctrl+D` - Exit (on empty line)
- `Up/Down` - Navigate command history

## Benchmark Results

### Terminal-Bench Performance

| Agent     | Model              | Accuracy |
| --------- | ------------------ | -------- |
| Qwen Code | Qwen3-Coder-480A35 | 37.5%    |
| Qwen Code | Qwen3-Coder-30BA3B | 31.3%    |

## Development & Contributing

**⚠️ Important for Contributors:** All changes must be made on feature branches. See [DEVELOPMENT.md](./DEVELOPMENT.md) for the mandatory branch workflow.

- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Development workflow and branch management (required reading)
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - How to contribute to the project
- **[LOCAL_PROVIDERS.md](./LOCAL_PROVIDERS.md)** - Complete local provider documentation

## Troubleshooting

If you encounter issues, check the [troubleshooting guide](docs/troubleshooting.md).

### Common Issues

**Ollama not detected:**
```bash
# Make sure Ollama is running
ollama serve

# In a new terminal
qwen
```

**Model not found:**
```bash
# List available models
ollama list

# Pull the model you need
ollama pull qwen2.5-coder:7b
```

**Memory issues:**
- Try a smaller model (7B instead of 14B)
- Reduce context window in settings
- Close other applications

## Acknowledgments

This project is based on [Google Gemini CLI](https://github.com/google-gemini/gemini-cli). We acknowledge and appreciate the excellent work of the Gemini CLI team. Our main contributions focus on:
- Parser-level adaptations to better support Qwen-Coder models
- Complete local provider support for privacy-focused development
- Removal of cloud dependencies for 100% offline operation

## License

[LICENSE](./LICENSE)

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=QwenLM/qwen-code&type=Date)](https://www.star-history.com/#QwenLM/qwen-code&Date)
