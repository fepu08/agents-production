import { JSONFilePreset } from 'lowdb/node'
import type { AIMessage } from '../types'
import { v4 as uuidv4 } from 'uuid'
import { summarizeMessages } from './llm'

const WINDOW_SIZE = 10

export type MessageWithMetadata = AIMessage & {
  id: string
  createdAt: string
}

type Data = {
  messages: MessageWithMetadata[]
  summary: string
}

const defaultData: Data = {
  messages: [],
  summary: '',
}

export const addMetadata = (message: AIMessage) => {
  return {
    ...message,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
  }
}

export const removeMetadata = (message: MessageWithMetadata) => {
  const { id, createdAt, ...rest } = message
  return rest
}

export const getDb = async () => {
  return await JSONFilePreset<Data>('db.json', defaultData)
}

export const addMessages = async (newMessages: AIMessage[]) => {
  const db = await getDb()
  db.data.messages.push(...newMessages.map(addMetadata))

  const messages = db.data.messages
  const len = messages.length

  // We only have a "previous window of size N" to summarize once we have at least 2N messages.
  if (len >= 2 * WINDOW_SIZE) {
    // Tail = raw messages we will return as-is (N, or N+1 if tool-boundary adjustment kicks in)
    const tailStart = computeTailStartIndex(messages, WINDOW_SIZE)

    // Summary window is the N messages immediately before the raw tail.
    let summaryStart = tailStart - WINDOW_SIZE
    let summaryEndExclusive = tailStart

    // If the summary window starts with a tool response, shift start left by 1
    // so we don't begin a summarized chunk with a tool message detached from its context.
    if (summaryStart > 0 && messages[summaryStart]?.role === 'tool') {
      summaryStart -= 1
    }

    summaryStart = Math.max(0, summaryStart)

    const messagesToSummarize = messages
      .slice(summaryStart, summaryEndExclusive)
      .map(removeMetadata)

    db.data.summary = await summarizeMessages(messagesToSummarize)
  }

  await db.write()
}

export const getMessages = async () => {
  const db = await getDb()
  const messages = db.data.messages.map(removeMetadata)

  const tailStart = computeTailStartIndex(messages, WINDOW_SIZE)
  return messages.slice(tailStart)
}

export const getSummary = async () => {
  const db = await getDb()
  return db.data.summary
}

export const saveToolResponse = async (
  toolCallId: string,
  toolResponse: string,
) => {
  return addMessages([
    {
      role: 'tool',
      content: toolResponse,
      tool_call_id: toolCallId,
    },
  ])
}

function computeTailStartIndex(
  messages: AIMessage[],
  keepLastN: number,
): number {
  const len = messages.length
  if (len <= keepLastN) return 0

  // Nominally keep the last N raw messages
  let tailStart = len - keepLastN

  // If the kept raw tail starts with a tool response, shift tailStart left by 1
  // so the tool response is not the first raw item (we include the message before it).
  if (messages[tailStart]?.role === 'tool') {
    tailStart = Math.max(0, tailStart - 1)
  }

  return tailStart
}
