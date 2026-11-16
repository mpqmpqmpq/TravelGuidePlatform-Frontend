<template>
  <div class="comment-review">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>评论管理</span>
          <el-input v-model="searchKeyword" placeholder="搜索评论内容" style="width: 200px" clearable @clear="handleSearch"
            @keyup.enter="handleSearch">
            <template #suffix>
              <el-icon class="el-input__icon" @click="handleSearch">
                <Search />
              </el-icon>
            </template>
          </el-input>
        </div>
      </template>

      <el-table :data="comments" style="width: 100%" v-loading="loading">
        <el-table-column prop="content" label="评论内容" min-width="300">
          <template #default="{ row }">
            <div class="comment-content">{{ row.content }}</div>
            <div class="article-title">
              <el-link type="primary" @click="viewArticle(row)">查看攻略</el-link>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="userName" label="用户名" width="120" />
        <el-table-column prop="createdAt" label="评论时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-button type="danger" size="small" @click="rejectComment(row)">
                删除
              </el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container">
        <el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize"
          :page-sizes="[1, 5, 10, 20, 50, 100]" :total="total" layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange" @current-change="handleCurrentChange" />
      </div>
    </el-card>

    <!-- 攻略预览对话框 -->
    <el-dialog v-model="previewDialogVisible" title="攻略内容" width="70%" :before-close="handleClosePreview">
      <div class="article-preview">
        <h1>{{ currentArticle.title }}</h1>
        <div class="article-meta">
          <span>作者：{{ currentArticle.author }}</span>
          <span>发布时间：{{ formatDate(currentArticle.createdAt) }}</span>
        </div>
        <div class="article-content" v-html="currentArticle.content"></div>
        <div class="comment-highlight">
          <h3>当前评论：</h3>
          <p>{{ currentComment.content }}</p>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleClosePreview">关闭</el-button>
          <el-button type="danger" @click="rejectComment(currentComment)">
            删除
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 删除确认对话框 -->
    <el-dialog v-model="rejectDialogVisible" title="删除评论" width="30%">
      <p>确定要删除这条评论吗？此操作不可恢复。</p>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="rejectDialogVisible = false">取消</el-button>
          <el-button type="danger" @click="confirmReject">
            确认删除
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

// 响应式数据
const loading = ref(false)
const searchKeyword = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const comments = ref([])
const previewDialogVisible = ref(false)
const rejectDialogVisible = ref(false)
const currentArticle = ref({})
const currentComment = ref({})

// 获取待审核评论列表
const loadComments = async () => {
  loading.value = true
  try {
    const response = await axios.get('http://localhost:8080/comments/getList', {
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
      comments.value = data.commentsList?.records || []
      total.value = data.total || 0
    } else {
      ElMessage.error(response.data.message || '加载评论列表失败')
    }
  } catch (error) {
    console.error('加载评论列表失败:', error)
    ElMessage.error('加载评论列表失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 搜索处理
const handleSearch = () => {
  currentPage.value = 1
  loadComments()
}

// 分页处理
const handleSizeChange = (val) => {
  pageSize.value = val
  loadComments()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  loadComments()
}

// 查看攻略
const viewArticle = async (comment) => {
  try {
    // 获取攻略详情
    const articleResponse = await axios.get(`http://localhost:8080/article/getArticleById/${comment.articleId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    if (articleResponse.data.code === 200) {
      currentArticle.value = {
        title: articleResponse.data.data.title,
        author: articleResponse.data.data.userName,
        createdAt: articleResponse.data.data.createdAt,
        content: articleResponse.data.data.content
      }
      currentComment.value = comment
      previewDialogVisible.value = true
    } else {
      ElMessage.error(articleResponse.data.message || '加载攻略详情失败')
    }
  } catch (error) {
    console.error('加载攻略详情失败:', error)
    ElMessage.error('加载攻略详情失败，请稍后重试')
  }
}

// 关闭预览
const handleClosePreview = () => {
  previewDialogVisible.value = false
  currentArticle.value = {}
  currentComment.value = {}
}

// 删除评论
const rejectComment = (comment) => {
  currentComment.value = comment
  rejectDialogVisible.value = true
}

// 确认删除
const confirmReject = async () => {
  try {
    const response = await axios.delete(
      `http://localhost:8080/comments/deleteComment/${currentComment.value.commentId}`,
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    )

    if (response.data.code === 200) {
      ElMessage.success('已删除评论')
      rejectDialogVisible.value = false
      loadComments() // 刷新列表
      if (previewDialogVisible.value) {
        handleClosePreview()
      }
    } else {
      ElMessage.error(response.data.message || '删除失败')
    }
  } catch (error) {
    console.error('删除评论失败:', error)
    ElMessage.error('删除失败，请稍后重试')
  }
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('zh-CN')
}

// 获取状态类型
const getStatusType = (status) => {
  const statusMap = {
    0: 'info',     // 待审核
    1: 'success',   // 已发布
    2: 'danger'    // 违规
  }
  return statusMap[status] || 'info'
}

// 获取状态文本
const getStatusText = (status) => {
  const statusMap = {
    0: '待审核',
    1: '已发布',
    2: '违规'
  }
  return statusMap[status] || '未知'
}

// 初始加载
loadComments()
</script>

<style scoped>
.comment-review {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.comment-content {
  margin-bottom: 8px;
}

.article-title {
  font-size: 13px;
  color: #666;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.article-preview {
  padding: 20px;
}

.article-meta {
  margin: 10px 0 20px;
  color: #666;
}

.article-meta span {
  margin-right: 20px;
}

.article-content {
  line-height: 1.6;
  margin-bottom: 20px;
}

.comment-highlight {
  background: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
