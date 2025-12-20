import type { AIMessage } from '../types'
import { openai } from './ai'
import { zodFunction, zodResponseFormat } from 'openai/helpers/zod'
import { systemPrompt as defaultSystemPrompt } from './systemPrompt'
import { z } from 'zod'
import { getSummary } from './memory.ts'

export const runLLM = async ({
  messages,
  tools = [],
  temperature = 0.1,
  systemPrompt,
}: {
  messages: AIMessage[]
  tools?: any[]
  temperature?: number
  systemPrompt?: string
}) => {
  const formattedTools = tools.map(zodFunction)
  const summary = await getSummary()

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature,
    messages: [
      {
        role: 'system',
        content: `${systemPrompt || defaultSystemPrompt}. Conversation so far: ${summary}`,
      },
      ...messages,
    ],
    ...(formattedTools.length > 0 && {
      tools: formattedTools,
      tool_choice: 'auto',
      parallel_tool_calls: false,
    }),
  })

  return response.choices[0].message
}

export const summarizeMessages = async (messages: AIMessage[]) => {
  const response = await runLLM({
    messages,
    systemPrompt: `
    You are a summarization agent.

    Your task is to summarize the provided conversation so it can be used as context
    in another LLM’s system prompt.

    Produce a concise, chronological (“play-by-play”) summary that describes:
    - What the user was trying to do or ask
    - How the conversation progressed
    - Key decisions, conclusions, and outcomes
    - Important facts, constraints, preferences, and assumptions stated by the user

    Focus on meaning and intent, not exact wording.
    Do NOT include:
    - Verbatim quotes
    - Message-by-message transcripts
    - Irrelevant chit-chat or filler

    The summary must be self-contained and understandable without seeing the original messages. 
    `,
    temperature: 0.3,
  })

  return response.content || ''
}

export const runApprovalCheck = async (userMessage: string) => {
  const result = await openai.beta.chat.completions.parse({
    model: 'gpt-4o-mini',
    temperature: 0.1,
    response_format: zodResponseFormat(
      z.object({
        approved: z
          .boolean()
          .describe('Did the user approved the action or not'),
      }),
      'approval',
    ),
    messages: [
      {
        role: 'system',
        content:
          'Determine if the user approved the action or not. If you are not sure, then it is not approved.',
      },
      { role: 'user', content: userMessage },
    ],
  })

  return result.choices[0].message.parsed?.approved
}
