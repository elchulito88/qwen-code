# Custom Modifications - Qwen CLI Local Provider Support

This document tracks all custom modifications made to the Qwen CLI to support local model inference through Ollama, LM Studio, and HuggingFace.

## Version

**Customization Version:** 1.0.0
**Base Upstream Version:** 0.0.14
**Fork Repository:** https://github.com/elchulito88/qwen-code
**Upstream Repository:** https://github.com/QwenLM/qwen-code

---

## Added Features

### 1. Local Model Provider Support
Added support for running Qwen models locally through three providers:
- **Ollama**: Local inference via http://localhost:11434 (PRIMARY)
- **LM Studio**: Local inference via http://127.0.0.1:1234 (SECONDARY)
- **HuggingFace**: Direct model loading or API inference (TERTIARY)

### 2. Automatic Provider Detection
The CLI automatically detects available local providers on startup and falls back gracefully if providers are unavailable.

### 3. Extended Configuration System
Added comprehensive provider configuration to settings.json with support for:
- Provider selection (auto, ollama, lmstudio, huggingface, cloud)
- Per-provider endpoint configuration
- Default model selection per provider
- Enable/disable individual providers

---

## Modified Files

### Core Package (packages/core/src/)
**Modified:**
- `packages/cli/src/config/settingsSchema.ts`
  - Added `providers` configuration section with nested settings for each provider
  - Added `customizations` section to track fork version and upstream sync

### CLI Package (packages/cli/src/)
**Minimal modifications expected for integration** (to be implemented in Phase 3)

---

## New Files/Directories

### Provider Implementation (packages/core/src/providers/)
- `base.ts` - Provider interface definitions and types
- `ollama.ts` - Ollama provider implementation
- `lmstudio.ts` - LM Studio provider implementation
- `huggingface.ts` - HuggingFace provider implementation
- `providerManager.ts` - Provider detection and management
- `index.ts` - Provider module exports

### Scripts
- `scripts/sync-upstream.sh` - Automated upstream synchronization script

### Documentation
- `CUSTOMIZATIONS.md` (this file) - Modification tracking

---

## Protected Paths (Do Not Auto-Merge)

These paths contain custom code that should be preserved during upstream syncs:

```
packages/core/src/providers/**/*
scripts/sync-upstream.sh
CUSTOMIZATIONS.md
packages/cli/src/config/settingsSchema.ts (partial - review carefully)
```

---

## Merge Strategy

When syncing with upstream (using `./scripts/sync-upstream.sh`):

1. **Always preserve** the `packages/core/src/providers/` directory
2. **Carefully review** changes to configuration files:
   - `packages/cli/src/config/settingsSchema.ts`
   - `packages/cli/src/config/settings.ts`
3. **Test all providers** after merge:
   - Verify Ollama detection and inference
   - Verify LM Studio detection and inference
   - Verify HuggingFace inference
4. **Update this document** with any new modifications or changes
5. **Update version numbers** in both this file and settings

---

## Implementation Status

### ✅ Completed (Phase 1 & 2)
- [x] Fork Qwen CLI repository
- [x] Set up upstream tracking
- [x] Create provider abstraction layer
- [x] Implement OllamaProvider
- [x] Implement LMStudioProvider
- [x] Implement HuggingFaceProvider
- [x] Create ProviderManager for detection
- [x] Extend settings schema with provider configuration
- [x] Create sync-upstream.sh script
- [x] Document customizations

### 🚧 In Progress (Phase 3)
- [ ] Integrate providers into main CLI flow
- [ ] Add provider detection on startup
- [ ] Implement provider switching commands
- [ ] Add model management commands

### 📋 Planned (Phase 4 & 5)
- [ ] Create provider selection CLI flags
- [ ] Implement `qwen providers list` command
- [ ] Implement `qwen providers set <provider>` command
- [ ] Implement `qwen models list` command
- [ ] Write unit tests for each provider
- [ ] Write integration tests
- [ ] Update user documentation
- [ ] Test sync process with simulated upstream updates

---

## Configuration Example

Example `.qwen/settings.json` configuration:

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
      "defaultModel": "qwen3-coder-30b",
      "contextWindow": 262144
    },
    "huggingface": {
      "enabled": true,
      "defaultModel": "Qwen/Qwen2.5-Coder-7B-Instruct"
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

---

## Testing Checklist

Before considering the implementation complete:

- [ ] Ollama provider can detect running instance
- [ ] Ollama provider can list available models
- [ ] Ollama provider can generate text responses
- [ ] LM Studio provider can detect running instance
- [ ] LM Studio provider can list available models
- [ ] LM Studio provider can generate text responses
- [ ] HuggingFace provider can connect to API/local server
- [ ] HuggingFace provider can generate text responses
- [ ] Auto-detection selects correct provider based on availability
- [ ] Provider switching works correctly
- [ ] Settings persist across restarts
- [ ] Sync script preserves customizations
- [ ] All original Qwen CLI features remain functional

---

## Privacy & Security Notes

This fork prioritizes privacy and local execution:

- **Default behavior**: All inference happens locally with no external API calls
- **Cloud provider**: Disabled by default, requires explicit user configuration
- **No telemetry**: No analytics or usage data sent to external services
- **Auditable**: All network requests are made through the provider implementations

---

## Future Enhancements

Potential improvements for future versions:

- Support for additional providers (vLLM, text-generation-webui)
- Model performance benchmarking
- Automatic model recommendations based on hardware
- Provider load balancing for hybrid cloud/local setups
- Web UI for configuration management
- GPU detection and automatic quantization selection
- Model download/management through CLI

---

## Maintenance

**Maintainer:** elchulito88
**Last Updated:** 2025-10-15
**Sync Frequency:** Check for upstream updates weekly

To sync with upstream:
```bash
./scripts/sync-upstream.sh
```

---

## License

This fork maintains the same license as the upstream Qwen CLI project (Apache-2.0).

Custom code in `packages/core/src/providers/` is also licensed under Apache-2.0.
