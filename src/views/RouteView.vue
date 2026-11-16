<template>
    <nav-component search-placeholder="搜索路线..." />
  <div class="planner-page">
    <div class="planner-container">
      <div class="planner-header">
        <div class="title-section">
          <h1><el-icon><Guide /></el-icon> 行程规划</h1>
          <p>浏览各地旅行者的公开行程</p>
        </div>
        <div class="action-buttons">
          <el-button class="btn-primary" @click="createRoute">
            <el-icon><Plus /></el-icon> 规划路线
          </el-button>
        </div>
      </div>

      <div class="planner-main">
        <div class="itinerary-sidebar">
          <div class="plan-tabs">
            <span :class="['plan-tab', { active: planMode === 'all' }]" @click="switchPlan('all')">全部路线</span>
            <span :class="['plan-tab', { active: planMode === 'mine' }]" @click="switchPlan('mine')">我的规划</span>
          </div>
          <div class="trip-list" v-loading="loading">
            <div
              v-for="route in routeList"
              :key="route.id"
              :class="['trip-card', { active: currentTripId === route.id }]"
              @click="selectTrip(route)"
            >
              <div class="trip-title">
                <span>{{ route.title || '未命名行程' }}</span>
                <el-popconfirm v-if="planMode === 'mine'"
                  title="删除行程"
                  confirm-button-text="删除"
                  cancel-button-text="取消"
                  @confirm.stop="deleteRoute(route.id)">
                <template #reference>
                  <el-button type="danger" size="small" :icon="Delete" circle text />
                </template>
                </el-popconfirm>
              </div>
              <div class="trip-desc">{{ route.description || '暂无描述' }}</div>
              <div class="trip-meta">
                <span><el-icon><Location /></el-icon> {{ route.spotCount || 0 }}个景点</span>
                <span><el-icon><Timer /></el-icon> {{ route.days || 0 }}天</span>
                <span><el-icon><View /></el-icon> {{ route.viewCount || 0 }}</span>
              </div>
            </div>

            <div v-if="routeList.length === 0 && !loading" class="empty-list">
              <el-empty description="暂无路线">
                <el-button type="primary" @click="createRoute">创建第一条路线</el-button>
              </el-empty>
            </div>
          </div>

          <div class="pagination-wrap" v-show="total > 0">
            <el-pagination background layout="prev, pager, next" :total="total" :page-size="pageSize"
              :current-page="pageNum" small />
          </div>

          <button class="btn-new-trip" @click="createRoute">
            <el-icon><Plus /></el-icon> 创建新行程
          </button>
        </div>

        <div class="map-preview">
          <template v-if="currentTrip">
            <div class="detail-cover" v-if="currentTrip.coverImage">
              <img :src="currentTrip.coverImage" :alt="currentTrip.title" />
            </div>

            <div class="detail-header-info">
              <h2>{{ currentTrip.title || '未命名行程' }}</h2>
              <p>{{ currentTrip.description || '暂无描述' }}</p>
              <div class="detail-meta">
                <span><el-icon><Timer /></el-icon> {{ currentTrip.days || 0 }}天</span>
                <span><el-icon><Flag /></el-icon> {{ currentTripSpots.length }}个景点</span>
                <span><el-icon><View /></el-icon> {{ currentTrip.viewCount || 0 }}次浏览</span>
              </div>
            </div>

            <div class="spots-section">
              <div class="spots-section-title"><el-icon><Flag /></el-icon> 相关景点 ({{ currentTripSpots.length }})</div>
              <div v-if="currentTripSpots.length === 0" class="empty-spots">暂无景点</div>
              <div v-for="(item, sIdx) in sortedSpots" :key="sIdx" class="spot-item" @click="goToSpot(item)">
                <span class="spot-order">{{ sIdx + 1 }}</span>
                <div class="spot-img" v-if="item.scenic?.coverImage">
                  <img :src="item.scenic.coverImage" :alt="item.scenic.name" />
                </div>
                <div class="spot-img placeholder" v-else>
                  <el-icon><Location /></el-icon>
                </div>
                <div class="spot-detail">
                  <span class="spot-name">{{ item.scenic?.name || '未命名景点' }}</span>
                  <span v-if="item.scenic?.description" class="spot-desc">{{ item.scenic.description }}</span>
                </div>
              </div>
            </div>
          </template>

          <div v-else class="empty-editor">
            <el-empty description="请从左侧选择一个行程，或创建新行程" />
          </div>

          <div class="route-stats" v-if="currentTrip">
            <div><el-icon><Flag /></el-icon> 景点 {{ currentTripSpots.length }}个</div>
            <div><el-icon><Timer /></el-icon> 行程 {{ currentTrip.days || 0 }}天</div>
            <div><el-icon><View /></el-icon> 浏览 {{ currentTrip.viewCount || 0 }}</div>
          </div>
          <div class="route-stats" v-else>
            <div><el-icon><Flag /></el-icon> 景点 0个</div>
            <div><el-icon><Timer /></el-icon> 行程 0天</div>
            <div><el-icon><View /></el-icon> 浏览 0</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import NavComponent from '@/components/NavComponent.vue';
import {
  Plus, Location, Timer, Flag, View,
  Guide,Delete
} from '@element-plus/icons-vue';
import axios from 'axios';
import { ElMessage } from 'element-plus';

export default {
  name: 'RouteView',
  components: {
    NavComponent,
    Plus, Location, Timer, Flag, View,
    Guide
  },
  setup() {
    const router = useRouter();

    const routeList = ref([]);
    const loading = ref(false);
    const pageNum = ref(1);
    const pageSize = ref(12);
    const total = ref(0);

    const currentTripId = ref(null);
    const currentTrip = ref(null);
    const currentTripSpots = ref([]);
    const planMode = ref('all');

    const sortedSpots = computed(() => {
      return [...currentTripSpots.value].sort((a, b) => (a.spotOrder || 0) - (b.spotOrder || 0));
    });

    // 获取路线列表
    const fetchList = async () => {
      loading.value = true;
      try {
        const params = { pageNum: pageNum.value, size: pageSize.value };
        const token = localStorage.getItem('token');
        const url = planMode.value === 'mine'
          ? 'http://localhost:8080/route/getByUserId'
          : 'http://localhost:8080/route/list';
        const res = await axios.get(url, {
          params,
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.data.code === 200) {
          routeList.value = (res.data.data.list || []).map(item => ({
            ...item,
            days: item.days || 0,
            spotCount: item.spotCount || 0
          }));
          total.value = res.data.data.total || 0;
          currentTripId.value = null;
          currentTrip.value = null;
          currentTripSpots.value = [];
          if (routeList.value.length > 0) {
            selectTrip(routeList.value[0]);
          }
        } else {
          ElMessage.error('获取路线列表失败');
        }
      } catch (error) {
        console.error('获取路线列表失败:', error);
      } finally {
        loading.value = false;
      }
    };
    // 切换路线类型（全部/我的）
    const switchPlan = (mode) => {
      const token = localStorage.getItem('token');
      if (mode === 'mine' && !token) {
        ElMessage.warning('请先登录');
        router.push('/login');
        return;
      }
      planMode.value = mode;
      pageNum.value = 1;
      fetchList();
    };
    const deleteRoute = async (id) => {
      try { 
        const token = localStorage.getItem('token');
        const res = await axios.delete(`http://localhost:8080/route/delete/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.data.code === 200) {
          ElMessage.success('行程删除成功');
          fetchList();
        } else {
          ElMessage.error('行程删除失败');
        }
      } catch (error) {
        console.error('行程删除失败:', error);
        ElMessage.error('行程删除失败');
      }
    };

    const fetchScenicDetail = async (spotId) => {
      try {
        const res = await axios.get(`http://localhost:8080/scenic-spots/get/${spotId}`);
        if (res.data.code === 200) {
          return res.data.data;
        }
      } catch (e) {
        console.warn(`获取景点 ${spotId} 详情失败`, e);
      }
      return null;
    };

    const selectTrip = async (trip) => {
      currentTripId.value = trip.id;
      currentTrip.value = trip;
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`http://localhost:8080/route/${trip.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.data.code === 200) {
          currentTrip.value = res.data.data.route;
          const spots = res.data.data.spots || [];
          const enriched = await Promise.all(spots.map(async (s) => {
            if (s.spotId) {
              const scenic = await fetchScenicDetail(s.spotId);
              return { ...s, scenic };
            }
            return s;
          }));
          currentTripSpots.value = enriched;
        }
      } catch (error) {
        currentTripSpots.value = [];
      }
    };

    const goToSpot = (item) => {
      if (!item.scenic) {
        ElMessage.warning('该景点不在系统中');
        return;
      }
      const id = item.scenic.scenicId || item.spotId;
      if (id) {
        window.open(`/spot/${id}`, '_blank');
      }
    };

    const createRoute = () => {
      const token = localStorage.getItem('token');
      if (!token) {
        ElMessage.warning('请先登录');
        router.push('/login');
        return;
      }
      router.push('/routes/edit');
    };

    watch(pageNum, () => {
      fetchList();
    });

    onMounted(() => {
      fetchList();
    });

    return {
      routeList, loading, pageNum, pageSize, total,
      currentTripId, currentTrip, currentTripSpots, sortedSpots,
      planMode, selectTrip, createRoute, goToSpot, switchPlan, deleteRoute,Delete
    };
  }
};
</script>

<style scoped>
.planner-page {
  min-height: 100vh;
  background: linear-gradient(145deg, #f4f7fc 0%, #eef2f8 100%);
  padding: 2rem 1.5rem 3rem;
}
.planner-container {
  max-width: 1400px;
  margin: 0 auto;
  background: white;
  border-radius: 2rem;
  box-shadow: 0 20px 35px -12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.planner-header {
  padding: 1.2rem 2rem;
  background: white;
  border-bottom: 1px solid #ecf3fa;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}
.title-section {
  text-align: left;
}
.title-section h1 {
  font-size: 1.6rem;
  font-weight: 800;
  background: linear-gradient(135deg, #1e293b, #2d3a5e);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.title-section p {
  font-size: 0.8rem;
  color: #5b6e8c;
  margin: 0;
}
.action-buttons { display: flex; gap: 0.8rem; }
.btn-primary {
  background: linear-gradient(105deg, #3a5568, #4a6b82);
  border: none; padding: 0.6rem 1.4rem;
  border-radius: 2rem; color: white; font-weight: 600; cursor: pointer;
}

.planner-main { display: flex; flex-wrap: wrap; }
.itinerary-sidebar {
  flex: 1.2; min-width: 320px;
  background: #fefefe;
  border-right: 1px solid #ecf3fa;
  padding: 1.2rem 1rem 2rem 1.5rem;
  max-height: 80vh; overflow-y: auto;
}
.map-preview {
  flex: 2; min-width: 400px;
  background: #f9fafb;
  padding: 1.5rem;
  display: flex; flex-direction: column; gap: 1rem;
  max-height: 80vh; overflow-y: auto;
}

.plan-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  background: #f1f5f9;
  border-radius: 12px;
  padding: 4px;
}
.plan-tab {
  flex: 1;
  text-align: center;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
}
.plan-tab:hover { color: #1e293b; }
.plan-tab.active {
  background: white;
  color: #3a5568;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
.trip-list {
   display: flex; flex-direction: column; gap: 0.8rem; margin-bottom: 1rem;
   }
.trip-card {
  background: white;
  border: 1px solid #eef2ff;
  border-radius: 1.2rem; padding: 1rem;
  cursor: pointer; transition: all 0.2s;
}
.trip-card.active {
  border-left: 5px solid #3a5568;
  background: #fafcff;
  box-shadow: 0 6px 12px -6px rgba(79, 70, 229, 0.2);
}
.trip-card:hover { transform: translateX(4px); background: #f8fafc; }
.trip-title {
  font-weight: 700; font-size: 1rem;
  display: flex; justify-content: space-between; align-items: center;
  color: #1e293b;
}

.trip-desc {
  font-size: 0.75rem; color: #94a3b8;
  margin-top: 0.3rem;
  display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;
}
.trip-meta {
  font-size: 0.7rem; color: #5b6e8c;
  margin-top: 0.4rem; display: flex; gap: 0.8rem; flex-wrap: wrap;
}
.trip-meta .el-icon { font-size: 0.7rem; }
.empty-list { padding: 1rem 0; }

.pagination-wrap { display: flex; justify-content: center; margin-bottom: 1rem; }

.btn-new-trip {
  width: 100%;
  background: #eef2ff; border: 1px dashed #cbd5e1;
  border-radius: 1rem; padding: 0.7rem;
  font-size: 0.8rem; font-weight: 500; cursor: pointer;
  color: #3a5568;
  display: flex; align-items: center; justify-content: center; gap: 0.5rem;
}
.btn-new-trip:hover { background: #dce4ec; border-color: #3a5568; }

.detail-cover {
  height: 200px;
  border-radius: 1.5rem;
  overflow: hidden;
  background: #f1f5f9;
}
.detail-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.detail-header-info {
  text-align: left;
}
.detail-header-info h2 {
  margin: 0 0 0.5rem;
  font-size: 1.4rem;
  font-weight: 800;
  color: #1e293b;
}
.detail-header-info p {
  margin: 0 0 0.8rem;
  font-size: 0.85rem;
  color: #64748b;
  line-height: 1.6;
}
.detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.75rem;
  color: #5b6e8c;
}
.detail-meta .el-icon { color: #3a5568; }

.spots-section { background: white; border-radius: 1.2rem; padding: 1rem; border: 1px solid #eef2ff; }
.spots-section-title { font-weight: 700; color: #1e293b; margin-bottom: 0.8rem; display: flex; align-items: center; gap: 0.4rem; }

.spot-item {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.6rem 0;
  border-bottom: 1px dashed #ecf3fa;
  cursor: pointer;
  transition: background 0.2s;
  border-radius: 0.6rem;
}
.spot-item:hover { background: #f8fafc; padding-left: 0.4rem; padding-right: 0.4rem; }
.spot-item:last-child { border-bottom: none; }
.spot-img {
  width: 50px;
  height: 50px;
  border-radius: 0.8rem;
  overflow: hidden;
  flex-shrink: 0;
  background: #f1f5f9;
}
.spot-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.spot-img.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-size: 1.2rem;
}
.spot-info { display: flex; align-items: flex-start; gap: 0.8rem; flex: 1; }
.spot-order {
  width: 24px; height: 24px; background: #eef2ff;
  border-radius: 30px; display: inline-flex; align-items: center; justify-content: center;
  font-size: 0.7rem; font-weight: bold; color: #3a5568; flex-shrink: 0;
}
.spot-detail { display: flex; flex-direction: column; gap: 2px; flex: 1; }
.spot-name { font-weight: 600; color: #1e293b; font-size: 0.85rem; }
.spot-desc { font-size: 0.7rem; color: #94a3b8; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
.empty-spots { color: #94a3b8; font-size: 0.75rem; text-align: center; padding: 1rem; }
.empty-editor { text-align: center; padding: 2rem; color: #94a3b8; }

.route-stats {
  background: white; border-radius: 1rem; padding: 0.8rem;
  display: flex; justify-content: space-between; flex-wrap: wrap;
  font-size: 0.75rem; color: #475569;
}
.route-stats .el-icon { color: #3a5568; }

@media (max-width: 800px) {
  .planner-page { padding: 0.8rem; }
  .planner-main { flex-direction: column; }
  .itinerary-sidebar, .map-preview { max-height: none; }
  .itinerary-sidebar { border-right: none; border-bottom: 1px solid #ecf3fa; }
}
</style>
