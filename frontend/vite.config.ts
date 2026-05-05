import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // ローカル開発時: Functionsエミュレーター(port 7071)へプロキシ
      "/api": {
        target: "http://localhost:7071",
        changeOrigin: true,
      },
    },
  },
});
