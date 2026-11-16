<template>
  <div class="category-manage">
    <div class="header">
      <div class="header-left">
        <h2 class="page-title">
          <el-icon>
            <Folder />
          </el-icon>
          分类管理
        </h2>
        <span class="total-count">共 {{ total }} 条记录</span>
      </div>
      <el-button type="primary" @click="showAddDialog" class="add-btn">
        <el-icon>
          <Plus />
        </el-icon>
        添加分类
      </el-button>
    </div>

    <!-- 分类列表 -->
    <el-card class="table-card" :body-style="{ padding: '0px' }">
      <el-table :data="categoryList" style="width: 100%" v-loading="loading"
        :header-cell-style="{ background: '#f5f7fa', color: '#606266', fontWeight: '600' }"
        :cell-style="{ padding: '12px 0' }" stripe>
        <el-table-column type="index" label="序号" width="80" align="center" />
        <el-table-column prop="name" label="分类名称" min-width="180">
          <template #default="{ row }">
            <div class="category-name">
              <el-icon v-if="row.parentId === null">
                <Folder />
              </el-icon>
              <el-icon v-else>
                <Document />
              </el-icon>
              <span>{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="parentId" label="父分类" width="150" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.parentId" type="info" size="small">
              {{ getCategoryName(row.parentId) }}
            </el-tag>
            <span v-else class="no-parent">无</span>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180" align="center">
          <template #default="{ row }">
            <el-icon>
              <Calendar />
            </el-icon>
            <span class="date-text">{{ formatDate(row.createdAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right" align="center">
          <template #default="{ row }">
            <div class="table-actions">
              <el-button type="primary" size="small" class="edit-btn" @click="handleEdit(row)" :icon="Edit">
                编辑
              </el-button>
              <el-popconfirm title="确定要删除该分类吗？" confirm-button-type="danger" cancel-button-type="primary"
                @confirm="handleDelete(row)">
                <template #reference>
                  <el-button type="danger" size="small" class="delete-btn" :icon="Delete">
                    删除
                  </el-button>
                </template>
              </el-popconfirm>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 分页 -->
    <div class="pagination-container">
      <el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize" :page-sizes="[5, 10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper" :total="total" @size-change="handleSizeChange"
        @current-change="handleCurrentChange" class="pagination" />
    </div>

    <!-- 添加分类对话框 -->
    <el-dialog v-model="dialogVisible" title="添加分类" width="500px" :close-on-click-modal="false">
      <div class="dialog-content">
        <el-form :model="categoryForm" label-width="100px" label-position="left">
          <el-form-item label="分类名称" required>
            <el-input v-model="categoryForm.name" placeholder="请输入分类名称" prefix-icon="User" clearable />
          </el-form-item>
          <el-form-item label="父分类">
            <el-tree-select v-model="categoryForm.parentId" :data="categoryTree" placeholder="请选择父分类（可选）" :props="{
              value: 'categoryId',
              label: 'name',
              children: 'children',
              disabled: 'disabled'
            }" clearable check-strictly filterable />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleAddCategory">
            <el-icon>
              <Check />
            </el-icon>
            确认添加
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 编辑分类对话框 -->
    <el-dialog v-model="editDialogVisible" title="编辑分类" width="500px" :close-on-click-modal="false">
      <div class="dialog-content">
        <el-form :model="editForm" label-width="100px" label-position="left">
          <el-form-item label="分类 ID">
            <el-input v-model="editForm.categoryId" disabled style="width: 100%" />
          </el-form-item>
          <el-form-item label="分类名称" required>
            <el-input v-model="editForm.name" placeholder="请输入分类名称" clearable />
          </el-form-item>
          <el-form-item label="父分类">
            <el-tree-select v-model="editForm.parentId" :data="categoryTree" placeholder="请选择父分类（可选）" :props="{
              value: 'categoryId',
              label: 'name',
              children: 'children',
              disabled: 'disabled'
            }" clearable check-strictly filterable />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="editDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleUpdateCategory">
            <el-icon>
              <Check />
            </el-icon>
            保存修改
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'
import {
  Folder,
  Document,
  Calendar,
  Plus,
  Edit,
  Delete,
  Check
} from '@element-plus/icons-vue'

// 列表数据
const loading = ref(false)
const categoryList = ref([])
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 树形数据
const categoryTree = ref([])

// 对话框数据
const dialogVisible = ref(false)
const categoryForm = ref({
  name: '',
  parentId: null
})

// 获取分类列表
const fetchCategoryList = async () => {
  loading.value = true
  try {
    const response = await axios.get('http://localhost:8080/category/getCategoryList', {
      params: {
        pageNum: currentPage.value,
        size: pageSize.value
      }
    })
    if (response.data.code === 200) {
      const data = response.data.data
      categoryList.value = data.list
      total.value = data.total !== undefined ? data.total : data.list.length
      console.log("Backend response data for category list:", response.data);
    } else {
      ElMessage.error(response.data.msg || '获取分类列表失败')
    }
  } catch (error) {
    ElMessage.error('获取分类列表失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

// 获取分类树
const fetchCategoryTree = async () => {
  try {
    const response = await axios.get('http://localhost:8080/category/getCategoryTree')
    if (response.data.code === 200) {
      const list = response.data.data.list || []

      // 处理分类树数据
      const processTreeData = (items) => {
        return items.map(item => ({
          ...item,
          children: item.children ? processTreeData(item.children) : [],
          disabled: editDialogVisible.value && item.categoryId === editForm.value.categoryId
        }))
      }

      const processedList = processTreeData(list)

      categoryTree.value = [{
        categoryId: null,
        name: '无父分类',
        children: processedList
      }]
    } else {
      ElMessage.error(response.data.msg || '获取分类树失败')
    }
  } catch (error) {
    ElMessage.error('获取分类树失败')
    console.error(error)
  }
}

// 添加分类
const handleAddCategory = async () => {
  if (!categoryForm.value.name) {
    ElMessage.warning('请输入分类名称')
    return
  }

  try {
    const response = await axios.post('http://localhost:8080/category/addCategory', categoryForm.value)
    if (response.data.code === 200) {
      ElMessage.success('添加成功')
      dialogVisible.value = false
      categoryForm.value = { name: '', parentId: null }
      fetchCategoryList()
      fetchCategoryTree()
    } else {
      ElMessage.error(response.data.msg || '添加失败')
    }
  } catch (error) {
    ElMessage.error('添加失败')
    console.error(error)
  }
}

// 删除分类
const handleDelete = async (row) => {
  try {
    const response = await axios.delete(`http://localhost:8080/category/deleteCategory/${row.categoryId}`)
    if (response.data.code === 200) {
      ElMessage.success('删除成功')
      fetchCategoryList()
      fetchCategoryTree()
    } else {
      ElMessage.error(response.data.msg || '删除失败')
    }
  } catch (error) {
    ElMessage.error('删除失败')
    console.error(error)
  }
}

// 编辑对话框数据
const editDialogVisible = ref(false)
const editForm = ref({
  categoryId: null,
  name: '',
  parentId: null
})

const getCategoryName = (categoryId) => {
  if (!categoryId) return '无'

  const findCategoryInTree = (items) => {
    for (const item of items) {
      if (item.categoryId === categoryId) {
        return item
      }
      if (item.children) {
        const found = findCategoryInTree(item.children)
        if (found) return found
      }
    }
    return null
  }

  const rootChildren = categoryTree.value[0]?.children || []
  const category = findCategoryInTree(rootChildren)

  return category ? category.name : '未知分类'
}

// 编辑分类点击
const handleEdit = async (row) => {
  await fetchCategoryTree()
  editForm.value = {
    categoryId: row.categoryId,
    name: row.name,
    parentId: row.parentId
  }
  editDialogVisible.value = true
}

// 编辑分类确认
const handleUpdateCategory = async () => {
  try {
    const response = await axios.put('http://localhost:8080/category/updateCategory', editForm.value)
    if (response.data.code === 200) {
      ElMessage.success('更新成功')
      editDialogVisible.value = false
      fetchCategoryList()
      fetchCategoryTree()
    } else {
      ElMessage.error(response.data.msg || '更新失败')
    }
  } catch (error) {
    ElMessage.error('更新失败')
    console.error(error)
  }
}

// 分页处理
const handleSizeChange = (val) => {
  pageSize.value = val
  fetchCategoryList()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  fetchCategoryList()
}

// 显示添加对话框
const showAddDialog = () => {
  categoryForm.value = { name: '', parentId: null }
  dialogVisible.value = true
}

// 格式化日期
const formatDate = (date) => {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 初始化
onMounted(() => {
  fetchCategoryList()
  fetchCategoryTree()
})
</script>

<style scoped>
.category-manage {
  padding: 24px;
  background-color: #f0f2f5;
  min-height: calc(100vh - 84px);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.total-count {
  font-size: 14px;
  color: #909399;
  padding: 4px 12px;
  background-color: #f5f7fa;
  border-radius: 12px;
}

.add-btn {
  padding: 10px 24px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.table-card {
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.category-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.no-parent {
  color: #c0c4cc;
  font-style: italic;
}

.date-text {
  margin-left: 6px;
  color: #606266;
}

.table-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
  align-items: center;
}

.edit-btn {
  padding: 6px 16px;
}

.delete-btn {
  padding: 6px 16px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
  background-color: #fff;
  padding: 16px 0;
  border-radius: 8px;
}

.dialog-content {
  padding: 10px 0;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 10px;
}

/* 表格行悬停效果 */
:deep(.el-table__row:hover) {
  background-color: #f5f7fa !important;
}

/* 表格头部样式 */
:deep(.el-table th) {
  font-size: 14px;
}

/* 表格单元格样式 */
:deep(.el-table td) {
  padding: 12px 0;
}

/* 对话框标题样式 */
:deep(.el-dialog__header) {
  padding: 20px 24px;
  border-bottom: 1px solid #ebeef5;
}

:deep(.el-dialog__title) {
  font-size: 18px;
  font-weight: 600;
}

/* 对话框内容样式 */
:deep(.el-dialog__body) {
  padding: 24px;
}

/* 对话框底部样式 */
:deep(.el-dialog__footer) {
  padding: 16px 24px;
  border-top: 1px solid #ebeef5;
}

/* 输入框焦点样式 */
:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

/* 按钮悬停效果 */
:deep(.el-button:hover) {
  transform: translateY(-1px);
  transition: all 0.3s ease;
}
</style>
