export default defineNuxtConfig({
  modules: ["@nuxt/ui", "@nuxt/eslint"],
  devtools: { enabled: true },
  compatibilityDate: "2024-04-03",
  ssr: false,
  vite: {
    optimizeDeps: {
      exclude: ["@mediapipe/tasks-vision"],
    },
  },
});
