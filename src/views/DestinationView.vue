<template>
  <div class="dest-page">
    <nav-component search-placeholder="搜索目的地..." />

    <div class="dest-container">
      <!-- 省份筛选标签 -->
      <div class="province-tabs">
        <span
          class="province-tab"
          :class="{ 'active': selectedProvince === '' }"
          @click="selectProvince('')"
        >
          全部
        </span>
        <span
          v-for="province in provinces"
          :key="province"
          class="province-tab"
          :class="{ 'active': selectedProvince === province }"
          @click="selectProvince(province)"
        >
          {{ province }}
        </span>
      </div>

      <!-- 目的地网格 -->
      <div class="dest-grid">
          <div v-if="loading" class="loading-grid">
            <el-skeleton v-for="i in 6" :key="i" :rows="3" animated class="loading-skeleton"/>
          </div>
          
          <div v-else-if="destList.length === 0" class="empty-state">
            <el-empty description="暂无目的地" />
          </div>

          <div
            v-else
            v-for="dest in destList"
            :key="dest.id"
            class="dest-card"
            @click="goToDetail(dest)"
          >
            <div class="card-image">
              <img v-if="dest.coverImage" :src="dest.coverImage" :alt="dest.name" />
              <div v-else class="image-placeholder">
                <el-icon><Location /></el-icon>
              </div>
              <div class="card-overlay">
                <span class="view-btn">查看详情</span>
              </div>
            </div>
            <div class="card-body">
              <h3 class="dest-name">{{ dest.name }}</h3>
              <p class="dest-location">
                <el-icon><Location /></el-icon>
                {{ dest.location }}
              </p>
              <p class="dest-desc">{{ dest.description || '暂无描述' }}</p>
              <div class="dest-tags" v-if="dest.tags">
                <span v-for="tag in dest.tags.split(',')" :key="tag" class="dest-tag">
                  {{ tag }}
                </span>
              </div>
              <div class="dest-stats">
                <span><el-icon><View /></el-icon> {{ dest.viewCount || 0 }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div class="pagination-wrapper" v-if="total > 0">
        <el-pagination
          v-model:current-page="pageNum"
          :page-size="pageSize"
          :total="total"
          layout="prev, pager, next"
          @current-change="fetchList"
        />
      </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import NavComponent from '@/components/NavComponent.vue';
import { Location, View } from '@element-plus/icons-vue';
import axios from 'axios';
import { ElMessage } from 'element-plus';

export default {
  name: 'DestinationView',
  components: { NavComponent, Location, View },
  setup() {
    const router = useRouter();
    
    const destList = ref([]);
    const loading = ref(true);
    const pageNum = ref(1);
    const pageSize = ref(12);
    const total = ref(0);
    const selectedProvince = ref('');
    
    const provinces = ref([]);

    const fetchProvinces = async () => {
      try {
        const res = await axios.get('http://localhost:8080/destination/getProvince');
        if (res.data.code === 200) {
          provinces.value = res.data.data || [];
        }
      } catch (error) {
        console.error('获取省份列表失败:', error);
      }
    };

    const fetchList = async () => {
      loading.value = true;
      try {
        const params = {
          pageNum: pageNum.value,
          size: pageSize.value
        };
        if (selectedProvince.value) {
          params.province = selectedProvince.value;
        }
        const res = await axios.get('http://localhost:8080/destination/list', { params });
        if (res.data.code === 200) {
          destList.value = res.data.data.list || [];
          total.value = res.data.data.total || 0;
        }
      } catch (error) {
        console.error('获取目的地列表失败:', error);
        ElMessage.error('获取列表失败');
      } finally {
        loading.value = false;
      }
    };

    const selectProvince = (province) => {
      selectedProvince.value = province;
      pageNum.value = 1;
      fetchList();
    };

    const goToDetail = (dest) => {
      if (dest.id) {
        router.push(`/destination/${dest.id}`);
      }
    };

    onMounted(() => {
      fetchProvinces();
      fetchList();
    });

    return {
      destList,
      loading,
      pageNum,
      pageSize,
      total,
      selectedProvince,
      provinces,
      fetchList,
      fetchProvinces,
      selectProvince,
      goToDetail
    };
  }
};
</script>

<style scoped>
.dest-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%);
}

.dest-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 28px 40px;
}

/* 省份筛选标签 */
.province-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 24px;
  /* background: white; */
  padding: 16px 20px;
  border-radius: 16px;
  /* box-shadow: 0 6px 24px rgba(74, 107, 130, 0.1); */
}

.province-tab {
  padding: 10px 20px;
  border-radius: 24px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 14px;
  font-weight: 600;
  color: #000000;
  background: #e8edf2;
  border: 1px solid transparent;
}

.province-tab:hover {
  background: #dce4ec;
  transform: translateY(-2px);
  border-color: #b0c4d4;
}

.province-tab.active {
  background: linear-gradient(135deg, #4a6b82, #2c4a5e);
  color: white;
  box-shadow: 0 6px 20px rgba(74, 107, 130, 0.4);
}

/* 目的地网格 */
.dest-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.dest-card {
  background: white;
  border-radius: 20px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 8px 30px -8px rgba(74, 107, 130, 0.12);
  border: 1px solid rgba(143, 168, 184, 0.08);
  position: relative;
}

.dest-card:hover {
  transform: translateY(-6px) scale(1.01);
  box-shadow: 0 16px 40px -10px rgba(74, 107, 130, 0.2);
  border-color: #8fa8b8;
}

.card-image {
  height: 160px;
  background: linear-gradient(145deg, #b0c4d4, #8fa8b8);
  position: relative;
  overflow: hidden;
}

.card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.dest-card:hover .card-image img {
  transform: scale(1.08);
}

.image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  color: rgba(255, 255, 255, 0.6);
}

.card-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(74, 107, 130, 0.8), transparent);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 20px;
  opacity: 0;
  transition: opacity 0.4s ease;
}

.dest-card:hover .card-overlay {
  opacity: 1;
}

.view-btn {
  background: white;
  color: #000000;
  padding: 10px 24px;
  border-radius: 24px;
  font-weight: 700;
  font-size: 14px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
}

.card-body {
  padding: 16px;
}

.dest-name {
  margin: 0 0 10px;
  font-size: 1.3rem;
  font-weight: 700;
  color: #1f2b38;
  transition: color 0.3s ease;
}

.dest-card:hover .dest-name {
  color: #000000;
}

.dest-location {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #000000;
  font-size: 13px;
  margin: 0 0 12px;
  font-weight: 500;
}

.dest-location .el-icon {
  color: #000000;
}

.dest-desc {
  margin: 0 0 14px;
  color: #6b7280;
  font-size: 14px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.dest-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.dest-tag {
  background: linear-gradient(135deg, #dce4ec, #b0c4d4);
  color: #4a6b82;
  padding: 5px 14px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
}

.dest-stats {
  display: flex;
  gap: 16px;
  color: #9ca3af;
  font-size: 13px;
}

.dest-stats span {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dest-stats .el-icon {
  color: #000000;
}

.dest-sidebar {
  position: sticky;
  top: 110px;
}

.sidebar-card {
  background: white;
  border-radius: 22px;
  padding: 24px;
  box-shadow: 0 10px 40px -10px rgba(74, 107, 130, 0.15);
  border: 1px solid #dce4ec;
}

.sidebar-card h4 {
  margin: 0 0 20px;
  color: #000000;
  font-size: 1.2rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 14px;
  border-bottom: 2px solid #dce4ec;
}

.sidebar-card h4::before {
  content: '🏆';
  font-size: 1.3rem;
}

.hot-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.hot-list li {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 0;
  border-bottom: 1px dashed #dce4ec;
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 12px;
  margin-bottom: 4px;
}

.hot-list li:hover {
  background: linear-gradient(135deg, #e8edf2, #dce4ec);
  padding-left: 10px;
  padding-right: 10px;
}

.hot-list li:last-child {
  border-bottom: none;
}

.hot-list li:hover .hot-name {
  color: #000000;
}

.hot-rank {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 13px;
  background: linear-gradient(135deg, #dce4ec, #b0c4d4);
  color: #000000;
}

.hot-rank.rank-1 {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: white;
  box-shadow: 0 4px 15px rgba(251, 191, 36, 0.4);
}

.hot-rank.rank-2 {
  background: linear-gradient(135deg, #c0c0c0, #a8a8a8);
  color: white;
}

.hot-rank.rank-3 {
  background: linear-gradient(135deg, #cd7f32, #b87333);
  color: white;
}

.hot-info {
  display: flex;
  flex-direction: column;
}

.hot-name {
  color: #1f2b38;
  font-weight: 500;
  font-size: 14px;
}

.hot-location {
  color: #999;
  font-size: 12px;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 30px;
  padding: 24px;
  background: white;
  border-radius: 20px;
  box-shadow: 0 6px 24px rgba(74, 107, 130, 0.1);
}

:deep(.el-pagination .el-pager li) {
  border-radius: 12px;
  background: #e8edf2;
  color: #4a6b82;
  font-weight: 600;
}

:deep(.el-pagination .el-pager li.active) {
  background: linear-gradient(135deg, #4a6b82, #2c4a5e);
  color: white;
  box-shadow: 0 4px 15px rgba(74, 107, 130, 0.4);
}

.loading-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

.loading-skeleton {
  background: white;
  border-radius: 24px;
  padding: 20px;
}

@media (max-width: 1024px) {
  .dest-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .hot-dest-section {
    padding: 20px;
  }
}

@media (max-width: 768px) {
  .dest-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
  }
  
  .dest-container {
    padding: 16px;
  }
  
  .hot-dest-card {
    width: 150px;
  }
  
  .hot-dest-img {
    height: 80px;
  }
}

@media (max-width: 480px) {
  .dest-grid {
    grid-template-columns: 1fr;
  }
  
  .dest-container {
    padding: 16px;
  }

  .dest-header {
    padding: 32px 20px;
  }

  .dest-header h1 {
    font-size: 1.6rem;
  }
}
</style>
