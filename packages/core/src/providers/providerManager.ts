/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ModelProvider, ProviderDetectionResult } from './base.js';
import { OllamaProvider } from './ollama.js';
import { LMStudioProvider } from './lmstudio.js';
import { HuggingFaceProvider } from './huggingface.js';

export type ProviderType = 'auto' | 'ollama' | 'lmstudio' | 'huggingface' | 'cloud';

export interface ProviderConfig {
  preferred: ProviderType;
  ollama?: {
    enabled: boolean;
    endpoint: string;
    defaultModel: string;
  };
  lmstudio?: {
    enabled: boolean;
    endpoint: string;
    defaultModel: string;
    contextWindow: number;
  };
  huggingface?: {
    enabled: boolean;
    defaultModel: string;
    apiKey?: string;
  };
  cloud?: {
    enabled: boolean;
  };
}

/**
 * Manages local model providers and auto-detection
 */
export class ProviderManager {
  private providers: Map<string, ModelProvider> = new Map();
  private config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Initialize Ollama provider
    if (this.config.ollama?.enabled !== false) {
      const ollamaProvider = new OllamaProvider(
        this.config.ollama?.endpoint || 'http://localhost:11434',
      );
      this.providers.set('ollama', ollamaProvider);
    }

    // Initialize LM Studio provider
    if (this.config.lmstudio?.enabled !== false) {
      const lmstudioProvider = new LMStudioProvider(
        this.config.lmstudio?.endpoint || 'http://127.0.0.1:1234',
        this.config.lmstudio?.contextWindow || 262144,
      );
      this.providers.set('lmstudio', lmstudioProvider);
    }

    // Initialize HuggingFace provider
    if (this.config.huggingface?.enabled !== false) {
      const hfProvider = new HuggingFaceProvider(
        this.config.huggingface?.apiKey,
        this.config.huggingface?.defaultModel || 'Qwen/Qwen2.5-Coder-7B-Instruct',
      );
      this.providers.set('huggingface', hfProvider);
    }
  }

  /**
   * Detect all available providers
   */
  async detectProviders(): Promise<ProviderDetectionResult[]> {
    const results: ProviderDetectionResult[] = [];

    for (const [name, provider] of this.providers.entries()) {
      try {
        const available = await provider.isAvailable();
        const models = available ? await provider.listModels() : [];

        results.push({
          provider: name,
          available,
          endpoint: this.getProviderEndpoint(name),
          models,
        });
      } catch (_error) {
        results.push({
          provider: name,
          available: false,
        });
      }
    }

    return results;
  }

  /**
   * Auto-detect and return the best available provider
   */
  async autoDetectProvider(): Promise<ModelProvider | null> {
    // Priority order: Ollama > LM Studio > HuggingFace
    const priorityOrder = ['ollama', 'lmstudio', 'huggingface'];

    for (const providerName of priorityOrder) {
      const provider = this.providers.get(providerName);
      if (provider && (await provider.isAvailable())) {
        return provider;
      }
    }

    return null;
  }

  /**
   * Get a specific provider by name
   */
  getProvider(name: string): ModelProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Get the configured or auto-detected provider
   */
  async getActiveProvider(): Promise<ModelProvider | null> {
    if (this.config.preferred === 'auto') {
      return this.autoDetectProvider();
    }

    const provider = this.providers.get(this.config.preferred);
    if (provider && (await provider.isAvailable())) {
      return provider;
    }

    // Fall back to auto-detection if preferred provider is not available
    return this.autoDetectProvider();
  }

  private getProviderEndpoint(name: string): string | undefined {
    switch (name) {
      case 'ollama':
        return this.config.ollama?.endpoint || 'http://localhost:11434';
      case 'lmstudio':
        return this.config.lmstudio?.endpoint || 'http://127.0.0.1:1234';
      case 'huggingface':
        return 'https://api-inference.huggingface.co';
      default:
        return undefined;
    }
  }
}
