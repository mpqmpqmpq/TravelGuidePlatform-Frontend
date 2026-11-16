<template>
  <div class="admin-info">
    <div class="info-header">
      <h1>管理员信息</h1>
    </div>

    <el-row :gutter="20">
      <!-- 个人信息卡片 -->
      <el-col :span="12">
        <el-card class="info-card">
          <template #header>
            <div class="card-header">
              <span>个人信息</span>
            </div>
          </template>
          <div class="info-content">
            <div class="avatar-section">
              <el-avatar :size="100" :src="adminInfo.avatar" />
            </div>
            <el-descriptions :column="1" border class="info-desc">
              <el-descriptions-item label="用户名">{{ adminInfo.username }}</el-descriptions-item>
              <el-descriptions-item label="邮箱">{{ adminInfo.email || '未设置' }}</el-descriptions-item>
              <el-descriptions-item label="角色">
                <el-tag type="primary">管理员</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="上次登录">{{ adminInfo.lastLoginTime || '-' }}</el-descriptions-item>
            </el-descriptions>
          </div>
        </el-card>
      </el-col>

      <!-- 修改密码卡片 -->
      <el-col :span="12">
        <el-card class="password-card">
          <template #header>
            <div class="card-header">
              <span>修改密码</span>
            </div>
          </template>
          <el-form ref="passwordFormRef" :model="passwordForm" :rules="passwordRules" label-width="100px">
            <el-form-item label="当前密码" prop="oldPassword">
              <el-input v-model="passwordForm.oldPassword" type="password" show-password placeholder="请输入当前密码" />
            </el-form-item>
            <el-form-item label="新密码" prop="newPassword">
              <el-input v-model="passwordForm.newPassword" type="password" show-password placeholder="请输入新密码" />
            </el-form-item>
            <el-form-item label="确认密码" prop="confirmPassword">
              <el-input v-model="passwordForm.confirmPassword" type="password" show-password placeholder="请再次输入新密码" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleUpdatePassword" :loading="loading">修改密码</el-button>
              <el-button @click="resetForm">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const loading = ref(false)
const passwordFormRef = ref(null)

// 格式化时间
const formatDateTime = (dateString) => {
  if (!dateString) return '首次登录'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return dateString
  return date.toLocaleString('zh-CN')
}

// 管理员信息
const adminInfo = ref({
  username: localStorage.getItem('username') || '',
  email: '',
  avatar: localStorage.getItem('userAvatar') || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png',
  lastLoginTime: formatDateTime(localStorage.getItem('lastLoginTime'))
})

// 密码表单
const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// 密码验证规则
const validateConfirmPassword = (rule, value, callback) => {
  if (value !== passwordForm.value.newPassword) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const passwordRules = {
  oldPassword: [
    { required: true, message: '请输入当前密码', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ]
}

// 修改密码
const handleUpdatePassword = async () => {
  if (!passwordFormRef.value) return

  await passwordFormRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        const userId = localStorage.getItem('userId')
        const response = await axios.put(`http://localhost:8080/user/updatePassword`, {
          userId: userId,
          oldPassword: passwordForm.value.oldPassword,
          newPassword: passwordForm.value.newPassword
        }, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })

        if (response.data.code === 200) {
          ElMessage.success('密码修改成功，请重新登录')
          passwordForm.value = {
            oldPassword: '',
            newPassword: '',
            confirmPassword: ''
          }
        } else {
          ElMessage.error(response.data.message || '密码修改失败')
        }
      } catch (error) {
        console.error('修改密码失败:', error)
        ElMessage.error(error.response?.data?.message || '修改密码失败，请稍后重试')
      } finally {
        loading.value = false
      }
    }
  })
}

// 重置表单
const resetForm = () => {
  passwordFormRef.value?.resetFields()
}

// 获取管理员信息
const fetchAdminInfo = async () => {
  try {
    const userId = localStorage.getItem('userId')
    // 调用获取用户信息接口
    const response = await axios.get(`http://localhost:8080/user/${userId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })

    if (response.data.code === 200) {
      const userData = response.data.data
      adminInfo.value.email = userData.email || ''
      adminInfo.value.lastLoginTime = formatDateTime(userData.lastLogin)
    }
  } catch (error) {
    console.error('获取管理员信息失败:', error)
  }
}

onMounted(() => {
  fetchAdminInfo()
})
</script>

<style scoped>
.admin-info {
  padding: 20px;
  height: 100%;
  min-height: calc(100vh - 80px);
  box-sizing: border-box;
}

.info-header {
  margin-bottom: 20px;
}

.info-header h1 {
  margin: 0;
  font-size: 24px;
  color: #303133;
}

.info-card,
.password-card {
  margin-bottom: 20px;
}

.card-header {
  font-size: 16px;
  font-weight: 600;
}

.info-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.avatar-section {
  margin-bottom: 20px;
}

.info-desc {
  width: 100%;
}
</style>
