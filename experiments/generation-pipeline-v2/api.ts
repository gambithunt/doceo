import OpenAI from 'openai';
import { zodFunction, zodTextFormat } from 'openai/helpers/zod';
import type { z } from 'zod';

export type ApiUsage = {
	inputTokens: number;
	cachedInputTokens: number;
	outputTokens: number;
	totalTokens: number;
};

export async function structuredCall<T>(options: {
	client: OpenAI;
	model: string;
	name: string;
	description: string;
	schema: z.ZodType<T>;
	system: string;
	user: string;
	maxCompletionTokens?: number;
	reasoningEffort?: 'none' | 'low' | 'medium' | 'high' | 'xhigh';
}) {
	if (options.reasoningEffort && options.reasoningEffort !== 'none') {
		const response = await options.client.responses.parse({
			model: options.model,
			input: [
				{ role: 'system', content: options.system },
				{ role: 'user', content: options.user }
			],
			reasoning: { effort: options.reasoningEffort },
			max_output_tokens: options.maxCompletionTokens ?? 6000,
			text: { format: zodTextFormat(options.schema, options.name) }
		});
		if (!response.output_parsed) throw new Error(`No parsed ${options.name} response returned.`);
		const usage: ApiUsage = {
			inputTokens: response.usage?.input_tokens ?? 0,
			cachedInputTokens: response.usage?.input_tokens_details?.cached_tokens ?? 0,
			outputTokens: response.usage?.output_tokens ?? 0,
			totalTokens: response.usage?.total_tokens ?? 0
		};
		return {
			value: options.schema.parse(response.output_parsed),
			usage,
			requestId: response._request_id ?? response.id ?? null
		};
	}

	const response = await options.client.chat.completions.create({
		model: options.model,
		messages: [
			{ role: 'system', content: options.system },
			{ role: 'user', content: options.user }
		],
		max_completion_tokens: options.maxCompletionTokens ?? 6000,
		tools: [
			zodFunction({
				name: options.name,
				description: options.description,
				parameters: options.schema
			})
		],
		tool_choice: { type: 'function', function: { name: options.name } }
	});
	const call = response.choices[0]?.message.tool_calls?.find(
		(item) => item.type === 'function' && item.function.name === options.name
	);
	if (!call || call.type !== 'function') throw new Error(`No ${options.name} tool call returned.`);
	const value = options.schema.parse(JSON.parse(call.function.arguments));
	const usage: ApiUsage = {
		inputTokens: response.usage?.prompt_tokens ?? 0,
		cachedInputTokens: response.usage?.prompt_tokens_details?.cached_tokens ?? 0,
		outputTokens: response.usage?.completion_tokens ?? 0,
		totalTokens: response.usage?.total_tokens ?? 0
	};
	return { value, usage, requestId: response._request_id ?? response.id ?? null };
}
