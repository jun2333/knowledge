<script setup>
import DefaultTheme from 'vitepress/theme'
import AnnotationSystem from './components/AnnotationSystem.vue'
import AIChat from './components/AIChat.vue'

const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <template #layout-bottom>
      <AnnotationSystem />
      <AIChat />
    </template>
  </Layout>
</template>
