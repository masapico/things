ビルド時の出力先はこのディレクトリ

    npm run build

vite.config.ts の outDir を 'pocketbase/pb_public' に設定しています

    import { defineConfig } from 'vite'
    import react from '@vitejs/plugin-react'
    import { tanstackRouter } from '@tanstack/router-plugin/vite'

    // https://vite.dev/config/
    export default defineConfig({
      plugins: [
        tanstackRouter({
          target: 'react',
          autoCodeSplitting: true,
        }),
        react()
      ],
      build: {
        outDir: 'pocketbase/pb_public',
      },
    })
