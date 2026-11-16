<template>
  <div class="scenic-manage">
    <div class="header">
      <h2>景点信息管理</h2>
      <div class="filter-bar">
        <el-select v-model="filterStatus" placeholder="全部" @change="fetchScenicList" clearable style="width: 100px;">
          <el-option label="全部" value=""></el-option>
          <el-option label="正常" :value="1"></el-option>
          <el-option label="下架" :value="2"></el-option>
        </el-select>
        <el-button @click="fetchScenicList" style="margin-left: 10px;">
          <el-icon>
            <Refresh />
          </el-icon>
          刷新
        </el-button>
        <el-button type="primary" @click="handleAdd" style="margin-left: 10px;">
          <el-icon>
            <Plus />
          </el-icon>
          新增景点
        </el-button>
      </div>
    </div>

    <!-- 景点列表 -->
    <el-table :data="scenicList" style="width: 100%; flex: 1;" v-loading="loading" :max-height="tableMaxHeight">
      <el-table-column prop="scenicId" label="景点 ID" width="80" />
      <el-table-column prop="name" label="景点名称" min-width="150" />
      <el-table-column prop="location" label="地理位置" min-width="150" show-overflow-tooltip />
      <el-table-column prop="ticketPrice" label="门票价格" width="100">
        <template #default="{ row }">
          <span v-if="row.ticketPrice == 0">免费</span>
          <span v-else>¥{{ row.ticketPrice }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="avgScore" label="评分" width="100">
        <template #default="{ row }">
          <el-rate v-model="row.avgScore" disabled :max="5" />
        </template>
      </el-table-column>
      <el-table-column prop="viewCount" label="浏览量" width="90" />
      <el-table-column prop="likeCount" label="点赞数" width="90" />
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)" size="small">
            {{ getStatusText(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" width="180">
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="280" fixed="right">
        <template #default="{ row }">
          <div class="table-actions">
            <el-button type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button type="success" size="small" @click="handleView(row)">详情</el-button>
            <el-button v-if="row.status === 1" type="warning" size="small" @click="handleToggleStatus(row, 2)">
              下架
            </el-button>
            <el-button v-else type="success" size="small" @click="handleToggleStatus(row, 1)">
              上架
            </el-button>
            <el-button type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination">
      <el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize" :page-sizes="[10, 20, 50, 100]"
        :total="total" layout="total, sizes, prev, pager, next, jumper" @size-change="handleSizeChange"
        @current-change="handleCurrentChange" />
    </div>

    <!-- 新增/编辑景点对话框 -->
    <el-dialog v-model="editDialogVisible" :title="isEdit ? '编辑景点' : '新增景点'" width="800px">
      <el-form :model="editForm" label-width="120px" :rules="formRules" ref="formRef">
        <el-form-item label="景点名称" prop="name" required>
          <el-input v-model="editForm.name" placeholder="请输入景点名称" />
        </el-form-item>
        <el-form-item label="景点简介" prop="description">
          <el-input v-model="editForm.description" type="textarea" :rows="3" placeholder="请输入景点简介" />
        </el-form-item>
        <el-form-item label="地理位置" prop="location" required>
          <div style="display: flex; gap: 10px;">
            <el-input v-model="editForm.location" placeholder="请输入地理位置" style="flex: 1;" />
            <el-button @click="getCoordinates" :loading="coordsLoading">获取坐标</el-button>
          </div>
        </el-form-item>
        <el-form-item label="经度" prop="longitude">
          <el-input v-model="editForm.longitude" placeholder="如：116.397428" />
        </el-form-item>
        <el-form-item label="纬度" prop="latitude">
          <el-input v-model="editForm.latitude" placeholder="如：39.90923" />
        </el-form-item>
        <el-form-item label="门票价格" prop="ticketPrice" required>
          <el-input-number v-model="editForm.ticketPrice" :min="0" :precision="2" :step="0.1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="开放时间" prop="openHours">
          <el-input v-model="editForm.openHours" placeholder="例如：08:00-18:00" />
        </el-form-item>
        <el-form-item label="封面图片" prop="coverImage">
          <el-upload v-model:file-list="fileList" :action="uploadUrl" :headers="uploadHeaders"
            :on-success="handleUploadSuccess" :on-change="handleCoverChange" :before-upload="beforeUpload"
            :on-remove="handleRemove" :limit="1" accept=".jpg,.jpeg,.png,.gif" list-type="picture-card"
            :auto-upload="false">
            <el-icon>
              <Plus />
            </el-icon>
            <template #file="{ file }">
              <div class="upload-file">
                <img class="el-upload-list__item-thumbnail" :src="file.url" alt="" />
                <span class="el-upload-list__item-actions">
                  <span class="el-upload-list__item-delete" @click="handleRemove(file)">
                    <el-icon>
                      <Delete />
                    </el-icon>
                  </span>
                </span>
              </div>
            </template>
          </el-upload>
        </el-form-item>
        <el-form-item label="详情图片">
          <el-upload v-model:file-list="detailFileList" :action="imageUploadUrl" :headers="uploadHeaders"
            :on-success="handleDetailUploadSuccess" :on-change="handleDetailChange" :before-upload="beforeUpload"
            :on-remove="handleDetailRemove" accept=".jpg,.jpeg,.png,.gif" list-type="picture-card" :auto-upload="false">
            <el-icon>
              <Plus />
            </el-icon>
          </el-upload>
        </el-form-item>
        <el-form-item label="景点状态" prop="status">
          <el-select v-model="editForm.status" placeholder="请选择状态" style="width: 100%">
            <el-option label="正常" :value="1" />
            <el-option label="下架" :value="2" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="editDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitLoading">确认</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 景点详情对话框 -->
    <el-dialog v-model="viewDialogVisible" title="景点详情" width="900px" destroy-on-close :close-on-click-modal="false"
      :modal="true" append-to-body>
      <div v-if="currentScenic" class="scenic-detail">
        <div class="detail-header">
          <div style="width: 350px; flex-shrink: 0;">
            <el-image :src="allImages[0]" fit="contain" style="width: 100%; height: 250px;"
              :preview-src-list="allImages" />
          </div>
          <div class="detail-info">
            <h3>{{ currentScenic.name }}</h3>
            <p><strong>评分：</strong><el-rate v-model="currentScenic.avgScore" disabled :max="5" /></p>
            <p><strong>位置：</strong>{{ currentScenic.location }}</p>
            <p><strong>门票：</strong>
              <span v-if="currentScenic.ticketPrice == 0" style="color: #67c23a;">免费</span>
              <span v-else style="color: #f56c6c;">¥{{ currentScenic.ticketPrice }}</span>
            </p>
            <p><strong>开放时间：</strong>{{ currentScenic.openHours || '-' }}</p>
            <p><strong>状态：</strong>
              <el-tag :type="getStatusType(currentScenic.status)" size="small">
                {{ getStatusText(currentScenic.status) }}
              </el-tag>
            </p>
          </div>
        </div>
        <div class="detail-description">
          <h4>景点简介</h4>
          <p>{{ currentScenic.description || '暂无简介' }}</p>
        </div>
        <div class="detail-stats">
          <h4>统计数据</h4>
          <el-descriptions :column="4" border>
            <el-descriptions-item label="浏览量">{{ currentScenic.viewCount }}</el-descriptions-item>
            <el-descriptions-item label="点赞数">{{ currentScenic.likeCount }}</el-descriptions-item>
            <el-descriptions-item label="收藏数">{{ currentScenic.favoriteCount }}</el-descriptions-item>
            <el-descriptions-item label="评论数">{{ currentScenic.commentCount }}</el-descriptions-item>
          </el-descriptions>
        </div>
        <div class="detail-time">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="创建时间">{{ formatDate(currentScenic.createdAt) }}</el-descriptions-item>
            <el-descriptions-item label="更新时间">{{ formatDate(currentScenic.updatedAt) }}</el-descriptions-item>
          </el-descriptions>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleViewClose">关闭</el-button>
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
import { Refresh, Plus, Delete } from '@element-plus/icons-vue'

const router = useRouter()

// 安全获取token的函数
const getToken = () => {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('token') || ''
    }
  } catch (error) {
    console.warn('无法访问localStorage:', error)
  }
  return ''
}

// 响应式数据
const loading = ref(false)
const submitLoading = ref(false)
const scenicList = ref([])
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const filterStatus = ref('')
const fileList = ref([])

// 表格最大高度
const tableMaxHeight = computed(() => {
  return window.innerHeight - 280
})

// 表单引用
const formRef = ref(null)

// 编辑相关
const editDialogVisible = ref(false)
const isEdit = ref(false)
const editForm = ref({
  scenicId: null,
  name: '',
  description: '',
  location: '',
  longitude: '',
  latitude: '',
  ticketPrice: 0,
  openHours: '',
  coverImage: '',
  status: 1
})

// 表单验证规则
const formRules = {
  name: [
    { required: true, message: '请输入景点名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  location: [
    { required: true, message: '请输入地理位置', trigger: 'blur' }
  ],
  ticketPrice: [
    { required: true, message: '请输入门票价格', trigger: 'blur' }
  ]
}

// 详情相关
const viewDialogVisible = ref(false)
const currentScenic = ref(null)
const detailImages = ref([])

// 计算所有图片（封面 + 详情图）
const allImages = computed(() => {
  const images = []
  if (currentScenic.value?.coverImage) {
    images.push(currentScenic.value.coverImage)
  }
  images.push(...detailImages.value)
  return images
})

// 上传配置
const uploadUrl = 'http://localhost:8080/scenic-spots/add'
const imageUploadUrl = 'http://localhost:8080/scenic-images/upload'

// 详情图片列表
const detailFileList = ref([])

// 坐标获取加载状态
const coordsLoading = ref(false)

// 创建不带 Authorization 头的 axios 实例用于调用高德地图API，避免跨域问题和认证错误
const noAuthAxios = axios.create()

// 获取坐标
const getCoordinates = async () => {
  if (editForm.value.location.trim() === '') {
    ElMessage.error('请先输入地理位置')
    return
  }
  coordsLoading.value = true
  try {
    const response = await noAuthAxios.get('https://restapi.amap.com/v3/geocode/geo', {
      params: {
        key: 'd6f70bcd140ad1671b66587412cc4561',
        address: editForm.value.location + ' ' + editForm.value.name
      }
    })
    if (response.data.status === '1' && response.data.geocodes.length > 0) {
      const location = response.data.geocodes[0].location.split(',')
      editForm.value.longitude = location[0]
      editForm.value.latitude = location[1]
      ElMessage.success('坐标获取成功')
    } else {
      ElMessage.error('未找到该地址的坐标，请检查输入是否正确')
    }
  } catch (error) {
    console.error('获取坐标失败:', error)
    ElMessage.error('获取坐标失败，请稍后重试')
  } finally {
    coordsLoading.value = false
  }
}

// 动态计算headers
const uploadHeaders = computed(() => {
  const token = getToken()
  return {
    'Authorization': token ? `Bearer ${token}` : ''
  }
})

// 处理文件上传成功
const handleUploadSuccess = (response) => {
  if (response?.data) {
    editForm.value.coverImage = response.data
  }
  ElMessage.success('上传成功')
}

// 选择封面图片后自动上传
const handleCoverChange = async (file) => {
  if (file.raw) {
    const formData = new FormData()
    formData.append('file', file.raw)
    try {
      const res = await axios.post('http://localhost:8080/scenic-images/upload', formData)
      if (res.data.data) {
        file.url = res.data.data
        editForm.value.coverImage = res.data.data
        ElMessage.success('上传成功')
      }
    } catch (e) {
      ElMessage.error('上传失败')
    }
  }
}

// 选择详情图片后自动上传
const handleDetailChange = async (file) => {
  if (file.raw) {
    const formData = new FormData()
    formData.append('file', file.raw)
    try {
      const res = await axios.post('http://localhost:8080/scenic-images/upload', formData)
      if (res.data.data) {
        file.url = res.data.data
        file.imageUrl = res.data.data
        ElMessage.success('上传成功')
      }
    } catch (e) {
      ElMessage.error('上传失败')
    }
  }
}

// 处理详情图上传成功
const handleDetailUploadSuccess = (response, file) => {
  if (response?.data) {
    file.imageUrl = response.data
  }
  ElMessage.success('上传成功')
}

// 处理详情图删除
const handleDetailRemove = (file) => {
  // 如果是已存在的图片（已有imageId），从数据库删除
  if (file.imageId) {
    axios.delete(`http://localhost:8080/scenic-images/delete/${file.imageId}`)
      .then(() => {
        ElMessage.success('图片已删除')
      })
      .catch(() => {
        ElMessage.error('删除失败')
      })
  } else if (file.imageUrl || file.url) {
    // 如果是未保存的图片（只有imageUrl），只删除MinIO中的图片
    const imageUrl = file.imageUrl || file.url
    axios.delete('http://localhost:8080/scenic-images/deleteImage', {
      params: { imageUrl: imageUrl }
    })
      .then(() => {
        ElMessage.success('图片已删除')
      })
      .catch(() => {
        ElMessage.error('删除失败')
      })
  }
}

// 上传前校验
const beforeUpload = (file) => {
  const isImage = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'].includes(file.type)
  if (!isImage) {
    ElMessage.error('只能上传jpg、jpeg、png、gif格式的图片')
    return false
  }
  const isLt5M = file.size / 1024 / 1024 < 5
  if (!isLt5M) {
    ElMessage.error('图片大小不能超过5MB')
    return false
  }
  return true
}

// 移除文件
const handleRemove = (file) => {
  // 从fileList中移除文件
  fileList.value = fileList.value.filter(f => f.uid !== file.uid)
  // 清空coverImage
  editForm.value.coverImage = ''
  ElMessage.success('已移除图片')
}

// 检查登录状态
const checkLoginStatus = () => {
  const token = getToken()
  if (!token) {
    ElMessage.error('请先登录')
    router.push('/login')
    return false
  }
  return true
}

// 检查管理员权限
const checkAdminPermission = () => {
  const token = getToken()
  if (!token) {
    ElMessage.error('请先登录')
    router.push('/login')
    return
  }
}

// 获取景点列表
const fetchScenicList = async () => {
  loading.value = true
  try {
    const response = await axios.get('http://localhost:8080/scenic-spots/list', {
      params: {
        pageNum: currentPage.value,
        size: pageSize.value,
        status: filterStatus.value || undefined
      },
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    })

    if (response.data.code === 200) {
      const data = response.data.data
      scenicList.value = data?.list || []
      total.value = data?.total || 0
    } else {
      ElMessage.error(response.data.msg || '获取景点列表失败')
      scenicList.value = []
      total.value = 0
    }
  } catch (error) {
    console.error('获取景点列表失败:', error)
    ElMessage.error('获取景点列表失败，请稍后重试')
    scenicList.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

// 新增景点
const handleAdd = () => {
  isEdit.value = false
  editForm.value = {
    scenicId: null,
    name: '',
    description: '',
    location: '',
    longitude: '',
    latitude: '',
    ticketPrice: 0,
    openHours: '',
    coverImage: '',
    status: 1
  }
  fileList.value = [] // 清空文件列表
  detailFileList.value = [] // 清空详情图片列表
  editDialogVisible.value = true
}

// 编辑景点
const handleEdit = async (row) => {
  isEdit.value = true
  editForm.value = {
    scenicId: row.scenicId,
    name: row.name,
    description: row.description,
    location: row.location,
    longitude: row.longitude || '',
    latitude: row.latitude || '',
    ticketPrice: parseFloat(row.ticketPrice) || 0,
    openHours: row.openHours,
    coverImage: row.coverImage,
    status: row.status
  }
  // 设置文件列表以显示现有图片
  if (row.coverImage) {
    fileList.value = [{
      uid: Date.now(),
      name: '封面图片',
      url: row.coverImage,
      status: 'success'
    }]
  } else {
    fileList.value = []
  }

  // 加载详情图片
  try {
    const res = await axios.get(`http://localhost:8080/scenic-images/list/${row.scenicId}`)
    if (res.data.code === 200) {
      detailFileList.value = res.data.data.map(img => ({
        uid: img.imageId,
        imageId: img.imageId,
        name: '详情图片',
        url: img.imageUrl,
        status: 'success'
      }))
    }
  } catch (e) {
    console.error('加载详情图片失败', e)
  }

  editDialogVisible.value = true
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    submitLoading.value = true
    try {
      const url = isEdit.value
        ? 'http://localhost:8080/scenic-spots/update'
        : 'http://localhost:8080/scenic-spots/add'

      // 创建FormData对象
      const formData = new FormData()
      Object.keys(editForm.value).forEach(key => {
        if (editForm.value[key] !== null && editForm.value[key] !== undefined) {
          formData.append(key, editForm.value[key])
        }
      })

      // 如果有上传的文件，添加到formData中
      if (fileList.value.length > 0 && fileList.value[0].raw) {
        formData.append('file', fileList.value[0].raw)
      }

      let response;
      if (isEdit.value) {
        // 编辑时使用PUT请求
        response = await axios.put(url, formData, {
          headers: {
            'Authorization': `Bearer ${getToken()}`
          },
          transformRequest: [function (data, headers) {
            delete headers['Content-Type']
            return data
          }]
        })
      } else {
        // 新增使用POST请求
        response = await axios.post(url, formData, {
          headers: {
            'Authorization': `Bearer ${getToken()}`
          },
          transformRequest: [function (data, headers) {
            delete headers['Content-Type']
            return data
          }]
        })
      }

      if (response.data.code === 200) {
        // 获取景点ID（新增时从返回数据获取，编辑时用已有的）
        const scenicId = isEdit.value ? editForm.value.scenicId : response.data.data?.scenicId

        // 处理详情图片
        if (scenicId && detailFileList.value.length > 0) {
          const imagesToSave = detailFileList.value
            .filter(f => !f.imageId) // 只处理新上传的图片（没有imageId的）
            .map((file, index) => ({
              scenicId: scenicId,
              imageUrl: file.imageUrl || file.url,
              sortOrder: index,
              isCover: 0
            }))

          if (imagesToSave.length > 0) {
            await axios.post('http://localhost:8080/scenic-images/addBatch', imagesToSave, {
              headers: { 'Authorization': `Bearer ${getToken()}` }
            })
          }
        }

        ElMessage.success(isEdit.value ? '更新成功' : '添加成功')
        editDialogVisible.value = false
        fetchScenicList()
      } else {
        ElMessage.error(response.data.msg || '操作失败')
      }
    } catch (error) {
      console.error('操作失败:', error)
      ElMessage.error('操作失败，请稍后重试')
    } finally {
      submitLoading.value = false
    }
  })
}

// 查看详情
const handleView = async (row) => {
  currentScenic.value = row
  detailImages.value = []

  // 加载详情图片
  try {
    const res = await axios.get(`http://localhost:8080/scenic-images/list/${row.scenicId}`)
    if (res.data.code === 200 && res.data.data) {
      detailImages.value = res.data.data.map(img => img.imageUrl || img.url || img)
    }
  } catch (e) {
    console.error('加载详情图片失败', e)
  }

  viewDialogVisible.value = true
}

// 关闭详情弹窗
const handleViewClose = () => {
  viewDialogVisible.value = false
  detailImages.value = []
}

// 切换状态
const handleToggleStatus = async (row, newStatus) => {
  const actionText = newStatus === 1 ? '上架' : '下架'

  ElMessageBox.confirm(
    `确定要${actionText}该景点吗？`,
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      const updateData = {
        scenicId: row.scenicId,
        name: row.name,
        description: row.description,
        location: row.location,
        ticketPrice: parseFloat(row.ticketPrice),
        openHours: row.openHours,
        coverImage: row.coverImage,
        status: newStatus
      }

      const response = await axios.put('http://localhost:8080/scenic-spots/update', updateData, {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.data.code === 200) {
        ElMessage.success(`${actionText}成功`)
        fetchScenicList()
      } else {
        ElMessage.error(response.data.msg || `${actionText}失败`)
      }
    } catch (error) {
      console.error(`${actionText}失败:`, error)
      ElMessage.error(`${actionText}失败，请稍后重试`)
    }
  }).catch(() => { })
}

// 删除景点
const handleDelete = async (row) => {
  ElMessageBox.confirm(
    '确定要删除该景点吗？此操作不可恢复！',
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      const response = await axios.delete(`http://localhost:8080/scenic-spots/delete/${row.scenicId}`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      })

      if (response.data.code === 200) {
        ElMessage.success('删除成功')
        fetchScenicList()
      } else {
        ElMessage.error(response.data.msg || '删除失败')
      }
    } catch (error) {
      console.error('删除失败:', error)
      ElMessage.error('删除失败，请稍后重试')
    }
  }).catch(() => { })
}

// 分页处理
const handleSizeChange = (val) => {
  pageSize.value = val
  currentPage.value = 1
  fetchScenicList()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  fetchScenicList()
}

// 工具函数
const getStatusType = (status) => {
  const statusMap = {
    1: 'success',
    2: 'info'
  }
  return statusMap[status] || 'info'
}

const getStatusText = (status) => {
  const statusMap = {
    1: '正常',
    2: '下架'
  }
  return statusMap[status] || '未知'
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
  fetchScenicList()
})
</script>

<style scoped>
.scenic-manage {
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

.filter-bar {
  display: flex;
  align-items: center;
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
  gap: 8px;
  justify-content: center;
  align-items: center;
}

.scenic-detail {
  padding: 10px;
}

.detail-header {
  display: flex;
  gap: 30px;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #eaeaea;
}

.detail-cover {
  width: 300px;
  height: 200px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.detail-info {
  flex: 1;
}

.detail-info h3 {
  margin: 0 0 20px 0;
  font-size: 24px;
  color: #303133;
}

.detail-info p {
  margin: 12px 0;
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
}

.detail-description {
  margin-bottom: 25px;
}

.detail-description h4 {
  margin: 0 0 15px 0;
  font-size: 16px;
  color: #303133;
}

.detail-description p {
  line-height: 1.8;
  color: #606266;
  background-color: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
}

.detail-stats {
  margin-bottom: 25px;
}

.detail-stats h4 {
  margin: 0 0 15px 0;
  font-size: 16px;
  color: #303133;
}

.detail-time {
  margin-top: 25px;
}

.detail-time .el-descriptions__label {
  width: 120px;
}

.carousel-wrapper .el-carousel__item {
  display: flex;
  align-items: center;
  justify-content: center;
}

.carousel-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.el-carousel__item:nth-child(2n) {
  background-color: #99a9bf;
}

.el-carousel__item:nth-child(2n + 1) {
  background-color: #d3dce6;
}
</style>
