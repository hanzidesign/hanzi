import { APIClient } from 'openai/core'
import { Images, Chat } from 'openai/resources/index'
import type { ClientOptions } from 'openai'
import type { DefaultQuery, FinalRequestOptions, Headers } from 'openai/core'

export default class OpenAI extends APIClient {
  apiKey: string

  private _options: ClientOptions

  constructor({ apiKey, ...opts }: ClientOptions = {}) {
    if (apiKey === undefined) {
      throw new Error('no apiKey')
    }

    const options: ClientOptions = {
      apiKey,
      ...opts,
      baseURL: opts.baseURL ?? `https://api.openai.com/v1`,
    }

    super({
      baseURL: options.baseURL!,
      timeout: options.timeout ?? 600000 /* 10 minutes */,
      httpAgent: options.httpAgent,
      maxRetries: options.maxRetries,
      fetch: options.fetch,
    })
    this._options = options

    this.apiKey = apiKey
  }

  images: Images = new Images(this as any)

  chat: Chat = new Chat(this as any)

  protected override defaultQuery(): DefaultQuery | undefined {
    return this._options.defaultQuery
  }

  protected override defaultHeaders(opts: FinalRequestOptions): Headers {
    return {
      ...super.defaultHeaders(opts),
      ...this._options.defaultHeaders,
    }
  }

  protected override authHeaders(opts: FinalRequestOptions): Headers {
    return { Authorization: `Bearer ${this.apiKey}` }
  }
}
