export default defineNuxtConfig({
  modules: ["@nuxt/ui"],
  devtools: { enabled: true },
  compatibilityDate: "2024-04-03",
  ssr: false,
  colorMode: {
    preference: "light",
  },
  css: ["~/assets/css/main.css"],
  app: {
    head: {
      link: [
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossorigin: "",
        },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@400;500;700;900&family=M+PLUS+Rounded+1c:wght@500;700;800&family=DotGothic16&family=JetBrains+Mono:wght@400;600&display=swap",
        },
      ],
    },
  },
  vite: {
    optimizeDeps: {
      exclude: ["@mediapipe/tasks-vision"],
    },
  },
});
