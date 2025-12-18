import client from './vectorClient'

// Initialize upstash Vector Client
const index = client

type MovieMetadata = {
  rank?: string
  title?: string
  genre?: string
  description?: string
  director?: string
  actors?: string
  year?: string
  runtime?: string
  rating?: string
  votes?: string
  revenue?: string
  metascore?: string
}

export const queryMovies = async (
  query: string,
  filters?: Partial<MovieMetadata>,
  topK: number = 5,
) => {
  // Build filter string if filters provided
  let filterStr = ''
  if (filters) {
    const filterParts = Object.entries(filters)
      .filter(([_, value]) => value !== undefined)
      .map(([key, values]) => `${key}=${values}`)

    if (filterParts.length > 0) {
      filterStr = filterParts.join(' AND ')
    }
  }

  // Query the vector store
  return await index.query({
    data: query,
    topK,
    filter: filterStr || undefined,
    includeMetadata: true,
    includeData: true,
  })
}
