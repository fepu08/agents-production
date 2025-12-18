import 'dotenv/config'
import { Index as UpstashIndex } from '@upstash/vector'
import fs from 'fs'
import { parse } from 'csv-parse/sync'
import { z } from 'zod'
import * as path from 'node:path'
import ora from 'ora'

const MovieRecordSchema = z.object({
  Rank: z.string(),
  Title: z.string(),
  Genre: z.string(),
  Description: z.string(),
  Director: z.string(),
  Actors: z.string(),
  Year: z.string(),
  Runtime: z.string(),
  Rating: z.string(),
  Votes: z.string(),
  Revenue: z.string(),
  Metascore: z.string(),
})

type MovieRecord = z.infer<typeof MovieRecordSchema>

const CSV_FILE_PATH = path.join(process.cwd(), 'src/rag/imdb_movie_dataset.csv')

// Initialize upstash vector client
const index = new UpstashIndex({
  url: process.env.UPSTASH_VECTOR_REST_URL as string,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN as string,
})

// function to index IMDB movie data
export async function indexMovieData() {
  const spinner = ora('Reading movie data...').start()

  const records = parseMovieRecords()

  spinner.text = 'Starting movie indexing...'

  for (const [index, movie] of records.entries()) {
    const percentage = calculateProgress(index, records.length)
    spinner.text = `Indexing movie data ${movie.Title}...
    ${percentage}% (${index}/${records.length})`
    await upsertMovie(movie, spinner)
  }

  spinner.succeed('Indexing complete!')
}

function parseMovieRecords(): MovieRecord[] {
  try {
    const csvData = fs.readFileSync(CSV_FILE_PATH, 'utf-8')
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      on_record: (record) => {
        return {
          ...record,
          Runtime: record['Runtime (Minutes)'],
          Revenue: record['Revenue (Millions)'],
        }
      },
    })

    return z.array(MovieRecordSchema).parse(records)
  } catch (err) {
    console.error('Failed to parse movie records:', err)
    return []
  }
}

async function upsertMovie(movie: MovieRecord, spinner: any) {
  const text = `${movie.Title}. ${movie.Genre}. ${movie.Description}`
  try {
    await index.upsert({
      id: movie.Title, // Using Title as unique ID
      data: text, // Text will be automatically embedded
      metadata: {
        title: movie.Title,
        year: Number(movie.Year),
        genre: movie.Genre,
        director: movie.Director,
        actors: movie.Actors,
        rating: Number(movie.Rating),
        votes: Number(movie.Votes),
        revenue: Number(movie.Revenue),
        metascore: Number(movie.Metascore),
      },
    })
  } catch (error) {
    spinner.fail(`Error indexing movie ${movie.Title}`)
    console.error(error)
  }
}

function calculateProgress(index: number, length: number) {
  return ((index / length) * 100).toFixed(0)
}

indexMovieData()
