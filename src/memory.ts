import { JSONFilePreset } from 'lowdb/node'
import type { AIMessage } from '../types'
import { v4 as uuidv4 } from 'uuid'
import { summarizeMessages } from './llm.ts'

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

export const addMessages = async (messages: AIMessage[]) => {
  const db = await getDb()
  db.data.messages.push(...messages.map(addMetadata))

  if (db.data.messages.length >= 10) {
    const oldestMessages = db.data.messages.slice(0, 5).map(removeMetadata)
    db.data.summary = await summarizeMessages(oldestMessages)
  }

  await db.write()
}

export const getMessages = async () => {
  const db = await getDb()
  const messages = db.data.messages.map(removeMetadata)
  const lastFive = messages.slice(-5)

  // if the first message is a tool response, get one more message before it
  if (lastFive[0]?.role === 'tool') {
    const sixthMessage = messages[messages.length - 6]
    if (sixthMessage) {
      return [sixthMessage, ...lastFive]
    }
  }

  return lastFive
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

export const getSummary = async () => {
  const db = await getDb()
  return db.data.summary
}
