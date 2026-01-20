<template>
  <Layout>
    <template #layout-bottom>
      <HighlightManager />
      <HighlightNav />
    </template>
  </Layout>
</template>

<script setup lang="ts">
import DefaultTheme from "vitepress/theme";
import HighlightManager from "./HighlightManager.vue";
import HighlightNav from "./HighlightNav.vue";

const { Layout } = DefaultTheme;
</script>
