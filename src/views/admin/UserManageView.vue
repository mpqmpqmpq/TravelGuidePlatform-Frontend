<template>
  <div class="user-manage">
    <div class="header">
      <h2>用户管理</h2>
      <el-button @click="fetchUserList" style="margin-left: 10px;">
        <el-icon>
          <Refresh />
        </el-icon>
        刷新
      </el-button>
    </div>

    <!-- 用户列表 -->
    <el-card class="table-card" v-loading="loading">
      <div class="table-header">
        <div class="table-title">
          <el-icon>
            <User />
          </el-icon>
          <span>用户列表</span>
          <el-tag size="small" type="info">{{ total }} 人</el-tag>
        </div>
        <div class="table-actions">
          <el-input v-model="searchKeyword" placeholder="搜索用户名/邮箱" clearable style="width: 200px"
            @keyup.enter="handleSearch">
            <template #prefix><el-icon>
                <Search />
              </el-icon></template>
          </el-input>
          <el-button type="primary" @click="handleSearch">
            <el-icon>
              <Search />
            </el-icon>搜索
          </el-button>
          <el-button @click="fetchUserList">
            <el-icon>
              <Refresh />
            </el-icon>刷新
          </el-button>
        </div>
      </div>
      <el-table :data="userList" style="width: 100%" :max-height="tableMaxHeight">
        <el-table-column prop="userId" label="ID" width="70" />
        <el-table-column prop="userName" label="用户名" min-width="120">
          <template #default="{ row }">
            <div class="user-name-cell">
              <el-avatar :size="32" :src="row.avatarUrl">{{ row.userName?.charAt(0) }}</el-avatar>
              <span>{{ row.userName }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="email" label="邮箱" min-width="180" />
        <el-table-column prop="role" label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="getRoleType(row.role)" size="small" effect="light">
              {{ getRoleText(row.role) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="isActive" label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.isActive)" size="small" :effect="row.isActive === 1 ? 'light' : 'plain'">
              {{ getStatusText(row.isActive) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="bio" label="个人简介" min-width="150" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="创建时间" width="170">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <div class="table-actions">
              <el-tooltip content="编辑" placement="top">
                <el-button type="primary" size="small" circle @click="handleEdit(row)">
                  <el-icon>
                    <Edit />
                  </el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip :content="row.isActive === 1 ? '禁用' : '启用'" placement="top">
                <el-button :type="row.isActive === 1 ? 'warning' : 'success'" size="small" circle
                  @click="row.isActive === 1 ? handleDisable(row) : handleEnable(row)">
                  <el-icon>
                    <Lock />
                  </el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="查看详情" placement="top">
                <el-button type="info" size="small" circle @click="handleView(row)">
                  <el-icon>
                    <View />
                  </el-icon>
                </el-button>
              </el-tooltip>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 分页 -->
    <div class="pagination">
      <el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize" :page-sizes="[10, 20, 50, 100]"
        :total="total" layout="total, sizes, prev, pager, next, jumper" @size-change="handleSizeChange"
        @current-change="handleCurrentChange" />
    </div>

    <!-- 编辑用户对话框 -->
    <el-dialog v-model="editDialogVisible" title="编辑用户" width="600px">
      <el-form :model="editForm" label-width="100px">
        <el-form-item label="头像">
          <el-avatar :size="64" :src="editForm.avatarUrl">{{ editForm.userName?.charAt(0) }}</el-avatar>
        </el-form-item>
        <el-form-item label="用户名" required>
          <el-input v-model="editForm.userName" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="邮箱" required>
          <el-input v-model="editForm.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="editForm.role" placeholder="请选择角色" style="width: 100%">
            <el-option label="普通用户" value="user" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="editForm.isActive" placeholder="请选择状态" style="width: 100%">
            <el-option label="激活" :value="1" />
            <el-option label="禁用" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item label="个人简介">
          <el-input v-model="editForm.bio" type="textarea" :rows="4" placeholder="请输入个人简介" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="editDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleUpdateUser">确认</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Search, Edit, Lock, View, User } from '@element-plus/icons-vue'

const router = useRouter()
const searchKeyword = ref('')

// 响应式数据
const loading = ref(false)
const userList = ref([])
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 表格最大高度
const tableMaxHeight = computed(() => {
  return window.innerHeight - 280
})

// 编辑相关
const editDialogVisible = ref(false)
const editForm = ref({
  userId: null,
  userName: '',
  email: '',
  role: 'user',
  isActive: 1,
  bio: ''
})

// 检查登录状态
const checkLoginStatus = () => {
  const token = localStorage.getItem('token')
  if (!token) {
    ElMessage.error('请先登录')
    router.push('/login')
    return false
  }
  return true
}

// 检查管理员权限
const checkAdminPermission = () => {
  const token = localStorage.getItem('token')

  if (!token) {
    ElMessage.error('请先登录')
    router.push('/login')
    return
  }

  // 根据需要可以添加角色检查逻辑
}

// 获取用户列表
const fetchUserList = async () => {
  loading.value = true
  try {
    const response = await axios.get('http://localhost:8080/user/getUserList', {
      params: {
        pageNum: currentPage.value,
        size: pageSize.value
      },
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    if (response.data.code === 200) {
      const data = response.data.data
      userList.value = data.list || []
      total.value = data.total || 0
      console.log('用户列表数据:', userList.value)
    } else {
      ElMessage.error(response.data.msg || '获取用户列表失败')
      userList.value = []
      total.value = 0
    }
  } catch (error) {
    console.error('获取用户列表失败:', error)
    ElMessage.error('获取用户列表失败，请稍后重试')
    userList.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

// 编辑用户
const handleEdit = (row) => {
  editForm.value = {
    userId: row.userId,
    userName: row.userName,
    email: row.email,
    role: row.role || 'user',
    isActive: row.isActive !== undefined ? row.isActive : 1,
    bio: row.bio || '',
    avatarUrl: row.avatarUrl || ''
  }
  editDialogVisible.value = true
}

// 更新用户
const handleUpdateUser = async () => {
  if (!editForm.value.userName || !editForm.value.email) {
    ElMessage.warning('用户名和邮箱不能为空')
    return
  }

  try {
    const response = await axios.post('http://localhost:8080/user/adminUpdate', editForm.value, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.data.code === 200) {
      ElMessage.success('更新成功')
      editDialogVisible.value = false
      fetchUserList()
    } else {
      ElMessage.error(response.data.msg || '更新失败')
    }
  } catch (error) {
    console.error('更新失败:', error)
    ElMessage.error('更新失败，请稍后重试')
  }
}

// 禁用用户
const handleDisable = async (row) => {
  ElMessageBox.confirm(
    '确定要禁用该用户吗？禁用后该用户将无法登录',
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(async () => {
    try {
      const response = await axios.delete(`http://localhost:8080/user/deleteUserById/${row.userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.data.code === 200) {
        ElMessage.success('禁用成功')
        fetchUserList()
      } else {
        ElMessage.error(response.data.msg || '禁用失败')
      }
    } catch (error) {
      console.error('禁用失败:', error)
      ElMessage.error('禁用失败，请稍后重试')
    }
  }).catch(() => { })
}

// 启用用户
const handleEnable = async (row) => {
  ElMessageBox.confirm(
    '确定要启用该用户吗？启用后该用户可以正常登录',
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(async () => {
    try {
      const response = await axios.put('http://localhost:8080/user/updateUserIsActive', null, {
        params: {
          id: row.userId
        },
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.data.code === 200) {
        ElMessage.success('启用成功')
        fetchUserList()
      } else {
        ElMessage.error(response.data.msg || '启用失败')
      }
    } catch (error) {
      console.error('启用失败:', error)
      ElMessage.error('启用失败，请稍后重试')
    }
  }).catch(() => { })
}

// 分页处理
const handleSizeChange = (val) => {
  pageSize.value = val
  currentPage.value = 1
  fetchUserList()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  fetchUserList()
}

const handleSearch = () => {
  currentPage.value = 1
  fetchUserList()
}

const handleView = (row) => {
  editForm.value = {
    userId: row.userId,
    userName: row.userName,
    email: row.email,
    role: row.role || 'user',
    isActive: row.isActive !== undefined ? row.isActive : 1,
    bio: row.bio || '',
    avatarUrl: row.avatarUrl || ''
  }
  editDialogVisible.value = true
}

// 工具函数
const getRoleType = (role) => {
  const roleMap = {
    'admin': 'danger',
    'user': 'success'
  }
  return roleMap[role] || 'info'
}

const getRoleText = (role) => {
  const roleMap = {
    'admin': '管理员',
    'user': '普通用户'
  }
  return roleMap[role] || role
}

const getStatusType = (isActive) => {
  return isActive === 1 ? 'success' : 'danger'
}

const getStatusText = (isActive) => {
  return isActive === 1 ? '激活' : '禁用'
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

// 初始化
onMounted(() => {
  checkLoginStatus()
  checkAdminPermission()
  fetchUserList()
})
</script>

<style scoped>
.user-manage {
  padding: 20px;
  height: 100%;
  min-height: calc(100vh - 80px);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-shrink: 0;
}

.header h2 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #303133;
}

.table-card {
  border-radius: 12px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.table-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.table-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.user-name-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: center;
  flex-shrink: 0;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.table-actions {
  display: flex;
  gap: 6px;
  justify-content: center;
  align-items: center;
}
</style>
