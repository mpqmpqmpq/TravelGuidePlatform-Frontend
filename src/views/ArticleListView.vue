<template>
  <div class="article-list-container">
    <!-- 导航头部 -->
    <nav-component search-placeholder="搜索攻略..." />
    <!-- 主布局：两栏 -->
    <div class="guide-layout">
      <!-- 左侧内容区 -->
      <div class="guide-left">
        <!-- 分类标签 -->
        <div class="category-tabs">
          <span class="category-tab" :class="{ 'active': selectedCategory === 'recommended' }"
            @click="selectCategory('recommended')">
            推荐
          </span>
          <span class="category-tab" :class="{ 'active': selectedCategory === 'myArticles' }"
            @click="selectCategory('myArticles')" v-if="isLoggedIn">
            我的
          </span>
          <!-- 动态显示分类 -->
          <template v-for="category in displayCategories" :key="category.categoryId">
            <span class="category-tab" :class="{ 'active': selectedCategory === category.categoryId }"
              @click="selectCategory(category.categoryId)">
              {{ category.name.includes('攻略') ? category.name.replace('攻略', '攻略') : category.name }}
            </span>
          </template>
          <span v-if="categories.length > 10" class="category-tab" @click="showAllCategories = !showAllCategories">
            {{ showAllCategories ? '收起' : '更多' }}
          </span>
        </div>


        <!-- 攻略列表 -->
        <div class="guide-grid">
          <div v-if="loading" class="loading-grid">
            <el-skeleton :rows="6" animated class="loading-skeleton" />
          </div>

          <div v-else-if="articles.length === 0" class="empty-state">
            <el-empty description="暂无符合条件">
              <template #image>
                <img src="/empty-travel.svg" alt="暂无" class="empty-img">
              </template>
              <template #description>
                <div class="empty-desc">
                  <p>暂无符合条件</p>
                  <el-button type="primary" size="small" @click="goToArticleEdit">
                    立即创建一篇
                  </el-button>
                </div>
              </template>
            </el-empty>
          </div>

          <div class="guide-card" v-for="article in articles" :key="article.articleId"
            @click="viewArticle(article.articleId)">
            <!-- 封面图 -->
            <div class="card-image" v-if="article.coverImage">
              <img :src="article.coverImage" alt="封面" class="cover-img">

            </div>
            <div class="card-image" v-else>
              <span class="image-placeholder"></span>
            </div>

            <div class="card-content">
              <div class="card-title">{{ article.title || '无标题攻略' }}</div>
              <div class="card-meta">

                <span class="meta-views">
                  <el-icon>
                    <View />
                  </el-icon>
                  {{ formatCount(article.viewCount || 0) }}阅读
                </span>
              </div>
              <div class="card-desc">{{ truncateContent(article.content || '', 50) }}</div>
              <div class="card-footer">
                <span class="footer-like">
                  <el-icon>
                    <StarFilled />
                  </el-icon>
                  {{ article.likeCount || 0 }}
                </span>
                <span class="footer-bookmark">
                  <el-icon>
                    <Collection />
                  </el-icon>
                  {{ article.collectCount || 0 }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 滚动加载更多 -->
        <div class="load-more-container" ref="loadMoreTrigger">
          <div v-if="loadingMore" class="loading-skeleton-grid">
            <el-skeleton :rows="3" animated v-for="i in 3" :key="i" class="skeleton-card" />
          </div>
          <div v-else-if="noMore" class="no-more">
            已加载全部 {{ totalArticles }} 篇攻略
          </div>
        </div>

        <div class="total-count">
          <el-icon>
            <Document />
          </el-icon>
          共 {{ totalArticles }} 篇攻略
        </div>
      </div>

      <!-- 右侧边栏 -->
      <div class="guide-sidebar">
        <!-- 热门攻略排行榜 -->
        <div class="sidebar-card">
          <div class="sidebar-title">热门攻略</div>
          <ul class="hot-list">
            <li class="hot-item" v-for="(item, i) in hotArticles" :key="item.articleId"
              @click="viewArticle(item.articleId)">
              <span class="hot-rank" :class="{ 'top-1': i === 0, 'top-2': i === 1, 'top-3': i === 2 }">
                {{ i + 1 }}
              </span>
              <div class="hot-info">
                <div class="hot-title">{{ item.title || '无标题攻略' }}</div>
                <div class="hot-meta">
                  {{ formatCount(item.viewCount || 0) }}阅读 · 收藏{{ item.likeCount || 0 }}
                </div>
              </div>
            </li>
            <li class="hot-item" v-if="hotArticles.length === 0">
              <span class="empty-hot-text">暂无热门攻略</span>
            </li>
          </ul>
        </div>

        <!-- 发布攻略按钮 -->
        <div class="sidebar-card post-card">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px;">
            <el-icon class="post-icon">
              <EditPen />
            </el-icon>
            <span class="post-text">分享你的实用攻略，帮助更多旅友</span>
          </div>
          <el-button type="primary" class="post-guide-btn" @click="goToArticleEdit">
            <el-icon>
              <Plus />
            </el-icon>
            写攻略
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, watch, computed, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import NavComponent from "@/components/NavComponent.vue";
import {
  ElMessage,
  ElEmpty,
  ElSkeleton,
  ElIcon
} from 'element-plus';
import {
  View, StarFilled, Document, EditPen, Plus, Collection
} from '@element-plus/icons-vue';
import axios from 'axios';
import { output as $route } from "quill-image-resize-module/webpack.config";

export default {
  name: 'ArticleListView',
  computed: {
    $route() {
      return $route
    }
  },
  components: {
    NavComponent,
    ElEmpty, ElSkeleton, ElIcon,
    View, StarFilled, Document, EditPen, Plus, Collection
  },
  setup() {
    const router = useRouter();

    const isLoggedIn = ref(false);
    const username = ref('');
    const userAvatar = ref('');
    const articles = ref([]);
    const hotArticles = ref([]);
    const loading = ref(true);
    const selectedCategory = ref('recommended');
    const selectedTag = ref('');
    const sortBy = ref('newest');
    const currentPage = ref(1);
    const pageSize = ref(12);
    const totalArticles = ref(0);
    const loadingMore = ref(false);
    const noMore = ref(false);
    const loadMoreTrigger = ref(null);
    let observer = null;
    const categories = ref([]);
    const categoryTreeForSelect = ref([]);
    const hotTags = ref(['']);

    const currentTip = ref('');

    const showAllCategories = ref(false);
    
    const displayCategories = computed(() => {
      return showAllCategories.value ?
        categories.value :
        categories.value.slice(0, 10);
    })



    const isMobile = computed(() => {
      return window.innerWidth < 768;
    });

    const sortText = ref({
      newest: '最新发布',
      hottest: '热门优先',
      mostCollected: '收藏最多'
    });

    const getHeaderTitle = () => {
      if (selectedTag.value) return `包含标签「${selectedTag.value}」的攻略`;
      switch (selectedCategory.value) {
        case 'recommended':
          return '推荐';
        case 'hottest':
          return '热门';
        case 'myArticles':
          return '我的';
        default:
          return getCategoryName(selectedCategory.value) || '推荐';
      }
    };

    const getCategoryName = (categoryId) => {
      if (!categoryId || categoryId === 'all') return '';
      const findName = (list) => {
        for (const item of list) {
          if (item.categoryId === categoryId) return item.name;
          if (item.children && item.children.length) {
            const childName = findName(item.children);
            if (childName) return childName;
          }
        }
        return '';
      };
      return findName(categories.value) || '';
    };

    const checkLoginStatus = () => {
      const token = localStorage.getItem('token');
      const storedUsername = localStorage.getItem('username');
      isLoggedIn.value = !!token;
      username.value = storedUsername || '';
      userAvatar.value = localStorage.getItem('userAvatar') || '/default-avatar.png';
    };
    // 获取分类列表
    const fetchCategories = async () => {
      try {
        const response = await axios.get('http://localhost:8080/category/getCategoryTree');
        if (response.data.code === 200) {
          const list = response.data.data.list || [];
          categories.value = list;
          categoryTreeForSelect.value = [
            {
              categoryId: 'all',
              name: '全部',
              children: list.map(item => ({
                ...item,
                name: item.name.includes('攻略') ? item.name.replace('攻略', '攻略') : item.name
              })),
            },
          ];
        } else {
          ElMessage.error(response.data.message || '获取分类失败');
        }
      } catch (error) {
        console.error('获取分类失败:', error);
        ElMessage.error('获取分类失败，请稍后重试');
      }
    };

    const fetchHotArticles = async () => {
      loading.value = true;
      try {
        let response = await axios.get('http://localhost:8080/article/getHotArticles');
        if (response.data.code === 200 && response.data.data.length) {
          hotArticles.value = response.data.data.map(item => ({
            ...item
          }));
        } else {
          response = await axios.get('http://localhost:8080/article/getArticlePageList');
          if (response.data.code === 200) {
            const allArticles = response.data.data.list || [];
            const hotList = allArticles
              .filter(article => (article.viewCount || 0) > 5 || (article.likeCount || 0) > 1)
              .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
              .slice(0, 5);
            hotArticles.value = hotList.map(item => ({
              ...item,
            }));
          }
        }
      } catch (error) {
        console.error('获取热门失败:', error);
        hotArticles.value = [];
      } finally {
        loading.value = false;
      }
    };
    // 获取攻略列表
    const fetchArticles = async (append = false) => {
      if (!append) {
        loading.value = true;
        currentPage.value = 1;
        noMore.value = false;
      } else {
        if (noMore.value || loadingMore.value) return;
        loadingMore.value = true;
      }
      try {
        const params = {
          pageNum: currentPage.value,
          size: pageSize.value,
          sort: selectedCategory.value === 'hottest' ? 'hottest' : sortBy.value
        };
        let apiUrl = 'http://localhost:8080/article/getArticlePageList';

        if (selectedCategory.value && !['recommended', 'hottest', 'all', 'myArticles'].includes(selectedCategory.value)) {
          params.categoryId = selectedCategory.value;
          apiUrl = 'http://localhost:8080/article/getArticlePageListByCategoryId';
        } else if (selectedCategory.value === 'myArticles') {
          const userId = localStorage.getItem('userId');
          if (!userId) {
            ElMessage.warning('请先登录以查看我的攻略');
            loading.value = false;
            return;
          }
          apiUrl = `http://localhost:8080/article/getArticleByUserId/${userId}`;
        } else if (selectedCategory.value === 'hottest') {
          try {
            const hotResponse = await axios.get('http://localhost:8080/article/getHotArticles');
            if (hotResponse.data.code === 200 && hotResponse.data.data.list?.length) {
              articles.value = hotResponse.data.list.map(item => ({
                ...item,
                tags: item.tags || []
              }));
              totalArticles.value = articles.value.length;
              currentPage.value = 1;
              loading.value = false;
              return;
            }
          } catch (hotError) {
            console.log('热门接口调用失败，使用普通列表筛选:', hotError);
          }
          params.sort = 'hottest';
        }

        if (selectedTag.value) {
          params.tag = selectedTag.value.replace('#', '');
        }

        const response = await axios.get(apiUrl, { params });
        if (response.data.code === 200) {
          const data = response.data.data;
          let articleList = data.list || [];

          if (selectedCategory.value === 'hottest') {
            articleList = articleList.filter(article => (article.viewCount || 0) > 5 || (article.likeCount || 0) > 1);
          }

          const mappedArticles = articleList.map(article => ({
            ...article,
            tags: article.tags || [],
            viewCount: article.viewCount || 0,
            likeCount: article.likeCount || 0,
            createdAt: article.createdAt || new Date()
          }));

          if (append) {
            articles.value = [...articles.value, ...mappedArticles];
          } else {
            articles.value = mappedArticles;
          }
          totalArticles.value = data.total || 0;
          currentPage.value = data.current || 1;

          if (append && articleList.length < pageSize.value) {
            noMore.value = true;
          }
        } else {
          ElMessage.error(response.data.message || '获取列表失败');
        }
      } catch (error) {
        console.error('获取列表失败:', error);
        ElMessage.error('获取列表失败，请稍后重试');
      } finally {
        loading.value = false;
        loadingMore.value = false;
      }
    };

    const loadMoreArticles = () => {
      if (noMore.value || loadingMore.value) return;
      currentPage.value++;
      fetchArticles(true);
    };

    const handleCategoryChange = (value) => {
      selectedCategory.value = value === '' ? 'all' : value;
      currentPage.value = 1;
      noMore.value = false;
      fetchArticles();
    };

    const handlePageChange = (page) => {
      currentPage.value = page;
      fetchArticles();
    };


    const initObserver = () => {
      if (!loadMoreTrigger.value) return;
      observer = new IntersectionObserver((entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !loadingMore.value && !noMore.value) {
          loadMoreArticles();
        }
      }, { rootMargin: '200px' });
      observer.observe(loadMoreTrigger.value);
    };

    const formatCount = (count) => {
      count = count || 0;
      if (count >= 10000) return `${(count / 10000).toFixed(1)}w`;
      if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
      return count;
    };

    const truncateContent = (content, maxLength) => {
      if (!content) return '暂无攻略摘要...';
      const pureText = content.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
      return pureText.length > maxLength ? `${pureText.substring(0, maxLength)}...` : pureText;
    };

    const viewArticle = (articleId) => {
      if (articleId) {
        router.push(`/article/${articleId}`);
      } else {
        ElMessage.warning('攻略 ID 无效，无法查看');
      }
    };

    const goToProfile = () => {
      const userId = localStorage.getItem('userId');
      if (userId) {
        router.push(`/profile/${userId}`);
      } else {
        ElMessage.warning('请先登录');
        router.push('/login');
      }
    };

    const goToArticleEdit = () => {
      router.push('/article/edit');
    };

    const goToMessages = () => {
      if (isLoggedIn.value) {
        router.push('/messages');
      } else {
        ElMessage.warning('请先登录');
        router.push('/login');
      }
    };

    const goToNotifications = () => {
      if (isLoggedIn.value) {
        router.push('/notifications');
      } else {
        ElMessage.warning('请先登录');
        router.push('/login');
      }
    };

    const handleLogout = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('userId');
      localStorage.removeItem('userAvatar');
      localStorage.removeItem('role');

      isLoggedIn.value = false;
      ElMessage.success('已退出登录');
      router.push('/');
    };

    const handleResize = () => {
    };

    const selectCategory = (category) => {
      selectedCategory.value = category;
      if (category === 'hottest') {
        router.push('/hot-articles');
      } else if (category === 'recommended' || category === 'all') {
        router.push('/articles');
      }
      currentPage.value = 1;
      noMore.value = false;
      fetchArticles();
    };

    onMounted(() => {
      checkLoginStatus();
      fetchCategories();
      if (router.currentRoute.value.path === '/hot-articles') {
        selectedCategory.value = 'hottest';
      }
      fetchArticles();
      fetchHotArticles();
      window.addEventListener('resize', handleResize);
      initObserver();

      const routeWatcher = watch(
        () => router.currentRoute.value.path,
        (newPath) => {
          if (newPath === '/hot-articles' && selectedCategory.value !== 'hottest') {
            selectedCategory.value = 'hottest';
            fetchArticles();
          } else if (newPath === '/articles' && selectedCategory.value !== 'recommended') {
            selectedCategory.value = 'recommended';
            fetchArticles();
          }
        }
      );

      onUnmounted(() => {
        window.removeEventListener('resize', handleResize);
        if (observer) observer.disconnect();
        routeWatcher();
      });
    });

    watch([() => selectedCategory.value, () => selectedTag.value], () => {
      fetchHotArticles();
    });

    return {
      isLoggedIn, username, userAvatar, articles, hotArticles,
      loading, selectedCategory, selectedTag, sortBy, currentPage,
      pageSize, totalArticles, categories, categoryTreeForSelect,
      hotTags, currentTip, isMobile, sortText,
      loadingMore, noMore, loadMoreTrigger,
      getHeaderTitle, getCategoryName,
      handleCategoryChange, handlePageChange, formatCount,
      truncateContent, viewArticle, goToProfile, goToArticleEdit,
      goToMessages, goToNotifications, handleLogout,
      selectCategory, displayCategories, showAllCategories
    };
  }
};
</script>

<style scoped>
.article-list-container {
  min-height: 100vh;
  background: linear-gradient(180deg, #f0f5fa 0%, #e4ebf2 100%);
  display: flex;
  flex-direction: column;
}

/* 主体布局：两栏 */
.guide-layout {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 28px;
  width: 100%;
  margin: 0 auto;
  max-width: 1400px;
  /* background: white; */
  border-radius: 28px;
  padding: 24px 32px 40px 32px;
  /* box-shadow: 0 25px 50px -12px rgba(0, 20, 40, 0.15); */
  /* border: 1px solid rgba(255, 255, 255, 0.6); */
  box-sizing: border-box;
}

/* 左侧内容区 */
.guide-left {
  display: flex;
  flex-direction: column;
  max-height: 85vh;
  overflow-y: auto;
  padding-right: 12px;
  scrollbar-width: thin;
}

/* 分类标签 */
.category-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 24px;
  padding-bottom: 18px;
  align-items: center;
  border-bottom: 2px solid #e8eef4;
}

.category-tab {
  background: transparent;
  border: 2px solid transparent;
  padding: 9px 20px;
  border-radius: 28px;
  font-weight: 600;
  font-size: 0.9rem;
  color: #4a6b82;
  cursor: pointer;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
}

.category-tab:not(.active) {
  background: linear-gradient(135deg, #f5f9fc, #edf3f8);
  border: 1px solid #d8e5ef;
}

.category-tab:hover:not(.active) {
  background: linear-gradient(135deg, #e0eaf3, #d4e2ed);
  border-color: #b8d0e2;
  transform: translateY(-2px);
  color: #2d5a7f;
}

.category-tab.active {
  background: linear-gradient(135deg, #3b6e9c, #2d5a7f);
  color: white;
  border: none;
  box-shadow: 0 6px 20px rgba(59, 110, 156, 0.35);
}

/* 攻略卡片网格 */
.guide-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

.guide-card {
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 10px 25px -8px rgba(0, 30, 50, 0.1);
  border: 1px solid #e8eef4;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.guide-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 20px;
  padding: 2px;
  background: linear-gradient(135deg, transparent, rgba(59, 110, 156, 0.12), transparent);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0;
  transition: opacity 0.4s ease;
  z-index: 10;
  pointer-events: none;
}

.guide-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 20px 40px -12px rgba(0, 30, 50, 0.18);
  border-color: transparent;
}

.guide-card:hover::before {
  opacity: 1;
}

.loading-grid {
  grid-column: 1 / -1;
}

.card-image {
  background: linear-gradient(145deg, #b8d4e8, #c8dced);
  height: 160px;
  width: 100%;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: flex-end;
  padding: 10px;
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  position: absolute;
  top: 0;
  left: 0;
  transition: transform 0.5s ease;
}

.guide-card:hover .cover-img {
  transform: scale(1.08);
}

.image-placeholder {
  font-size: 3.5rem;
  align-self: flex-end;
  color: rgba(59, 110, 156, 0.3);
}


.card-content {
  padding: 18px 16px 20px;
}

.card-title {
  font-weight: 700;
  font-size: 1.1rem;
  margin: 0 0 10px 0;
  color: #1a2832;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: color 0.3s ease;
}

.guide-card:hover .card-title {
  color: #3b6e9c;
}

.card-meta {
  display: flex;
  gap: 14px;
  color: #6b7e93;
  font-size: 0.85rem;
  margin: 8px 0 12px;
  align-items: center;
}

.meta-author,
.meta-views {
  display: flex;
  align-items: center;
  gap: 4px;
}

.card-desc {
  color: #3b5066;
  font-size: 0.9rem;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 0 0 12px 0;
  min-height: 42px;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #ecf2f8;
  padding-top: 12px;
  font-size: 0.85rem;
  color: #4f6e8c;
}

.footer-like,
.footer-bookmark {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 滚动加载更多 */
.load-more-container {
  grid-column: 1 / -1;
  padding: 20px 0;
}

.loading-skeleton-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.skeleton-card {
  background: #f5f7fa;
  border-radius: 12px;
  padding: 16px;
}

.no-more {
  grid-column: 1 / -1;
  text-align: center;
  color: #909399;
  font-size: 14px;
  padding: 20px 0;
}

:deep(.el-pager li) {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: #f2f6fb;
  color: #2b4f73;
  font-weight: 500;
  border: 1px solid #dee9f2;
  margin: 0 4px;
}

:deep(.el-pager li.active) {
  background: #3b6e9c;
  color: white;
  border: none;
}

:deep(.el-pager li:hover:not(.active)) {
  background: #e0eaf3;
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

.empty-desc {
  text-align: center;
}

.empty-desc p {
  margin-bottom: 20px;
  color: #666;
  font-size: 14px;
}

/* 右侧边栏 */
.guide-sidebar {
  display: flex;
  flex-direction: column;
  gap: 24px;
  position: sticky;
  top: 90px;
}

.sidebar-card {
  background: linear-gradient(145deg, #f8fcff, #f3f8fc);
  border-radius: 24px;
  padding: 26px 22px;
  border: 1px solid #e0eaf2;
  box-shadow: 0 8px 25px rgba(59, 110, 156, 0.08);
}

.sidebar-title {
  font-weight: 800;
  font-size: 1.25rem;
  margin-bottom: 20px;
  color: #1a3040;
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 14px;
  border-bottom: 2px solid #e0eaf2;
}

.hot-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.hot-item {
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
  transition: all 0.35s ease;
  border-radius: 12px;
  padding: 10px;
}

.hot-item+.hot-item {
  border-top: 1px dashed #e0eaf2;
}

.hot-item:hover {
  transform: translateX(4px);
  background: linear-gradient(135deg, #f0f7fc, #e8f3fa);
}

.hot-rank {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #e8f1f8, #d8e5f0);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 14px;
  color: #3b6e9c;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(59, 110, 156, 0.15);
}

.hot-rank.top-1 {
  background: linear-gradient(135deg, #ffd700, #ffb700);
  color: white;
}

.hot-rank.top-2 {
  background: linear-gradient(135deg, #c0c0c0, #a8a8a8);
  color: white;
}

.hot-rank.top-3 {
  background: linear-gradient(135deg, #cd7f32, #b87333);
  color: white;
}

.hot-info {
  flex: 1;
  min-width: 0;
}

.hot-title {
  font-weight: 600;
  color: #1e364a;
  margin-bottom: 3px;
  font-size: 0.95rem;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: color 0.3s ease;
}

.hot-item:hover .hot-title {
  color: #3b6e9c;
}

.hot-meta {
  font-size: 0.75rem;
  color: #69849e;
}

.empty-hot-text {
  color: #69849e;
  font-size: 0.9rem;
}

/* 发布攻略卡片 */
.post-card {
  background: #e6f0f8;
}

.post-icon {
  font-size: 1.8rem;
  color: #2e628c;
}

.post-text {
  font-weight: 500;
  color: #1e3f5c;
  font-size: 0.95rem;
  flex: 1;
}

.post-guide-btn {
  width: 100%;
  border-radius: 60px;
  padding: 14px 24px;
  font-weight: 600;
  font-size: 1rem;
  background: #3b6e9c;
  border: none;
  box-shadow: 0 8px 18px rgba(44, 99, 150, 0.2);
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.post-guide-btn:hover {
  background: #2d5a82;
  transform: translateY(-2px);
  box-shadow: 0 10px 22px rgba(44, 99, 150, 0.28);
}

/* 响应式 */
@media (max-width: 1200px) {
  .guide-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 1024px) {
  .guide-layout {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .guide-sidebar {
    display: none;
  }
}

@media (max-width: 768px) {
  .guide-layout {
    padding: 16px;
    border-radius: 16px;
  }

  .guide-grid {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .guide-left {
    max-height: none;
    overflow-y: visible;
    padding-right: 0;
  }

  .category-tabs {
    overflow-x: auto;
    flex-wrap: nowrap;
    gap: 8px;
    padding-bottom: 14px;
    -webkit-overflow-scrolling: touch;
  }

  .category-tab {
    padding: 8px 16px;
    font-size: 0.85rem;
    white-space: nowrap;
  }

  .card-title {
    font-size: 1rem;
  }

  .card-desc {
    font-size: 0.85rem;
    min-height: auto;
  }

  .card-image {
    height: 140px;
  }
}

@media (max-width: 480px) {
  .guide-layout {
    padding: 12px;
    border-radius: 12px;
  }

  .card-content {
    padding: 14px;
  }
}
</style>
