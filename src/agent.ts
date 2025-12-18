import { addMessages, getMessages, saveToolResponse } from './memory'
import { runApprovalCheck, runLLM } from './llm'
import { showLoader, logMessage } from './ui'
import { runTool } from './toolRunner'
import type { AIMessage } from '../types.ts'
import { generateImageToolDefinition } from './tools/generateImage.ts'
import OpenAI from 'openai'

/**
 * Manages the approval process for image generation tool calls
 * by checking the last message, verifying if it's an image generation request,
 * and processing user approval or disapproval
 * @param history
 * @param userMessage
 * @returns {Promise<boolean>} To indicate whether an approval was needed (true) or not (false), which helps determine whether the user message should be added to the conversation history
 */
const handleImageApprovalFlow = async (
  history: AIMessage[],
  userMessage: string,
): Promise<boolean> => {
  const lastMessage = history.at(-1)

  let toolCall:
    | OpenAI.Chat.Completions.ChatCompletionMessageToolCall
    | undefined
  if (lastMessage?.role === 'assistant' && 'tool_calls' in lastMessage) {
    toolCall = lastMessage.tool_calls?.[0]
  }

  if (
    !toolCall ||
    toolCall.function.name !== generateImageToolDefinition.name
  ) {
    return false
  }

  const loader = showLoader('Processing approval')
  const approved = await runApprovalCheck(userMessage)

  if (approved) {
    loader.update(`Executing tool: ${toolCall.function.name}`)
    const toolResponse = await runTool(toolCall, userMessage)

    loader.update(`Done: ${toolCall.function.name}`)
    await saveToolResponse(toolCall.id, toolResponse)
  } else {
    await saveToolResponse(
      toolCall.id,
      'User did not approve image generation at this time',
    )
  }

  loader.stop()
  return true
}

export const runAgent = async ({
  userMessage,
  tools,
}: {
  userMessage: string
  tools: any[]
}) => {
  // We need the history here because the approval tool needs it
  const history = await getMessages()
  const isImageApproval = await handleImageApprovalFlow(history, userMessage)

  // if there were no approval request (regular request that doesn't need approval)
  if (!isImageApproval) {
    await addMessages([{ role: 'user', content: userMessage }])
  }

  const loader = showLoader('🤔')

  while (true) {
    const history = await getMessages()
    const response = await runLLM({ messages: history, tools })

    await addMessages([response])

    if (response.content) {
      loader.stop()
      logMessage(response)
      return getMessages()
    }

    if (response.tool_calls) {
      const toolCall = response.tool_calls[0]
      logMessage(response)
      loader.update(`executing: ${toolCall.function.name}`)

      if (toolCall.function.name === generateImageToolDefinition.name) {
        loader.update('need user approval')
        loader.stop()
        return getMessages()
      }

      const toolResponse = await runTool(toolCall, userMessage)
      await saveToolResponse(toolCall.id, toolResponse)
      loader.update(`done: ${toolCall.function.name}`)
    }
  }
}
