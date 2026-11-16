<template>
  <div class="nav-header">
    <div class="nav-left">
      <div class="logo-area">
        <div class="logo-icon">
          <el-icon><Location /></el-icon>
        </div>
        <span class="logo-text">旅迹攻略</span>
      </div>
      <div class="nav-links">
        <router-link to="/" class="nav-link" :class="{ 'active': $route.path === '/' }">首页</router-link>
        <router-link to="/articles" class="nav-link" :class="{ 'active': $route.path.includes('/articles') || $route.path.includes('/hot-articles') }">攻略</router-link>
        <router-link to="/destinations" class="nav-link" :class="{ 'active': $route.path === '/destinations' }">目的地</router-link>
        <router-link to="/spots" class="nav-link" :class="{ 'active': $route.path === '/spots' }">景点</router-link>
        <router-link to="/routes" class="nav-link" :class="{ 'active': $route.path.includes('/routes') }">行程规划</router-link>
        <router-link to="/chat" class="nav-link" :class="{ 'active': $route.path === '/chat' }">攻略助手</router-link>
      </div>
    </div>

    <div class="nav-right">
      <!-- 搜索框 -->
      <div class="search-bar-container">
        <el-icon class="search-icon"><Search /></el-icon>
        <input 
          type="text" 
          :placeholder="searchPlaceholder" 
          class="search-input"
          v-model="searchKeyword"
          @keyup.enter="handleSearch"
        >
      </div>

      <div class="header-right">
        <!-- 登录/注册区域 -->
        <div class="auth-buttons" v-if="!isLoggedIn">
          <router-link to="/login" class="auth-button login-button">登录</router-link>
          <router-link to="/register" class="auth-button register-button">
            <el-icon><User /></el-icon>
            注册
          </router-link>
        </div>

        <!-- 用户信息区域 -->
        <div class="user-profile" v-else>
          <el-badge :is-dot="true" :hidden="unreadNotificationCount === 0">
            <el-icon class="notification-icon" @click="goToNotifications">
              <Bell />
            </el-icon>
          </el-badge>
          <el-dropdown trigger="click" placement="bottom-end">
            <div class="avatar-wrapper">
              <img :src="userAvatar" class="user-avatar" :alt="username">
              <span class="username" v-if="username">{{ username }}</span>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="goToProfile">
                  <el-icon><User /></el-icon>
                  我的主页
                </el-dropdown-item>
                <el-dropdown-item @click="goToArticleEdit">
                  <el-icon><Edit /></el-icon>
                  写攻略
                </el-dropdown-item>
                <el-dropdown-item @click="goToMessages">
                  <el-icon><Message /></el-icon>
                  私信
                </el-dropdown-item>
                <el-dropdown-item @click="goToNotifications">
                  <el-icon><Bell /></el-icon>
                  通知
                </el-dropdown-item>
                <el-dropdown-item divided @click="handleLogout">
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { ElMessage, ElDropdown, ElDropdownMenu, ElDropdownItem, ElIcon, ElBadge } from 'element-plus';
import axios from 'axios';
import {
  Location, Search, User, Bell, Edit, Message, SwitchButton
} from '@element-plus/icons-vue';

export default {
  name: 'NavComponent',
  components: {
    ElDropdown, ElDropdownMenu, ElDropdownItem, ElIcon, ElBadge,
    Location, Search, User, Bell, Edit, Message, SwitchButton
  },
  props: {
    searchPlaceholder: {
      type: String,
      default: '搜索攻略...'
    }
  },
  setup() {
    const router = useRouter();
    const store = useStore();
    const isLoggedIn = ref(false);
    const username = ref('');
    const userAvatar = ref('');
    const unreadNotificationCount = ref(0);
    const searchKeyword = ref('');

    // 搜索处理
    const handleSearch = () => {
      if (searchKeyword.value.trim()) {
        router.push({
          path: '/search',
          query: { keyword: searchKeyword.value.trim() }
        });
      }
    };

    // 检查登录状态
    const checkLoginStatus = () => {
      const token = localStorage.getItem('token');
      const storedUsername = localStorage.getItem('username');
      const userId = localStorage.getItem('userId');

      console.log(' 检查登录状态:', {
        hasToken: !!token,
        username: storedUsername,
        userId: userId
      });

      isLoggedIn.value = !!token;
      username.value = storedUsername || '';
      userAvatar.value = localStorage.getItem('userAvatar') || '/default-avatar.png';
      
      if (token) {
        fetchUnreadNotificationCount();
      }
    };
    
    // 获取未读通知数量
    const fetchUnreadNotificationCount = async () => {
      try {
        const response = await axios.get('http://localhost:8080/notifications/list', {
          params: { pageNum: 1, size: 100 }
        });
        if (response.data && response.data.code === 200) {
          const data = response.data.data;
          const list = data.records || data.list || [];
          const unreadCount = list.filter(item => !item.isRead).length;
          unreadNotificationCount.value = unreadCount;
        }
      } catch (error) {
        console.error('获取未读通知数量失败', error);
      }
    };

    // 跳转至个人主页
    const goToProfile = () => {
      const userId = localStorage.getItem('userId');
      if (userId) {
        router.push(`/profile/${userId}`);
      } else {
        ElMessage.warning('请先登录');
        router.push('/login');
      }
    };

    // 跳转至写攻略页面
    const goToArticleEdit = () => {
      router.push('/article/edit');
    };

    // 跳转至消息页面
    const goToMessages = () => {
      if (isLoggedIn.value) {
        router.push('/messages');
      } else {
        ElMessage.warning('请先登录');
        router.push('/login');
      }
    };

    // 跳转至通知页面
    const goToNotifications = () => {
      if (isLoggedIn.value) {
        unreadNotificationCount.value = 0;
        router.push('/notifications');
      } else {
        ElMessage.warning('请先登录');
        router.push('/login');
      }
    };

    // 退出登录
    const handleLogout = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          await axios.get('http://localhost:8080/auth/userLogout', {
            headers: { Authorization: token }
          });
        }
      } catch (error) {
        console.error('后端登出请求失败', error);
      }

      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('userId');
      localStorage.removeItem('userAvatar');
      localStorage.removeItem('role');

      isLoggedIn.value = false;
      username.value = '';
      userAvatar.value = '';
      unreadNotificationCount.value = 0;

      ElMessage.success('已退出登录');
      router.push('/login');
    };

    // 监听存储事件，实现跨组件通信
    const handleStorageChange = (e) => {
      console.log(' 监听到 storage 事件:', e.key, e.newValue);
      if (e.key === 'token' || e.key === 'username' || e.key === 'userId' || e.key === null) {
        setTimeout(() => {
          checkLoginStatus();
        }, 100);
      }
      if (e.key === 'hasNewNotification') {
        unreadNotificationCount.value++;
        localStorage.removeItem('hasNewNotification');
      }
    };

    // 组件挂载时检查登录状态
    onMounted(() => {
      console.log('NavComponent 已挂载');
      checkLoginStatus();
      window.addEventListener('storage', handleStorageChange);
      window.addEventListener('user-info-updated', checkLoginStatus);
      
      // 监听 Vuex 中的新通知，显示红点
      store.subscribe((mutation) => {
        console.log('mutation:', mutation.type);
        if (mutation.type === 'setNewNotification' && mutation.payload) {
          unreadNotificationCount.value++;
        }
        if (mutation.type === 'clearNotificationDot') {
          unreadNotificationCount.value = 0;
        }
      });
      
      // 监听清除红点事件
      window.addEventListener('storage', (e) => {
        console.log(' storage event:', e.key);
        if (e.key === 'clearNotificationDot') {
          unreadNotificationCount.value = 0;
          localStorage.removeItem('clearNotificationDot');
        }
      });
      
      // 监听通知已读事件
      window.addEventListener('notificationRead', () => {
        unreadNotificationCount.value = 0;
      });
    });

    // 组件卸载时移除监听器
    onUnmounted(() => {
      console.log(' NavComponent 已卸载');
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('user-info-updated', checkLoginStatus);
    });

    return {
      isLoggedIn,
      username,
      userAvatar,
      unreadNotificationCount,
      searchKeyword,
      handleSearch,
      goToProfile,
      goToArticleEdit,
      goToMessages,
      goToNotifications,
      handleLogout,
      checkLoginStatus
    };
  }
};
</script>



<style scoped>

.nav-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 40px;
  background: white;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  border-bottom: 1px solid #eef2f6;
  position: sticky;
  top: 0;
  z-index: 100;
  width: 100%;
  max-width: 1800px;
  margin: 0 auto;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.logo-area {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-icon {
  width: 40px;
  height: 40px;
  background: #3b6e9c;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
}

.logo-text {
  font-size: 20px;
  font-weight: 700;
  color: #1f2b38;
}

.nav-links {
  display: flex;
  gap: 32px;
  align-items: center;
  flex-shrink: 0;
}

.nav-link {
  text-decoration: none;
  color: #2f3e4e;
  font-size: 15px;
  font-weight: 500;
  padding: 8px 0;
  position: relative;
  transition: all 0.3s;
  white-space: nowrap;
}

.nav-link.active {
  color: #1d7a9c;
  font-weight: 600;
}

.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: #1d7a9c;
  border-radius: 2px;
}

.nav-link:hover {
  color: #1d7a9c;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 24px;
}

/* 搜索栏 */
.search-bar-container {
  display: flex;
  background: #f1f4f8;
  border-radius: 40px;
  padding: 8px 16px;
  margin-left: auto;
  margin-right: 20px;
  width: 260px;
  border: 1px solid #e0e7ed;
  transition: all 0.3s;
  flex-shrink: 0;
}

.search-bar-container:focus-within {
  border-color: #3b6e9c;
  box-shadow: 0 0 0 3px rgba(59, 110, 156, 0.1);
}

.search-icon {
  color: #8b9aab;
  font-size: 16px;
  margin-right: 8px;
  display: flex;
  align-items: center;
}

.search-input {
  border: none;
  background: transparent;
  outline: none;
  flex-grow: 1;
  font-size: 14px;
  color: #2f3e4e;
}

.search-input::placeholder {
  color: #8b9aab;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-shrink: 0;
}

.notification-icon {
  font-size: 22px;
  color: #3b5e7a;
  transition: all 0.3s;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 30px;
}

.notification-icon:hover {
  color: #1d7a9c;
  transform: scale(1.1);
}

/* 登录注册按钮 */
.auth-buttons {
  display: flex;
  gap: 12px;
  align-items: center;
}

.auth-button {
  color: #3b6e9c;
  border: 1px solid #3b6e9c;
  padding: 8px 20px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.3s;
  background: white;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.auth-button:hover {
  background: rgba(59, 110, 156, 0.08);
  transform: translateY(-1px);
}

.register-button {
  background: linear-gradient(135deg, #3b6e9c, #2d5a7f);
  color: white;
  border: none;
}

.register-button:hover {
  background: linear-gradient(135deg, #2d5a7f, #1f4a6f);
  box-shadow: 0 4px 12px rgba(59, 110, 156, 0.3);
  transform: translateY(-1px);
}

/* 用户头像 */
.user-profile .avatar-wrapper {
  display: flex;
  align-items: center;
  cursor: pointer;
  gap: 10px;
  padding: 6px 14px;
  border-radius: 24px;
  transition: all 0.3s;
}

.user-profile .avatar-wrapper:hover {
  background: #f1f4f8;
}

.user-profile .user-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
  object-fit: cover;
}

.user-profile .username {
  color: #1f2b38;
  font-weight: 500;
  font-size: 14px;
}

/* 响应式 */
@media (max-width: 1024px) {
  .nav-header {
    padding: 16px 24px;
  }
}

@media (max-width: 768px) {
  .nav-header {
    flex-wrap: wrap;
    padding: 12px 24px;
  }

  .nav-left {
    flex-wrap: wrap;
    gap: 16px;
  }

  .nav-links {
    gap: 16px;
  }

  .nav-right {
    width: 100%;
    margin-top: 12px;
  }

  .search-bar-container {
    width: 100%;
    order: 3;
  }
}
.user-profile{
  display: flex;
  align-items: center;
  float: right;
  width: 300px;
}
@media (max-width: 480px) {
  .logo-text {
    font-size: 18px;
  }

  .logo-icon {
    width: 36px;
    height: 36px;
    font-size: 18px;
  }

  .nav-links {
    display: none;
  }
}
</style>
