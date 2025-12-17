import { runEval } from '../evalTools.ts'
import { ToolCallMatch } from '../scorers.ts'
import { runLLM } from '../../src/llm.ts'
import { dadJokeToolDefinition } from '../../src/tools/dadJoke.ts'
import { redditToolDefinition } from '../../src/tools/reddit.ts'
import { generateImageToolDefinition } from '../../src/tools/generateImage.ts'

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
      tools: [
        dadJokeToolDefinition,
        redditToolDefinition,
        generateImageToolDefinition,
      ],
    })
  },
  data: [
    {
      input: 'tell me a funny dad joke',
      expected: createToolCallMessage(dadJokeToolDefinition.name),
    },
    {
      input: 'tell me something interesting from reddit',
      expected: createToolCallMessage(redditToolDefinition.name),
    },
    {
      input: 'I want to see an image about Mars',
      expected: createToolCallMessage(generateImageToolDefinition.name),
    },
  ],
  scorers: [ToolCallMatch],
})
