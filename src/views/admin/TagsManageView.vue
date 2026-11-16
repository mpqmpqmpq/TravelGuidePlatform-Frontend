<template>
  <div class="tags-manage">
    <div class="header">
      <div class="header-left">
        <h2 class="page-title">
          <el-icon>
            <PriceTag />
          </el-icon>
          标签管理
        </h2>
        <span class="total-count">共 {{ total }} 条记录</span>
      </div>
      <div class="header-right">
        <el-button type="danger" @click="handleBatchDelete" :disabled="selectedTags.length === 0"
          class="batch-delete-btn">
          <el-icon>
            <Delete />
          </el-icon>
          批量删除 ({{ selectedTags.length }})
        </el-button>
        <el-button type="primary" @click="showBatchAddDialog" class="add-btn">
          <el-icon>
            <Plus />
          </el-icon>
          批量添加
        </el-button>
        <el-button type="primary" @click="showAddDialog" class="add-btn">
          <el-icon>
            <Plus />
          </el-icon>
          添加标签
        </el-button>
      </div>
    </div>

    <!-- 标签列表 -->
    <el-card class="table-card" :body-style="{ padding: '0px' }">
      <el-table :data="tagList" style="width: 100%" v-loading="loading"
        :header-cell-style="{ background: '#f5f7fa', color: '#606266', fontWeight: '600' }"
        :cell-style="{ padding: '12px 0' }" stripe @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column type="index" label="序号" width="80" align="center" />
        <el-table-column prop="tagName" label="标签名称" min-width="180">
          <template #default="{ row }">
            <div class="tag-name">
              <el-tag type="primary" effect="plain" size="small">
                {{ row.tagName }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="tagSlug" label="标签别名" min-width="150">
          <template #default="{ row }">
            <span class="tag-slug">{{ row.tagSlug || '-' }}</span>
          </template>
        </el-table-column>
        <!-- <el-table-column prop="createdAt" label="创建时间" width="180" align="center">
          <template #default="{ row }">
            <el-icon><Calendar /></el-icon>
            <span class="date-text">{{ formatDate(row.createdAt) }}</span>
          </template>
        </el-table-column> -->
        <el-table-column label="操作" width="100" fixed="right" align="center">
          <template #default="{ row }">
            <div class="table-actions">
              <el-popconfirm title="确定要删除该标签吗？" confirm-button-type="danger" cancel-button-type="primary"
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

    <!-- 添加标签对话框 -->
    <el-dialog v-model="dialogVisible" title="添加标签" width="500px" :close-on-click-modal="false" class="tag-dialog">
      <el-form ref="formRef" :model="tagForm" :rules="tagRules" label-width="100px" class="tag-form">
        <el-form-item label="标签名称" prop="tagName">
          <el-input v-model="tagForm.tagName" placeholder="请输入标签名称" maxlength="20" />
        </el-form-item>

      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitLoading">
            确定
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 批量添加对话框 -->
    <el-dialog v-model="batchAddDialogVisible" title="批量添加标签" width="500px" :close-on-click-modal="false"
      class="tag-dialog">
      <div class="batch-add-tip">
        <p>每行一个标签名</p>
      </div>
      <el-input v-model="batchTagsInput" type="textarea" :rows="8"
        placeholder="请输入标签名称，每行一个&#10;例如：&#10;云南&#10;丽江&#10;古城" />
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="batchAddDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleBatchAdd" :loading="batchAddLoading">
            确认添加
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, onMounted, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus, PriceTag, Delete } from '@element-plus/icons-vue';
import axios from 'axios';

export default {
  name: 'TagsManageView',
  components: {
    Plus, PriceTag, Delete
  },
  setup() {
    const tagList = ref([]);
    const loading = ref(false);
    const currentPage = ref(1);
    const pageSize = ref(10);
    const total = ref(0);

    const selectedTags = ref([]);
    const dialogVisible = ref(false);
    const submitLoading = ref(false);
    const formRef = ref(null);

    const batchAddDialogVisible = ref(false);
    const batchTagsInput = ref('');
    const batchAddLoading = ref(false);

    const tagForm = ref({
      tagName: '',
      tagSlug: ''
    });

    const tagRules = {
      tagName: [
        { required: true, message: '请输入标签名称', trigger: 'blur' },
        { min: 1, max: 20, message: '标签名称长度为 1-20 个字符', trigger: 'blur' }
      ],
      tagSlug: [
        { min: 0, max: 50, message: '标签别名长度为 0-50 个字符', trigger: 'blur' }
      ]
    };

    const fetchTags = async () => {
      loading.value = true;
      try {
        const response = await axios.get('http://localhost:8080/tags/list', {
          params: {
            pageNum: currentPage.value,
            size: pageSize.value
          }
        });

        if (response.data.code === 200) {
          const data = response.data.data;
          tagList.value = data.list || data || [];
          total.value = data.total || data.length || 0;
        } else {
          ElMessage.error(response.data.message || '获取标签列表失败');
        }
      } catch (error) {
        console.error('获取标签列表失败:', error);
        ElMessage.error('获取标签列表失败');
      } finally {
        loading.value = false;
      }
    };

    const handleSizeChange = (val) => {
      pageSize.value = val;
      currentPage.value = 1;
      fetchTags();
    };

    const handleCurrentChange = (val) => {
      currentPage.value = val;
      fetchTags();
    };

    const showAddDialog = () => {

      tagForm.value = {
        tagName: '',
        tagSlug: ''
      };
      dialogVisible.value = true;
      nextTick(() => {
        formRef.value?.clearValidate();
      });
    };

    const handleSubmit = async () => {
      if (!formRef.value) return;

      await formRef.value.validate(async (valid) => {
        if (!valid) return;

        submitLoading.value = true;
        try {
          await axios.post('http://localhost:8080/tags/findOrCreate', [tagForm.value.tagName]);
          ElMessage.success('标签创建成功');
          dialogVisible.value = false;
          fetchTags();
        } catch (error) {
          console.error('操作失败:', error);
          ElMessage.error(error.response?.data?.message || '操作失败');
        } finally {
          submitLoading.value = false;
        }
      });
    };

    const handleDelete = async (row) => {
      try {
        await axios.delete(`http://localhost:8080/tags/delete/${row.tagId}`);
        ElMessage.success('标签删除成功');
        fetchTags();
      } catch (error) {
        console.error('删除失败:', error);
        ElMessage.error(error.response?.data?.message || '删除失败');
      }
    };

    const formatDate = (date) => {
      if (!date) return '-';
      const d = new Date(date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    const handleSelectionChange = (selection) => {
      selectedTags.value = selection;
    };

    const showBatchAddDialog = () => {
      batchTagsInput.value = '';
      batchAddDialogVisible.value = true;
    };

    const handleBatchAdd = async () => {
      if (!batchTagsInput.value.trim()) {
        ElMessage.warning('请输入标签名称');
        return;
      }

      const tagNames = batchTagsInput.value.split('\n').map(t => t.trim()).filter(t => t);
      if (tagNames.length === 0) {
        ElMessage.warning('请输入有效的标签名称');
        return;
      }

      batchAddLoading.value = true;
      try {
        await axios.post('http://localhost:8080/tags/findOrCreate', tagNames);
        ElMessage.success(`成功添加 ${tagNames.length} 个标签`);
        batchAddDialogVisible.value = false;
        fetchTags();
      } catch (error) {
        console.error('批量添加失败:', error);
        ElMessage.error(error.response?.data?.message || '批量添加失败');
      } finally {
        batchAddLoading.value = false;
      }
    };

    const handleBatchDelete = async () => {
      if (selectedTags.value.length === 0) {
        ElMessage.warning('请选择要删除的标签');
        return;
      }

      const tagIds = selectedTags.value.map(tag => tag.tagId);
      try {
        await axios.delete('http://localhost:8080/tags/deleteByIds', {
          data: tagIds
        });
        ElMessage.success(`成功删除 ${tagIds.length} 个标签`);
        selectedTags.value = [];
        fetchTags();
      } catch (error) {
        console.error('批量删除失败:', error);
        ElMessage.error(error.response?.data?.message || '批量删除失败');
      }
    };

    onMounted(() => {
      fetchTags();
    });

    return {
      tagList,
      loading,
      currentPage,
      pageSize,
      total,
      selectedTags,
      dialogVisible,
      submitLoading,
      formRef,
      tagForm,
      tagRules,
      batchAddDialogVisible,
      batchTagsInput,
      batchAddLoading,
      handleSizeChange,
      handleCurrentChange,
      showAddDialog,
      showBatchAddDialog,
      handleSubmit,
      handleDelete,
      handleSelectionChange,
      handleBatchAdd,
      handleBatchDelete,
      formatDate
    };
  }
};
</script>

<style scoped>
.tags-manage {
  padding: 20px;
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

.header-right {
  display: flex;
  gap: 12px;
}

.batch-delete-btn {
  display: flex;
  align-items: center;
  gap: 4px;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.page-title .el-icon {
  font-size: 24px;
  color: #409eff;
}

.total-count {
  font-size: 14px;
  color: #909399;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 4px;
}

.table-card {
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.tag-name {
  display: flex;
  align-items: center;
}

.tag-slug {
  color: #909399;
  font-size: 14px;
}

.date-text {
  margin-left: 4px;
  color: #606266;
  font-size: 14px;
}

.table-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.edit-btn {
  padding: 6px 12px;
}

.delete-btn {
  padding: 6px 12px;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.pagination {
  background: #fff;
  padding: 12px 16px;
  border-radius: 8px;
}

.tag-dialog :deep(.el-dialog__header) {
  border-bottom: 1px solid #eee;
  padding: 16px 20px;
}

.tag-dialog :deep(.el-dialog__title) {
  font-weight: 600;
}

.tag-form {
  padding: 20px 10px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #eee;
}

.batch-add-tip {
  margin-bottom: 12px;
  padding: 10px 12px;
  background: #f0f9ff;
  border-radius: 4px;
  border-left: 3px solid #409eff;
}

.batch-add-tip p {
  margin: 0;
  color: #606266;
  font-size: 14px;
  line-height: 1.5;
}
</style>