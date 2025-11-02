/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Content, GenerateContentResponse } from '@google/genai';

/**
 * Model information returned by providers
 */
export interface Model {
  id: string;
  name: string;
  contextWindow?: number;
  supportsStreaming?: boolean;
  supportsVision?: boolean;
}

/**
 * Request options for generating content
 */
export interface RequestOptions {
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  signal?: AbortSignal;
  tools?: import('@google/genai').ToolListUnion;
}

/**
 * Base interface that all model providers must implement
 */
export interface ModelProvider {
  /** Provider name (e.g., 'ollama', 'lmstudio', 'huggingface') */
  readonly name: string;

  /** Check if this provider is available/running */
  isAvailable(): Promise<boolean>;

  /** List available models from this provider */
  listModels(): Promise<Model[]>;

  /** Send a request to generate content */
  sendRequest(
    contents: Content[],
    options: RequestOptions,
  ): Promise<GenerateContentResponse>;

  /** Send a streaming request */
  sendStreamRequest(
    contents: Content[],
    options: RequestOptions,
  ): AsyncGenerator<GenerateContentResponse>;

  /** Whether this provider supports streaming */
  readonly supportsStreaming: boolean;

  /** Whether this provider supports vision models */
  readonly supportsVision: boolean;
}

/**
 * Provider detection result
 */
export interface ProviderDetectionResult {
  provider: string;
  available: boolean;
  endpoint?: string;
  models?: Model[];
}
