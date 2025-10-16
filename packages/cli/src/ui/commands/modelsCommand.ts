/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ProviderManager,
  type ProviderConfig,
} from '@qwen-code/qwen-code-core';
import type { SlashCommand } from './types.js';
import { CommandKind } from './types.js';
import { MessageType } from '../types.js';

export const modelsListCommand: SlashCommand = {
  name: 'models list',
  description: 'list all available models from local providers',
  kind: CommandKind.BUILT_IN,
  action: async (context) => {
    // Get provider configuration from settings
    const providerConfig: ProviderConfig = {
      preferred:
        (context.services.settings.merged.providers?.preferred as
          | 'auto'
          | 'ollama'
          | 'lmstudio'
          | 'huggingface'
          | 'cloud') || 'auto',
      ollama: {
        enabled: context.services.settings.merged.providers?.ollama?.enabled ?? true,
        endpoint:
          context.services.settings.merged.providers?.ollama?.endpoint ||
          'http://localhost:11434',
        defaultModel:
          context.services.settings.merged.providers?.ollama?.defaultModel ||
          'qwen2.5-coder:7b',
      },
      lmstudio: {
        enabled:
          context.services.settings.merged.providers?.lmstudio?.enabled ?? true,
        endpoint:
          context.services.settings.merged.providers?.lmstudio?.endpoint ||
          'http://127.0.0.1:1234',
        defaultModel:
          context.services.settings.merged.providers?.lmstudio?.defaultModel ||
          'qwen3-coder-30b',
        contextWindow:
          context.services.settings.merged.providers?.lmstudio?.contextWindow ||
          262144,
      },
      huggingface: {
        enabled:
          context.services.settings.merged.providers?.huggingface?.enabled ??
          true,
        defaultModel:
          context.services.settings.merged.providers?.huggingface
            ?.defaultModel || 'Qwen/Qwen2.5-Coder-7B-Instruct',
        apiKey:
          context.services.settings.merged.providers?.huggingface?.apiKey,
      },
      cloud: {
        enabled:
          context.services.settings.merged.providers?.cloud?.enabled ?? true,
      },
    };

    const providerManager = new ProviderManager(providerConfig);

    context.ui.addItem(
      {
        type: MessageType.INFO,
        text: '🔍 Fetching models from all providers...\n',
      },
      Date.now(),
    );

    // Detect providers and list models
    const detectionResults = await providerManager.detectProviders();

    let output = '\n**Available Models**\n\n';

    for (const result of detectionResults) {
      if (!result.available) continue;

      const emoji =
        result.provider === 'ollama'
          ? '🦙'
          : result.provider === 'lmstudio'
            ? '🎯'
            : '🤗';

      output += `${emoji} **${result.provider}**\n`;
      output += `   Endpoint: ${result.endpoint || 'N/A'}\n`;

      if (result.models && result.models.length > 0) {
        output += `   Models (${result.models.length}):\n`;
        result.models.forEach((model) => {
          const visionIndicator = model.supportsVision ? ' [vision]' : '';
          const streamIndicator = model.supportsStreaming ? ' [stream]' : '';
          const contextWindow = model.contextWindow
            ? ` (${model.contextWindow} tokens)`
            : '';
          output += `   - ${model.name}${visionIndicator}${streamIndicator}${contextWindow}\n`;
        });
      } else {
        output += '   No models detected\n';
      }

      output += '\n';
    }

    if (detectionResults.every((r) => !r.available)) {
      output = '\n**No local providers available**\n\n';
      output +=
        'Please start one of the following:\n';
      output += '- Ollama: https://ollama.ai\n';
      output += '- LM Studio: https://lmstudio.ai\n';
      output +=
        '- HuggingFace TGI: https://github.com/huggingface/text-generation-inference\n';
    }

    context.ui.addItem(
      {
        type: MessageType.INFO,
        text: output,
      },
      Date.now(),
    );
  },
};

export const modelsPullCommand: SlashCommand = {
  name: 'models pull',
  description: 'pull a model from a provider (Ollama only)',
  kind: CommandKind.BUILT_IN,
  action: async (context, args?: string) => {
    if (!args || args.trim() === '') {
      context.ui.addItem(
        {
          type: MessageType.ERROR,
          text: 'Please specify a model name. Usage: /models pull <model-name>',
        },
        Date.now(),
      );
      return;
    }

    const modelName = args.trim();

    // Get provider configuration
    const ollamaEndpoint =
      context.services.settings.merged.providers?.ollama?.endpoint ||
      'http://localhost:11434';

    context.ui.addItem(
      {
        type: MessageType.INFO,
        text: `🔄 Pulling model "${modelName}" from Ollama...\n\nThis may take several minutes depending on the model size.\n`,
      },
      Date.now(),
    );

    try {
      const response = await fetch(`${ollamaEndpoint}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: modelName,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to pull model: ${response.statusText}`);
      }

      // Stream the response to show progress
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let lastProgress = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim()) {
              try {
                const data = JSON.parse(line) as {
                  status?: string;
                  completed?: number;
                  total?: number;
                };

                if (data.status) {
                  const progress =
                    data.completed && data.total
                      ? ` (${Math.round((data.completed / data.total) * 100)}%)`
                      : '';
                  const statusMessage = `${data.status}${progress}`;

                  // Only update if status changed
                  if (statusMessage !== lastProgress) {
                    lastProgress = statusMessage;
                    context.ui.addItem(
                      {
                        type: MessageType.INFO,
                        text: statusMessage + '\n',
                      },
                      Date.now(),
                    );
                  }
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      context.ui.addItem(
        {
          type: MessageType.INFO,
          text: `\n✅ Successfully pulled model "${modelName}"!\n\nYou can now use it with: qwen --model=${modelName}\n`,
        },
        Date.now(),
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      context.ui.addItem(
        {
          type: MessageType.ERROR,
          text: `❌ Failed to pull model: ${errorMessage}\n\nMake sure Ollama is running and the model name is correct.\n`,
        },
        Date.now(),
      );
    }
  },
};
