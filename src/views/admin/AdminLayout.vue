<template>
  <div class="admin-layout">
    <el-container>
      <el-aside :width="isCollapse ? '64px' : '220px'">
        <div class="logo-area">
          <el-icon v-if="isCollapse" class="logo-icon">
            <DataLine />
          </el-icon>
          <span v-else class="logo-text">旅游管理</span>
        </div>
        <el-button class="collapse-btn" :icon="isCollapse ? Expand : Fold" @click="isCollapse = !isCollapse" text />
        <el-menu :default-active="$route.path" class="admin-menu" router :collapse="isCollapse"
          :collapse-transition="false">
          <el-menu-item index="/admin/dashboards">
            <el-icon>
              <DataLine />
            </el-icon>
            <template #title>控制台</template>
          </el-menu-item>
          <el-menu-item index="/admin/articles">
            <el-icon>
              <Document />
            </el-icon>
            <template #title>攻略审核</template>
          </el-menu-item>
          <el-menu-item index="/admin/comments">
            <el-icon>
              <ChatDotSquare />
            </el-icon>
            <template #title>评论审核</template>
          </el-menu-item>
          <el-menu-item index="/admin/users">
            <el-icon>
              <User />
            </el-icon>
            <template #title>用户管理</template>
          </el-menu-item>
          <el-menu-item index="/admin/categories">
            <el-icon>
              <Files />
            </el-icon>
            <template #title>分类管理</template>
          </el-menu-item>
          <el-menu-item index="/admin/tags">
            <el-icon>
              <PriceTag />
            </el-icon>
            <template #title>标签管理</template>
          </el-menu-item>
          <el-menu-item index="/admin/scenic-spots">
            <el-icon>
              <LocationFilled />
            </el-icon>
            <template #title>景点管理</template>
          </el-menu-item>
          <el-menu-item index="/admin/destinations">
            <el-icon>
              <Place />
            </el-icon>
            <template #title>目的地管理</template>
          </el-menu-item>
          <el-menu-item index="/admin/monitor">
            <el-icon>
              <Monitor />
            </el-icon>
            <template #title>系统监控</template>
          </el-menu-item>
          <el-menu-item index="/admin/admin-info">
            <el-icon>
              <Setting />
            </el-icon>
            <template #title>管理员信息</template>
          </el-menu-item>
        </el-menu>
      </el-aside>
      <el-container>
        <el-header>
          <div class="admin-header">
            <div class="header-left">
              <h2>旅游攻略平台管理系统</h2>
            </div>
            <div class="header-right">
              <el-dropdown @command="handleCommand">
                <span class="admin-user-info">
                  <el-avatar :size="36" :src="userAvatar" class="user-avatar">
                    <el-icon>
                      <User />
                    </el-icon>
                  </el-avatar>
                  <span class="username">{{ username }}</span>
                  <el-icon class="dropdown-arrow">
                    <ArrowDown />
                  </el-icon>
                </span>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="profile">
                      <el-icon>
                        <User />
                      </el-icon>个人中心
                    </el-dropdown-item>
                    <el-dropdown-item command="settings">
                      <el-icon>
                        <Setting />
                      </el-icon>系统设置
                    </el-dropdown-item>
                    <el-dropdown-item divided command="logout">
                      <el-icon>
                        <SwitchButton />
                      </el-icon>退出登录
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </el-header>
        <el-main>
          <router-view :key="$route.fullPath" />
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { DataLine, Document, ChatDotSquare, User, Files, Setting, Monitor, LocationFilled, ArrowDown, SwitchButton, Fold, Expand, PriceTag, Place } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const router = useRouter()
const username = ref(localStorage.getItem('username') || '管理员')
const userAvatar = ref(localStorage.getItem('userAvatar'))
const isCollapse = ref(false)

const handleCommand = (command) => {
  if (command === 'logout') {
    handleLogout()
  } else if (command === 'profile') {
    router.push('/admin/admin-info')
  } else if (command === 'settings') {
    ElMessage.info('功能开发中')
  }
}

const handleLogout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  localStorage.removeItem('userId');
  localStorage.removeItem('userAvatar');
  localStorage.removeItem('role');
  ElMessage.success('已退出登录');
  router.push('/login')
}
</script>

<style scoped>
.admin-layout {
  height: 100vh;
}

.el-aside {
  background: #e8e0d5;
  color: #303133;
  transition: width 0.3s ease;
  overflow: hidden;
}

.logo-area {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid #d5cdc0;
}

.logo-icon {
  font-size: 28px;
  color: #4a6b82;
}

.logo-text {
  font-size: 18px;
  font-weight: 600;
  color: #4a6b82;
  letter-spacing: 1px;
}

.collapse-btn {
  width: 100%;
  color: #4a6b82;
  border-radius: 0;
  border: none;
  background: transparent;
}

.collapse-btn:hover {
  background: rgba(74, 107, 130, 0.08);
}

.admin-menu {
  height: calc(100% - 100px);
  border-right: none;
  background: transparent;
}

:deep(.el-menu-item) {
  color: #5a6670;
  margin: 4px 8px;
  border-radius: 8px;
  transition: all 0.3s ease;
}

:deep(.el-menu-item:hover) {
  background: rgba(74, 107, 130, 0.08);
  color: #4a6b82;
}

:deep(.el-menu-item.is-active) {
  background: #d5cdc0;
  color: #4a6b82;
  box-shadow: none;
}

:deep(.el-menu--collapse .el-menu-item) {
  margin: 4px;
  justify-content: center;
}

.el-header {
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 0;
}

.admin-header {
  height: 64px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
}

.header-left h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.header-right {
  display: flex;
  align-items: center;
}

.admin-user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.admin-user-info:hover {
  background: #f5f7fa;
}

.user-avatar {
  background: linear-gradient(135deg, #1a3345 0%, #0d2137 100%);
}

.username {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.dropdown-arrow {
  color: #909399;
  font-size: 12px;
}

.el-main {
  background: #f0f2f5;
  padding: 20px;
  min-height: calc(100vh - 64px);
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}
</style>