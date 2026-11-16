<template>
  <div class="home">
    <!-- 导航栏 -->
    <nav-component search-placeholder="搜索攻略..." />

    <!-- 主内容区域 -->
    <div class="home-content-wrapper">
      <!-- Hero 横幅区域：新增渐变背景和大标题 -->
      <div class="hero-section">
        <div class="hero-text">
          <h1 class="hero-title">发现世界，从一篇攻略开始</h1>
          <p class="hero-subtitle">千万旅行者的真实经验，助你规划完美旅程</p>
        </div>
        <div class="hero-search">
          <input type="text" placeholder="输入目的地，比如'稻城亚丁'" class="hero-search-input" v-model="heroSearchKeyword"
            @keyup.enter="handleHeroSearch">
          <button class="hero-search-btn" @click="handleHeroSearch">搜索攻略</button>
        </div>
      </div>

      <!-- 功能卡片网格 -->
      <div class="section-header">
        <h2 class="section-title">快速入口</h2>
      </div>
      <div class="card-grid">
        <!-- AI 助手卡片 -->
        <router-link to="/chat" class="feature-card">
          <div class="card-header">
            <div class="card-icon ai-icon">
              <el-icon>
                <Cpu />
              </el-icon>
            </div>
            <h3 class="card-title">AI 助手</h3>
          </div>
          <p class="card-description">智能 AI 辅助，解答你的疑问</p>
        </router-link>

        <!-- 写文章卡片 -->
        <router-link to="/article/edit" class="feature-card">
          <div class="card-header">
            <div class="card-icon write-icon">
              <el-icon>
                <EditPen />
              </el-icon>
            </div>
            <h3 class="card-title">分享攻略</h3>
          </div>
          <p class="card-description">分享攻略，分享你的观点与经验</p>
        </router-link>

        <!-- 私信卡片 -->
        <router-link to="/messages" class="feature-card">
          <div class="card-header">
            <el-badge :value="totalUnreadMessages" :max="99" :hidden="totalUnreadMessages === 0" class="message-badge">
              <div class="card-icon message-icon">
                <el-icon>
                  <Message />
                </el-icon>
              </div>
            </el-badge>
            <h3 class="card-title">私信</h3>
          </div>
          <p class="card-description">查看好友消息，实时沟通交流</p>
        </router-link>

        <!-- 通知卡片 -->
        <router-link to="/notifications" class="feature-card">
          <div class="card-header">
            <div class="card-icon notification-card-icon">
              <el-icon>
                <Bell />
              </el-icon>
            </div>
            <h3 class="card-title">通知</h3>
          </div>
          <p class="card-description">查看系统消息和互动提醒</p>
        </router-link>
      </div>

      <!-- 精选攻略推荐 -->
      <div class="section-header">
        <h2 class="section-title">精选攻略</h2>
        <router-link to="/articles" class="view-all-link">
          更多攻略 <el-icon>
            <ArrowRight />
          </el-icon>
        </router-link>
      </div>
      <div class="article-grid">
        <div class="article-card" v-for="article in recommendedArticles" :key="article.articleId">
          <div class="card-image-placeholder" v-if="!article.coverImage">
            <el-icon>
              <Picture />
            </el-icon>
          </div>
          <img v-else :src="article.coverImage" :alt="article.title" class="card-cover-image">
          <div class="article-content">
            <h3 class="article-title">{{ article.title }}</h3>
            <div class="article-meta">
              <span class="views"><el-icon>
                  <View />
                </el-icon> {{ formatNumber(article.viewCount || 0) }} 阅读</span>
            </div>
            <p class="article-desc">{{ article.excerpt || cleanContent(article.content)?.substring(0, 50) + '...' ||
              '暂无描述' }}</p>
            <div class="article-footer">
              <span class="likes"><el-icon>
                  <Star />
                </el-icon> {{ formatNumber(article.likeCount || 0) }}</span>
              <span class="bookmarks"><el-icon>
                  <Collection />
                </el-icon> {{ formatNumber(article.collectCount || 0) }}</span>
            </div>
          </div>
        </div>
        <div v-if="recommendedArticles.length === 0 && !loading" class="empty-state">
          <el-empty description="暂无精选攻略" />
        </div>
      </div>

      <!-- 热门景点 -->
      <div class="section-header">
        <h2 class="section-title">热门景点</h2>
        <router-link to="/spots" class="view-all-link">
          查询更多景点 <el-icon>
            <ArrowRight />
          </el-icon>
        </router-link>
      </div>
      <div class="spot-grid">
        <div class="spot-card" v-for="spot in hotSpots" :key="spot.id" @click="router.push(`/spot/${spot.scenicId || spot.id}`)">
          <div class="spot-card-img-wrap">
            <div class="card-image-placeholder spot-image" v-if="!spot.coverImage">
              <el-icon><Location /></el-icon>
            </div>
            <img v-else :src="spot.coverImage" :alt="spot.name" class="spot-cover-image">
            <button
              class="spot-wishlist-btn"
              :class="{ wished: wishlistMap[spot.scenicId || spot.id] }"
              @click="toggleWishlist($event, spot)"
            >
              <el-icon v-if="wishlistMap[spot.scenicId || spot.id]"><StarFilled /></el-icon>
              <el-icon v-else><Star /></el-icon>
            </button>
          </div>
          <div class="spot-content">
            <h3 class="spot-title">{{ spot.name }}</h3>
            <p class="spot-meta">海拔 {{ spot.altitude }}m · {{ spot.location }}</p>
            <p class="spot-desc">{{ spot.description }}</p>
          </div>
        </div>
        <div v-if="hotSpots.length === 0 && !loadingSpots" class="empty-state">
          <el-empty description="暂无热门景点" />
        </div>
      </div>

      <!-- 底部号召 -->
      <div class="cta-banner">
        <h3 class="cta-title">分享你的旅行经验</h3>
        <p class="cta-subtitle">帮助更多旅友，成为攻略达人</p>
        <router-link to="/article/edit" class="cta-button">
          <el-icon>
            <EditPen />
          </el-icon> 写攻略
        </router-link>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import axios from 'axios';
import NavComponent from "@/components/NavComponent.vue";
import {
  Bell, Message,
  Cpu, EditPen, Location, ArrowRight, Picture, View, Star, StarFilled, Collection
} from '@element-plus/icons-vue';

export default {
  name: 'HomeView',
  components: {
    Bell, Message, NavComponent,
    Cpu, EditPen, Location, ArrowRight, Picture, View, Star, StarFilled, Collection,
  },
  setup() {
    const router = useRouter();

    const isLoggedIn = ref(false);
    const username = ref('');
    const userAvatar = ref('');
    const notifications = ref([]);
    const totalUnreadMessages = ref(0);
    const recommendedArticles = ref([]);
    const loading = ref(true);
    const hotSpots = ref([]);
    const loadingSpots = ref(true);
    const heroSearchKeyword = ref('');
    // 收藏状态（key: scenicId, value: boolean）
    const wishlistMap = ref({});
    // 收藏加载中
    const wishlistLoading = ref(false);

    // 获取用户收藏列表
    const fetchWishlist = async () => {
      try {
        const res = await axios.get('http://localhost:8080/user-scenic-favorites/list', {
          params: { pageNum: 1, size: 999 }
        });
        if (res.data.code === 200) {
          const list = res.data.data.list || [];
          const map = {};
          list.forEach(item => { map[item.scenicId] = true; });
          wishlistMap.value = map;
        }
      } catch (e) {
        ElMessage.error('获取收藏列表失败，请稍后重试');
        // console.error('获取收藏列表失败', e);
      }
    };

    // 切换收藏状态
    const toggleWishlist = async (e, spot) => {
      e.stopPropagation();
      const id = spot.scenicId || spot.id;
      if (!id) return;
      wishlistLoading.value = true;
      try {
        if (wishlistMap.value[id]) {
          const res = await axios.delete(`http://localhost:8080/user-scenic-favorites/delete/${id}`);
          if (res.data.code === 200) {
            wishlistMap.value = { ...wishlistMap.value, [id]: false };
            ElMessage.success('已取消收藏');
          }
        } else {
          const res = await axios.post('http://localhost:8080/user-scenic-favorites/add', { scenicId: id });
          if (res.data.code === 200) {
            wishlistMap.value = { ...wishlistMap.value, [id]: true };
            ElMessage.success('已添加至收藏');
          }
        }
      } catch (e) {
        // console.error('操作收藏失败:', e);
        ElMessage.error('操作失败，请稍后重试');
      } finally {
        wishlistLoading.value = false;
      }
    };

    // 首页搜索
    const handleHeroSearch = () => {
      if (heroSearchKeyword.value.trim()) {
        router.push({
          path: '/search',
          query: { keyword: heroSearchKeyword.value.trim() }
        });
      }
    };

    // 检查登录状态
    const checkLoginStatus = () => {
      const token = localStorage.getItem('token');
      const storedUsername = localStorage.getItem('username');

      isLoggedIn.value = !!token;
      username.value = storedUsername || '';
      userAvatar.value = localStorage.getItem('userAvatar') || '/default-avatar.png';
    };

    // 获取精选攻略（推荐文章）
    const fetchRecommendedArticles = async () => {
      try {
        loading.value = true;
        const response = await axios.get('http://localhost:8080/article/getHotArticles');
        if (response.data.code === 200) {
          const data = response.data.data;
          recommendedArticles.value = Array.isArray(data) ? data.map(article => ({
            ...article,
            tags: article.tags || [],
            viewCount: article.viewCount || 0,
            likeCount: article.likeCount || 0,
            collectCount: article.collectCount || 0,
            createdAt: article.createdAt || new Date()
          })) : (data.list || []).map(article => ({
            ...article,
            tags: article.tags || [],
            viewCount: article.viewCount || 0,
            likeCount: article.likeCount || 0,
            collectCount: article.collectCount || 0,
            createdAt: article.createdAt || new Date()
          }));
        } else {
          ElMessage.warning(response.data.message || '获取推荐文章失败');
          recommendedArticles.value = [];
        }
      } catch (error) {
        console.error('获取精选文章失败:', error);
       // ElMessage.error('获取精选文章失败，请稍后重试');
        recommendedArticles.value = [];
      } finally {
        loading.value = false;
      }
    };

    // 获取热门景点
    const fetchHotSpots = async () => {
      try {
        loadingSpots.value = true;
        const response = await axios.get('http://localhost:8080/scenic-spots/getHotScenicSpots', {
          params: {
            pageNum: 1,
            size: 4
          }
        });
        if (response.data.code === 200 && Array.isArray(response.data.data.list)) {
          hotSpots.value = response.data.data.list.map(spot => ({
            ...spot,
            altitude: spot.altitude || 0,
            location: spot.location || '未知位置',
            description: spot.description || '暂无描述'
          }));
        } else {
          console.warn('获取热门景点失败:', response.data.message);
          hotSpots.value = [];
        }
      } catch (error) {
        console.error('获取热门景点失败:', error);
        hotSpots.value = [];
      } finally {
        loadingSpots.value = false;
      }
    };

    // 格式化数字
    const formatNumber = (num) => {
      if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'k';
      }
      return num;
    };

    // 清理HTML标签
    const cleanContent = (content) => {
      if (!content) return '';
      return content.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
    };

    // 跳转至个人主页
    const goToProfile = () => {
      const userId = localStorage.getItem('userId');
      router.push(`/profile/${userId}`);
    };

    // 跳转至写攻略页面
    const goToArticleEdit = () => {
      router.push('/article/edit');
    };

    // 跳转至消息页面
    const goToMessages = () => {
      router.push('/messages');
    };

    // 跳转至通知页面
    const goToNotifications = () => {
      router.push('/notifications');
    };

    // 退出登录
    const handleLogout = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('userId');
      localStorage.removeItem('userAvatar');
      localStorage.removeItem('role');

      isLoggedIn.value = false;
      username.value = '';
      userAvatar.value = '';

      ElMessage.success('已退出登录');
      router.push('/');
    };

    // 挂载时的初始化
    onMounted(() => {
      checkLoginStatus();
      fetchRecommendedArticles();
      fetchHotSpots();
      if (isLoggedIn.value) fetchWishlist();
    });

    return {
      isLoggedIn,
      username,
      userAvatar,
      notifications,
      totalUnreadMessages,
      recommendedArticles,
      loading,
      hotSpots,
      loadingSpots,
      heroSearchKeyword,
      wishlistMap,
      toggleWishlist,
      handleHeroSearch,
      formatNumber,
      cleanContent,
      goToProfile,
      goToArticleEdit,
      goToMessages,
      goToNotifications,
      handleLogout,
      router,
    };
  },
};
</script>

<style scoped>
/* 基础布局 */
.home {
  min-height: 100vh;
  background: linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%);
  display: flex;
  flex-direction: column;
}

/* 主内容区域 */
.home-content-wrapper {
  flex: 1;
  padding: 32px 40px;
  max-width: 1380px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

/* Hero 横幅 */
.hero-section {
  background: linear-gradient(135deg, #4a6b82 0%, #2c4a5e 100%);
  border-radius: 28px;
  padding: 52px 48px;
  margin-bottom: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: white;
  position: relative;
  overflow: hidden;
}

.hero-section::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -20%;
  width: 60%;
  height: 200%;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 50%;
  transform: rotate(15deg);
}

.hero-text {
  position: relative;
  z-index: 1;
}

.hero-title {
  font-size: 40px;
  font-weight: 700;
  line-height: 1.2;
  margin: 0 0 10px 0;
  max-width: 520px;
}

.hero-subtitle {
  font-size: 17px;
  opacity: 0.9;
  margin: 0;
  max-width: 480px;
}

.hero-search {
  background: white;
  border-radius: 60px;
  padding: 5px;
  display: flex;
  align-items: center;
  width: 440px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  position: relative;
  z-index: 1;
  flex-shrink: 0;
}

.hero-search-input {
  flex: 1;
  border: none;
  outline: none;
  padding: 15px 22px;
  font-size: 15px;
  background: transparent;
  border-radius: 54px;
  color: #1f2937;
  min-width: 0;
}

.hero-search-input::placeholder {
  color: #9ca3af;
}

.hero-search-btn {
  background: linear-gradient(135deg, #4a6b82 0%, #2c4a5e 100%);
  border: none;
  color: white;
  padding: 13px 30px;
  border-radius: 50px;
  font-weight: 600;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.3s;
  white-space: nowrap;
}

.hero-search-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

/* 章节标题 */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin: 44px 0 20px;
}

.section-header:first-of-type {
  margin-top: 0;
}

.section-title {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
  position: relative;
  padding-left: 14px;
}

.section-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 4px;
  bottom: 4px;
  width: 4px;
  background: linear-gradient(180deg, #4a6b82, #2c4a5e);
  border-radius: 4px;
}

.view-all-link {
  color: #4a6b82;
  text-decoration: none;
  font-weight: 600;
  font-size: 15px;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s;
}

.view-all-link:hover {
  gap: 10px;
  color: #2c4a5e;
}

/* 功能卡片网格 */
.card-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.feature-card {
  background: white;
  border-radius: 20px;
  padding: 24px;
  text-decoration: none;
  color: inherit;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  border: 1px solid #e5e7eb;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.feature-card::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #4a6b82, #2c4a5e);
  opacity: 0;
  transition: opacity 0.3s;
}

.feature-card:hover::after {
  opacity: 1;
}

.feature-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 16px 40px rgba(74, 107, 130, 0.15);
  border-color: #b0c4d4;
}

.feature-card .card-header {
  display: flex;
  align-items: center;
  margin-bottom: 14px;
}

.feature-card .card-icon {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 14px;
  font-size: 24px;
  color: white;
  background: linear-gradient(135deg, var(--icon-color), var(--icon-color-dark));
  flex-shrink: 0;
}

.ai-icon {
  --icon-color: #4a6b82;
  --icon-color-dark: #2c4a5e;
}

.write-icon {
  --icon-color: #10b981;
  --icon-color-dark: #059669;
}

.message-icon {
  --icon-color: #f59e0b;
  --icon-color-dark: #d97706;
}

.notification-card-icon {
  --icon-color: #3b82f6;
  --icon-color-dark: #2563eb;
}

.feature-card .card-title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.feature-card .card-description {
  color: #6b7280;
  font-size: 14px;
  line-height: 1.5;
  margin: 0;
}

/* 文章网格 */
.article-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 22px;
}

.article-card {
  background: white;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  border: 1px solid #eef3f8;
  transition: all 0.35s ease;
  cursor: pointer;
}

.article-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 16px 32px -8px rgba(0, 30, 50, 0.14);
}

.card-image-placeholder {
  background: linear-gradient(145deg, #a0b9d2, #c0d3e7);
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 48px;
}

.card-cover-image {
  width: 100%;
  height: 180px;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.article-card:hover .card-cover-image {
  transform: scale(1.06);
}

.spot-image {
  height: 140px;
}

.article-content {
  padding: 20px;
}

.article-title {
  font-size: 18px;
  font-weight: 700;
  color: #1b2a36;
  margin: 0 0 10px 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-meta {
  display: flex;
  gap: 16px;
  color: #6b7e93;
  font-size: 13px;
  margin-bottom: 10px;
}

.article-meta span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.article-desc {
  color: #3b5066;
  font-size: 14px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 0 0 14px 0;
}

.article-footer {
  display: flex;
  gap: 16px;
  padding-top: 14px;
  border-top: 1px solid #ecf2f8;
  color: #4f6e8c;
  font-size: 13px;
}

.article-footer span {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 空状态 */
.empty-state {
  grid-column: 1 / -1;
  display: flex;
  justify-content: center;
  padding: 40px;
}

/* 景点网格 */
.spot-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}

.spot-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 6px 16px -4px rgba(0, 30, 50, 0.08);
  border: 1px solid #eef3f8;
  transition: all 0.3s;
  cursor: pointer;
}

.spot-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 28px -8px rgba(0, 30, 50, 0.14);
}

.spot-cover-image {
  width: 100%;
  height: 150px;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.spot-card:hover .spot-cover-image {
  transform: scale(1.06);
}

.spot-card-img-wrap {
  position: relative;
  overflow: hidden;
}

.spot-wishlist-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s;
  z-index: 2;
  backdrop-filter: blur(4px);
}

.spot-wishlist-btn:hover {
  background: rgba(0, 0, 0, 0.65);
  transform: scale(1.1);
}

.spot-wishlist-btn.wished {
  background: rgba(245, 158, 11, 0.85);
  color: #fff;
}

.spot-wishlist-btn.wished:hover {
  background: rgba(245, 158, 11, 1);
}

.spot-content {
  padding: 16px;
}

.spot-title {
  font-size: 17px;
  font-weight: 700;
  color: #1b2a36;
  margin: 0 0 6px 0;
}

.spot-meta {
  color: #6b7e93;
  font-size: 13px;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.spot-desc {
  color: #4f6e8c;
  font-size: 13px;
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 底部号召 */
.cta-banner {
  background: linear-gradient(135deg, #4a6b82 0%, #2c4a5e 100%);
  border-radius: 24px;
  padding: 44px;
  margin: 52px 0 20px;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.cta-banner::before {
  content: '';
  position: absolute;
  bottom: -30%;
  left: -10%;
  width: 50%;
  height: 150%;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 50%;
}

.cta-banner::after {
  content: '';
  position: absolute;
  top: -40%;
  right: -5%;
  width: 40%;
  height: 180%;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 50%;
}

.cta-title {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 8px 0;
  position: relative;
  z-index: 1;
}

.cta-subtitle {
  color: rgba(255, 255, 255, 0.8);
  font-size: 16px;
  margin: 0 0 26px 0;
  position: relative;
  z-index: 1;
}

.cta-button {
  background: white;
  color: #4a6b82;
  border: none;
  border-radius: 50px;
  padding: 14px 38px;
  font-weight: 700;
  font-size: 16px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  z-index: 1;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.cta-button:hover {
  transform: translateY(-3px) scale(1.03);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
}

/* Element Plus 徽章样式 */
:deep(.message-badge .el-badge__content) {
  background-color: #ff6733 !important;
  border: none !important;
  height: 18px !important;
  padding: 0 5px !important;
  min-width: 18px !important;
  line-height: 18px !important;
  font-size: 11px !important;
  font-weight: 600 !important;
  box-shadow: 0 2px 6px rgba(255, 103, 51, 0.3) !important;
}

/* 响应式适配 */
@media (max-width: 1100px) {
  .card-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .hero-search {
    width: 380px;
  }
}

@media (max-width: 1024px) {
  .hero-section {
    flex-direction: column;
    text-align: center;
    gap: 24px;
    padding: 40px 32px;
  }

  .hero-title {
    font-size: 30px;
    max-width: 100%;
  }

  .hero-subtitle {
    max-width: 100%;
  }

  .hero-search {
    width: 100%;
    max-width: 480px;
  }

  .article-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .spot-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .home-content-wrapper {
    padding: 24px 28px;
  }
}

@media (max-width: 768px) {
  .home-content-wrapper {
    padding: 16px;
  }

  .hero-section {
    padding: 32px 24px;
    border-radius: 20px;
  }

  .hero-title {
    font-size: 24px;
  }

  .hero-subtitle {
    font-size: 14px;
  }

  .hero-search {
    flex-direction: column;
    background: transparent;
    box-shadow: none;
    gap: 12px;
    padding: 0;
  }

  .hero-search-input {
    background: white;
    padding: 14px 18px;
    border-radius: 40px;
    width: 100%;
    box-sizing: border-box;
  }

  .hero-search-btn {
    width: 100%;
    justify-content: center;
    padding: 13px 20px;
  }

  .section-title {
    font-size: 20px;
  }

  .article-grid,
  .spot-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .card-grid {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .feature-card {
    padding: 20px;
  }

  .cta-banner {
    padding: 32px 20px;
    border-radius: 18px;
  }

  .cta-title {
    font-size: 22px;
  }

  .section-header {
    margin: 36px 0 16px;
  }
}

@media (max-width: 480px) {
  .hero-section {
    padding: 24px 16px;
    border-radius: 16px;
  }

  .hero-title {
    font-size: 22px;
  }

  .hero-search-btn {
    padding: 12px 16px;
    font-size: 14px;
  }

  .cta-banner {
    padding: 28px 16px;
  }

  .cta-title {
    font-size: 20px;
  }

  .cta-button {
    padding: 12px 28px;
    font-size: 14px;
  }
}
</style>
