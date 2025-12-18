import { Index as UpstashIndex } from '@upstash/vector'

export class VectorClient {
  private static client: UpstashIndex | null

  static getClient(): UpstashIndex {
    if (!this.client) {
      this.client = new UpstashIndex({
        url: process.env.UPSTASH_VECTOR_REST_URL as string,
        token: process.env.UPSTASH_VECTOR_REST_TOKEN as string,
      })
    }
    return this.client
  }
}

export default VectorClient.getClient()
