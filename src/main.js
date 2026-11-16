import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css';
import globalConfig from './config/global';

// 配置axios请求拦截器
axios.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// 添加axios错误拦截器（统一处理登录过期）
let isRedirecting = false;
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      const status = error.response.status;

      // 未授权或禁止访问：清空登录状态并跳转登录页
      if (status === 401 || status === 403) {
        if (!isRedirecting) {
          isRedirecting = true;
          // 清理本地登录信息
          localStorage.removeItem('token');
          localStorage.removeItem('userName');
          localStorage.removeItem('userId');
          localStorage.removeItem('userAvatar');
          localStorage.removeItem('role');
          ElMessage.warning('登录已过期，请重新登录');
          router.push('/login').finally(() => {
            // 防止重复跳转
            setTimeout(() => { isRedirecting = false; }, 1000);
          });
        }
      } else {
        // 其他错误统一提示
        ElMessage.error(error.response.data?.message || '请求失败');
      }
    } else if (error.request) {
      ElMessage.error('无法连接到服务器，请检查网络连接');
    } else {
      ElMessage.error('请求配置错误');
    }
    return Promise.reject(error);
  }
);

const app = createApp(App)

// 使用 ElementPlus 插件
app.use(store)
app.use(router)
app.use(ElementPlus)

// 全局注册 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 全局注册 QuillEditor
app.component('QuillEditor', QuillEditor)

app.mount('#app')

// 监听通知弹窗
store.subscribe((mutation, state) => {
  console.log('📡 [App] store mutation:', mutation.type, state.newNotification);
  if (mutation.type === 'setNewNotification' && state.newNotification) {
    const notification = state.newNotification;
    const actionTypes = { 1: '点赞', 2: '评论', 3: '关注', 4: '回复', 5: '私信' };
    const actionText = actionTypes[notification.actionType] || '通知';
    ElMessage({
      message: `您收到一条新的${actionText}`,
      type: 'info',
      duration: 3000,
      onClose: () => {
        store.commit('setNewNotification', null);
      }
    });
  }
});

// 初始化全局配置
globalConfig.token = sessionStorage.getItem('token') || '';
globalConfig.userId = sessionStorage.getItem('userId') || '';
globalConfig.username = sessionStorage.getItem('username') || '';
globalConfig.userAvatar = sessionStorage.getItem('userAvatar') || '';