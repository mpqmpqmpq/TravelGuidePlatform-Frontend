<template>
  <div class="dest-detail-page">
    <nav-component />

    <div class="detail-container" v-loading="loading">
      <!-- 头部封面 -->
      <div class="detail-header" :style="{ backgroundImage: `url(${destination.coverImage || '/default-cover.jpg'})` }">
        <div class="header-overlay">
          <div class="header-content">
            <h1 class="dest-title">{{ destination.name }}</h1>
            <p class="dest-location">
              <el-icon><Location /></el-icon>
              {{ destination.province }} · {{ destination.city }} · {{ destination.location }}
            </p>
            <div class="dest-tags" v-if="destination.tags">
              <span v-for="tag in destination.tags.split(',')" :key="tag" class="tag">{{ tag }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="detail-content">
        <!-- 左侧主体 -->
        <div class="detail-main">
          <!-- 基本信息 -->
          <div class="info-card">
            <h3><el-icon><InfoFilled /></el-icon> 目的地简介</h3>
            <p class="description">{{ destination.description || '暂无详细介绍' }}</p>
          </div>

          <!-- 相关景点 -->
          <div class="spots-section" v-if="relatedSpots.length > 0">
            <h3><el-icon><Location /></el-icon> 相关景点</h3>
            <div class="spots-grid">
              <div v-for="spot in relatedSpots" :key="spot.scenicId" class="spot-card" @click="goToSpot(spot.scenicId)">
                <div class="spot-image">
                  <img v-if="spot.coverImage" :src="spot.coverImage" :alt="spot.name" />
                  <div v-else class="spot-placeholder">🏞️</div>
                </div>
                <div class="spot-info">
                  <h4>{{ spot.name }}</h4>
                  <p class="spot-location">{{ spot.location }}</p>
                  <div class="spot-rating">
                    <el-rate v-model="spot.avgScore" disabled :max="5" allow-half size="small" />
                    <span>{{ Number(spot.avgScore)?.toFixed(1) || '0.0' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 相关攻略 -->
          <div class="articles-section" v-if="relatedArticles.length > 0">
            <h3><el-icon><Document /></el-icon> 相关攻略</h3>
            <div class="articles-list">
              <div v-for="article in relatedArticles" :key="article.articleId" class="article-card" @click="goToArticle(article.articleId)">
                <img v-if="article.coverImage" :src="article.coverImage" class="article-cover" />
                <div v-else class="article-cover placeholder">📄</div>
                <div class="article-info">
                  <h4>{{ article.title }}</h4>
                  <p>{{ stripHtml(article.content)?.substring(0, 80) }}...</p>
                  <div class="article-meta">
                    <span>{{ article.userName }}</span>
                    <span><el-icon><View /></el-icon> {{ article.viewCount }}</span>
                    <span><el-icon><Star /></el-icon> {{ article.likeCount }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧边栏 -->
        <div class="detail-sidebar">
          <div class="stats-card">
            <h4>数据统计</h4>
            <div class="stats-list">
              <div class="stat-item">
                <el-icon><View /></el-icon>
                <span class="stat-value">{{ destination.viewCount || 0 }}</span>
                <span class="stat-label">浏览</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import NavComponent from '@/components/NavComponent.vue';
import { Location, InfoFilled, Document, View, Star } from '@element-plus/icons-vue';
import axios from 'axios';
import { ElMessage } from 'element-plus';

export default {
  name: 'DestinationDetailView',
  components: { NavComponent, Location, InfoFilled, Document, View, Star },
  setup() {
    const router = useRouter();
    const route = useRoute();
    
    const loading = ref(true);
    const destination = ref({});
    const relatedSpots = ref([]);
    const relatedArticles = ref([]);

    const fetchDetail = async () => {
      loading.value = true;
      try {
        const res = await axios.get(`http://localhost:8080/destination/${route.params.id}`);
        if (res.data.code === 200) {
          destination.value = res.data.data;
        } else {
          ElMessage.error('目的地不存在');
          router.push('/destinations');
        }
      } catch (error) {
        console.error('获取详情失败:', error);
        ElMessage.error('获取详情失败');
      } finally {
        loading.value = false;
      }
    };
    // 获取相关景点
    const fetchRelatedSpots = async () => {
      try {
        const res = await axios.get('http://localhost:8080/scenic-spots/list', {
          params: { pageNum: 1, size: 6, location: destination.value.location }
        });
        if (res.data.code === 200) {
          relatedSpots.value = res.data.data.list || [];
        }
      } catch (error) {
        console.error('获取景点失败:', error);
      }
    };

    const fetchRelatedArticles = async () => {
      try {
        // 根据目的地的标签查询相关攻略
        if (!destination.value.tags) {
          // 如果没有标签，则获取热门攻略
          const res = await axios.get('http://localhost:8080/article/getHotArticles');
          if (res.data.code === 200) {
            relatedArticles.value = (res.data.data.list || res.data.data || []).slice(0, 4);
          }
          return;
        }
        
        const tags = destination.value.tags.split(',');
        if (tags.length > 0) {
          // 用第一个标签查询相关攻略
          const res = await axios.get('http://localhost:8080/article/search', {
            params: { keyword: tags[0].trim(), sort: 'hot' }
          });
          if (res.data.code === 200) {
            relatedArticles.value = (res.data.data.list || res.data.data || []).slice(0, 4);
          }
        }
      } catch (error) {
        console.error('获取攻略失败:', error);
        // 失败时获取热门攻略兜底
        try {
          const res = await axios.get('http://localhost:8080/article/getHotArticles');
          if (res.data.code === 200) {
            relatedArticles.value = (res.data.data.list || res.data.data || []).slice(0, 4);
          }
        } catch (e) {
          console.error('获取热门攻略也失败:', e);
        }
      }
    };

    const goToSpot = (id) => {
      router.push(`/spot/${id}`);
    };

    const goToArticle = (id) => {
      router.push(`/article/${id}`);
    };

onMounted(async () => {
      await fetchDetail();
      if (destination.value.location) {
        fetchRelatedSpots();
      }
      await fetchRelatedArticles();
    });
    
    // 移除HTML标签
    const stripHtml = (html) => {
      if (!html) return '';
      return html.replace(/<[^>]*>/g, '').trim();
    };
    
    return {
      loading,
      destination,
      relatedSpots,
      relatedArticles,
      goToSpot,
      goToArticle,
      stripHtml
    };
  }
};
</script>

<style scoped>
.dest-detail-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f0f4f8 0%, #e2e8f0 100%);
}

.detail-container {
  max-width: 1400px;
  margin: 0 auto;
}

.detail-header {
  height: 320px;
  background-size: cover;
  background-position: center;
  position: relative;
  overflow: hidden;
}

.detail-header::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(59, 110, 156, 0.3) 0%, rgba(0, 0, 0, 0.5) 100%);
}

.header-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 50%, transparent 100%);
  display: flex;
  align-items: flex-end;
}

.header-content {
  padding: 40px 48px;
  color: white;
  position: relative;
  z-index: 1;
  width: 100%;
}

.dest-title {
  font-size: 2.8rem;
  margin: 0 0 14px;
  font-weight: 700;
  text-shadow: 0 2px 20px rgba(0, 0, 0, 0.3);
  letter-spacing: 1px;
}

.dest-location {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 18px;
  font-size: 1.1rem;
  opacity: 0.95;
}

.dest-location .el-icon {
  color: #7dd3fc;
}

.dest-tags {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.tag {
  background: linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.1));
  backdrop-filter: blur(8px);
  padding: 8px 18px;
  border-radius: 24px;
  font-size: 13px;
  font-weight: 500;
  border: 1px solid rgba(255,255,255,0.2);
  transition: all 0.3s ease;
}

.tag:hover {
  background: rgba(255,255,255,0.35);
  transform: translateY(-2px);
}

.detail-content {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 28px;
  padding: 28px 40px 40px;
}

.detail-main {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.info-card, .stats-card {
  background: white;
  border-radius: 20px;
  padding: 28px;
  box-shadow: 0 8px 30px rgba(0, 20, 40, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.6);
}

.info-card h3, .spots-section h3, .articles-section h3 {
  margin: 0 0 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #1a2535;
  font-size: 1.2rem;
  font-weight: 600;
  padding-bottom: 14px;
  border-bottom: 2px solid #e8eef4;
  position: relative;
}

.info-card h3::before, .spots-section h3::before, .articles-section h3::before {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 40px;
  height: 2px;
  background: linear-gradient(90deg, #3b6e9c, #5a9bc7);
  border-radius: 1px;
}

.info-card h3 .el-icon, .spots-section h3 .el-icon, .articles-section h3 .el-icon {
  color: #3b6e9c;
  font-size: 22px;
}

.description {
  color: #4a5a6a;
  line-height: 2;
  margin: 0;
  font-size: 15px;
  background: linear-gradient(135deg, #f8fcff, #f3f8fb);
  padding: 20px;
  border-radius: 14px;
  border: 1px solid #e5ecf2;
}

.spots-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.spot-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid #e8eef4;
}

.spot-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 16px 32px -8px rgba(0, 30, 50, 0.15);
  border-color: #c8d8e8;
}

.spot-image {
  height: 140px;
  background: linear-gradient(145deg, #d8e5f0, #e8f0f5);
  position: relative;
  overflow: hidden;
}

.spot-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.spot-card:hover .spot-image img {
  transform: scale(1.08);
}

.spot-placeholder {
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
}

.spot-info {
  padding: 16px;
}

.spot-info h4 {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
  color: #1a2535;
  transition: color 0.3s ease;
}

.spot-card:hover .spot-info h4 {
  color: #3b6e9c;
}

.spot-location {
  margin: 0 0 10px;
  font-size: 13px;
  color: #7a8a9a;
  display: flex;
  align-items: center;
  gap: 4px;
}

.spot-rating {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #5a6a7a;
}

.articles-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.article-card {
  display: flex;
  gap: 18px;
  background: white;
  border-radius: 14px;
  padding: 14px;
  cursor: pointer;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid #e8eef4;
}

.article-card:hover {
  transform: translateX(6px);
  box-shadow: 0 8px 24px -4px rgba(0, 30, 50, 0.12);
  border-color: #c8d8e8;
}

.article-cover {
  width: 140px;
  height: 90px;
  object-fit: cover;
  border-radius: 12px;
  flex-shrink: 0;
}

.article-cover.placeholder {
  width: 140px;
  height: 90px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #d8e5f0, #e8f0f5);
  font-size: 2.2rem;
  border-radius: 12px;
}

.article-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.article-info h4 {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
  color: #1a2535;
  transition: color 0.3s ease;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-card:hover .article-info h4 {
  color: #3b6e9c;
}

.article-info p {
  margin: 0 0 10px;
  font-size: 13px;
  color: #6a7a8a;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-meta {
  display: flex;
  gap: 20px;
  font-size: 12px;
  color: #8a9aa8;
}

.article-meta span {
  display: flex;
  align-items: center;
  gap: 5px;
}

.detail-sidebar {
  position: sticky;
  top: 110px;
}

.stats-card h4 {
  margin: 0 0 20px;
  color: #1a2535;
  font-size: 1.1rem;
  font-weight: 600;
  padding-bottom: 12px;
  border-bottom: 2px solid #e8eef4;
}

.stats-list {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  background: linear-gradient(135deg, #f8fcff, #f3f8fb);
  border-radius: 12px;
  border: 1px solid #e5ecf2;
  transition: all 0.3s ease;
}

.stat-item:hover {
  background: linear-gradient(135deg, #f0f6fb, #e8f2f8);
  transform: translateX(4px);
}

.stat-item .el-icon {
  font-size: 22px;
  color: #3b6e9c;
  background: white;
  padding: 8px;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(59, 110, 156, 0.15);
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #1a2535;
}

.stat-label {
  color: #7a8a9a;
  font-size: 13px;
}

@media (max-width: 1200px) {
  .spots-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 1024px) {
  .detail-content {
    grid-template-columns: 1fr;
    padding: 24px 28px 32px;
  }
  
  .spots-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .detail-sidebar {
    position: static;
  }
}

@media (max-width: 768px) {
  .detail-content {
    padding: 16px 20px 24px;
  }
  
  .header-content {
    padding: 24px;
  }
  
  .dest-title {
    font-size: 1.9rem;
  }
  
  .spots-grid {
    grid-template-columns: 1fr;
  }
  
  .article-card {
    flex-direction: column;
  }
  
  .article-cover, .article-cover.placeholder {
    width: 100%;
    height: 160px;
  }
}
</style>
