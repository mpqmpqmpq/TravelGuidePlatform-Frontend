<template>
  <nav-component search-placeholder="搜索攻略..." />
  <div class="notify-page">
    <div class="notify-container">
      <!-- 头部 -->
      <div class="notify-header">
        <div class="title-section">
          <h1><el-icon>
              <Bell />
            </el-icon> 通知中心</h1>
         
        </div>
        <div class="header-actions">
        </div>
      </div>

      <!-- 双栏布局 -->
      <div class="notify-main">
        <!-- 左侧分类菜单 -->
        <div class="notify-sidebar">
          <div v-for="menu in sidebarMenus" :key="menu.key"
            :class="['menu-item', { active: currentCategory === menu.key }]" @click="switchCategory(menu.key)">
            <el-icon>
              <component :is="menu.icon" />
            </el-icon>
            <span>{{ menu.label }}</span>
            <span v-if="getCategoryUnread(menu.key) > 0" class="badge-unread">{{ getCategoryUnread(menu.key) }}</span>
          </div>
        </div>

        <!-- 右侧通知列表 -->
        <div class="notify-list">
          <!-- 列表头部筛选 -->
          <div class="list-header">
            <div class="filter-tabs">
              <span :class="['filter-chip', { active: currentFilter === 'all' }]"
                @click="currentFilter = 'all'">全部</span>
              <span :class="['filter-chip', { active: currentFilter === 'unread' }]"
                @click="currentFilter = 'unread'">未读</span>
            </div>
            <span class="mark-all-read" @click="markAllAsRead" v-if="unreadCount > 0">
              <el-icon>
                <Check />
              </el-icon> 全部标为已读
            </span>
          </div>

          <!-- 通知列表 -->
          <div class="notif-list-body" v-loading="loading">
            <div v-if="filteredNotifications.length === 0 && !loading" class="empty-state">
              <el-empty
                :description="'暂无' + getCategoryLabel(currentCategory) + (currentFilter === 'unread' ? '未读' : '') + '通知'" />
            </div>

            <div v-for="notif in filteredNotifications" :key="notif.id"
              :class="['notification-item', { unread: !notif.read }]" @click="handleNotificationClick(notif)">
              <!-- 通知图标 -->
              <div class="notify-icon" :style="{ background: '#e8f4ff', color: getNotifColor(notif) }">
                <el-icon>
                  <component :is="getNotifIcon(notif)" />
                </el-icon>
              </div>

              <!-- 通知内容 -->
              <div class="notify-content">
                <div class="notify-title">
                  {{ getNotifTitle(notif) }}
                  <span v-if="!notif.read" class="unread-dot"></span>
                </div>
                <div class="notify-desc" v-if="notif.extraContent">{{ notif.extraContent }}</div>
                <div class="notify-time">
                  <el-icon>
                    <Clock />
                  </el-icon> {{ formatTime(notif.time) }}
                </div>
              </div>

              <!-- 操作按钮 -->
              <div class="action-btns" @click.stop>
                <button v-if="!notif.read" class="small-icon-btn" @click="markAsRead(notif)" title="标记已读">
                  <el-icon>
                    <Check />
                  </el-icon>
                </button>
                <button class="small-icon-btn" @click="deleteNotification(notif)" title="删除">
                  <el-icon>
                    <Delete />
                  </el-icon>
                </button>
              </div>
            </div>
          </div>

          <!-- 分页 -->
          <div class="notification-pagination" v-if="totalNotifications > pageSize">
            <el-pagination background layout="prev, pager, next" :total="totalNotifications" :page-size="pageSize"
              :current-page="currentPage" @current-change="handlePageChange" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';

import { ElMessage, ElMessageBox } from 'element-plus';
import axios from 'axios';
import NavComponent from "@/components/NavComponent.vue";
import {
  Check, Close, Delete, MoreFilled, Bell, Setting, Clock,
  Star, ChatDotRound, ChatLineSquare, User, Message,
  Calendar, Monitor, List, Trophy
} from '@element-plus/icons-vue';

export default {
  name: 'NotificationView',
  components: {
    NavComponent, Check, Close, Delete, MoreFilled, Bell, Setting, Clock,
    Star, ChatDotRound, ChatLineSquare, User, Message,
    Calendar, Monitor, List, Trophy
  },
  setup() {
    const router = useRouter();
    const isLoggedIn = ref(false);
    const username = ref('');
    const userAvatar = ref('');
    const currentUserId = ref('');

    const notifications = ref([]);
    const loading = ref(true);
    const currentCategory = ref('all');    // 当前选中的分类: all, comment, like, follow, private, system
    const currentFilter = ref('all');       // 当前筛选: all, unread
    const currentPage = ref(1);
    const pageSize = ref(10);
    const totalNotifications = ref(0);

    // 侧边栏菜单配置
    const sidebarMenus = [
      { key: 'all', label: '全部', icon: List },
      { key: 'comment', label: '评论', icon: ChatLineSquare },
      { key: 'like', label: '点赞', icon: Star },
      { key: 'follow', label: '关注', icon: User },
      { key: 'private', label: '私信', icon: Message },
      { key: 'system', label: '系统', icon: Monitor }
    ];

    // 通知类型对应的图标
    const notifIconMap = {
      like: Star,
      comment: ChatLineSquare,
      follow: User,
      private: Message,
      reply: ChatLineSquare,
      system: Bell,
      audit: Bell // 审核通知暂时使用系统图标
    };

    // 通知类型对应的颜色
    const notifColorMap = {
      like: '#10b981',
      comment: '#f59e0b',
      follow: '#ec489a',
      private: '#409eff',
      reply: '#f59e0b',
      system: '#409eff',
      audit: '#409eff'
    };

    // 获取分类的未读数
    const getCategoryUnread = (category) => {
      const typeMap = { comment: 2, like: 1, follow: 3, private: 5 };
      if (category === 'all') {
        return notifications.value.filter(n => !n.read).length;
      }
      if (category === 'system') {
        return notifications.value.filter(n => !n.read && n.senderId === 0).length;
      }
      return notifications.value.filter(n => !n.read && n.actionType === typeMap[category]).length;
    };

    // 获取分类的中文标签
    const getCategoryLabel = (category) => {
      const map = { all: '', comment: '评论', like: '点赞', follow: '关注', private: '私信', system: '系统' };
      return map[category] || '';
    };

    const checkLoginStatus = () => {
      let token = localStorage.getItem('token');
      if (!token) {
        token = sessionStorage.getItem('token');
        if (token) {
          localStorage.setItem('token', token);
          localStorage.setItem('userId', sessionStorage.getItem('userId') || '');
          localStorage.setItem('username', sessionStorage.getItem('username') || '');
          localStorage.setItem('userAvatar', sessionStorage.getItem('userAvatar') || '');
        }
      }
      if (token) {
        isLoggedIn.value = true;
        username.value = localStorage.getItem('username') || '';
        userAvatar.value = localStorage.getItem('userAvatar') || '';
        currentUserId.value = localStorage.getItem('userId') || '';
      } else {
        isLoggedIn.value = false;
        router.push('/login');
      }
    };

    // 获取通知列表
    const fetchNotifications = async () => {
      loading.value = true;
      try {
        const response = await axios.get('http://localhost:8080/notifications/list', {
          params: {
            pageNum: currentPage.value,
            size: pageSize.value
          }
        });
        if (response.data && response.data.code === 200) {
          const actionTypeMap = { 1: 'like', 2: 'comment', 3: 'follow', 4: 'reply', 5: 'private', 6: 'audit' };
          const targetTypeMap = { 1: 'article', 2: 'comment', 3: 'user' };

          const data = response.data.data;
          const list = data.records || data.list || [];
          const total = data.total || 0;

          notifications.value = list.map(item => {
            let extraContent = '';
            try {
              if (item.extraData && item.extraData.startsWith('{')) {
                const parsed = JSON.parse(item.extraData);
                extraContent = parsed.content || '';
              }
            } catch (e) {
              console.warn('解析通知消息失败', e);
            }
            return {
              id: item.notifId,
              actionType: item.actionType,
              type: item.senderId === 0 ? 'system' : (actionTypeMap[item.actionType] || 'system'),
              actionText: item.senderId === 0 ? (item.extraContent || '系统通知') : getActionText(item.actionType),
              extraContent: extraContent,
              senderUsername: item.senderId === 0 ? '系统通知' : (item.senderUsername || '未知用户'),
              senderAvatar: item.senderId === 0 ? 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png' : (item.senderAvatar || ''),
              time: item.createdAt,
              read: item.isRead === true || item.isRead === 1,
              targetId: item.targetId,
              targetType: targetTypeMap[item.targetType] || 'system',
              senderId: item.senderId,
              recipientId: item.recipientId
            };
          });
          totalNotifications.value = total;
        }
      } catch (error) {
        console.error('获取通知失败', error);
        ElMessage.error('获取通知失败');
      } finally {
        loading.value = false;
      }
    };

    // 根据 actionType 返回操作文案
    const getActionText = (actionType) => {
      const texts = { 1: '点赞了您的内容', 2: '评论了您的内容', 3: '关注了您', 4: '回复了您', 5: '发送了私信' };
      return texts[actionType] || '有新通知';
    };

    // 过滤后的通知列表 (按分类 + 已读未读筛选)
    const filteredNotifications = computed(() => {
      let filtered = notifications.value;
      const typeMap = { 'comment': 2, 'like': 1, 'follow': 3, 'private': 5, 'system': 0 };

      if (currentCategory.value !== 'all') {
        if (currentCategory.value === 'system') {
          filtered = filtered.filter(item => item.senderId === 0);
        } else {
          const actionType = typeMap[currentCategory.value];
          if (actionType !== undefined) {
            filtered = filtered.filter(item => item.actionType === actionType);
          }
        }
      }

      if (currentFilter.value === 'unread') {
        filtered = filtered.filter(item => !item.read);
      }

      return filtered;
    });

    // 未读总数
    const unreadCount = computed(() => {
      return notifications.value.filter(item => !item.read).length;
    });

    // 切换分类
    const switchCategory = (category) => {
      currentCategory.value = category;
      currentFilter.value = 'all';
    };

    // 切换页码
    const handlePageChange = (page) => {
      currentPage.value = page;
      fetchNotifications();
    };

    // 格式化时间
    const formatTime = (dateString) => {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMinutes < 60) {
        return `${diffMinutes}分钟前`;
      } else if (diffHours < 24) {
        return `${diffHours}小时前`;
      } else if (diffDays < 7) {
        return `${diffDays}天前`;
      } else {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      }
    };

    // 获取通知图标
    const getNotifIcon = (notif) => {
      return notifIconMap[notif.type] || Bell;
    };

    // 获取通知颜色
    const getNotifColor = (notif) => {
      return notifColorMap[notif.type] || '#409eff';
    };

    // 获取通知标题 (组装发送者 + 操作)
    const getNotifTitle = (notif) => {
      if (notif.senderId === 0) return notif.actionText;
      return `${notif.senderUsername} ${notif.actionText}`;
    };

    // 点击通知: 标记已读 + 跳转
    const handleNotificationClick = (notification) => {
      if (!notification.read) {
        markAsRead(notification);
      }

      if (notification.targetType === 'article' && notification.targetId) {
        router.push(`/article/${notification.targetId}`);
      } else if (notification.targetType === 'user' && notification.targetId) {
        router.push(`/profile/${notification.targetId}`);
      } else if (notification.targetType === 'comment' && notification.targetId) {
        const articleId = notification.targetId.split('-')[1];
        router.push(`/article/${articleId}#comment-${notification.targetId}`);
      } else if (notification.type === 'private' || notification.actionType === 5) {
        router.push('/messages');
      }
    };

    // 标记单条已读
    const markAsRead = async (notification) => {
      try {
        await axios.put(`http://localhost:8080/notifications/${notification.id}/read`);
        notification.read = true;
      } catch (error) {
        console.error('标记已读失败', error);
        ElMessage.error('标记已读失败');
      }
    };

    // 标记单条未读 (保留功能, 原型中未直接展示)
    const markAsUnread = async (notification) => {
      try {
        await axios.put(`http://localhost:8080/notifications/${notification.id}/unread`);
        notification.read = false;
      } catch (error) {
        console.error('标记未读失败', error);
        ElMessage.error('标记未读失败');
      }
    };

    // 全部标为已读
    const markAllAsRead = async () => {
      try {
        await axios.put('http://localhost:8080/notifications/read-all');
        notifications.value.forEach(item => {
          item.read = true;
        });
        localStorage.setItem('clearNotificationDot', Date.now().toString());
        ElMessage.success('已全部标为已读');
      } catch (error) {
        console.error('标记全部已读失败', error);
        ElMessage.error('标记全部已读失败');
      }
    };

    // 删除通知
    const deleteNotification = async (notification) => {
      try {
        ElMessageBox.confirm('确定要删除这条通知吗？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(async () => {
          await axios.delete(`http://localhost:8080/notifications/${notification.id}`);
          const index = notifications.value.findIndex(item => item.id === notification.id);
          if (index !== -1) {
            notifications.value.splice(index, 1);
          }
          ElMessage.success('删除成功');
        }).catch(() => { });
      } catch (error) {
        console.error('删除通知失败', error);
        ElMessage.error('删除通知失败');
      }
    };



    onMounted(() => {
      checkLoginStatus();
      fetchNotifications();
    });

    return {
      isLoggedIn, username, userAvatar,
      notifications, filteredNotifications, loading,
      currentCategory, currentFilter, currentPage, pageSize, totalNotifications,
      sidebarMenus, unreadCount,
      getCategoryUnread, getCategoryLabel,
      switchCategory, handlePageChange,
      formatTime, getNotifIcon, getNotifColor, getNotifTitle,
      handleNotificationClick,
      markAsRead, markAsUnread, markAllAsRead, deleteNotification,

    };
  }
};
</script>

<style scoped>
/* ===== 页面布局 ===== */
.notify-page {
  min-height: 100vh;
  background: linear-gradient(145deg, #f4f7fc 0%, #eef2f8 100%);
  padding: 2rem 1.5rem 3rem;
}

/* ===== 主容器 ===== */
.notify-container {
  max-width: 1280px;
  margin: 0 auto;
  background: #ffffff;
  border-radius: 2rem;
  box-shadow: 0 20px 35px -12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

/* ===== 头部 ===== */
.notify-header {
  padding: 1.2rem 2rem;
  background: white;
  border-bottom: 1px solid #ecf3fa;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.title-section h1 {
  font-size: 1.6rem;
  font-weight: 800;
  background: linear-gradient(135deg, #1e293b, #2d3a5e);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.title-section p {
  font-size: 0.8rem;
  color: #5b6e8c;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 0.8rem;
}

.btn-outline-sm {
  background: transparent;
  border: 1px solid #cbd5e1;
  border-radius: 2rem;
  padding: 0.5rem 1rem;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: 0.2s;
  color: #475569;
}

.btn-outline-sm:hover {
  background: #f1f5f9;
  color: #409eff;
  border-color: #409eff;
}

/* ===== 双栏布局 ===== */
.notify-main {
  display: flex;
  flex-wrap: wrap;
}

.notify-sidebar {
  flex: 0 0 240px;
  background: #fefefe;
  border-right: 1px solid #ecf3fa;
  padding: 1.5rem 0;
}

.notify-list {
  flex: 1;
  background: white;
  padding: 1.5rem 1.8rem;
  min-width: 0;
}

/* ===== 侧边栏菜单 ===== */
.menu-item {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.8rem 1.8rem;
  margin: 0.2rem 0;
  cursor: pointer;
  transition: all 0.2s;
  border-left: 3px solid transparent;
  color: #475569;
  font-weight: 500;
}

.menu-item .el-icon {
  width: 1.4rem;
  font-size: 1.1rem;
}

.menu-item.active {
  background: #e8f4ff;
  border-left-color: #409eff;
  color: #409eff;
  font-weight: 600;
}

.menu-item:hover:not(.active) {
  background: #f8fafc;
}

.badge-unread {
  background: #ef4444;
  color: white;
  border-radius: 30px;
  padding: 0 0.5rem;
  font-size: 0.7rem;
  line-height: 1.4;
  margin-left: auto;
  flex-shrink: 0;
}

/* ===== 列表头部 ===== */
.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.filter-tabs {
  display: flex;
  gap: 0.8rem;
}

.filter-chip {
  background: #f1f5f9;
  border-radius: 30px;
  padding: 0.3rem 1rem;
  font-size: 0.8rem;
  cursor: pointer;
  transition: 0.2s;
  user-select: none;
}

.filter-chip.active {
  background: #409eff;
  color: white;
}

.mark-all-read {
  font-size: 0.8rem;
  color: #409eff;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.mark-all-read:hover {
  color: #409eff;
}

/* ===== 通知列表 ===== */
.notif-list-body {
  min-height: 200px;
}

.notification-item {
  display: flex;
  gap: 1rem;
  padding: 1rem 0;
  border-bottom: 1px solid #ecf3fa;
  transition: background 0.1s;
  cursor: pointer;
}

.notification-item:hover {
  background: #fafbfc;
  margin: 0 -0.5rem;
  padding: 1rem 0.5rem;
  border-radius: 0.5rem;
}

.notification-item.unread {
  background: #fefce8;
  margin: 0 -0.5rem;
  padding: 1rem 0.5rem;
  border-radius: 1rem;
}

/* ===== 通知图标 ===== */
.notify-icon {
  width: 48px;
  height: 48px;
  background: #e8f4ff;
  border-radius: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #409eff;
  font-size: 1.2rem;
  flex-shrink: 0;
}

/* ===== 通知内容 ===== */
.notify-content {
  flex: 1;
  min-width: 0;
}

.notify-title {
  font-weight: 700;
  font-size: 0.95rem;
  margin-bottom: 0.2rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  color: #1e293b;
}

.notify-desc {
  font-size: 0.85rem;
  color: #475569;
  margin-bottom: 0.3rem;
  line-height: 1.4;
}

.notify-time {
  font-size: 0.7rem;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.notify-time .el-icon {
  font-size: 0.7rem;
}

.unread-dot {
  width: 8px;
  height: 8px;
  background: #ef4444;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}

/* ===== 操作按钮 ===== */
.action-btns {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-shrink: 0;
}

.small-icon-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0.3rem;
  border-radius: 0.3rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.small-icon-btn:hover {
  color: #409eff;
  background: #f1f5f9;
}

/* ===== 空状态 ===== */
.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 3rem 1rem;
}

/* ===== 分页 ===== */
.notification-pagination {
  margin-top: 1.5rem;
  display: flex;
  justify-content: center;
}

/* ===== 响应式 ===== */
@media (max-width: 780px) {
  .notify-page {
    padding: 1rem;
  }

  .notify-sidebar {
    flex: 0 0 100%;
    border-right: none;
    border-bottom: 1px solid #ecf3fa;
    padding: 0.5rem 0;
    display: flex;
    overflow-x: auto;
  }

  .menu-item {
    padding: 0.6rem 1rem;
    white-space: nowrap;
    border-left: none;
    border-bottom: 3px solid transparent;
  }

  .menu-item.active {
    border-left-color: transparent;
    border-bottom-color: #409eff;
  }

  .badge-unread {
    margin-left: 0.3rem;
  }

  .notify-list {
    padding: 1.2rem;
  }

  .notify-header {
    padding: 1rem 1.2rem;
  }
}
</style>
