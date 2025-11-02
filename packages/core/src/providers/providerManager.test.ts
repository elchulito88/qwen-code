/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProviderManager, type ProviderConfig } from './providerManager.js';

describe('ProviderManager', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with auto detection by default', () => {
      const config: ProviderConfig = {
        preferred: 'auto',
        ollama: { enabled: true, endpoint: 'http://localhost:11434' },
        lmstudio: { enabled: true, endpoint: 'http://127.0.0.1:1234' },
        huggingface: { enabled: true },
        cloud: { enabled: true },
      };

      const manager = new ProviderManager(config);
      expect(manager).toBeDefined();
    });

    it('should initialize with specific provider preference', () => {
      const config: ProviderConfig = {
        preferred: 'ollama',
        ollama: { enabled: true, endpoint: 'http://localhost:11434' },
        lmstudio: { enabled: false, endpoint: 'http://127.0.0.1:1234' },
        huggingface: { enabled: false },
        cloud: { enabled: false },
      };

      const manager = new ProviderManager(config);
      expect(manager).toBeDefined();
    });
  });

  describe('detectProviders', () => {
    it('should detect all available providers', async () => {
      const config: ProviderConfig = {
        preferred: 'auto',
        ollama: { enabled: true, endpoint: 'http://localhost:11434' },
        lmstudio: { enabled: true, endpoint: 'http://127.0.0.1:1234' },
        huggingface: { enabled: true },
        cloud: { enabled: true },
      };

      // Mock all providers as available
      fetchMock.mockImplementation((url: string) => {
        if (url.includes('11434')) {
          // Ollama
          return Promise.resolve({
            ok: true,
            json: async () => ({
              models: [{ name: 'qwen2.5-coder:7b', size: 4661211648 }],
            }),
          });
        } else if (url.includes('1234')) {
          // LM Studio
          return Promise.resolve({
            ok: true,
            json: async () => ({
              data: [{ id: 'qwen3-coder-30b', object: 'model', owned_by: 'lmstudio' }],
            }),
          });
        } else if (url.includes('8080')) {
          // HuggingFace TGI
          return Promise.resolve({ ok: true });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      const manager = new ProviderManager(config);
      const results = await manager.detectProviders();

      expect(results).toHaveLength(3);
      expect(results[0].provider).toBe('ollama');
      expect(results[0].available).toBe(true);
      expect(results[1].provider).toBe('lmstudio');
      expect(results[1].available).toBe(true);
      expect(results[2].provider).toBe('huggingface');
    });

    it('should mark unavailable providers correctly', async () => {
      const config: ProviderConfig = {
        preferred: 'auto',
        ollama: { enabled: true, endpoint: 'http://localhost:11434' },
        lmstudio: { enabled: true, endpoint: 'http://127.0.0.1:1234' },
        huggingface: { enabled: true },
        cloud: { enabled: true },
      };

      // Only Ollama is available
      fetchMock.mockImplementation((url: string) => {
        if (url.includes('11434')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ models: [] }),
          });
        }
        return Promise.reject(new Error('Connection refused'));
      });

      const manager = new ProviderManager(config);
      const results = await manager.detectProviders();

      const ollamaResult = results.find(r => r.provider === 'ollama');
      const lmstudioResult = results.find(r => r.provider === 'lmstudio');

      expect(ollamaResult?.available).toBe(true);
      expect(lmstudioResult?.available).toBe(false);
    });

    it('should skip disabled providers', async () => {
      const config: ProviderConfig = {
        preferred: 'auto',
        ollama: { enabled: true, endpoint: 'http://localhost:11434' },
        lmstudio: { enabled: false, endpoint: 'http://127.0.0.1:1234' },
        huggingface: { enabled: false },
        cloud: { enabled: false },
      };

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ models: [] }),
      });

      const manager = new ProviderManager(config);
      const results = await manager.detectProviders();

      // Should only have Ollama since others are disabled
      expect(results).toHaveLength(1);
      expect(results[0].provider).toBe('ollama');
    });

    it('should include endpoint information', async () => {
      const config: ProviderConfig = {
        preferred: 'auto',
        ollama: { enabled: true, endpoint: 'http://custom:11434' },
        lmstudio: { enabled: false, endpoint: 'http://127.0.0.1:1234' },
        huggingface: { enabled: false },
        cloud: { enabled: false },
      };

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ models: [] }),
      });

      const manager = new ProviderManager(config);
      const results = await manager.detectProviders();

      expect(results[0].endpoint).toBe('http://custom:11434');
    });

    it('should include model lists when providers are available', async () => {
      const config: ProviderConfig = {
        preferred: 'auto',
        ollama: { enabled: true, endpoint: 'http://localhost:11434' },
        lmstudio: { enabled: false, endpoint: 'http://127.0.0.1:1234' },
        huggingface: { enabled: false },
        cloud: { enabled: false },
      };

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [
            { name: 'qwen2.5-coder:7b', size: 4661211648 },
            { name: 'qwen2.5-coder:14b', size: 9243291136 },
          ],
        }),
      });

      const manager = new ProviderManager(config);
      const results = await manager.detectProviders();

      expect(results[0].models).toHaveLength(2);
      expect(results[0].models?.[0].name).toBe('qwen2.5-coder:7b');
      expect(results[0].models?.[1].name).toBe('qwen2.5-coder:14b');
    });
  });

  describe('autoDetectProvider', () => {
    it('should return first available provider in priority order', async () => {
      const config: ProviderConfig = {
        preferred: 'auto',
        ollama: { enabled: true, endpoint: 'http://localhost:11434' },
        lmstudio: { enabled: true, endpoint: 'http://127.0.0.1:1234' },
        huggingface: { enabled: true },
        cloud: { enabled: true },
      };

      // Only LM Studio is available
      fetchMock.mockImplementation((url: string) => {
        if (url.includes('1234')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ data: [] }),
          });
        }
        return Promise.reject(new Error('Connection refused'));
      });

      const manager = new ProviderManager(config);
      const provider = await manager.autoDetectProvider();

      expect(provider).toBeDefined();
      expect(provider?.name).toBe('lmstudio');
    });

    it('should respect priority order: ollama > lmstudio > huggingface', async () => {
      const config: ProviderConfig = {
        preferred: 'auto',
        ollama: { enabled: true, endpoint: 'http://localhost:11434' },
        lmstudio: { enabled: true, endpoint: 'http://127.0.0.1:1234' },
        huggingface: { enabled: true },
        cloud: { enabled: true },
      };

      // All providers available
      fetchMock.mockImplementation((url: string) => {
        if (url.includes('11434')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ models: [] }),
          });
        } else if (url.includes('1234')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ data: [] }),
          });
        } else if (url.includes('8080')) {
          return Promise.resolve({ ok: true });
        }
        return Promise.reject(new Error('Unknown'));
      });

      const manager = new ProviderManager(config);
      const provider = await manager.autoDetectProvider();

      // Should return Ollama as it's first in priority
      expect(provider?.name).toBe('ollama');
    });

    it('should return null when no providers are available', async () => {
      const config: ProviderConfig = {
        preferred: 'auto',
        ollama: { enabled: true, endpoint: 'http://localhost:11434' },
        lmstudio: { enabled: true, endpoint: 'http://127.0.0.1:1234' },
        huggingface: { enabled: true },
        cloud: { enabled: true },
      };

      fetchMock.mockRejectedValue(new Error('Connection refused'));

      const manager = new ProviderManager(config);
      const provider = await manager.autoDetectProvider();

      expect(provider).toBeNull();
    });
  });

  describe('getActiveProvider', () => {
    it('should return specific provider when preferred is set', async () => {
      const config: ProviderConfig = {
        preferred: 'lmstudio',
        ollama: { enabled: true, endpoint: 'http://localhost:11434' },
        lmstudio: { enabled: true, endpoint: 'http://127.0.0.1:1234' },
        huggingface: { enabled: true },
        cloud: { enabled: true },
      };

      fetchMock.mockImplementation((url: string) => {
        if (url.includes('1234')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ data: [] }),
          });
        }
        return Promise.reject(new Error('Connection refused'));
      });

      const manager = new ProviderManager(config);
      const provider = await manager.getActiveProvider();

      expect(provider?.name).toBe('lmstudio');
    });

    it('should auto-detect when preferred is "auto"', async () => {
      const config: ProviderConfig = {
        preferred: 'auto',
        ollama: { enabled: true, endpoint: 'http://localhost:11434' },
        lmstudio: { enabled: false, endpoint: 'http://127.0.0.1:1234' },
        huggingface: { enabled: true },
        cloud: { enabled: false },
      };

      fetchMock.mockImplementation((url: string) => {
        if (url.includes('11434')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ models: [] }),
          });
        }
        return Promise.reject(new Error('Connection refused'));
      });

      const manager = new ProviderManager(config);
      const provider = await manager.getActiveProvider();

      expect(provider?.name).toBe('ollama');
    });

    it('should return null if preferred provider is not available', async () => {
      const config: ProviderConfig = {
        preferred: 'ollama',
        ollama: { enabled: true, endpoint: 'http://localhost:11434' },
        lmstudio: { enabled: false, endpoint: 'http://127.0.0.1:1234' },
        huggingface: { enabled: false },
        cloud: { enabled: false },
      };

      fetchMock.mockRejectedValue(new Error('Connection refused'));

      const manager = new ProviderManager(config);
      const provider = await manager.getActiveProvider();

      expect(provider).toBeNull();
    });
  });

  describe('configuration handling', () => {
    it('should use custom endpoints from config', async () => {
      const config: ProviderConfig = {
        preferred: 'auto',
        ollama: { enabled: true, endpoint: 'http://custom-ollama:9999' },
        lmstudio: { enabled: true, endpoint: 'http://custom-lms:8888' },
        huggingface: { enabled: false },
        cloud: { enabled: false },
      };

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ models: [] }),
      });

      const manager = new ProviderManager(config);
      await manager.detectProviders();

      expect(fetchMock).toHaveBeenCalledWith(
        'http://custom-ollama:9999/api/tags',
        expect.any(Object),
      );
      expect(fetchMock).toHaveBeenCalledWith(
        'http://custom-lms:8888/v1/models',
        expect.any(Object),
      );
    });

    it('should use custom default models from config', () => {
      const config: ProviderConfig = {
        preferred: 'auto',
        ollama: {
          enabled: true,
          endpoint: 'http://localhost:11434',
          defaultModel: 'qwen2.5-coder:32b',
        },
        lmstudio: {
          enabled: true,
          endpoint: 'http://127.0.0.1:1234',
          defaultModel: 'qwen3-coder-70b',
        },
        huggingface: {
          enabled: true,
          defaultModel: 'Qwen/Qwen2.5-Coder-32B-Instruct',
        },
        cloud: { enabled: false },
      };

      const manager = new ProviderManager(config);
      expect(manager).toBeDefined();
    });

    it('should handle HuggingFace API key from config', async () => {
      const config: ProviderConfig = {
        preferred: 'huggingface',
        ollama: { enabled: false, endpoint: 'http://localhost:11434' },
        lmstudio: { enabled: false, endpoint: 'http://127.0.0.1:1234' },
        huggingface: {
          enabled: true,
          apiKey: 'test-hf-key',
          defaultModel: 'Qwen/Qwen2.5-Coder-7B-Instruct',
        },
        cloud: { enabled: false },
      };

      const manager = new ProviderManager(config);
      const provider = await manager.getActiveProvider();

      expect(provider).toBeDefined();
      expect(provider?.name).toBe('huggingface');
    });
  });
});
