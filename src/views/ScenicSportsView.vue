<template>
  <div class="scenic-list-container">
    <!-- 导航栏 -->
    <nav-component search-placeholder="搜索景点..." />

    <!-- 主布局：两栏 -->
    <div class="scenic-layout">
      <!-- 左侧内容区 -->
      <div class="scenic-left">
        <!-- 筛选与排序区域 -->
        <div class="filter-sort-wrapper">
          <!-- 左侧：价格筛选  -->
          <div class="filter-section">
            <div class="filter-header">
              <span class="filter-title">价格筛选</span>
            </div>
            <div class="filter-tags">
              <span class="filter-tag" :class="{ 'active': selectedPrice === 'all' }" @click="selectPrice('all')">
                <span class="tag-dot"></span>
                全部
              </span>
              <span class="filter-tag" :class="{ 'active': selectedPrice === 'free' }" @click="selectPrice('free')">
                <span class="tag-dot free"></span>
                免费
              </span>
              <span class="filter-tag" :class="{ 'active': selectedPrice === 'paid' }" @click="selectPrice('paid')">
                <span class="tag-dot paid"></span>
                付费
              </span>
            </div>
          </div>

          <!-- 右侧：排序 - 下拉菜单风格 -->
          <div class="sort-section">
            <div class="sort-header">
              <span class="sort-title">排序方式</span>
            </div>
            <el-select v-model="sortBy" placeholder="选择排序" @change="fetchScenics" class="sort-select">
              <el-option label="综合" value="default" />
              <el-option label="评分最高" value="score" />
              <el-option label="浏览最多" value="views" />
              <el-option label="价格从低到高" value="price_asc" />
              <el-option label="价格从高到低" value="price_desc" />
            </el-select>
          </div>
        </div>

        <!-- 景点列表 -->
        <div class="scenic-grid">
          <div v-if="loading" class="loading-grid">
            <el-skeleton :rows="6" animated class="loading-skeleton" />
          </div>

          <div v-else-if="scenicList.length === 0" class="empty-state">
            <el-empty description="暂无景点信息">
              <template #image>
                <img src="/empty-travel.svg" alt="暂无" class="empty-img">
              </template>
            </el-empty>
          </div>

          <div class="scenic-card" v-for="scenic in scenicList" :key="scenic.scenicId" @click="viewScenic(scenic)">
            <!-- 封面图 -->
            <div class="card-image" v-if="scenic.coverImage">
              <img :src="scenic.coverImage" alt="封面" class="cover-img">
              <div class="price-tag" v-if="scenic.ticketPrice == 0">
                <el-icon>
                  <Ticket />
                </el-icon>
                免费
              </div>
              <div class="price-tag paid" v-else-if="scenic.ticketPrice > 0">
                ¥{{ scenic.ticketPrice }}
              </div>
            </div>
            <div class="card-image" v-else>
              <span class="image-placeholder">🏞️</span>
            </div>

            <div class="card-content">
              <div class="card-title">{{ scenic.name || '未知景点' }}</div>
              <div class="card-location">
                <el-icon>
                  <Location />
                </el-icon>
                {{ scenic.location || '位置未知' }}
              </div>
              <div class="card-rating">
                <el-rate v-model="scenic.avgScore" disabled :max="5" allow-half size="small" />
                <span class="rating-text">{{ Number(scenic.avgScore)?.toFixed(1) || '0.0' }}分</span>
              </div>
              <div class="card-desc">{{ scenic.description || '暂无简介' }}</div>
              <div class="card-footer">
                <span class="footer-stats">
                  <el-icon>
                    <View />
                  </el-icon>
                  {{ formatCount(scenic.viewCount || 0) }}浏览
                </span>
                <span class="footer-stats">
                  <el-icon>
                    <StarFilled />
                  </el-icon>
                  {{ formatCount(scenic.likeCount || 0) }}点赞
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 分页 -->
        <div class="pagination">
          <el-pagination background layout="prev, pager, next" :total="total" :page-size="pageSize"
            :current-page="currentPage" @current-change="handlePageChange" class="custom-pagination"
            :disabled="total === 0" />
        </div>

        <div class="total-count">
          <el-icon>
            <LocationFilled />
          </el-icon>
          共 {{ total }} 个景点
        </div>
      </div>

      <!-- 右侧边栏 - 精选推荐 -->
      <div class="scenic-sidebar">
        <!-- 精选景点推荐 -->
        <div class="sidebar-card featured-card">
          <div class="featured-header">
            <span class="featured-title">精选推荐</span>
          </div>
          <p class="featured-desc">不容错过的热门景点</p>

          <div class="featured-list">
            <div class="featured-item" v-for="(item, i) in hotScenics" :key="item.scenicId" @click="viewScenic(item)">
              <div class="featured-rank" :class="'rank-' + (i + 1)">
                {{ i + 1 }}
              </div>
              <div class="featured-img" v-if="item.coverImage">
                <img :src="item.coverImage" :alt="item.name" />
              </div>
              <div class="featured-img placeholder" v-else>
                
              </div>
              <div class="featured-content">
                <div class="featured-name">{{ item.name || '未知景点' }}</div>
                <div class="featured-meta">
                  <span class="meta-location">{{ item.location || '位置未知' }}</span>
                </div>
              </div>
            </div>
            <div class="empty-featured" v-if="hotScenics.length === 0">
              <span>暂无推荐景点</span>
            </div>
          </div>
        </div>

        <!-- 推荐提示卡片 -->
        <div class="sidebar-card tip-card">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px;">
            <el-icon class="tip-icon">
              <InfoFilled />
            </el-icon>
            <span class="tip-text">发现心仪的景点？点击查看详情，规划你的完美旅程</span>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import NavComponent from "@/components/NavComponent.vue";
import { ElEmpty, ElSkeleton, ElPagination, ElIcon, ElRate } from 'element-plus';
import axios from 'axios';

export default {
  name: 'ScenicListView',
  components: {
    NavComponent,
    ElEmpty, ElSkeleton, ElPagination, ElIcon, ElRate
  },
  setup() {
    const router = useRouter();
    const scenicList = ref([]);
    const hotScenics = ref([]);
    const loading = ref(true);
    const selectedPrice = ref('all');
    const sortBy = ref('default');
    const currentPage = ref(1);
    const pageSize = ref(8);
    const total = ref(0);

    // 获取景点列表
    const fetchScenics = async () => {
      loading.value = true;
      try {
        const params = {
          pageNum: currentPage.value,
          size: pageSize.value,
          ticketPrice: selectedPrice.value === 'free' ? 0 : (selectedPrice.value === 'paid' ? 1 : null),
          sortBy: sortBy.value !== 'default' ? sortBy.value : null
        };

        // 过滤掉 null 值
        Object.keys(params).forEach(key => {
          if (params[key] === null || params[key] === '') {
            delete params[key];
          }
        });

        const response = await axios.get('http://localhost:8080/scenic-spots/getByConditional', { params });

        if (response.data.code === 200 && response.data.data) {
          const data = response.data.data;
          let list = data.list || data.records || [];

          scenicList.value = list.map(item => ({
            ...item,
            avgScore: item.avgScore || 0,
            viewCount: item.viewCount || 0,
            likeCount: item.likeCount || 0
          }));
          total.value = data.total || list.length;
        } else {
          scenicList.value = [];
          total.value = 0;
        }
      } catch (error) {
        console.error('获取景点列表失败:', error);
        scenicList.value = [];
        total.value = 0;
      } finally {
        loading.value = false;
      }
    };

    // 获取热门景点
    const fetchHotScenics = async () => {
      try {
        const response = await axios.get('http://localhost:8080/scenic-spots/getHotScenicSpots', {
          params: { pageNum: 1, size: 5 }
        });

        if (response.data.code === 200 && response.data.data) {
          const data = response.data.data;
          const list = data.list || data.records || [];

          hotScenics.value = list
            .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
            .slice(0, 5)
            .map(item => ({
              ...item,
              location: item.location || '位置未知'
            }));
        } else {
          hotScenics.value = [];
        }
      } catch (error) {
        console.error('获取热门景点失败:', error);
        hotScenics.value = [];
      }
    };


    // 选择价格筛选
    const selectPrice = (price) => {
      selectedPrice.value = price;
      currentPage.value = 1;
      fetchScenics();
    };

    // 分页处理
    const handlePageChange = (page) => {
      currentPage.value = page;
      fetchScenics();
    };

    // 格式化数量
    const formatCount = (count) => {
      count = count || 0;
      if (count >= 10000) return `${(count / 10000).toFixed(1)}w`;
      if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
      return count;
    };

    // 格式化日期
    const formatDate = (dateString) => {
      if (!dateString) return '-';
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };

    // 查看景点详情
    const viewScenic = (scenic) => {
      router.push({ name: 'spot-detail', params: { id: scenic.scenicId } });
    };

    onMounted(() => {
      fetchScenics();
      fetchHotScenics();
    });

    return {
      scenicList, hotScenics, loading, selectedPrice, sortBy,
      currentPage, pageSize, total,
      selectPrice, handlePageChange, formatCount, formatDate, viewScenic,
      fetchScenics
    };
  }
};
</script>


<style scoped>
.scenic-list-container {
  min-height: 100vh;
  background: linear-gradient(180deg, #f0f4f8 0%, #e2e8f0 100%);
  display: flex;
  flex-direction: column;
}

/* 主体布局：两栏 */
.scenic-layout {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 28px;
  width: 100%;
  margin: 0 auto;
  max-width: 1400px;
  /* background: white; */
  border-radius: 24px;
  padding: 24px 32px 40px 32px;
  /* box-shadow: 0 20px 50px -12px rgba(0, 20, 40, 0.15); */
  /* border: 1px solid rgba(255, 255, 255, 0.6); */
}

/* 左侧内容区 */
.scenic-left {
  display: flex;
  flex-direction: column;
}

/* 筛选与排序整体包装 */
.filter-sort-wrapper {
  display: flex;
  align-items: stretch;
  gap: 20px;
  margin-bottom: 28px;
}

/* 左侧筛选区 */
.filter-section {
  flex: 1;
  /* background: white; */
  border-radius: 20px;
  padding: 20px 24px;
  box-shadow: 0 8px 30px rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.1);
}

.filter-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 2px dashed #dce4ec;
}



.filter-title {
  font-weight: 700;
  color: #3a5568;
  font-size: 1rem;
}

.filter-tags {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-tag {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 25px;
  font-weight: 600;
  font-size: 0.9rem;
  color: #64748b;
  background: #f1f5f9;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 2px solid transparent;
}

.tag-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #94a3b8;
}

.tag-dot.free {
  background: #10b981;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
}

.tag-dot.paid {
  background: #f43f5e;
  box-shadow: 0 0 8px rgba(244, 63, 94, 0.5);
}

.filter-tag:hover {
  background: #dce4ec;
  border-color: #8fa8b8;
  color: #3a5568;
  transform: translateY(-2px);
}

.filter-tag.active {
  background: linear-gradient(135deg, #4a6b82, #2c4a5e);
  color: white;
  border-color: transparent;
  box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4);
}

.filter-tag.active .tag-dot {
  background: white;
}

/* 右侧排序区 */
.sort-section {
  min-width: 280px;
  /* background: white; */
  border-radius: 20px;
  padding: 20px 24px;
  box-shadow: 0 8px 30px rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.1);
}

.sort-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 2px dashed #dce4ec;
}



.sort-title {
  font-weight: 700;
  color: #3a5568;
  font-size: 1rem;
}

.sort-select {
  width: 100%;
}

:deep(.sort-select .el-input__wrapper) {
  border-radius: 14px;
  border: 2px solid #dce4ec;
  box-shadow: none;
  padding: 4px 12px;
}

:deep(.sort-select .el-input__wrapper:hover) {
  border-color: #8fa8b8;
}

:deep(.sort-select.is-focus .el-input__wrapper) {
  border-color: #4a6b82;
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
}

:deep(.sort-select .el-input__inner) {
  font-weight: 600;
  color: #3a5568;
}

/* 景点卡片网格 - 瀑布流风格 */
.scenic-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: 20px;
  gap: 20px;
  margin-bottom: 40px;
}

.loading-grid {
  grid-column: 1 / -1;
}

.scenic-card {
  background: #ffffff;
  border-radius: 24px;
  box-shadow: 0 10px 40px -10px rgba(0, 30, 50, 0.12);
  border: 1px solid rgba(59, 130, 246, 0.1);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.scenic-card:nth-child(4n+1) {
  grid-row: span 12;
}

.scenic-card:nth-child(4n+2) {
  grid-row: span 10;
}

.scenic-card:nth-child(4n+3) {
  grid-row: span 11;
}

.scenic-card:nth-child(4n) {
  grid-row: span 9;
}

.scenic-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 24px;
  padding: 2px;
  background: linear-gradient(135deg, #4a6b82, #2c4a5e);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0;
  z-index: 10;
  transition: opacity 0.4s ease;
}

.scenic-card:hover {
  transform: scale(1.02) translateY(-8px);
  box-shadow: 0 25px 50px -12px rgba(59, 130, 246, 0.25);
  z-index: 5;
}

.scenic-card:hover::before {
  opacity: 1;
}

.card-image {
  background: linear-gradient(145deg, #6a8ba0, #4a6b82);
  height: 100%;
  width: 100%;
  position: relative;
  overflow: hidden;
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  position: absolute;
  top: 0;
  left: 0;
  transition: transform 0.6s ease;
}

.scenic-card:hover .cover-img {
  transform: scale(1.12);
}

.image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 5rem;
  color: rgba(255, 255, 255, 0.3);
}

.price-tag {
  position: absolute;
  top: 14px;
  right: 14px;
  background: linear-gradient(135deg, #10b981, #34d399);
  color: white;
  font-size: 13px;
  padding: 8px 16px;
  border-radius: 24px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 6px;
  z-index: 2;
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
  backdrop-filter: blur(8px);
}

.price-tag.paid {
  background: linear-gradient(135deg, #f43f5e, #fb7185);
  box-shadow: 0 6px 20px rgba(244, 63, 94, 0.4);
}

.card-content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 60px 18px 18px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.4) 60%, transparent 100%);
  color: white;
}

.card-title {
  font-weight: 800;
  font-size: 1.2rem;
  margin-bottom: 8px;
  color: white;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

.scenic-card:hover .card-title {
  color: #6a8ba0;
}

.card-location {
  display: flex;
  align-items: center;
  gap: 6px;
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.85rem;
  margin-bottom: 8px;
}

.card-location .el-icon {
  color: #6a8ba0;
}

.card-rating {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.rating-text {
  font-size: 0.9rem;
  color: #fbbf24;
  font-weight: 700;
}

.card-desc {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.85rem;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 10px;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
}

.footer-stats {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 分页 */
.pagination {
  display: flex;
  justify-content: center;
  margin-top: 10px;
}

:deep(.el-pager li) {
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: #f5f9fc;
  color: #4a6b82;
  font-weight: 500;
  border: 1px solid #e2eaf2;
  margin: 0 3px;
  transition: all 0.3s ease;
}

:deep(.el-pager li.active) {
  background: linear-gradient(135deg, #3b6e9c, #2d5a7f);
  color: white;
  border: none;
  box-shadow: 0 4px 12px rgba(59, 110, 156, 0.3);
}

:deep(.el-pager li:hover:not(.active)) {
  background: #e8f1f7;
  border-color: #c8d8e8;
  color: #3b6e9c;
}

.total-count {
  text-align: right;
  margin-top: 12px;
  color: #809cb5;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
}

/* 空状态 */
.empty-state {
  grid-column: 1 / -1;
  padding: 60px 20px;
  display: flex;
  justify-content: center;
}

.empty-img {
  width: 180px;
  height: 180px;
}

/* 右侧边栏 */
.scenic-sidebar {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.sidebar-card {
  /* background: linear-gradient(145deg, #ffffff, #f8faff); */
  border-radius: 24px;
  padding: 24px;
  border: 1px solid rgba(99, 102, 241, 0.1);
  box-shadow: 0 10px 40px -10px rgba(99, 102, 241, 0.15);
}

/* 精选推荐卡片 */
.featured-card {
  position: relative;
  overflow: hidden;
}

.featured-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #4a6b82, #2c4a5e, #8fa8b8);
}

.featured-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

@keyframes sparkle {

  0%,
  100% {
    transform: scale(1) rotate(0deg);
  }

  50% {
    transform: scale(1.1) rotate(10deg);
  }
}

.featured-title {
  font-weight: 800;
  font-size: 1.3rem;
  color: #3a5568;
}

.featured-desc {
  color: #64748b;
  font-size: 0.9rem;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px dashed #dce4ec;
}

.featured-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.featured-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px;
  background: linear-gradient(135deg, #f8faff, #f1f5f9);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;
}

.featured-item:hover {
  background: linear-gradient(135deg, #dce4ec, #b0c4d4);
  border-color: #8fa8b8;
  transform: translateX(4px);
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.15);
}

.featured-rank {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 14px;
  background: linear-gradient(135deg, #dce4ec, #b0c4d4);
  color: #4a6b82;
  flex-shrink: 0;
}

.featured-rank.rank-1 {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: white;
  box-shadow: 0 4px 12px rgba(251, 191, 36, 0.4);
}

.featured-rank.rank-2 {
  background: linear-gradient(135deg, #94a3b8, #64748b);
  color: white;
}

.featured-rank.rank-3 {
  background: linear-gradient(135deg, #fb923c, #ea580c);
  color: white;
}

.featured-img {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  overflow: hidden;
  flex-shrink: 0;
}

.featured-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.featured-img.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #dce4ec, #b0c4d4);
  font-size: 1.5rem;
}

.featured-content {
  flex: 1;
  min-width: 0;
}

.featured-name {
  font-weight: 700;
  color: #1e293b;
  font-size: 0.95rem;
  margin-bottom: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.featured-item:hover .featured-name {
  color: #4a6b82;
}

.featured-meta {
  font-size: 0.8rem;
  color: #64748b;
}

.meta-location {
  display: flex;
  align-items: center;
  gap: 4px;
}

.empty-featured {
  text-align: center;
  padding: 24px;
  color: #94a3b8;
  font-size: 0.9rem;
}

/* 提示卡片 */
.tip-card {
  background: linear-gradient(135deg, #dce4ec, #b0c4d4);
}

.tip-icon {
  font-size: 1.8rem;
  color: #2e628c;
}

.tip-text {
  font-weight: 500;
  color: #1e3f5c;
  font-size: 0.95rem;
  flex: 1;
}



/* 响应式 */
@media (max-width: 1024px) {
  .scenic-layout {
    grid-template-columns: 1fr;
    max-width: 800px;
    padding: 20px 24px 32px 24px;
  }

  .scenic-sidebar {
    display: none;
  }

  .scenic-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .scenic-card:nth-child(n) {
    grid-row: span 10 !important;
  }
}

@media (max-width: 768px) {
  .scenic-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
  }

  .scenic-card:nth-child(n) {
    grid-row: span 8 !important;
  }

  .scenic-layout {
    padding: 16px 20px 30px 20px;
    border-radius: 16px;
    gap: 20px;
  }

  .card-content {
    padding: 40px 14px 14px;
  }

  .card-title {
    font-size: 1rem;
  }

  .filter-tabs {
    gap: 8px;
  }

  .filter-tab {
    padding: 8px 16px;
    font-size: 0.85rem;
  }

  .sort-bar {
    flex-wrap: wrap;
    gap: 8px;
  }
}
</style>
