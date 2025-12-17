import { runEval } from '../evalTools.ts'
import { ToolCallMatch } from '../scorers.ts'
import { redditToolDefinition } from '../../src/tools/reddit.ts'
import { runLLM } from '../../src/llm.ts'

const createToolCallMessage = (toolName: string) => ({
  role: 'assistant',
  tool_calls: [
    {
      type: 'function',
      function: { name: toolName },
    },
  ],
})

runEval('reddit', {
  task: (input) => {
    return runLLM({
      messages: [{ role: 'user', content: input }],
      tools: [redditToolDefinition],
    })
  },
  data: [
    {
      input: 'get the latest posts from reddit',
      expected: createToolCallMessage(redditToolDefinition.name),
    },
    {
      input: 'what are the nba news?',
      expected: createToolCallMessage(redditToolDefinition.name),
    },
  ],
  scorers: [ToolCallMatch],
})
