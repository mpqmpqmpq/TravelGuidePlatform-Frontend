<template>
  <div class="user-switcher">
    <el-dropdown @command="handleCommand" :disabled="isProcessing">
      <span class="el-dropdown-link">
        <el-avatar 
          v-if="currentUser" 
          :src="currentUser.avatar" 
          size="small" 
          class="user-avatar"
        ></el-avatar>
        {{ currentUsername }}<i class="el-icon-arrow-down el-icon--right"></i>
      </span>
      <template #dropdown>
        <el-dropdown-menu>
          <template v-if="users.length > 0">
            <el-dropdown-item 
              v-for="user in users" 
              :key="user.id"
              :command="{ type: 'switch', userId: user.id }"
              :class="{ 'active-user': user.id === activeUserId }"
            >
              <el-avatar :src="user.avatar" size="mini" class="item-avatar"></el-avatar>
              <span class="username">{{ user.username }}</span>
            </el-dropdown-item>
          </template>
          <el-dropdown-item v-else disabled>暂无登录账号</el-dropdown-item>
          <el-dropdown-item divided command="login">
            <i class="el-icon-plus"></i> 添加账号
          </el-dropdown-item>
          <el-dropdown-item 
            command="logout" 
            :disabled="users.length === 0"
          >
            <i class="el-icon-logout"></i> 退出当前账号
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script>
import { computed, ref } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { ElMessageBox, ElMessage } from 'element-plus';

export default {
  name: 'UserSwitcher',
  setup() {
    const store = useStore();
    const router = useRouter();
    const isProcessing = ref(false); // 防止重复操作
    
    const users = computed(() => store.getters.getUsers);
    const activeUserId = computed(() => store.getters.getActiveUserId);
    const currentUser = computed(() => 
      users.value.find(u => u.id === activeUserId.value)
    );
    const currentUsername = computed(() => {
      return currentUser.value ? currentUser.value.username : '未登录';
    });
    
    const handleCommand = async (command) => {
      if (isProcessing.value) return;
      isProcessing.value = true;
      
      try {
        if (typeof command === 'object' && command.type === 'switch') {
          // 切换用户时添加加载状态
          await store.dispatch('switchUser', command.userId);
          ElMessage.success('已切换账号');
        } else if (command === 'login') {
          // 记录当前页面地址，登录后可返回
          const returnUrl = window.location.pathname;
          router.push({ path: '/login', query: { returnUrl } });
        } else if (command === 'logout') {
          // 退出前确认
          await ElMessageBox.confirm(
            '确定要退出当前账号吗？',
            '确认退出',
            {
              confirmButtonText: '确定',
              cancelButtonText: '取消',
              type: 'warning'
            }
          );
          
          await store.dispatch('logoutUser');
          ElMessage.success('已退出当前账号');
          
          if (store.getters.getUsers.length === 0) {
            router.push('/login');
          }
        }
      } catch (error) {
        // 捕获取消操作的错误，不提示
        if (error !== 'cancel') {
          ElMessage.error('操作失败，请重试');
          console.error(error);
        }
      } finally {
        isProcessing.value = false;
      }
    };
    
    return {
      users,
      activeUserId,
      currentUser,
      currentUsername,
      handleCommand,
      isProcessing
    };
  }
};
</script>

<style scoped>
.user-switcher {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-avatar {
  vertical-align: middle;
}

.el-dropdown-link {
  display: flex;
  align-items: center;
  gap: 6px;
}

.active-user {
  font-weight: bold;
  color: #409EFF;
}

.item-avatar {
  margin-right: 8px;
  vertical-align: middle;
}

.username {
  vertical-align: middle;
}

/* 禁用状态样式优化 */
:deep(.el-dropdown-item.is-disabled) {
  color: #c0c4cc !important;
  cursor: not-allowed;
}
</style>