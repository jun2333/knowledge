import { ref, shallowRef } from 'vue'

export interface ChatSource {
  source: string
  title: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  sources?: ChatSource[]
  streaming?: boolean
  stopped?: boolean
}

const API_BASE = 'http://localhost:3000'

export function useAIChat() {
  const messages = ref<ChatMessage[]>([])
  const isLoading = ref(false)
  const abortController = shallowRef<AbortController | null>(null)

  // 流式内容直接更新回调，绕过 Vue 响应式
  let onToken: ((token: string) => void) | null = null
  let onSources: ((sources: ChatSource[]) => void) | null = null
  let onDone: (() => void) | null = null

  async function sendMessage(content: string) {
    if (!content.trim() || isLoading.value) return

    messages.value.push({ role: 'user', content })

    const assistantMsg: ChatMessage = {
      role: 'assistant',
      content: '',
      streaming: true,
    }
    messages.value.push(assistantMsg)
    isLoading.value = true

    abortController.value = new AbortController()

    try {
      const history = messages.value
        .slice(0, -2)
        .map((m) => ({ role: m.role, content: m.content }))

      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content, history }),
        signal: abortController.value.signal,
      })

      if (!response.ok) {
        const lastMsg = messages.value[messages.value.length - 1]
        if (lastMsg?.role === 'assistant') {
          lastMsg.content = `请求失败 (${response.status})`
          lastMsg.streaming = false
        }
        isLoading.value = false
        return
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const json = JSON.parse(line.slice(6))
            if (json.type === 'sources') {
              const lastMsg = messages.value[messages.value.length - 1]
              if (lastMsg?.role === 'assistant') {
                lastMsg.sources = json.data
              }
              onSources?.(json.data)
            } else if (json.type === 'token') {
              onToken?.(json.data)
            } else if (json.type === 'done') {
              onDone?.()
              const lastMsg = messages.value[messages.value.length - 1]
              if (lastMsg?.role === 'assistant') {
                lastMsg.streaming = false
              }
            } else if (json.type === 'error') {
              const lastMsg = messages.value[messages.value.length - 1]
              if (lastMsg?.role === 'assistant') {
                lastMsg.content = `错误: ${json.data}`
                lastMsg.streaming = false
              }
            }
          } catch {
            // skip malformed SSE lines
          }
        }
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        const lastMsg = messages.value[messages.value.length - 1]
        if (lastMsg?.role === 'assistant') {
          lastMsg.content = '连接失败，请检查服务器是否启动'
          lastMsg.streaming = false
        }
      }
    } finally {
      isLoading.value = false
    }
  }

  function stopGeneration() {
    abortController.value?.abort()
    const lastMsg = messages.value[messages.value.length - 1]
    if (lastMsg?.role === 'assistant') {
      lastMsg.streaming = false
      lastMsg.stopped = true
    }
    isLoading.value = false
  }

  function resendMessage(index: number) {
    const userMsg = messages.value[index - 1]
    if (userMsg?.role === 'user') {
      messages.value.splice(index, 1)
      sendMessage(userMsg.content)
    }
  }

  function clearMessages() {
    messages.value = []
  }

  function registerStreamCallbacks(
    tokenCb: (token: string) => void,
    sourcesCb: (sources: ChatSource[]) => void,
    doneCb: () => void
  ) {
    onToken = tokenCb
    onSources = sourcesCb
    onDone = doneCb
  }

  return { messages, isLoading, sendMessage, stopGeneration, resendMessage, clearMessages, registerStreamCallbacks }
}
