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

export const providersCommand: SlashCommand = {
  name: 'providers',
  description: 'list available local model providers',
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
        type: MessageType.TEXT,
        text: '🔍 Detecting available providers...\n',
      },
      Date.now(),
    );

    // Detect providers
    const detectionResults = await providerManager.detectProviders();

    let output = '\n**Local Model Providers**\n\n';
    output += `Preferred provider: **${providerConfig.preferred}**\n\n`;

    for (const result of detectionResults) {
      const status = result.available ? '✅' : '❌';
      const emoji =
        result.provider === 'ollama'
          ? '🦙'
          : result.provider === 'lmstudio'
            ? '🎯'
            : '🤗';

      output += `${emoji} **${result.provider}** ${status}\n`;

      if (result.endpoint) {
        output += `   Endpoint: ${result.endpoint}\n`;
      }

      if (result.available && result.models && result.models.length > 0) {
        output += `   Models: ${result.models.length} available\n`;
        result.models.slice(0, 3).forEach((model) => {
          output += `   - ${model.name}\n`;
        });
        if (result.models.length > 3) {
          output += `   ... and ${result.models.length - 3} more\n`;
        }
      } else if (result.available) {
        output += `   Status: Running (no models detected)\n`;
      } else {
        output += `   Status: Not available\n`;
      }

      output += '\n';
    }

    // Show recommended setup
    const availableProviders = detectionResults.filter((r) => r.available);
    if (availableProviders.length === 0) {
      output += '**No local providers detected**\n\n';
      output +=
        'To use local models, install and start one of the following:\n';
      output += '- Ollama: https://ollama.ai\n';
      output += '- LM Studio: https://lmstudio.ai\n';
      output +=
        '- HuggingFace TGI: https://github.com/huggingface/text-generation-inference\n';
    } else {
      output += `**${availableProviders.length} provider(s) available**\n\n`;

      // Auto-detect the active provider
      const activeProvider = await providerManager.getActiveProvider();
      if (activeProvider) {
        output += `Active provider: **${activeProvider.name}**\n`;
      }
    }

    output += '\n---\n\n';
    output += 'Configure providers in `.qwen/settings.json`:\n';
    output += '```json\n';
    output += '{\n';
    output += '  "providers": {\n';
    output += '    "preferred": "auto",\n';
    output += '    "ollama": { "enabled": true, "defaultModel": "qwen2.5-coder:7b" }\n';
    output += '  }\n';
    output += '}\n';
    output += '```\n';

    context.ui.addItem(
      {
        type: MessageType.TEXT,
        text: output,
      },
      Date.now(),
    );
  },
};
