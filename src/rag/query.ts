import client from './vectorClient'

// Initialize upstash Vector Client
const index = client

type MovieMetadata = {
  rank?: number
  title?: string
  genre?: string
  description?: string
  director?: string
  actors?: string
  year?: number
  runtime?: number
  rating?: number
  votes?: number
  revenue?: number
  metascore?: number
}

type ComparisonOperator = '<=' | '>=' | '<' | '>'

type ComparisonFilter = {
  operator: ComparisonOperator
  value: number
}

type MovieQueryFilters = Partial<
  Omit<
    MovieMetadata,
    'year' | 'rank' | 'runtime' | 'rating' | 'votes' | 'revenue' | 'metascore'
  >
> & {
  // allow comparison filters for numeric fields (optional)
  year?: ComparisonFilter
  rank?: ComparisonFilter
  runtime?: ComparisonFilter
  rating?: ComparisonFilter
  votes?: ComparisonFilter
  revenue?: ComparisonFilter
  metascore?: ComparisonFilter
}

export const queryMovies = async (
  query: string,
  filters?: MovieQueryFilters,
  topK: number = 5,
) => {
  // Build filter string if filters provided
  let filterStr = ''
  if (filters) {
    const filterParts = Object.entries(filters)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => {
        if (typeof value === 'string') {
          if (Number.isNaN(Number(value))) {
            return `${key}='${value}'`
          }
          return `${key}=${value}`
        }

        const { operator, value: operand } = value
        return `${key}${operator}${operand}`
      })

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
