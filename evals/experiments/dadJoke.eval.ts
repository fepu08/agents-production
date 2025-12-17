import { runEval } from '../evalTools.ts'
import { ToolCallMatch } from '../scorers.ts'
import { runLLM } from '../../src/llm.ts'
import { dadJokeToolDefinition } from '../../src/tools/dadJoke.ts'

const createToolCallMessage = (toolName: string) => ({
  role: 'assistant',
  tool_calls: [
    {
      type: 'function',
      function: { name: toolName },
    },
  ],
})

runEval('dadJoke', {
  task: (input) => {
    return runLLM({
      messages: [{ role: 'user', content: input }],
      tools: [dadJokeToolDefinition],
    })
  },
  data: [
    {
      input: 'tell me a funny dad joke',
      expected: createToolCallMessage(dadJokeToolDefinition.name),
    },
    {
      input: 'what about something from reddit?',
      expected: createToolCallMessage(dadJokeToolDefinition.name),
    },
  ],
  scorers: [ToolCallMatch],
})
