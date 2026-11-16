<template>
  <div class="route-detail-page">
    <nav-component />

    <div class="route-detail-container" v-loading="loading">
      <div v-if="!loading && route" class="detail-content">
        <div class="detail-header">
          <div class="header-cover">
            <img v-if="route.coverImage" :src="route.coverImage" :alt="route.title" />
            <div v-else class="cover-placeholder">
              <el-icon>
                <Guide />
              </el-icon>
            </div>
            <div class="header-overlay">
              <div class="header-info">
                <el-tag v-if="route.type" class="type-tag">{{ route.type }}</el-tag>
                <h1>{{ route.title }}</h1>
                <div class="route-meta">
                  <span><el-icon>
                      <Location />
                    </el-icon> {{ route.days }}天</span>
                  <span><el-icon>
                      <Flag />
                    </el-icon> {{ route.spots?.length || 0 }}个景点</span>
                  <span><el-icon>
                      <View />
                    </el-icon> {{ route.viewCount || 0 }}次浏览</span>
                </div>
              </div>
              <div class="author-info" v-if="route.author">
                <img v-if="route.authorAvatar" :src="route.authorAvatar" class="author-avatar" />
                <div v-else class="author-avatar-placeholder">
                  <el-icon>
                    <User />
                  </el-icon>
                </div>
                <div class="author-text">
                  <span class="author-label">路线作者</span>
                  <span class="author-name">{{ route.authorName || '匿名用户' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="detail-body">
          <div class="main-content">
            <el-card class="description-card">
              <template #header>
                <h3>路线介绍</h3>
              </template>
              <p>{{ route.description || '暂无详细介绍' }}</p>
            </el-card>

            <el-card class="spots-card">
              <template #header>
                <h3>路线景点</h3>
              </template>
              <div class="spots-timeline">
                <div v-for="(spot, index) in route.spots" :key="spot.id || index" class="spot-item"
                  @click="goToSpot(spot.scenicId || spot.spotId)">
                  <div class="spot-content">
                    <img v-if="spot.image" :src="spot.image" class="spot-image" />
                    <div v-else class="spot-image-placeholder">
                      <el-icon>
                        <Picture />
                      </el-icon>
                    </div>
                    <div class="spot-info">
                      <h4>{{ spot.name }}</h4>
                      <p>{{ spot.description || '暂无描述' }}</p>
                      <div class="spot-tags" v-if="spot.tags">
                        <el-tag v-for="tag in spot.tags.split(',')" :key="tag" size="small">{{ tag }}</el-tag>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </el-card>
          </div>

          <div class="sidebar">
            <el-card class="action-card">
              <el-button type="primary" size="large" class="action-btn" @click="startRoute">
                <el-icon>
                  <Flag />
                </el-icon> 开启行程
              </el-button>
              <el-button size="large" class="action-btn" @click="collectRoute">
                <el-icon>
                  <Star />
                </el-icon> {{ isCollected ? '已收藏' : '收藏路线' }}
              </el-button>
              <el-button size="large" class="action-btn" @click="shareRoute">
                <el-icon>
                  <Share />
                </el-icon> 分享
              </el-button>
            </el-card>

            <el-card class="info-card">
              <template #header>
                <h4>路线信息</h4>
              </template>
              <ul class="info-list">
                <li>
                  <span class="label">行程天数</span>
                  <span class="value">{{ route.days }}天</span>
                </li>
                <li>
                  <span class="label">景点数量</span>
                  <span class="value">{{ route.spots?.length || 0 }}个</span>
                </li>
                <li>
                  <span class="label">最佳季节</span>
                  <span class="value">{{ route.bestSeason || '全年适宜' }}</span>
                </li>
                <li>
                  <span class="label">难度等级</span>
                  <span class="value">{{ route.difficulty || '休闲' }}</span>
                </li>
              </ul>
            </el-card>
          </div>
        </div>
      </div>

      <div v-if="!loading && !route" class="empty-state">
        <el-result icon="warning" title="路线不存在" sub-title="您访问的路线可能已被删除">
          <template #extra>
            <el-button type="primary" @click="goToRoutes">返回路线列表</el-button>
          </template>
        </el-result>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import NavComponent from '@/components/NavComponent.vue';
import { Guide, Location, Flag, User, Picture, Star, Share } from '@element-plus/icons-vue';
import axios from 'axios';
import { ElMessage } from 'element-plus';

export default {
  name: 'RouteDetailView',
  components: { NavComponent, Guide, Location, Flag, User, Picture, Star, Share },
  setup() {
    const router = useRouter();
    const route = useRoute();

    const loading = ref(true);
    const routeData = ref(null);
    const isCollected = ref(false);

    const fetchDetail = async () => {
      loading.value = true;
      try {
        const id = route.params.id;
        const res = await axios.get(`http://localhost:8080/route/${id}`);
        if (res.data.code === 200) {
          const data = res.data.data;

          const routeInfo = data.route;

          if (data.spots && data.spots.length > 0) {
            const spotDetails = [];
            for (const spot of data.spots) {
              const spotId = spot.spotId || spot.spot_id;
              if (spotId) {
                const spotRes = await axios.get(`http://localhost:8080/scenic-spots/get/${spotId}`);
                if (spotRes.data.code === 200 && spotRes.data.data) {
                  spotDetails.push({
                    ...spotRes.data.data,
                    dayNum: spot.dayNum || spot.day_num,
                    spotOrder: spot.spotOrder || spot.spot_order
                  });
                } else {
                  spotDetails.push(spot);
                }
              } else {
                spotDetails.push(spot);
              }
            }
            routeInfo.spots = spotDetails;
          } else {
            routeInfo.spots = [];
          }

          routeData.value = routeInfo;
        } else {
          ElMessage.error('获取路线详情失败');
        }
      } catch (error) {
        console.error('获取路线详情失败:', error);
        ElMessage.error('获取路线详情失败');
      } finally {
        loading.value = false;
      }
    };

    const goToSpot = (id) => {
      if (id) {
        router.push(`/spot/${id}`);
      }
    };

    const goToRoutes = () => {
      router.push('/routes');
    };

    const startRoute = () => {
      ElMessage.info('行程规划功能开发中');
    };

    const collectRoute = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        ElMessage.warning('请先登录');
        router.push('/login');
        return;
      }

      try {
        if (isCollected.value) {
          await axios.delete(`http://localhost:8080/route/collect/${routeData.value.id}`);
          isCollected.value = false;
          ElMessage.success('已取消收藏');
        } else {
          await axios.post(`http://localhost:8080/route/collect/${routeData.value.id}`);
          isCollected.value = true;
          ElMessage.success('收藏成功');
        }
      } catch (error) {
        ElMessage.error('操作失败');
      }
    };

    const shareRoute = () => {
      const url = window.location.href;
      navigator.clipboard.writeText(url).then(() => {
        ElMessage.success('链接已复制到剪贴板');
      }).catch(() => {
        ElMessage.error('复制失败');
      });
    };

    onMounted(() => {
      fetchDetail();
    });

    return {
      loading,
      route: routeData,
      isCollected,
      goToSpot,
      goToRoutes,
      startRoute,
      collectRoute,
      shareRoute
    };
  }
};
</script>

<style scoped>
.route-detail-page {
  min-height: 100vh;
  background: #f5f7fa;
}

.route-detail-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.detail-header {
  margin-bottom: 24px;
}

.header-cover {
  height: 400px;
  border-radius: 20px;
  overflow: hidden;
  position: relative;
}

.header-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #a8d5a2, #c8e6c9);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 6rem;
  color: rgba(255, 255, 255, 0.6);
}

.header-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 40px;
}

.header-info {
  color: white;
}

.type-tag {
  margin-bottom: 12px;
}

.header-info h1 {
  margin: 0 0 16px;
  font-size: 2.2rem;
}

.route-meta {
  display: flex;
  gap: 24px;
  font-size: 15px;
}

.route-meta span {
  display: flex;
  align-items: center;
  gap: 6px;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.15);
  padding: 12px 20px;
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.author-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
}

.author-avatar-placeholder {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
}

.author-text {
  display: flex;
  flex-direction: column;
}

.author-label {
  font-size: 12px;
  opacity: 0.8;
}

.author-name {
  font-weight: 600;
  font-size: 16px;
}

.detail-body {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 24px;
}

.main-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.description-card :deep(.el-card__header) h3,
.spots-card :deep(.el-card__header) h3 {
  margin: 0;
  font-size: 1.2rem;
  color: #1f2b38;
}

.description-card p {
  line-height: 1.8;
  color: #666;
}

.spots-timeline {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.spot-item {
  display: flex;
  gap: 16px;
  cursor: pointer;
  transition: all 0.3s;
}

.spot-item:hover {
  transform: translateX(8px);
}

.spot-number {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #27ae60, #1e8449);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  flex-shrink: 0;
}

.spot-content {
  flex: 1;
  display: flex;
  gap: 16px;
  background: #f9fafb;
  border-radius: 12px;
  padding: 16px;
}

.spot-image {
  width: 120px;
  height: 80px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}

.spot-image-placeholder {
  width: 120px;
  height: 80px;
  border-radius: 8px;
  background: #e6f0f8;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3b6e9c;
  font-size: 2rem;
  flex-shrink: 0;
}

.spot-info h4 {
  margin: 0 0 8px;
  color: #1f2b38;
  font-size: 1rem;
}

.spot-info p {
  margin: 0 0 8px;
  color: #666;
  font-size: 13px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.spot-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.action-card {
  position: sticky;
  top: 100px;
}

.action-card .action-btn {
  width: 100%;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.info-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.info-list li {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #f0f4f8;
}

.info-list li:last-child {
  border-bottom: none;
}

.info-list .label {
  color: #999;
}

.info-list .value {
  color: #1f2b38;
  font-weight: 500;
}

.empty-state {
  padding: 60px 0;
}

@media (max-width: 1024px) {
  .detail-body {
    grid-template-columns: 1fr;
  }

  .sidebar {
    position: static;
  }

  .header-cover {
    height: 300px;
  }
}

@media (max-width: 768px) {
  .header-cover {
    height: 250px;
  }

  .header-overlay {
    flex-direction: column;
    align-items: flex-start;
    gap: 20px;
    padding: 24px;
  }

  .header-info h1 {
    font-size: 1.6rem;
  }

  .spot-content {
    flex-direction: column;
  }

  .spot-image,
  .spot-image-placeholder {
    width: 100%;
    height: 120px;
  }
}
</style>
