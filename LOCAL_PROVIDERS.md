# Local Provider Support for Qwen CLI

This fork of the official Qwen CLI adds support for running Qwen models locally through multiple providers, enabling privacy-focused, offline inference while maintaining compatibility with the upstream repository.

## Table of Contents

- [Features](#features)
- [Supported Providers](#supported-providers)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Usage](#usage)
- [Commands](#commands)
- [Syncing with Upstream](#syncing-with-upstream)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## Features

- 🦙 **Ollama Support**: Use Ollama for local model inference (PRIMARY)
- 🎯 **LM Studio Support**: Run models through LM Studio (SECONDARY)
- 🤗 **HuggingFace Support**: Use HuggingFace Inference API or local TGI (TERTIARY)
- 🔍 **Auto-Detection**: Automatically detects and selects available providers
- 🚀 **CLI Provider Selection**: Override provider with `--provider` flag
- 📦 **Model Management**: List and pull models with `/models` commands
- 🔒 **Privacy First**: All inference happens locally by default
- 🔄 **Upstream Sync**: Maintain ability to sync with official Qwen CLI updates
- ⚙️ **Configurable**: Extensive per-provider configuration options
- ✅ **Fully Tested**: 75+ unit tests covering all provider implementations

## Supported Providers

### 1. Ollama (Recommended)

Ollama is the easiest way to run local models with a simple CLI interface.

**Installation:**
```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Start Ollama
ollama serve
```

**Pull a Qwen model:**
```bash
ollama pull qwen2.5-coder:7b
ollama pull qwen2.5-coder:14b
ollama pull qwen2.5-coder:32b
```

### 2. LM Studio

LM Studio provides a user-friendly GUI for running local models.

**Installation:**
1. Download from https://lmstudio.ai
2. Install and open LM Studio
3. Download a Qwen model from the model browser
4. Start the local server (click the server icon)

### 3. HuggingFace

Use HuggingFace's Inference API or run a local Text Generation Inference (TGI) server.

**Option A - Inference API:**
```bash
export HF_API_KEY="your-api-key"
```

**Option B - Local TGI:**
```bash
docker run -p 8080:80 \
  -v $PWD/data:/data \
  ghcr.io/huggingface/text-generation-inference:latest \
  --model-id Qwen/Qwen2.5-Coder-7B-Instruct
```

## Installation

### From Source

```bash
# Clone your fork
git clone https://github.com/elchulito88/qwen-code.git
cd qwen-code

# Install dependencies
npm install

# Build the project
npm run build

# Link for global use (optional)
npm link
```

### Requirements

- Node.js >= 20.0.0
- At least one local provider installed (Ollama, LM Studio, or HuggingFace TGI)

## Quick Start

1. **Install and start a provider** (e.g., Ollama):
   ```bash
   ollama serve
   ollama pull qwen2.5-coder:7b
   ```

2. **Start the Qwen CLI**:
   ```bash
   npm run start
   # or if you've linked it globally
   qwen

   # Or specify a provider directly
   qwen --provider=ollama
   ```

3. **Check available providers**:
   ```
   /providers
   ```

4. **List available models**:
   ```
   /models list
   ```

5. **Start chatting**:
   ```
   Hello! Can you help me write a Python function?
   ```

## Configuration

Configuration is stored in `.qwen/settings.json`. Create or edit this file in your home directory or project root.

### Example Configuration

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
      "defaultModel": "qwen2.5-coder-14b",
      "contextWindow": 262144
    },
    "huggingface": {
      "enabled": true,
      "defaultModel": "Qwen/Qwen2.5-Coder-7B-Instruct",
      "apiKey": "hf_..."
    },
    "cloud": {
      "enabled": false
    }
  },
  "customizations": {
    "version": "1.0.0",
    "lastUpstreamSync": "2025-10-15T00:00:00Z"
  }
}
```

### Configuration Options

#### Provider Selection

- `"auto"`: Automatically detect and use the first available provider (Ollama → LM Studio → HuggingFace)
- `"ollama"`: Always use Ollama
- `"lmstudio"`: Always use LM Studio
- `"huggingface"`: Always use HuggingFace
- `"cloud"`: Use cloud providers (requires explicit configuration)

#### Per-Provider Settings

**Ollama:**
- `enabled`: Enable/disable Ollama provider
- `endpoint`: Ollama API endpoint (default: `http://localhost:11434`)
- `defaultModel`: Default model to use (e.g., `qwen2.5-coder:7b`)

**LM Studio:**
- `enabled`: Enable/disable LM Studio provider
- `endpoint`: LM Studio server endpoint (default: `http://127.0.0.1:1234`)
- `defaultModel`: Default model name
- `contextWindow`: Context window size (default: `262144`)

**HuggingFace:**
- `enabled`: Enable/disable HuggingFace provider
- `defaultModel`: Model ID (e.g., `Qwen/Qwen2.5-Coder-7B-Instruct`)
- `apiKey`: HuggingFace API key (optional, for Inference API)

## Usage

### Basic Chat

Just start typing your questions or requests:

```
What is a closure in JavaScript?
```

### CLI Flags

#### `--provider` Flag

Override the default provider selection using the `--provider` flag:

```bash
# Use Ollama specifically
qwen --provider=ollama

# Use LM Studio
qwen --provider=lmstudio

# Use HuggingFace
qwen --provider=huggingface

# Auto-detect (default behavior)
qwen --provider=auto

# Use cloud providers
qwen --provider=cloud
```

This flag overrides the `providers.preferred` setting from your configuration file.

**Use cases:**
- Testing different providers quickly
- Forcing a specific provider when auto-detection fails
- Switching between local and cloud providers
- CI/CD pipelines with specific provider requirements

### Using Slash Commands

The CLI includes various slash commands for configuration and control:

```
/help          - Show available commands
/providers     - List available local providers
/models list   - List all available models
/models pull   - Pull/download a model (Ollama)
/settings      - Configure settings
/clear         - Clear conversation history
/quit          - Exit the CLI
```

### Provider Detection

Use the `/providers` command to see which providers are available:

```
/providers
```

Output example:
```
🔍 Detecting available providers...

**Local Model Providers**

Preferred provider: **auto**

🦙 **ollama** ✅
   Endpoint: http://localhost:11434
   Models: 3 available
   - qwen2.5-coder:7b
   - qwen2.5-coder:14b
   - qwen2.5-coder:32b

🎯 **lmstudio** ❌
   Status: Not available

🤗 **huggingface** ✅
   Status: Running (no models detected)

**1 provider(s) available**

Active provider: **ollama**
```

## Commands

### `/providers`

List all available providers and their status.

```
/providers
```

### `/models list`

List all available models from detected providers with details:

```
/models list
```

Output example:
```
**Available Models**

🦙 **ollama**
   Endpoint: http://localhost:11434
   Models (3):
   - qwen2.5-coder:7b [stream]
   - qwen2.5-coder:14b [stream]
   - llava:7b [vision] [stream]

🎯 **lmstudio**
   Endpoint: http://127.0.0.1:1234
   Models (2):
   - qwen3-coder-30b [stream] (262144 tokens)
   - qwen2.5-coder-14b [stream] (262144 tokens)
```

### `/models pull`

Pull/download a model from Ollama (Ollama only):

```
/models pull qwen2.5-coder:7b
```

Features:
- Real-time progress updates
- Shows download percentage
- Error handling with helpful messages
- Automatically validates model availability after download

Example output:
```
🔄 Pulling model "qwen2.5-coder:7b" from Ollama...

This may take several minutes depending on the model size.

pulling manifest
downloading digestname: 100%
✅ Successfully pulled model "qwen2.5-coder:7b"!

You can now use it with: qwen --model=qwen2.5-coder:7b
```

### Configuration Commands

```
/settings          - Open settings dialog
```

## Syncing with Upstream

This fork maintains compatibility with the official Qwen CLI repository. To sync with upstream updates:

```bash
./scripts/sync-upstream.sh
```

The sync script will:
1. Fetch upstream changes
2. Create a backup branch
3. Attempt to merge changes
4. Preserve custom provider code
5. Run tests
6. Report status

### Manual Sync

If you prefer to sync manually:

```bash
# Fetch upstream changes
git fetch upstream

# Create a backup
git branch backup-$(date +%Y%m%d)

# Merge upstream changes
git merge upstream/main

# Resolve conflicts (if any)
# Prioritize keeping files in packages/core/src/providers/

# Test the build
npm test
npm run build
```

## Troubleshooting

### Provider Not Detected

**Ollama:**
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Restart Ollama
ollama serve
```

**LM Studio:**
1. Open LM Studio
2. Ensure a model is loaded
3. Click the server icon to start the local server
4. Verify the port matches your configuration (default: 1234)

**HuggingFace:**
```bash
# Check if local TGI is running
curl http://localhost:8080/health

# Or verify API key
echo $HF_API_KEY
```

### Models Not Loading

**Ollama:**
```bash
# List installed models
ollama list

# Pull a model if missing
ollama pull qwen2.5-coder:7b
```

**LM Studio:**
1. Open LM Studio
2. Go to the model browser
3. Search for "Qwen"
4. Download the desired model

### Build Errors

```bash
# Clean and rebuild
npm run clean
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Configuration Not Loading

```bash
# Check settings file location
ls -la ~/.qwen/settings.json

# Verify JSON syntax
cat ~/.qwen/settings.json | jq .
```

## Privacy & Security

This fork prioritizes privacy and local execution:

- ✅ **Local-first**: All inference happens locally by default
- ✅ **No telemetry**: No analytics or usage data sent to external services
- ✅ **Cloud disabled by default**: Cloud providers require explicit user configuration
- ✅ **Auditable**: All network requests are transparent and documented
- ✅ **Open source**: Full source code available for inspection

## Performance Tips

1. **Use appropriate model sizes**: Larger models provide better quality but require more resources
   - 7B models: Good for most tasks, runs on 8GB+ RAM
   - 14B models: Better quality, needs 16GB+ RAM
   - 32B models: Best quality, requires 32GB+ RAM

2. **Use quantization**: Ollama and LM Studio support quantized models for faster inference
   ```bash
   ollama pull qwen2.5-coder:7b-q4_0  # 4-bit quantization
   ```

3. **Adjust context window**: Reduce context window for faster responses
   ```json
   {
     "lmstudio": {
       "contextWindow": 8192  // Smaller = faster
     }
   }
   ```

## Contributing

Contributions are welcome! Please follow the development workflow documented in [DEVELOPMENT.md](./DEVELOPMENT.md).

**⚠️ IMPORTANT: All changes must be made on a feature branch. Never commit directly to `main`.**

### Quick Start for Contributors

1. Fork this repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/qwen-code.git`
3. Create a feature branch: `git checkout -b feature/your-feature-name`
4. Make your changes and add tests
5. Update documentation
6. Verify: `npm test && npm run build`
7. Commit with clear message
8. Push your branch: `git push origin feature/your-feature-name`
9. Merge to main after verification

See [DEVELOPMENT.md](./DEVELOPMENT.md) for detailed workflow, branch naming conventions, and examples.

### Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/qwen-code.git
cd qwen-code

# Install dependencies
npm install

# Run in development mode
npm run start

# Run tests
npm test

# Build
npm run build
```

## License

This fork maintains the same Apache-2.0 license as the upstream Qwen CLI project.

Custom provider code in `packages/core/src/providers/` is also licensed under Apache-2.0.

## Acknowledgments

- [Qwen Team](https://github.com/QwenLM) for the original Qwen CLI
- [Ollama](https://ollama.ai) for making local LLMs accessible
- [LM Studio](https://lmstudio.ai) for the excellent local inference platform
- [HuggingFace](https://huggingface.co) for their open-source ecosystem

## Links

- **Upstream Repository**: https://github.com/QwenLM/qwen-code
- **This Fork**: https://github.com/elchulito88/qwen-code
- **Issues**: https://github.com/elchulito88/qwen-code/issues
- **Ollama**: https://ollama.ai
- **LM Studio**: https://lmstudio.ai
- **HuggingFace**: https://huggingface.co
