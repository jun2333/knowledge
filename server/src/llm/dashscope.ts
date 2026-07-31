import { ChatOpenAI } from '@langchain/openai'
import { config } from '../config/index.js'

export function createChatModel(options?: { streaming?: boolean }) {
  return new ChatOpenAI({
    model: config.chatModel,
    apiKey: config.dashscopeApiKey,
    configuration: { baseURL: config.dashscopeBaseUrl },
    streaming: options?.streaming ?? true,
    temperature: 0.7,
  })
}
