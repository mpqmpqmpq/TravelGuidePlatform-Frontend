<template>
  <div class="route-edit-page">
    <nav-component />

    <div class="edit-container">
      <el-card class="edit-card">
        <template #header>
          <div class="card-header">
            <h2>{{ isEdit ? '编辑路线' : '创建路线' }}</h2>
            <el-button @click="goBack">取消</el-button>
          </div>
        </template>

        <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
          <el-form-item label="路线标题" prop="title">
            <el-input v-model="form.title" placeholder="请输入路线标题" maxlength="50" show-word-limit />
          </el-form-item>


          <el-form-item label="行程天数" prop="days">
            <el-input-number v-model="form.days" :min="1" :max="30" />
            <span class="unit">天</span>
          </el-form-item>

          <el-form-item label="封面图片" prop="coverImage">
            <el-upload class="cover-uploader" action="#" :auto-upload="false" :show-file-list="false"
              :on-change="handleCoverChange" :before-change="beforeCoverUpload" accept="image/*">
              <img v-if="form.coverImage" :src="form.coverImage" class="cover-preview-img" />
              <div v-else class="cover-upload-placeholder">
                <el-icon class="cover-uploader-icon">
                  <Plus />
                </el-icon>
                <span>点击上传封面</span>
              </div>
            </el-upload>
          </el-form-item>

          <el-form-item label="路线描述" prop="description">
            <el-input v-model="form.description" type="textarea" :rows="4" placeholder="请输入路线描述" maxlength="500"
              show-word-limit />
          </el-form-item>



          <el-divider>景点列表</el-divider>

          <div class="spots-section">
            <div v-for="(spot, index) in form.spots" :key="index" class="spot-item">
              <div class="spot-header">
                <span class="spot-number">景点 {{ index + 1 }}</span>
                <el-button type="danger" size="small" text @click="removeSpot(index)">
                  <el-icon>
                    <Delete />
                  </el-icon> 删除
                </el-button>
              </div>
              <div class="spot-form">
                <el-form-item label="景点名称">
                  <el-input v-model="spot.name" placeholder="请输入景点名称" :disabled="!!spot.scenicId" />
                </el-form-item>
                <el-form-item label="景点描述">
                  <el-input v-model="spot.description" type="textarea" :rows="2" placeholder="请输入景点描述"
                    :disabled="!!spot.scenicId" />
                </el-form-item>
                <el-form-item label="景点图片" v-if="spot.image && spot.image.length > 0">
                  <div class="spot-image-preview">
                    <img :src="spot.image" alt="景点图片" />
                  </div>
                </el-form-item>
                <el-form-item label="景点图片" v-else-if="!spot.scenicId">
                  <el-input v-model="spot.image" placeholder="请输入图片URL" />
                </el-form-item>
                <el-form-item label="景点图片" v-else>
                  <span style="color: #999;">暂无图片</span>
                </el-form-item>
                <el-form-item label="标签" v-if="spot.tags && spot.tags.length > 0">
                  <el-tag v-for="tag in spot.tags.split(',')" :key="tag" class="spot-tag">{{ tag }}</el-tag>
                </el-form-item>
                <el-form-item label="标签" v-else-if="!spot.scenicId">
                  <el-input v-model="spot.tags" placeholder="多个标签用逗号分隔" />
                </el-form-item>
                <el-form-item label="标签" v-else>
                  <span style="color: #999;">暂无标签</span>
                </el-form-item>
              </div>
            </div>

            <div class="add-spot-btns">
              <el-button type="primary" plain @click="openSpotSelector">
                <el-icon>
                  <Plus />
                </el-icon> 从景点库选择
              </el-button>
              <el-button plain @click="addManualSpot">
                <el-icon>
                  <Plus />
                </el-icon> 手动添加
              </el-button>
            </div>
          </div>
          <el-divider />

          <div class="form-actions">
            <el-button type="primary" size="large" @click="submitForm" :loading="submitting">
              {{ isEdit ? '保存修改' : '发布路线' }}
            </el-button>
            <el-button size="large" @click="goBack">取消</el-button>
          </div>
        </el-form>
      </el-card>
    </div>

    <!-- 景点选择器对话框 -->
    <el-dialog v-model="spotSelectorVisible" title="选择景点" width="700px" destroy-on-close>
      <div class="spot-selector">
        <el-input v-model="spotSearchKeyword" placeholder="搜索景点名称" class="spot-search" clearable>
          <template #prefix>
            <el-icon>
              <Search />
            </el-icon>
          </template>
        </el-input>
        <div v-if="spotList.length === 0" style="text-align: center; padding: 20px; color: #999;">
          暂无景点数据，请先添加景点
        </div>
        <el-table v-else :data="filteredSpotList" height="400" border @row-click="selectSpot" highlight-current-row>
          <el-table-column prop="scenicId" label="ID" width="60" />
          <el-table-column prop="name" label="景点名称" />
          <el-table-column prop="location" label="位置" />
          <el-table-column prop="ticketPrice" label="门票" width="80">
            <template #default="{ row }">
              {{ row.ticketPrice === 0 ? '免费' : `¥${row.ticketPrice}` }}
            </template>
          </el-table-column>
          <el-table-column prop="avgScore" label="评分" width="60">
            <template #default="{ row }">
              {{ Number(row.avgScore).toFixed(1) }}
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import NavComponent from '@/components/NavComponent.vue';
import { Delete, Plus, Search } from '@element-plus/icons-vue';
import axios from 'axios';
import { ElMessage } from 'element-plus';

export default {
  name: 'RouteEditView',
  components: { NavComponent, Delete, Plus, Search },
  setup() {
    const router = useRouter();
    const route = useRoute();

    const formRef = ref(null);
    const submitting = ref(false);
    const spotSelectorVisible = ref(false);
    const spotList = ref([]);
    const spotSearchKeyword = ref('');
    const token = localStorage.getItem('token');
    const uploadHeaders = ref({
      Authorization: `Bearer ${token}`
    });
    const coverFile = ref(null);

    const beforeCoverUpload = (file) => {
      const isImage = file.type.startsWith('image/');
      const isLt5M = file.size / 1024 / 1024 < 5;
      if (!isImage) {
        ElMessage.error('只能上传图片文件');
        return false;
      }
      if (!isLt5M) {
        ElMessage.error('图片大小不能超过5MB');
        return false;
      }
      coverFile.value = file.raw;
      form.coverImage = URL.createObjectURL(file.raw);
      return false;
    };

    const handleCoverChange = (file) => {
      coverFile.value = file.raw;
      form.coverImage = URL.createObjectURL(file.raw);
    };


    const form = reactive({
      title: '',
      type: '',
      days: 1,
      coverImage: '',
      description: '',
      bestSeason: '',
      difficulty: '休闲',
      spots: []
    });

    const rules = {
      title: [{ required: true, message: '请输入路线标题', trigger: 'blur' }],
      type: [{ required: true, message: '请选择路线类型', trigger: 'change' }],
      days: [{ required: true, message: '请输入行程天数', trigger: 'blur' }]
    };

    const isEdit = computed(() => !!route.params.id);

    const filteredSpotList = computed(() => {
      if (!spotSearchKeyword.value) return spotList.value;
      const keyword = spotSearchKeyword.value.toLowerCase();
      return spotList.value.filter(spot =>
        spot.name.toLowerCase().includes(keyword) ||
        (spot.location && spot.location.toLowerCase().includes(keyword))
      );
    });

    const fetchRouteDetail = async () => {
      if (!isEdit.value) return;

      try {
        const res = await axios.get(`http://localhost:8080/route/${route.params.id}`);
        if (res.data.code === 200) {
          const data = res.data.data;
          Object.assign(form, {
            title: data.title,
            type: data.type,
            days: data.days,
            coverImage: data.coverImage,
            description: data.description,
            bestSeason: data.bestSeason,
            difficulty: data.difficulty,
            spots: data.spots || []
          });
        }
      } catch (error) {
        console.error('获取路线详情失败:', error);
        ElMessage.error('获取路线详情失败');
      }
    };

    const fetchSpotList = async () => {
      try {
        const res = await axios.get('http://localhost:8080/scenic-spots/list', {
          params: { pageNum: 1, size: 10000 }
        });
        if (res.data.code === 200) {
          spotList.value = res.data.data.records || res.data.data.list || [];
        }
      } catch (error) {
        console.error('获取景点列表失败:', error);
      }
    };

    const openSpotSelector = async () => {
      if (spotList.value.length === 0) {
        await fetchSpotList();
      }
      spotSelectorVisible.value = true;
    };

    const selectSpot = (row) => {
      form.spots.push({
        scenicId: row.scenicId || row.id,
        name: row.name,
        description: row.description || '',
        image: row.coverImage || row.image || '',
        tags: row.tags || ''
      });
      spotSelectorVisible.value = false;
      spotSearchKeyword.value = '';
      ElMessage.success('已添加景点: ' + row.name);
    };

    const addManualSpot = () => {
      form.spots.push({
        scenicId: null,
        name: '',
        description: '',
        image: '',
        tags: ''
      });
    };

    const removeSpot = (index) => {
      form.spots.splice(index, 1);
    };

    const submitForm = async () => {
      const valid = await formRef.value.validate().catch(() => false);
      if (!valid) return;

      if (form.spots.length === 0) {
        ElMessage.warning('请至少添加一个景点');
        return;
      }

      submitting.value = true;
      try {
        if (isEdit.value) {
          const res = await axios.put(`http://localhost:8080/route/${route.params.id}`, form);
          if (res.data.code === 200) {
            ElMessage.success('修改成功');
            router.push('/routes');
          } else {
            ElMessage.error(res.data.message || '操作失败');
          }
        } else {
          const formData = new FormData();
          formData.append('title', form.title);
          formData.append('type', form.type);
          formData.append('days', form.days);
          formData.append('description', form.description || '');
          formData.append('bestSeason', form.bestSeason || '');
          formData.append('difficulty', form.difficulty || '休闲');

          if (coverFile.value) {
            formData.append('file', coverFile.value);
          }

          const res = await axios.post('http://localhost:8080/route/create', formData, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          if (res.data.code === 200) {
            const routeId = res.data.data.id;

            for (let i = 0; i < form.spots.length; i++) {
              const spot = form.spots[i];
              await axios.post(`http://localhost:8080/route/${routeId}/spots`, {
                routeId: routeId,
                spotId: spot.scenicId || null,
                dayNum: Math.floor(i / 3) + 1,
                spotOrder: i + 1
              }, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
              });
            }

            ElMessage.success('创建成功');
            router.push('/routes');
          } else {
            ElMessage.error(res.data.message || '操作失败');
          }
        }
      } catch (error) {
        console.error('提交失败:', error);
        ElMessage.error('提交失败，请稍后重试');
      } finally {
        submitting.value = false;
      }
    };

    const goBack = () => {
      router.back();
    };

    onMounted(() => {
      fetchRouteDetail();
    });

    return {
      formRef,
      form,
      rules,
      isEdit,
      submitting,
      spotSelectorVisible,
      spotList,
      spotSearchKeyword,
      filteredSpotList,
      uploadHeaders,
      beforeCoverUpload,
      handleCoverChange,
      openSpotSelector,
      selectSpot,
      addManualSpot,
      removeSpot,
      submitForm,
      goBack
    };
  }
};
</script>

<style scoped>
.route-edit-page {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 40px;
}

.edit-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 30px 20px;
}

.edit-card {
  border-radius: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h2 {
  margin: 0;
  color: #1f2b38;
}

.unit {
  margin-left: 12px;
  color: #666;
}

.cover-preview {
  margin-top: 12px;
  border-radius: 8px;
  overflow: hidden;
  max-width: 300px;
}

.cover-preview img {
  width: 100%;
  height: auto;
  display: block;
}

.cover-uploader {
  width: 200px;
  height: 150px;
  border: 1px dashed #d9d9d9;
  border-radius: 8px;
  cursor: pointer;
  overflow: hidden;
}

.cover-uploader:hover {
  border-color: #409eff;
}

.cover-upload-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #8c939d;
}

.cover-upload-placeholder span {
  margin-top: 8px;
  font-size: 12px;
}

.cover-uploader-icon {
  font-size: 28px;
}

.cover-preview-img {
  width: 200px;
  height: 150px;
  object-fit: cover;
  border-radius: 8px;
}

.spots-section {
  padding: 0 20px;
}

.spot-item {
  background: #f9fafb;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
}

.spot-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.spot-number {
  font-weight: 600;
  color: #1f2b38;
}

.spot-form .el-form-item {
  margin-bottom: 12px;
}

.spot-form .el-input__wrapper,
.spot-form .el-textarea__inner {
  background-color: #fff !important;
}

.spot-form .el-input__inner,
.spot-form .el-textarea__inner {
  color: #333 !important;
  background-color: transparent !important;
}

.spot-image-preview {
  width: 200px;
  height: 120px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #ddd;
}

.spot-image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.spot-tag {
  margin-right: 8px;
}

.add-spot-btns {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.add-spot-btns .el-button {
  flex: 1;
}

.spot-selector .spot-search {
  margin-bottom: 16px;
}

.form-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  padding-top: 20px;
}

.form-actions .el-button {
  min-width: 120px;
}
</style>
