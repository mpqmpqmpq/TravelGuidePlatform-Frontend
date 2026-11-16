<template>
  <div class="article-review">
    <div class="header-card">
      <div class="header-content">
        <div class="header-left">
          <h2><el-icon>
              <Document />
            </el-icon>攻略审核管理</h2>
          <p>管理平台用户提交的攻略审核请求</p>
        </div>
        <div class="header-right">
          <div class="filter-bar">
            <el-select v-model="filterStatus" placeholder="审核状态" @change="fetchArticleReviews" style="width: 140px">
              <el-option label="全部" value=""></el-option>
              <el-option label="审核中" value="1"></el-option>
              <el-option label="通过" value="2"></el-option>
              <el-option label="未通过" value="3"></el-option>
            </el-select>
            <el-button @click="fetchArticleReviews">
              <el-icon>
                <Refresh />
              </el-icon>刷新
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <el-card class="table-card" v-loading="loading">
      <el-table :data="articleReviews" style="width: 100%" :max-height="600">
        <el-table-column prop="reviewId" label="ID" width="70" />
        <el-table-column prop="articleId" label="攻略ID" width="80" />
        <el-table-column prop="articleTitle" label="攻略标题" min-width="200">
          <template #default="scope">
            <el-link @click="previewArticle(scope.row)" type="primary">
              {{ scope.row.articleTitle || '加载中...' }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column prop="authorName" label="作者" width="120" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)" size="small" effect="light">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="reason" label="审核意见" min-width="150">
          <template #default="scope">
            <div class="reason-cell">
              <span class="reason-text" :title="scope.row.reason || '-'">
                {{ scope.row.reason || '-' }}
              </span>
              <el-button v-if="scope.row.reason" type="text" size="small" @click="showReasonDetail(scope.row)">
                详情
              </el-button>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="提交时间" width="170">
          <template #default="scope">
            {{ formatDate(scope.row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="审核" width="160" fixed="right" align="center">
          <template #default="scope">
            <div class="table-actions">
              <el-tooltip v-if="scope.row.status === 1 || scope.row.status == '1'" content="通过" placement="top">
                <el-button type="success" size="small" circle @click="approveReview(scope.row)">
                  <el-icon>
                    <Check />
                  </el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip v-if="scope.row.status === 1 || scope.row.status == '1'" content="拒绝" placement="top">
                <el-button type="danger" size="small" circle @click="rejectReview(scope.row)">
                  <el-icon>
                    <Close />
                  </el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="查看" placement="top">
                <el-button type="primary" size="small" circle @click="previewArticle(scope.row)">
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

    <div class="pagination">
      <el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize" :page-sizes="[10, 20, 50, 100]"
        :total="total" layout="total, sizes, prev, pager, next, jumper" @size-change="handleSizeChange"
        @current-change="handleCurrentChange" />
    </div>

    <!-- 攻略预览对话框 -->
    <el-dialog v-model="previewDialogVisible" title="查看攻略" width="80%" :before-close="handleClosePreview">
      <div v-if="currentPreviewArticle" class="article-preview">
        <h2>{{ currentPreviewArticle.title }}</h2>
        <div class="article-meta">
          <span>作者：{{ currentPreviewArticle.userName }}</span>
          <span>分类：{{ getCategoryName(currentPreviewArticle.categoryId) }}</span>
          <span>创建时间：{{ formatDate(currentPreviewArticle.createdAt) }}</span>
          <span>浏览量：{{ currentPreviewArticle.viewCount }}</span>
          <span>点赞数：{{ currentPreviewArticle.likeCount }}</span>
        </div>

        <!-- 封面图 -->
        <div v-if="currentPreviewArticle.coverImage" class="article-cover">
          <img :src="currentPreviewArticle.coverImage" :alt="currentPreviewArticle.title" class="cover-image">
        </div>

        <!-- 攻略内容 -->
        <div class="article-content" v-html="currentPreviewArticle.content"></div>

        <!-- 视频播放器 -->
        <div v-if="currentVideoMedia" class="video-container">
          <h3>相关视频</h3>
          <div class="video-player">
            <video :src="currentVideoMedia.mediaUrl" controls class="video-element"
              :poster="currentVideoMedia.videoCoverUrl"></video>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="previewDialogVisible = false">关闭</el-button>
          <el-button v-if="currentReview && (currentReview.status === 1)" type="success"
            @click="approveReview(currentReview)">
            通过审核
          </el-button>
          <el-button v-if="currentReview && (currentReview.status === 1)" type="danger"
            @click="rejectReview(currentReview)">
            拒绝审核
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 拒绝原因对话框 -->
    <el-dialog v-model="rejectDialogVisible" title="拒绝审核" width="500px">
      <el-form :model="rejectForm" label-width="80px">
        <el-form-item label="拒绝意见" required>
          <el-input v-model="rejectForm.reason" type="textarea" :rows="4" placeholder="请输入拒绝意见" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="rejectDialogVisible = false">取消</el-button>
          <el-button type="danger" @click="confirmReject">确认拒绝</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 审核意见详情对话框 -->
    <el-dialog v-model="reasonDetailVisible" title="审核意见详情" width="600px">
      <div class="reason-detail">
        <h4>审核状态：{{ getStatusText(currentReasonReview?.status) }}</h4>
        <div class="reason-content">
          {{ currentReasonReview?.reason || '暂无审核意见' }}
        </div>
        <div class="reason-meta">
          <p>审核时间：{{ currentReasonReview?.reviewedAt ? formatDate(currentReasonReview.reviewedAt) : '未审核' }}</p>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="reasonDetailVisible = false">关闭</el-button>
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
import { Refresh, Document, Check, Close, View } from '@element-plus/icons-vue'

// 路由实例
const router = useRouter()

// 响应式数据
const articleReviews = ref([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const filterStatus = ref('')

// 预览相关
const previewDialogVisible = ref(false)
const currentPreviewArticle = ref(null)
const currentReview = ref(null)

// 拒绝相关
const rejectDialogVisible = ref(false)
const rejectForm = ref({
  reason: '',
  review: null
})

// 审核意见详情相关
const reasonDetailVisible = ref(false)
const currentReasonReview = ref(null)

// 视频媒体相关
const videoMediaList = ref([])
const currentVideoMedia = computed(() => {
  return videoMediaList.value.length > 0 ? videoMediaList.value[0] : null
})

// 分类映射
const categoryMap = ref(new Map())

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

// 显示审核意见详情
const showReasonDetail = (review) => {
  currentReasonReview.value = review
  reasonDetailVisible.value = true
}

// 获取分类树
const fetchCategoryTree = async () => {
  try {
    const response = await axios.get('http://localhost:8080/category/getCategoryTree', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    if (response.data.code === 200) {
      const buildCategoryMap = (categories) => {
        categories.forEach(category => {
          categoryMap.value.set(category.categoryId, category.name)
          if (category.children && category.children.length > 0) {
            buildCategoryMap(category.children)
          }
        })
      }

      const categoryTree = Array.isArray(response.data.data.list) ? response.data.data.list : []
      buildCategoryMap(categoryTree)
    }
  } catch (error) {
    console.error('获取分类树失败:', error)
    ElMessage.error('获取分类信息失败，请稍后重试')
  }
}

// 获取攻略审核列表
const fetchArticleReviews = async () => {
  loading.value = true
  try {
    const response = await axios.get('http://localhost:8080/articleReviews/listWithUser', {
      params: {
        pageNum: currentPage.value,
        pageSize: pageSize.value,
        status: filterStatus.value || undefined
      },
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    console.log('获取审核列表响应:', response.data)

    if (response.data.code === 200) {
      let reviews = response.data.data.list || []
      console.log('原始审核数据:', reviews)

      // 直接使用后端返回的数据，映射字段名
      const reviewsWithDetails = reviews.map(review => ({
        ...review,
        articleTitle: review.title,
        authorName: review.userName
      }))

      articleReviews.value = reviewsWithDetails
      total.value = response.data.data.total || 0

      console.log('处理后的审核数据:', reviewsWithDetails)
    } else {
      ElMessage.error(response.data.message || '获取审核列表失败')
      articleReviews.value = []
      total.value = 0
    }
  } catch (error) {
    console.error('获取审核列表失败:', error)
    ElMessage.error('获取审核列表失败，请稍后重试')
    articleReviews.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

// 拒绝审核
const rejectReview = (review) => {
  rejectForm.value.review = review
  rejectForm.value.reason = ''
  rejectDialogVisible.value = true
}

// 预览攻略
const previewArticle = async (review) => {
  try {
    // 获取攻略详情
    const articleResponse = await axios.get(`http://localhost:8080/article/getArticleById/${review.articleId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    if (articleResponse.data.code === 200) {
      currentPreviewArticle.value = articleResponse.data.data
      currentReview.value = review

      // 获取关联的视频媒体
      await fetchVideoMedia(review.articleId)

      previewDialogVisible.value = true
    } else {
      ElMessage.error(articleResponse.data.message || '获取攻略详情失败')
    }
  } catch (error) {
    console.error('获取攻略详情失败:', error)
    ElMessage.error('获取攻略详情失败，请稍后重试')
  }
}

// 获取视频媒体
const fetchVideoMedia = async (articleId) => {
  try {
    const response = await axios.get(`http://localhost:8080/articleMedia/media/${articleId}`, {
      params: { type: 'video' },
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    if (response.data.code === 200) {
      videoMediaList.value = response.data.data || []
    } else {
      videoMediaList.value = []
    }
  } catch (error) {
    console.error('获取视频媒体失败:', error)
    videoMediaList.value = []
  }
}

// 通过审核 - 添加更详细的错误处理
const approveReview = async (review) => {
  try {
    console.log('开始审核，review对象:', review)

    await ElMessageBox.confirm('确认通过此攻略的审核吗？', '确认操作', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning'
    })

    const updatedReview = {
      reviewId: review.reviewId,
      articleId: review.articleId,
      status: 2, // 通过
      reviewedAt: new Date().toISOString(),
      reason: '审核通过'
    }

    console.log('发送审核请求:', updatedReview)

    const response = await axios.post('http://localhost:8080/articleReviews/review', updatedReview, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    })

    console.log('审核响应:', response.data)

    if (response.data.code === 200) {
      ElMessage.success('审核通过成功')
      previewDialogVisible.value = false
      fetchArticleReviews()
    } else {
      ElMessage.error(response.data.message || '审核失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('审核失败详细错误:', error)
      if (error.response) {
        console.error('错误响应:', error.response.data)
        ElMessage.error(`审核失败: ${error.response.data.message || error.response.status}`)
      } else {
        ElMessage.error('审核失败，请稍后重试')
      }
    }
  }
}

// 确认拒绝
const confirmReject = async () => {
  if (!rejectForm.value.reason.trim()) {
    ElMessage.warning('请输入拒绝意见')
    return
  }

  try {
    const updatedReview = {
      reviewId: rejectForm.value.review.reviewId,
      articleId: rejectForm.value.review.articleId,
      status: 3, // 未通过
      reviewedAt: new Date().toISOString(),
      reason: rejectForm.value.reason
    }

    const response = await axios.post('http://localhost:8080/articleReviews/review', updatedReview, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.data.code === 200) {
      ElMessage.success('审核拒绝成功')
      rejectDialogVisible.value = false
      previewDialogVisible.value = false
      fetchArticleReviews()
    } else {
      ElMessage.error(response.data.message || '审核失败')
    }
  } catch (error) {
    console.error('审核失败:', error)
    ElMessage.error('审核失败，请稍后重试')
  }
}

// 分页处理
const handleSizeChange = (val) => {
  pageSize.value = val
  currentPage.value = 1
  fetchArticleReviews()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  fetchArticleReviews()
}

// 关闭预览
const handleClosePreview = () => {
  previewDialogVisible.value = false
  currentPreviewArticle.value = null
  currentReview.value = null
  videoMediaList.value = []
}

// 工具函数
const getStatusType = (status) => {
  const statusMap = {
    1: 'info',     // 审核中
    2: 'success',  // 通过
    3: 'danger'    // 未通过
  }
  return statusMap[status] || 'info'
}

const getStatusText = (status) => {
  const statusMap = {
    1: '审核中',
    2: '通过',
    3: '未通过'
  }
  return statusMap[status] || '未知'
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('zh-CN')
}

const getCategoryName = (categoryId) => {
  return categoryMap.value.get(categoryId) || '未知分类'
}

// 组件挂载时获取数据
onMounted(() => {
  checkLoginStatus()
  checkAdminPermission()
  fetchCategoryTree() // 获取分类信息
  fetchArticleReviews()
})

const checkAdminPermission = () => {
  const userRole = localStorage.getItem('userRole')
  const token = localStorage.getItem('token')

  console.log('用户角色:', userRole)
  console.log('Token存在:', !!token)

  if (!token) {
    ElMessage.error('请先登录')
    router.push('/login')
    return
  }
}
</script>

<style scoped>
.article-review {
  padding: 20px;
}

.header-card {
  background: #fff;
  padding: 24px;
  border-radius: 12px;
  margin-bottom: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.header-left h2 {
  margin: 0 0 8px 0;
  color: #000;
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-left p {
  margin: 0;
  color: #333;
  font-size: 14px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-bar {
  display: flex;
  gap: 10px;
}

.table-card {
  border-radius: 12px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.article-preview {
  max-height: 600px;
  overflow-y: auto;
}

.article-meta {
  margin: 15px 0;
  padding: 12px 16px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ed 100%);
  border-radius: 8px;
}

.article-meta span {
  margin-right: 20px;
  color: #666;
  font-size: 14px;
}

.article-content {
  margin-top: 20px;
  line-height: 1.8;
  color: #303133;
}

.reason-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.reason-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 120px;
}

.reason-detail {
  padding: 10px 0;
}

.reason-detail h4 {
  margin-bottom: 15px;
  color: #409eff;
}

.reason-content {
  background: #f5f7fa;
  padding: 15px;
  border-radius: 8px;
  line-height: 1.6;
  min-height: 100px;
  white-space: pre-wrap;
  word-break: break-word;
}

.reason-meta {
  margin-top: 15px;
  color: #666;
  font-size: 14px;
}

.reason-meta p {
  margin: 5px 0;
}

.dialog-footer {
  text-align: right;
}

.article-cover {
  margin: 20px 0;
  text-align: center;
}

.cover-image {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.video-container {
  margin: 20px 0;
}

.video-container h3 {
  margin-bottom: 10px;
  color: #3b6e9c;
}

.video-player {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
}

.video-element {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.table-actions {
  display: flex;
  gap: 6px;
  justify-content: center;
}

.el-table-column--center {
  text-align: center;
}
</style>
