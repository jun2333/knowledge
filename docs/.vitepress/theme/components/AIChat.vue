<script setup>
import { ref, watch } from 'vue'
import { useAIChat } from '../composables/useAIChat.ts'
import { usePanelState } from '../composables/usePanelState.js'

const { messages, isLoading, sendMessage, stopGeneration, resendMessage, clearMessages, registerStreamCallbacks } = useAIChat()
const { isBlocked, tryOpen, close: closePanel } = usePanelState('ai-chat')

const isOpen = ref(false)
const isFullscreen = ref(false)
const inputText = ref('')
const messagesContainer = ref(null)

watch(isOpen, (val) => {
  if (val) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
    closePanel()
  }
})

function openPanel() {
  if (isBlocked.value) return
  tryOpen()
  isOpen.value = true
}

function handleClose() {
  isOpen.value = false
}

// 直接 DOM 操作：通过 data 属性查找流式内容容器
let rawContent = ''

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function renderMarkdown(text) {
  // 先处理代码块
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g
  let result = text.replace(codeBlockRegex, (match, lang, code) => {
    const escapedCode = escapeHtml(code.trim())
    const borderRadius = lang ? '0 0 6px 6px' : '6px'
    const langLabel = lang ? `<div style="background: #e8e8e8; padding: 4px 12px; font-size: 12px; color: #666; border-radius: 6px 6px 0 0; font-family: var(--vp-font-family-base);">${lang}</div>` : ''
    return `${langLabel}<pre class="code-block" style="background: #fafafa; padding: 12px 16px; border-radius: ${borderRadius}; overflow-x: auto; font-size: 13px; margin: 8px 0; font-family: var(--vp-font-family-mono, monospace); border-left: 3px solid var(--vp-c-brand-1);"><code>${escapedCode}</code></pre>`
  })

  // 再处理其他 markdown 语法
  return result
    .replace(/`([^`]+)`/g, '<code class="inline-code" style="background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-size: 13px; font-family: var(--vp-font-family-mono, monospace); border: 1px solid #e0e0e0;">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>')
    .replace(/\n/g, '<br>')
}

function getStreamContentEl() {
  return messagesContainer.value?.querySelector('[data-stream-content]')
}

function getStreamSourcesEl() {
  return messagesContainer.value?.querySelector('[data-stream-sources]')
}

// 注册流式回调，直接操作 DOM
registerStreamCallbacks(
  (token) => {
    rawContent += token
    let el = getStreamContentEl()
    if (!el) {
      setTimeout(() => {
        el = getStreamContentEl()
        if (el) {
          el.innerHTML = renderMarkdown(rawContent)
          scrollToBottom()
        }
      }, 0)
      return
    }
    el.innerHTML = renderMarkdown(rawContent)
    scrollToBottom()
  },
  (sources) => {
    const el = getStreamSourcesEl()
    if (el && sources.length > 0) {
      el.innerHTML = `
        <span class="ai-chat-sources-label">参考来源:</span>
        ${sources.map((s) => {
          const href = '/' + s.source.replace(/\.md$/, '').replace(/\/index$/, '')
          return `<a href="${href}" class="ai-chat-source-tag" title="${s.source}">${s.title || s.source}</a>`
        }).join('')}
      `
    }
  },
  () => {
    const lastMsg = messages.value[messages.value.length - 1]
    if (lastMsg?.role === 'assistant') {
      lastMsg.content = rawContent
    }
    rawContent = ''
  }
)

async function handleSend() {
  const text = inputText.value.trim()
  if (!text) return
  inputText.value = ''
  rawContent = ''
  await sendMessage(text)
}

function handleKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}
</script>

<template>
  <!-- 遮罩层：放在容器外面，和 .ai-chat 是兄弟关系 -->
  <Transition name="fade">
    <div v-if="isOpen" class="ai-chat-overlay" @click="handleClose" />
  </Transition>

  <div class="ai-chat">
    <button
      v-if="!isOpen"
      class="ai-chat-trigger"
      :class="{ 'ai-chat-trigger-disabled': isBlocked }"
      @click="openPanel"
      :disabled="isBlocked"
      title="AI 知识问答"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    </button>

    <div v-if="isOpen" class="ai-chat-panel" :class="{ 'ai-chat-panel-fullscreen': isFullscreen }">
      <div class="ai-chat-header">
        <h3>AI 知识问答</h3>
        <div class="ai-chat-header-actions">
          <button class="ai-chat-btn-icon" @click="clearMessages" title="清空对话">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
          <button class="ai-chat-btn-icon" @click="isFullscreen = !isFullscreen" :title="isFullscreen ? '退出全屏' : '全屏'">
            <svg v-if="!isFullscreen" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="4 14 10 14 10 20" />
              <polyline points="20 10 14 10 14 4" />
              <line x1="14" y1="10" x2="21" y2="3" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </button>
          <button class="ai-chat-btn-icon" @click="handleClose" title="关闭">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <div ref="messagesContainer" class="ai-chat-messages">
        <div v-if="messages.length === 0" class="ai-chat-empty">
          <p>你好！我是前端知识库助手</p>
          <p>可以问我关于 JavaScript、Vue、React、CSS、性能优化等问题</p>
        </div>

        <div
          v-for="(msg, index) in messages"
          :key="index"
          class="ai-chat-message"
          :class="msg.role"
        >
          <div class="ai-chat-bubble">
            <div v-if="msg.stopped && !msg.content" class="ai-chat-stopped">
              <button
                class="ai-chat-resend-icon"
                @click="resendMessage(index)"
                title="重新发送"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
              </button>
            </div>

            <!-- 流式中的 assistant 消息：直接 DOM 操作 -->
            <div
              v-else-if="msg.role === 'assistant' && msg.streaming"
              class="ai-chat-content"
              data-stream-content
            />

            <!-- 非流式的 assistant 消息：Vue 渲染 -->
            <div
              v-else-if="msg.role === 'assistant'"
              class="ai-chat-content"
              v-html="renderMarkdown(msg.content)"
            />

            <div v-else class="ai-chat-content">{{ msg.content }}</div>

            <div v-if="msg.streaming" class="ai-chat-cursor">|</div>

            <!-- 流式来源：直接 DOM 操作 -->
            <div
              v-if="msg.streaming"
              class="ai-chat-sources"
              data-stream-sources
            />

            <!-- 非流式来源：Vue 渲染 -->
            <div v-else-if="msg.sources && msg.sources.length > 0" class="ai-chat-sources">
              <span class="ai-chat-sources-label">参考来源:</span>
              <a
                v-for="(src, i) in msg.sources"
                :key="i"
                :href="'/' + src.source.replace(/\.md$/, '').replace(/\/index$/, '')"
                class="ai-chat-source-tag"
                :title="src.source"
              >
                {{ src.title || src.source }}
              </a>
            </div>
          </div>
        </div>
      </div>

      <div class="ai-chat-input-area">
        <textarea
          v-model="inputText"
          class="ai-chat-input"
          placeholder="输入你的问题..."
          @keydown="handleKeydown"
        />
        <button
          v-if="isLoading"
          class="ai-chat-btn ai-chat-btn-stop"
          @click="stopGeneration"
        >
          停止
        </button>
        <button
          v-else
          class="ai-chat-btn ai-chat-btn-send"
          :disabled="!inputText.trim()"
          @click="handleSend"
        >
          发送
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ai-chat {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1001;
  font-family: var(--vp-font-family-base);
}

.ai-chat-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.15);
  z-index: 999;
}

.ai-chat-trigger-disabled {
  opacity: 0.4;
  cursor: not-allowed !important;
}

.ai-chat-trigger-disabled:hover {
  transform: none !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
}

.ai-chat-trigger {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: var(--vp-c-brand-1);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s, box-shadow 0.2s;
  position: relative;
  z-index: 1003;
}

.ai-chat-trigger:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.ai-chat-panel {
  width: 400px;
  height: 560px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-border);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.3s ease;
  z-index: 1002;
}

.ai-chat-panel-fullscreen {
  width: 100vw;
  height: 100vh;
  max-width: 100vw;
  max-height: 100vh;
  border-radius: 0;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 9999;
}

.ai-chat-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--vp-c-divider);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ai-chat-header h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.ai-chat-header-actions {
  display: flex;
  gap: 4px;
}

.ai-chat-btn-icon {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--vp-c-text-2);
  cursor: pointer;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ai-chat-btn-icon:hover {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}

.ai-chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ai-chat-empty {
  text-align: center;
  color: var(--vp-c-text-2);
  padding: 40px 20px;
  font-size: 14px;
  line-height: 1.6;
}

.ai-chat-message {
  display: flex;
}

.ai-chat-message.user {
  justify-content: flex-end;
}

.ai-chat-message.assistant {
  justify-content: flex-start;
}

.ai-chat-bubble {
  max-width: 85%;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.6;
  position: relative;
}

.ai-chat-message.user .ai-chat-bubble {
  background: var(--vp-c-brand-1);
  color: #fff;
  border-bottom-right-radius: 4px;
}

.ai-chat-message.assistant .ai-chat-bubble {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  border-bottom-left-radius: 4px;
}

.ai-chat-stopped {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 0;
}

.ai-chat-resend-icon {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--vp-c-text-2);
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.ai-chat-resend-icon:hover {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}

.ai-chat-cursor {
  display: inline;
  animation: blink 1s step-end infinite;
  color: var(--vp-c-brand-1);
  font-weight: bold;
}

@keyframes blink {
  50% { opacity: 0; }
}

.ai-chat-sources {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--vp-c-divider);
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  font-size: 12px;
}

.ai-chat-sources-label {
  color: var(--vp-c-text-2);
  margin-right: 4px;
}

.ai-chat-source-tag {
  display: inline-block;
  padding: 2px 8px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  border-radius: 10px;
  text-decoration: none;
  font-size: 11px;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ai-chat-source-tag:hover {
  background: var(--vp-c-brand-1);
  color: #fff;
}

.ai-chat-input-area {
  padding: 12px;
  border-top: 1px solid var(--vp-c-divider);
  display: flex;
  gap: 8px;
  align-items: center;
}

.ai-chat-input {
  flex: 1;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  resize: none;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-base);
  outline: none;
  height: 40px;
  line-height: 1.5;
  overflow: hidden;
}

.ai-chat-input:focus {
  border-color: var(--vp-c-brand-1);
}

.ai-chat-btn {
  padding: 0 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  font-weight: 500;
  white-space: nowrap;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ai-chat-btn-send {
  background: var(--vp-c-brand-1);
  color: #fff;
}

.ai-chat-btn-send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ai-chat-btn-stop {
  background: var(--vp-c-danger-1);
  color: #fff;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
