<template>
  <div class="destination-manage">
    <div class="header">
      <div class="header-left">
        <h2 class="page-title">
          <el-icon>
            <Location />
          </el-icon>
          目的地管理
        </h2>
        <span class="total-count">共 {{ total }} 条记录</span>
        <div class="search-box">
          <el-cascader v-model="searchRegion" :options="regionOptions"
            :props="{ value: 'value', label: 'label', checkStrictly: true }" placeholder="选择省/市/县" clearable
            class="region-select" @change="handleSearch" />
          <el-button @click="handleReset">重置</el-button>
        </div>
      </div>
      <el-button type="primary" @click="showAddDialog" class="add-btn">
        <el-icon>
          <Plus />
        </el-icon>
        添加目的地
      </el-button>
    </div>
  </div>

  <!-- 目的地列表 -->
  <el-card class="table-card" :body-style="{ padding: '0px' }">
    <el-table :data="destinationList" style="width: 100%" v-loading="loading"
      :header-cell-style="{ background: '#f5f7fa', color: '#606266', fontWeight: '600' }"
      :cell-style="{ padding: '12px 0' }" stripe @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column type="index" label="序号" width="80" align="center" />
      <el-table-column prop="name" label="名称" min-width="150">
        <template #default="{ row }">
          <span class="destination-name">{{ row.name }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="province" label="省份" width="120" align="center">
        <template #default="{ row }">
          <el-tag type="info" size="small">{{ row.province || '-' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="location" label="位置" min-width="180">
        <template #default="{ row }">
          <span class="location-text">{{ row.location }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="viewCount" label="浏览量" width="100" align="center">
        <template #default="{ row }">
          <span class="view-count">{{ row.viewCount || 0 }}</span>
        </template>
      </el-table-column>
      <el-table-column label="封面" width="100" align="center">
        <template #default="{ row }">
          <el-image v-if="row.coverImage" :src="row.coverImage" fit="cover" class="cover-image"
            :preview-src-list="[row.coverImage]" />
          <span v-else class="no-image">无</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right" align="center">
        <template #default="{ row }">
          <div class="table-actions">
            <el-button type="primary" size="small" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-popconfirm title="确定要删除该目的地吗？" confirm-button-type="danger" cancel-button-type="primary"
              @confirm="handleDelete(row)">
              <template #reference>
                <el-button type="danger" size="small">
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

  <!-- 添加/编辑对话框 -->
  <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑目的地' : '添加目的地'" width="600px" :close-on-click-modal="false"
    class="destination-dialog">
    <el-form ref="formRef" :model="destinationForm" :rules="destinationRules" label-width="100px"
      class="destination-form">
      <el-form-item label="名称" prop="name">
        <el-input v-model="destinationForm.name" placeholder="请输入目的地名称" />
      </el-form-item>
      <el-form-item label="省份" prop="province">
        <el-input v-model="destinationForm.province" placeholder="请输入省份" />
      </el-form-item>
      <el-form-item label="位置" prop="location">
        <el-input v-model="destinationForm.location" placeholder="请输入详细位置" />
      </el-form-item>
      <el-form-item label="描述" prop="description">
        <el-input v-model="destinationForm.description" type="textarea" :rows="4" placeholder="请输入目的地描述" />
      </el-form-item>
      <el-form-item label="封面图片">
<div class="cover-upload-wrapper">
  <el-upload ref="uploadRef" :auto-upload="false" :show-file-list="false" :on-change="handleFileChange"
    accept="image/*" class="cover-upload">
    <el-image v-if="previewImage" :src="previewImage" class="upload-preview" fit="contain"
      :preview-src-list="[previewImage]" @click.stop />
    <el-button v-else type="primary" plain>
      <el-icon>
        <Upload />
      </el-icon>
      选择图片
    </el-button>
  </el-upload>
</div>
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

</template>

<script>
import { ref, onMounted, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus, Location, Upload } from '@element-plus/icons-vue';
import { regionData } from 'element-china-area-data';
import axios from 'axios';

export default {
  name: 'DestinationManageView',
  components: {
    Plus, Location, Upload
  },
  setup() {
    // 数据和状态
    const destinationList = ref([]);
    // loading状态用于表格加载
    const loading = ref(false);
    const currentPage = ref(1);
    const pageSize = ref(10);
    const total = ref(0);
// selectedDestinations用于存储表格选中的 destinations 列表，方便批量操作
    const selectedDestinations = ref([]);
    // dialogVisible控制添加/编辑对话框的显示，isEdit区分是添加还是编辑
    const dialogVisible = ref(false);
    const isEdit = ref(false);
    // submitLoading用于提交按钮加载状态，防止重复提交
    const submitLoading = ref(false);
    // formRef用于表单验证，currentDestinationId存储当前编辑的目的地ID，uploadRef用于上传组件操作
    const formRef = ref(null);
    const currentDestinationId = ref(null);
    const uploadRef = ref(null);
    // regionOptions存储省市区数据，searchRegion存储搜索选择的省市区，searchForm存储搜索表单数据，
    // destinationForm存储添加/编辑表单数据，previewImage存储上传图片预览地址
    const regionOptions = ref(regionData || []);
    const searchRegion = ref([]);
    const searchForm = ref({
      province: ''
    });

    const destinationForm = ref({
      name: '',
      province: '',
      location: '',
      description: ''
    });

    const previewImage = ref('');

    const destinationRules = {
      name: [{ required: true, message: '请输入目的地名称', trigger: 'blur' }],
      province: [{ required: true, message: '请输入省份', trigger: 'blur' }],
      location: [{ required: true, message: '请输入位置', trigger: 'blur' }],
      description: [{ required: true, message: '请输入描述', trigger: 'blur' }]
    };

    const fetchDestinations = async () => {
      loading.value = true;
      try {
        const response = await axios.get('http://localhost:8080/destination/list', {
          params: {
            pageNum: currentPage.value,
            size: pageSize.value,
            province: searchForm.value.province || undefined
          }
        });

        if (response.data.code === 200) {
          const data = response.data.data;
          destinationList.value = data.list || data || [];
          total.value = data.total || data.length || 0;
        } else {
          ElMessage.error(response.data.message || '获取目的地列表失败');
        }
      } catch (error) {
        console.error('获取目的地列表失败:', error);
        ElMessage.error('获取目的地列表失败');
      } finally {
        loading.value = false;
      }
    };
// handleSizeChange和handleCurrentChange分别处理分页组件的页大小和当前页变化，触发fetchDestinations重新获取数据
    const handleSizeChange = (val) => {
      pageSize.value = val;
      currentPage.value = 1;
      fetchDestinations();
    };

    const handleCurrentChange = (val) => {
      currentPage.value = val;
      fetchDestinations();
    };

    const handleSearch = () => {
      if (searchRegion.value && searchRegion.value.length > 0) {
        const provinceValue = searchRegion.value[0];
        const province = regionOptions.value.find(p => p.value === provinceValue);
        if (province) {
          let provinceName = province.label;
          provinceName = provinceName
            .replace(/壮族自治区|回族自治区|维吾尔自治区|蒙古自治区|西藏自治区|宁夏回族自治区/g, '')
            .replace(/特别行政区/g, '')
            .replace(/省$/, '')
            .replace(/市$/, '');
          searchForm.value.province = provinceName;
        }
      } else {
        searchForm.value.province = '';
      }
      currentPage.value = 1;
      fetchDestinations();
    };
    /**
     * handleReset重置搜索条件和分页，重新获取目的地列表数据
      1. 将searchRegion清空，重置级联选择器
      2. 将searchForm.province清空，重置搜索表单数据
      3. 将currentPage重置为1，回到第一页
      4. 调用fetchDestinations重新获取数据，显示所有目的地列表
     */
    const handleReset = () => {
      searchRegion.value = [];
      searchForm.value.province = '';
      currentPage.value = 1;
      fetchDestinations();
    };

    const showAddDialog = () => {
      isEdit.value = false;
      currentDestinationId.value = null;
      destinationForm.value = {
        name: '',
        province: '',
        location: '',
        description: ''
      };
      previewImage.value = '';
      dialogVisible.value = true;
      nextTick(() => {
        formRef.value?.clearValidate();
      });
    };

    const handleEdit = (row) => {
      isEdit.value = true;
      currentDestinationId.value = row.destinationId;
      destinationForm.value = {
        name: row.name,
        province: row.province || '',
        location: row.location,
        description: row.description
      };
      previewImage.value = row.coverImage || '';
      dialogVisible.value = true;
      nextTick(() => {
        formRef.value?.clearValidate();
      });
    };

    /**
     *  handleFileChange处理上传组件的文件变化事件，使用FileReader读取选中的图片文件并将其转换为Data URL格式，存储在previewImage中用于预览显示
      1. 创建一个新的FileReader实例
      2. 定义onload事件处理函数，当文件读取完成后，将结果（Data URL）赋值给previewImage
      3. 调用readAsDataURL方法读取选中的文件（file.raw），触发onload事件进行预览更新
     */
    const handleFileChange = (file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        previewImage.value = e.target.result;
      };
      reader.readAsDataURL(file.raw);
    };

    const handleSubmit = async () => {
      if (!formRef.value) return;

      await formRef.value.validate(async (valid) => {
        if (!valid) return;

        submitLoading.value = true;
        try {
          const formData = new FormData();
          formData.append('name', destinationForm.value.name);
          formData.append('province', destinationForm.value.province);
          formData.append('location', destinationForm.value.location);
          formData.append('description', destinationForm.value.description);
          if (previewImage.value && previewImage.value.startsWith('data:')) {
            const response = await fetch(previewImage.value);
            const blob = await response.blob();
            formData.append('file', blob, 'image.jpg');
          }

          if (isEdit.value) {
            await axios.post('http://localhost:8080/destination/update', formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
            });
            ElMessage.success('目的地更新成功');
          } else {
            await axios.post('http://localhost:8080/destination/add', formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
            });
            ElMessage.success('目的地添加成功');
          }
          dialogVisible.value = false;
          fetchDestinations();
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
        await axios.delete(`http://localhost:8080/destination/delete/${row.destinationId}`);
        ElMessage.success('删除成功');
        fetchDestinations();
      } catch (error) {
        console.error('删除失败:', error);
        ElMessage.error(error.response?.data?.message || '删除失败');
      }
    };

    const handleSelectionChange = (selection) => {
      selectedDestinations.value = selection;
    };

    onMounted(() => {
      fetchDestinations();
    });

    return {
      destinationList,
      loading,
      currentPage,
      pageSize,
      total,
      selectedDestinations,
      dialogVisible,
      isEdit,
      submitLoading,
      formRef,
      searchForm,
      regionOptions,
      searchRegion,
      destinationForm,
      previewImage,
      uploadRef,
      destinationRules,
      handleSizeChange,
      handleCurrentChange,
      handleSearch,
      handleReset,
      showAddDialog,
      handleEdit,
      handleFileChange,
      handleSubmit,
      handleDelete,
      handleSelectionChange
    };
  }
};
</script>

<style scoped>
.destination-manage {
  padding: 20px;
}

:deep(.el-image-viewer__wrapper) {
  z-index: 9999 !important;
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

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 20px;
}

.region-select {
  width: 200px;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 4px;
}

.search-card {
  margin-bottom: 20px;
  border-radius: 8px;
}

.search-form {
  padding: 10px 0;
}

.table-card {
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.destination-name {
  font-weight: 500;
  color: #303133;
}

.location-text {
  color: #606266;
  font-size: 14px;
}

.view-count {
  color: #909399;
}

.cover-image {
  width: 60px;
  height: 40px;
  border-radius: 4px;
  object-fit: cover;
}

.no-image {
  color: #909399;
  font-size: 12px;
}

.table-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
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

.destination-dialog :deep(.el-dialog__header) {
  border-bottom: 1px solid #eee;
  padding: 16px 20px;
}

.destination-dialog :deep(.el-dialog__title) {
  font-weight: 600;
}

.destination-form {
  padding: 20px 10px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #eee;
}

.cover-upload-wrapper {
  display: flex;
  align-items: flex-start;
}

.cover-upload {
  display: inline-block;
}

.upload-preview {
  width: 200px;
  height: 120px;
  border-radius: 8px;
  border: 1px solid #ddd;
  cursor: pointer;
}
</style>