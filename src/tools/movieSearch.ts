import type { ToolFn } from '../../types'
import { z } from 'zod'
import { queryMovies } from '../rag/query'

export const queryMoviesToolDefinition = {
  name: 'movie_search',
  parameters: z.object({
    query: z.string().describe('Query used for vector search on movies'),
    genre: z.string().optional().describe('Filter movies by genre'),
    director: z.string().optional().describe('Filter movies by director'),
    year: z
      .object({
        operator: z.enum(['<=', '>=', '<', '>']),
        value: z.number(),
      })
      .optional()
      .describe('Filter movies by director'),
  }),
  description:
    'Searches for movies and information about them, including title, year, genre, costs, director, actor and more',
}

type Args = z.infer<typeof queryMoviesToolDefinition.parameters>

export const movieSearch: ToolFn<Args, string> = async ({
  userMessage,
  toolArgs,
}) => {
  const { query, genre, director, year } = toolArgs

  const filters = {
    ...(genre && { genre }),
    ...(director && { director }),
    ...(year && { year }),
  }

  let results
  try {
    results = await queryMovies(query, filters)
  } catch (error) {
    console.error(error)
    return 'Error: Failed to query movies'
  }

  const formattedResults = results.map((result) => ({
    title: result.metadata?.title,
    year: result.metadata?.year,
    genre: result.metadata?.genre,
    director: result.metadata?.director,
    actors: result.metadata?.actors,
    rating: result.metadata?.rating,
    description: result.metadata?.description,
  }))

  return JSON.stringify(formattedResults, null, 2)
}
