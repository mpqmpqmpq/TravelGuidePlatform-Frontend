<template>
  <div class="search-page">
    <nav-component :search-placeholder="currentPlaceholder" />

    <div class="search-container">
      <!-- 搜索框 -->
      <div class="search-header">
        <el-input v-model="keyword" :placeholder="currentPlaceholder" size="large" class="search-input-wrap"
          @keyup.enter="doSearch" clearable>
          <template #prefix>
            <el-icon>
              <Search />
            </el-icon>
          </template>
          <template #append>
            <el-button type="primary" @click="doSearch" class="search-btn">搜索</el-button>
          </template>
        </el-input>
      </div>

      <!-- 搜索类型标签 -->
      <div class="search-tabs">
        <div class="tab-item" :class="{ active: activeTab === 'articles' }" @click="changeTab('articles')">
          <el-icon>
            <Document />
          </el-icon>
          <span>攻略</span>
        </div>
        <div class="tab-item" :class="{ active: activeTab === 'spots' }" @click="changeTab('spots')">
          <el-icon>
            <Location />
          </el-icon>
          <span>景点</span>
        </div>
      </div>

      <!-- 搜索结果 -->
      <div class="search-results" v-loading="loading">
        <!-- 初始状态 -->
        <div v-if="!hasSearched && !loading" class="initial-state">
          <el-empty description="输入关键词搜索攻略、景点或用户">
            <template #image>
              <el-icon class="empty-icon">
                <Search />
              </el-icon>
            </template>
          </el-empty>
        </div>

        <!-- 攻略结果 -->
        <div v-if="activeTab === 'articles' && hasSearched" class="results-list">
          <el-card v-for="article in articleResults" :key="article.articleId" class="result-card" shadow="hover"
            @click="goToArticle(article.articleId)">
            <div class="card-layout">
              <img v-if="article.coverImage" :src="article.coverImage" class="card-img">
              <div v-else class="card-img-placeholder">
                <el-icon>
                  <Picture />
                </el-icon>
              </div>
              <div class="card-info">
                <h3>{{ article.title }}</h3>
                <p>{{ cleanContent(article.content)?.substring(0, 80) || '暂无描述' }}...</p>
                <div class="card-meta">
                  <span>{{ article.userName }}</span>
                  <span><el-icon>
                      <View />
                    </el-icon> {{ article.viewCount }}</span>
                  <span><el-icon>
                      <Star />
                    </el-icon> {{ article.likeCount }}</span>
                </div>
              </div>
            </div>
          </el-card>
        </div>

        <!-- 景点结果 -->
        <div v-if="activeTab === 'spots' && hasSearched" class="results-list">
          <el-card v-for="spot in spotResults" :key="spot.scenicId" class="result-card" shadow="hover"
            @click="goToSpot(spot.scenicId)">
            <div class="card-layout">
              <img v-if="spot.coverImage" :src="spot.coverImage" class="card-img">
              <div v-else class="card-img-placeholder">
                <el-icon>
                  <Picture />
                </el-icon>
              </div>
              <div class="card-info">
                <h3>{{ spot.name }}</h3>
                <p>{{ cleanContent(spot.description)?.substring(0, 80) || '暂无描述' }}</p>
              </div>
            </div>
          </el-card>
        </div>

        <!-- 搜索结果 -->
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { Search, Document, Location, User, View, Star, Picture } from '@element-plus/icons-vue'
import NavComponent from '@/components/NavComponent.vue'

export default {
  components: { NavComponent },
  setup() {
    const router = useRouter()
    const route = useRoute()
    const keyword = ref('')
    const activeTab = ref('articles')
    const loading = ref(false)
    const hasSearched = ref(false)
    const articleResults = ref([])
    const spotResults = ref([])
    const currentPlaceholder = ref('搜索攻略...')

    // 页面加载时检查是否有搜索关键字
    onMounted(() => {
      const queryKeyword = route.query.keyword
      if (queryKeyword) {
        keyword.value = queryKeyword
        doSearch()
      }
    })

    const changeTab = (tab) => {
      activeTab.value = tab
      currentPlaceholder.value = tab === 'articles' ? '搜索攻略...' : '搜索景点...'
      if (hasSearched.value) doSearch()
    }

    // 清理HTML标签，只显示纯文本
    const cleanContent = (content) => {
      if (!content) return ''
      return content.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ')
    }

    const doSearch = async () => {
      if (!keyword.value.trim()) {
        ElMessage.warning('请输入搜索关键词')
        return
      }
      hasSearched.value = true
      loading.value = true

      try {
        if (activeTab.value === 'articles') {
          const res = await axios.get('http://localhost:8080/article/search', {
            params: { keyword: keyword.value, pageNum: 1, size: 20 }
          })
          if (res.data.code === 200) articleResults.value = res.data.data.list || []
        } else if (activeTab.value === 'spots') {
          const res = await axios.get('http://localhost:8080/scenic-spots/search', {
            params: { keyword: keyword.value, pageNum: 1, size: 20 }
          })
          if (res.data.code === 200) spotResults.value = res.data.data.list || []
        }
      } catch (e) {
        console.error('搜索失败:', e)
      } finally {
        loading.value = false
      }
    }

    const goToArticle = (id) => router.push(`/article/${id}`)
    const goToSpot = (id) => router.push(`/scenic/${id}`)

    return {
      keyword, activeTab, loading, hasSearched,
      articleResults, spotResults,
      currentPlaceholder, changeTab, doSearch,
      goToArticle, goToSpot,
      cleanContent,
      Search, Document, Location, User, View, Star, Picture
    }
  }
}
</script>

<style scoped>
.search-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%);
}

.search-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px 16px;
}

.search-header {
  margin-bottom: 24px;
}

.search-input-wrap :deep(.el-input__wrapper) {
  border-radius: 50px;
  padding: 8px 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.search-input-wrap :deep(.el-input__inner) {
  font-size: 16px;
}

.search-btn {
  border-radius: 50px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
  font-weight: 600;
}

.search-tabs {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: white;
  border-radius: 12px;
  color: #6b7280;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.tab-item:hover {
  transform: translateY(-2px);
}

.tab-item.active {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.initial-state {
  background: white;
  border-radius: 16px;
  padding: 60px;
}

.empty-icon {
  font-size: 64px;
  color: #d1d5db;
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.result-card {
  cursor: pointer;
  border-radius: 12px;
  transition: all 0.3s;
}

.result-card:hover {
  transform: translateX(4px);
}

.card-layout {
  display: flex;
  gap: 16px;
}

.card-img {
  width: 160px;
  height: 100px;
  object-fit: cover;
  border-radius: 8px;
  flex-shrink: 0;
}

.card-img-placeholder {
  width: 160px;
  height: 100px;
  background: #f3f4f6;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: #9ca3af;
  flex-shrink: 0;
}

.card-info {
  flex: 1;
}

.card-info h3 {
  margin: 0 0 8px;
  font-size: 17px;
  color: #1f2937;
}

.card-info p {
  margin: 0 0 12px;
  font-size: 14px;
  color: #6b7280;
}

.card-meta {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #9ca3af;
}

.card-meta span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.user-card {
  cursor: pointer;
  border-radius: 12px;
}

.user-layout {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-info {
  flex: 1;
}

.user-info h3 {
  margin: 0 0 4px;
  font-size: 16px;
  color: #1f2937;
}

.user-info p {
  margin: 0;
  font-size: 14px;
  color: #9ca3af;
}
</style>