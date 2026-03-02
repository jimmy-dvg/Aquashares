import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        feed: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'login.html'),
        register: resolve(__dirname, 'register.html'),
        postCreate: resolve(__dirname, 'post-create.html'),
        chat: resolve(__dirname, 'chat.html'),
        giveaway: resolve(__dirname, 'giveaway.html'),
        exchange: resolve(__dirname, 'exchange.html'),
        postDetail: resolve(__dirname, 'post-detail.html'),
        profile: resolve(__dirname, 'profile.html'),
        admin: resolve(__dirname, 'admin.html')
      }
    }
  }
});