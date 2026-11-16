<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <div class="header-content">
        <div class="header-text">
          <h1>管理员控制台</h1>
          <p>欢迎回来，<span class="admin-name">{{ adminName }}</span>！祝您今天工作顺利</p>
        </div>
        
      </div>
    </div>

    <div class="stats-grid">
      <el-card v-for="(stat, index) in statsData" :key="index" class="stat-card"
        :style="{ '--delay': index * 0.1 + 's' }">
        <div class="stat-content">
          <div class="stat-icon" :class="stat.iconClass">
            <el-icon :size="28">
              <component :is="stat.icon" />
            </el-icon>
          </div>
          <div class="stat-info">
            <h3 class="stat-number">{{ stat.value }}</h3>
            <p class="stat-label">{{ stat.label }}</p>
          </div>

        </div>
      </el-card>
    </div>

    <div class="main-content">
      <div class="quick-actions">
        <div class="section-header">
          <h2><el-icon>
              <Operation />
            </el-icon>快速操作</h2>
          <el-button text type="primary" @click="refreshQuickActions">
            <el-icon>
              <RefreshRight />
            </el-icon>刷新
          </el-button>
        </div>
        <div class="action-grid">
          <el-card v-for="(action, index) in quickActions" :key="index" class="action-card" :class="action.type"
            @click="handleAction(action)">
            <div class="action-content">
              <div class="action-icon" :class="action.type">
                <el-icon :size="28">
                  <component :is="action.icon" />
                </el-icon>
              </div>
              <div class="action-info">
                <span class="action-label">{{ action.label }}</span>
              </div>
            </div>
          </el-card>
        </div>
      </div>


    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  User, Document, Warning, ChatDotSquare, Files,
  Operation, RefreshRight,
  Setting, LocationFilled, Tickets, TrendCharts, Key
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const router = useRouter()
const adminName = ref(localStorage.getItem('username') || '管理员')

const stats = reactive({
  totalUsers: 0,
  totalArticles: 0,
  pendingReviews: 0,
  totalComments: 0
})

const statsData = computed(() => [
  { value: stats.totalUsers, label: '总用户数', icon: User, iconClass: 'user-icon' },
  { value: stats.totalArticles, label: '总攻略数', icon: Document, iconClass: 'article-icon' },
  { value: stats.pendingReviews, label: '待审核', icon: Warning, iconClass: 'review-icon' },
  { value: stats.totalComments, label: '总评论数', icon: ChatDotSquare, iconClass: 'comment-icon' }
])

const quickActions = ref([
  { label: '攻略审核', icon: Document, type: 'primary', route: '/admin/articles' },
  { label: '用户管理', icon: User, type: 'success', route: '/admin/users' },
  { label: '评论审核', icon: ChatDotSquare, type: 'warning', route: '/admin/comments' },
  { label: '分类管理', icon: Files, type: 'info', route: '/admin/categories' },
  { label: '景点管理', icon: LocationFilled, type: 'purple', route: '/admin/scenic-spots' },
  { label: '系统监控', icon: Setting, type: 'dark', route: '/admin/monitor' },
  { label: '标签管理', icon: Tickets, type: 'cyan', route: '/admin/tags' },
  { label: '数据报表', icon: TrendCharts, type: 'orange', route: '/admin/reports' },
  { label: '权限管理', icon: Key, type: 'teal', route: '/admin/roles' }
])

const loadStats = async () => {
  try {
    const [userRes, articleRes, pendingRes, commentRes] = await Promise.all([
      axios.get('http://localhost:8080/user/getAllUserNumber'),
      axios.get('http://localhost:8080/article/getArticleNumber'),
      axios.get('http://localhost:8080/article/getArticlePage', { params: { pageNum: 1, size: 10} }),
      axios.get('http://localhost:8080/comments/getCommentNumber')
    ])

    if (userRes.data.code === 200) stats.totalUsers = userRes.data.data
    if (articleRes.data.code === 200) stats.totalArticles = articleRes.data.data
    if (pendingRes.data.code === 200) stats.pendingReviews = pendingRes.data.data.total
    if (commentRes.data.code === 200) stats.totalComments = commentRes.data.data
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

const handleAction = (action) => {
  router.push(action.route)
}

const refreshQuickActions = async () => {
  ElMessage.success('刷新成功')
  await loadStats()
}

onMounted(async () => {
  await loadStats()
})
</script>

<style scoped>
.dashboard {
  padding: 20px;
  min-height: 100vh;
  background: #f0f2f5;
}

.dashboard-header {
  background: #fff;
  padding: 28px 32px;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  margin-bottom: 24px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-text h1 {
  margin: 0 0 8px 0;
  color: #000;
  font-size: 26px;
  font-weight: 600;
}

.header-text p {
  margin: 0;
  color: #333;
  font-size: 15px;
}

.admin-name {
  font-weight: 600;
  color: #000;
}



.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: none;
  overflow: hidden;
  background: #fff;
}

.stat-card :deep(.el-card__body) {
  background: #fff;
  border-radius: 12px;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.stat-icon.user-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-icon.article-icon {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-icon.review-icon {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}

.stat-icon.comment-icon {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-info {
  flex: 1;
}

.stat-number {
  margin: 0 0 4px 0;
  font-size: 28px;
  font-weight: 700;
  color: #303133;
}

.stat-label {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.main-content {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}

@media (max-width: 1200px) {
  .main-content {
    grid-template-columns: 1fr;
  }
}

.quick-actions,
.recent-activity {
  background: #fff;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h2 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  color: #303133;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.action-card {
  border-radius: 12px;
  border: none;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: transparent;
}

.action-card :deep(.el-card__body) {
  background: transparent;
  border-radius: 12px;
}

.action-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}

.action-content {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px;
}

.action-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.action-icon.primary {
  background: linear-gradient(135deg, #409eff 0%, #3375d9 100%);
}

.action-icon.success {
  background: linear-gradient(135deg, #67c23a 0%, #529b2e 100%);
}

.action-icon.warning {
  background: linear-gradient(135deg, #e6a23c 0%, #c78c1a 100%);
}

.action-icon.info {
  background: linear-gradient(135deg, #909399 0%, #73767a 100%);
}

.action-icon.purple {
  background: linear-gradient(135deg, #b37feb 0%, #9255d9 100%);
}

.action-icon.dark {
  background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);
}

.action-icon.cyan {
  background: linear-gradient(135deg, #36cfc9 0%, #21a39d 100%);
}

.action-icon.orange {
  background: linear-gradient(135deg, #f5a623 0%, #d4891a 100%);
}

.action-icon.teal {
  background: linear-gradient(135deg, #5c6bc0 0%, #3f51b5 100%);
}

.action-info {
  flex: 1;
}

.action-label {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.activity-card {
  border: none;
  box-shadow: none;
}

.activity-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.activity-desc {
  color: #606266;
  font-size: 14px;
}
</style>
