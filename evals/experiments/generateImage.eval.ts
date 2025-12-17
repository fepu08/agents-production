import { runEval } from '../evalTools.ts'
import { ToolCallMatch } from '../scorers.ts'
import { runLLM } from '../../src/llm.ts'
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

// We are not generating the actual image
// we just check if the LLM tells to run this function

runEval('dadJoke', {
  task: (input) => {
    return runLLM({
      messages: [{ role: 'user', content: input }],
      tools: [generateImageToolDefinition],
    })
  },
  data: [
    {
      input: 'generate me an image about a cat',
      expected: createToolCallMessage(generateImageToolDefinition.name),
    },
    {
      input: 'I want to see an image about Saturn',
      expected: createToolCallMessage(generateImageToolDefinition.name),
    },
    /*
    {
      // do you expect the agent to create an image for this input?
      input: 'take a photo of the sunset',
      expected: createToolCallMessage(generateImageToolDefinition.name),
    },
    */
  ],
  scorers: [ToolCallMatch],
})
