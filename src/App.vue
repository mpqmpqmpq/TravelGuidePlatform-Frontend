<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script>
import { onMounted } from 'vue';
import { useStore } from 'vuex';

export default {
  name: 'App',
  setup() {
    const store = useStore();

    onMounted(() => {
      const token = localStorage.getItem('token');
      if (token && !store.state.stompClient) {
        console.log('App mounted, init WebSocket');
        try {
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(window.atob(base64));
          store.commit('setCurrentUserId', payload.userId);
        } catch (e) {
          console.error('解析token失败:', e);
        }

        store.dispatch('initWebSocket').catch(err => {
          console.error('WebSocket init failed:', err);
        });
      }
    });
  }
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

nav {
  padding: 0;
  height: 0;
}

nav a {
  font-weight: bold;
  color: #2c3e50;
}

nav a.router-link-exact-active {
  color: #42b983;
}
</style>
