<script setup>
import DefaultTheme from 'vitepress/theme'
import AnnotationSystem from './components/AnnotationSystem.vue'

const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <template #layout-bottom>
      <AnnotationSystem />
    </template>
  </Layout>
</template>
