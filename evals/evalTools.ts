import 'dotenv/config'
import type { Score, Scorer } from 'autoevals'
import chalk from 'chalk'
import { JSONFilePreset } from 'lowdb/node'

type Run = {
  input: any
  output: any
  expected: any
  scores: {
    name: Score['name']
    score: Score['score']
  }[]
  createdAt?: string
}

type Set = {
  runs: Run[]
  score: number
  createdAt: string
}

// You need an experiment to track historical reference of how you improving the system
type Experiment = {
  name: string // an unique name that you're testing
  sets: Set[]
}

type Data = {
  experiments: Experiment[]
}

const defaultData: Data = {
  experiments: [],
}

const getDb = async () => {
  const db = await JSONFilePreset<Data>('results.json', defaultData)
  return db
}

const calculateAvgScore = (runs: Run[]) => {
  const totalScores = runs.reduce((sum, run) => {
    const runAvg =
      run.scores.reduce((sum, score) => sum + score.score, 0) /
      run.scores.length
    return sum + runAvg
  }, 0)
  return totalScores / runs.length
}

export const loadExperiment = async (
  experimentName: string,
): Promise<Experiment | undefined> => {
  const db = await getDb()
  return db.data.experiments.find((e) => e.name === experimentName)
}

export const saveSet = async (
  experimentName: string,
  runs: Omit<Run, 'createdAt'>[],
) => {
  const db = await getDb()

  const runsWithTimestamp = runs.map((run) => ({
    ...run,
    createdAt: new Date().toISOString(),
  }))

  const newSet = {
    runs: runsWithTimestamp,
    score: calculateAvgScore(runsWithTimestamp),
    createdAt: new Date().toISOString(),
  }

  const existingExperiment = db.data.experiments.find(
    (e) => e.name === experimentName,
  )

  if (existingExperiment) {
    existingExperiment.sets.push(newSet)
  } else {
    db.data.experiments.push({
      name: experimentName,
      sets: [newSet],
    })
  }

  await db.write()
}

/**
 * The runEval function is used to run an evaluation experiment by calling it
 * with an experiment name, task, data, and scoring mechanism to test
 * the performance of a system, such as checking if an AI can correctly use a specific tool.
 *
 * The key components are:
 *
 * - an experiment name,
 * - a task (an async function that takes an input),
 * - data (with input and expected output),
 * - and scorers to evaluate the performance of the task.
 *
 * If multiple data objects are provided,
 * the evaluation will be run once for each data object.
 * The final score is calculated as the average performance across
 * all runs of the experiment.
 *
 *
 * @param experiment the unique name of what you're testing
 * @param task  some async function, it can be anything that gives back a result
 * @param data an array of inputs and expected outputs with a reference that where you get the data from
 * @param scorers an array of metrics that you want to score with the inputs and expected data.
 * You can use sophisticated solutions like Levenshtein distance or just checking that this called the right tool or not.
 */
export const runEval = async <T = any>(
  experiment: string,
  {
    task,
    data,
    scorers,
  }: {
    task: (input: any) => Promise<T>
    data: { input: any; expected?: T; reference?: string | string[] }[]
    scorers: Scorer<T, any>[]
  },
) => {
  const results = await Promise.all(
    data.map(async ({ input, expected, reference }) => {
      const results = await task(input)
      let context: string | string[]
      let output: string

      if (results.context) {
        context = results.context
        output = results.response
      } else {
        output = results
      }

      const scores = await Promise.all(
        scorers.map(async (scorer) => {
          const score = await scorer({
            input,
            output: results,
            expected,
            reference,
            context,
          })
          return {
            name: score.name,
            score: score.score,
          }
        }),
      )

      const result = {
        input,
        output,
        expected,
        scores,
      }

      return result
    }),
  )

  const previousExperiment = await loadExperiment(experiment)
  const previousScore =
    previousExperiment?.sets[previousExperiment.sets.length - 1]?.score || 0
  const currentScore = calculateAvgScore(results)
  const scoreDiff = currentScore - previousScore

  const color = previousExperiment
    ? scoreDiff > 0
      ? chalk.green
      : scoreDiff < 0
        ? chalk.red
        : chalk.blue
    : chalk.blue

  console.log(`Experiment: ${experiment}`)
  console.log(`Previous score: ${color(previousScore.toFixed(2))}`)
  console.log(`Current score: ${color(currentScore.toFixed(2))}`)
  console.log(
    `Difference: ${scoreDiff > 0 ? '+' : ''}${color(scoreDiff.toFixed(2))}`,
  )
  console.log()

  await saveSet(experiment, results)

  return results
}
