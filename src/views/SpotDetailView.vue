<template>
  <nav-component />
  <div class="spot-detail-page">

    <!-- 景点详情卡片 -->
    <div class="detail-pc" v-loading="loading">
      <div v-if="!loading && !scenic" class="not-found">
        <el-empty description="该景点不在系统中" />
      </div>
      <div v-if="scenic && scenic.scenicId" class="detail-main">
        <!-- 左侧图片展示区 -->
        <div class="gallery-section">
          <div class="main-image">
            <img :src="currentMainImage" :alt="scenic.name" />
            <div class="image-badge">
              <el-icon>
                <Camera />
              </el-icon> 景区照片
            </div>
          </div>
          <!-- 缩略图列表 -->
          <div class="thumbnail-strip" v-if="allSpotImages.length > 1">
            <img v-for="(img, index) in allSpotImages" :key="index" :src="img"
              :class="['thumbnail', { active: currentImageIndex === index }]" @click="switchImage(index)" />
          </div>
        </div>

        <!-- 右侧信息区 -->
        <div class="info-section">
          <div class="breadcrumb">
            <span @click="router.push('/')" style="cursor:pointer;color:#4f46e5;">首页</span>
            <el-icon>
              <ArrowRight />
            </el-icon>
            <span style="color:#1e293b;">景点详情</span>
            <span style="margin-left: auto;" @click="toggleWishlist" class="wishlist-btn">
              <el-icon v-if="!isWished">
                <Star />
              </el-icon>
              <el-icon v-else>
                <StarFilled style="color:#f59e0b;" />
              </el-icon>
              收藏
            </span>
          </div>

          <div class="spot-title">
            <h1>{{ scenic.name }}</h1>
            <div class="rating-badge">
              <span class="rating-value">{{ Number(scenic.avgScore)?.toFixed(1) || '0.0' }}</span>
              <el-rate v-model="scenic.avgScore" disabled :max="5" allow-half />
              <span style="font-size:12px;color:#94a3b8;">({{ formatCount(scenic.commentCount || 0) }}条评价)</span>
            </div>
          </div>

          <div class="info-row">
            <div class="info-chip"><el-icon>
                <Location />
              </el-icon> {{ scenic.location }}</div>
            <div class="info-chip" v-if="scenic.openHours"><el-icon>
                <Clock />
              </el-icon> {{ scenic.openHours }}</div>
          </div>

          <div class="description">{{ scenic.description || '暂无详细介绍' }}</div>

          <div class="spec-grid">
            <div class="spec-item">
              <div class="spec-icon"><el-icon>
                  <Ticket />
                </el-icon></div>
              <div class="spec-text">
                <div class="label">门票价格</div>
                <div class="value">{{ scenic.ticketPrice == 0 ? '免费开放' : '¥' + scenic.ticketPrice }}</div>
              </div>
            </div>
            <div class="spec-item">
              <div class="spec-icon"><el-icon>
                  <View />
                </el-icon></div>
              <div class="spec-text">
                <div class="label">浏览量</div>
                <div class="value">{{ formatCount(scenic.viewCount) }}</div>
              </div>
            </div>
            <div class="spec-item">
              <div class="spec-icon"><el-icon>
                  <Collection />
                </el-icon></div>
              <div class="spec-text">
                <div class="label">收藏数</div>
                <div class="value">{{ formatCount(scenic.favoriteCount) }}</div>
              </div>
            </div>
            <div class="spec-item">
              <div class="spec-icon"><el-icon>
                  <ChatDotSquare />
                </el-icon></div>
              <div class="spec-text">
                <div class="label">评论数</div>
                <div class="value">{{ formatCount(scenic.commentCount) }}</div>
              </div>
            </div>
          </div>


          <!-- 地图 -->
          <div class="map-buttons">
            <button class="btn-outline-sm" @click="scrollToMap"><el-icon>
                <MapLocation />
              </el-icon> 查看地图 </button>
          </div>

          <div class="separator"></div>

          <!-- 用户评论区块 -->
          <div class="reviews-section">
            <div class="review-header-title">
              <span style="font-weight:700;font-size:23px;"><el-icon>
                  <ChatDotSquare />
                </el-icon> 用户评论</span>
            </div>

            <!-- 评论输入框 -->
            <div class="review-form" v-if="isLoggedIn">
              <div class="review-form-header">
                <el-avatar :size="32" :src="userAvatar" />
                <span class="review-username">{{ username }}</span>
              </div>
              <div class="review-star-row">
                <span class="review-star-label">评分：</span>
                <el-rate v-model="newReviewRating" :max="5" allow-half :colors="['#99A9BF', '#F7BA2A', '#FF9900']" />
              </div>
              <el-input v-model="newReviewContent" type="textarea" :rows="3" placeholder="分享你的游览体验..." maxlength="500"
                show-word-limit class="review-textarea" />
              <el-button type="primary" size="small" @click="submitReview" :loading="reviewLoading"
                class="submit-review-btn">
                发表评论
              </el-button>
            </div>
            <!-- 未登录提示 -->
            <div class="review-login-tip" v-else>
              <el-button type="primary" size="small" @click="goToLogin">登录后发表评论</el-button>
            </div>

            <!-- 评论列表 -->
            <div class="review-list" v-if="reviewList.length > 0">
              <div class="review-item" v-for="review in reviewList" :key="review.reviewId">
                <div class="review-header">
                  <el-avatar :size="36" :src="review.avatarUrl || '/default-avatar.png'" />
                  <div class="review-info">
                    <div class="review-user">{{ review.username || '匿名用户' }}</div>
                    <div class="review-meta">
                      <el-rate v-model="review.rating" disabled :max="5" allow-half size="small" />
                      <span class="review-date">{{ formatDate(review.createdAt) }}</span>
                    </div>
                  </div>
                  <!-- 自己的评论可删除 -->
                  <el-button v-if="review.userId === currentUserId" type="danger" size="small" text
                    @click="deleteReview(review.reviewId)" class="delete-review-btn">
                    删除
                  </el-button>
                </div>
                <div class="review-content">{{ review.content }}</div>
                <div class="review-images" v-if="review.images">
                  <el-image v-for="(img, idx) in parseImages(review.images)" :key="idx" :src="img"
                    :preview-src-list="parseImages(review.images)" fit="cover" class="review-img" />
                </div>
              </div>
            </div>
            <!-- 评论为空 -->
            <div class="review-empty" v-else>
              <el-empty description="暂无评论，快来发表第一条评论吧" :image-size="60" />
            </div>

            <!-- 评论分页 -->
            <div class="review-pagination" v-if="reviewTotal > reviewPageSize">
              <el-pagination background layout="prev, pager, next" :total="reviewTotal" :page-size="reviewPageSize"
                :current-page="reviewCurrentPage" @current-change="handleReviewPageChange" small />
            </div>
          </div>

        </div>
      </div>
      <!-- 高德地图容器 -->
      <div id="container" v-if="scenic.scenicId"></div>
    </div>
  </div>
</template>

<script>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import NavComponent from '@/components/NavComponent.vue';
import {
  Location, ArrowRight, Camera, Clock, Ticket, View,
  MapLocation, ChatDotSquare, Star, StarFilled, Collection,
} from '@element-plus/icons-vue';
import { ElMessage, ElEmpty, ElRate, ElAvatar, ElImage } from 'element-plus';
import axios from 'axios';
import AMapLoader from "@amap/amap-jsapi-loader";

export default {
  name: 'SpotDetailView',
  components: {
    NavComponent,
    Location, ArrowRight, Camera, Clock, Ticket, View,
    MapLocation, ChatDotSquare, Star, StarFilled, Collection,
    ElEmpty, ElRate, ElAvatar, ElImage
  },
  setup() {
    const router = useRouter();
    const route = useRoute();

    // 页面加载状态
    const loading = ref(true);
    // 景点详情数据
    const scenic = ref({});
    // 景点图片列表
    const spotImages = ref([]);
    // 当前图片索引
    const currentImageIndex = ref(0);
    // 收藏状态
    const isWished = ref(false);

    // 封面图 + 详情图 合并为一个列表
    const allSpotImages = computed(() => {
      const images = [];
      if (scenic.value?.coverImage) images.push(scenic.value.coverImage);
      images.push(...spotImages.value);
      return images;
    });

    // 当前展示的大图
    const currentMainImage = computed(() => {
      const images = allSpotImages.value;
      return images[currentImageIndex.value] || images[0] || '';
    });

    // 用户登录状态
    const isLoggedIn = ref(false);
    const username = ref('');
    const userAvatar = ref('');
    const currentUserId = ref(null);
    // 评论列表相关
    const reviewList = ref([]);
    const reviewLoading = ref(false);
    const newReviewRating = ref(5);       // 新增评分
    const newReviewContent = ref('');     // 新增内容
    const reviewCurrentPage = ref(1);     // 当前评论页
    const reviewPageSize = ref(10);       // 每页评论数
    const reviewTotal = ref(0);           // 评论总数

    const securityJsCode = import.meta.env.VITE_AMAP_SECURITY_CODE; // 高德地图安全密钥
    const amapKey = import.meta.env.VITE_AMAP_KEY; // 高德地图API密钥

    let map = null; // 地图实例

    // 加载高德地图
    const initMap = async (longitude, latitude) => {
      // 校验经纬度数据
      if (longitude == null || latitude == null) {
        console.warn('景点暂无经纬度数据，无法加载地图');
        ElMessage.warning('该景点暂未标注地图位置');
        return;
      }
      // 等待 DOM 更新完毕，确保地图容器已渲染
      await nextTick();
      // 设置高德地图安全密钥
      window._AMapSecurityConfig = {
        securityJsCode: securityJsCode,
      };
      try {
        const AMap = await AMapLoader.load({
          key: amapKey,
          version: "2.0",
          plugins: ["AMap.Scale"],
        });
        // 创建地图实例
        map = new AMap.Map("container", {
          zoom: 10,
          center: [longitude, latitude],
        });
        // 添加景点标记
        const marker = new AMap.Marker({
          position: [longitude, latitude],
          title: scenic.value.name || '景点位置',
        });
        map.add(marker);
        // 添加比例尺控件
        map.addControl(new AMap.Scale());
      } catch (e) {
        console.error("地图加载失败:", e);
        ElMessage.error('地图加载失败，请检查网络后刷新页面');
      }
    };

    // 切换图片
    const switchImage = (index) => {
      currentImageIndex.value = index;
    };

    // 查询当前景点是否已收藏
    const checkWishlistStatus = async () => {
      try {
        const res = await axios.get('http://localhost:8080/user-scenic-favorites/list', {
          params: { pageNum: 1, size: 999 }
        });
        if (res.data.code === 200) {
          const list = res.data.data.list || [];
          isWished.value = list.some(item => item.scenicId === scenic.value.scenicId);
        }
      } catch (e) {
        console.error('获取收藏状态失败', e);
      }
    };

    // 切换收藏状态
    const toggleWishlist = async () => {
      try {
        if (isWished.value) {
          // 取消收藏
          const res = await axios.delete(`http://localhost:8080/user-scenic-favorites/delete/${scenic.value.scenicId}`);
          if (res.data.code === 200) {
            isWished.value = false;
            ElMessage.success('已取消收藏');
          } else {
            ElMessage.error(res.data.message || '取消收藏失败');
          }
        } else {
          // 添加收藏
          const res = await axios.post('http://localhost:8080/user-scenic-favorites/add', {
            scenicId: scenic.value.scenicId
          });
          if (res.data.code === 200) {
            isWished.value = true;
            ElMessage.success('已添加至收藏');
          } else {
            ElMessage.error(res.data.message || '收藏失败');
          }
        }
      } catch (e) {
        console.error('操作收藏失败:', e);
        ElMessage.error('操作失败，请稍后重试');
      }
    };

    // 预订按钮
    const handleBook = () => {
      ElMessage.info('预订功能开发中');
    };

    // 滚动到地图区域
    const scrollToMap = () => {
      const el = document.getElementById('container');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    };

    // 从 localStorage 读取登录态
    const checkLoginStatus = () => {
      const token = localStorage.getItem('token');
      isLoggedIn.value = !!token;
      username.value = localStorage.getItem('username') || '';
      userAvatar.value = localStorage.getItem('userAvatar') || '/default-avatar.png';
      currentUserId.value = localStorage.getItem('userId') ? parseInt(localStorage.getItem('userId')) : null;
    };

    // 获取景点详情
    const fetchScenicDetali = async () => {
      loading.value = true;
      try {
        const res = await axios.get(`http://localhost:8080/scenic-spots/get/${route.params.id}`);
        if (res.data.code === 200 && res.data.data) {
          scenic.value = res.data.data;
          // 加载景点图片
          try {
            const imgRes = await axios.get(`http://localhost:8080/scenic-images/list/${route.params.id}`);
            if (imgRes.data.code === 200) {
              spotImages.value = imgRes.data.data.map(img => img.imageUrl);
            }
          } catch (e) {
            console.error('加载图片失败', e);
          }
          // 更新浏览量（不阻塞）
          axios.put(`http://localhost:8080/scenic-spots/updateViews?id=${route.params.id}`);
          // 初始化地图
          initMap(scenic.value.longitude, scenic.value.latitude);
        } else {
          ElMessage.error('景点不存在');
          router.push('/scenic-spots');
        }
      } catch (error) {
        console.error('获取景点详情失败:', error);
        ElMessage.error('获取详情失败');
      } finally {
        loading.value = false;
      }
    };

    // 获取评论列表
    const fetchReviews = async (scenicId) => {
      try {
        const response = await axios.get('http://localhost:8080/scenic-reviews/list', {
          params: {
            pageNum: reviewCurrentPage.value,
            size: reviewPageSize.value,
            scenicId: scenicId
          }
        });

        if (response.data.code === 200 && response.data.data) {
          let list = response.data.data.list || [];
          list = list.filter(item => item.scenicId === scenicId);
          list = list.map(item => ({
            ...item,
            rating: parseFloat(item.rating) || 0
          }));
          reviewList.value = list;
          reviewTotal.value = list.length;
        }
      } catch (error) {
        console.error('获取评论失败:', error);
        reviewList.value = [];
      }
    };

    // 提交评论
    const submitReview = async () => {
      if (!newReviewContent.value.trim()) {
        ElMessage.warning('请输入评论内容');
        return;
      }

      reviewLoading.value = true;
      try {
        const response = await axios.post('http://localhost:8080/scenic-reviews/add', {
          scenicId: scenic.value.scenicId,
          rating: Number(newReviewRating.value),
          content: newReviewContent.value,
          status: 1
        });

        if (response.data.code === 200) {
          ElMessage.success('评论发表成功');
          newReviewContent.value = '';
          newReviewRating.value = 5;
          fetchReviews(scenic.value.scenicId);
        } else {
          ElMessage.error(response.data.message || '评论发表失败');
        }
      } catch (error) {
        console.error('评论发表失败:', error);
        ElMessage.error('评论发表失败，请稍后重试');
      } finally {
        reviewLoading.value = false;
      }
    };

    // 删除评论
    const deleteReview = async (reviewId) => {
      try {
        const response = await axios.delete(`http://localhost:8080/scenic-reviews/delete/${reviewId}`);
        if (response.data.code === 200) {
          ElMessage.success('评论删除成功');
          fetchReviews(scenic.value.scenicId);
        } else {
          ElMessage.error(response.data.message || '删除失败');
        }
      } catch (error) {
        console.error('删除评论失败:', error);
        ElMessage.error('删除失败，请稍后重试');
      }
    };

    // 解析评论图片（兼容 JSON 和逗号分隔两种格式）
    const parseImages = (images) => {
      if (!images) return [];
      try {
        return JSON.parse(images);
      } catch {
        return images.split(',').filter(img => img.trim());
      }
    };

    // 跳转登录页
    const goToLogin = () => {
      router.push('/login');
    };

    // 评论分页切换
    const handleReviewPageChange = (page) => {
      reviewCurrentPage.value = page;
      if (scenic.value.scenicId) {
        fetchReviews(scenic.value.scenicId);
      }
    };

    // 格式化数量（千/万缩略）
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
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    };

    // 组件挂载：检查登录、加载景点详情和评论
    onMounted(() => {
      checkLoginStatus();
      fetchScenicDetali().then(() => {
        if (scenic.value.scenicId) {
          fetchReviews(scenic.value.scenicId);
          checkWishlistStatus();
        }
      });
    });

    // 组件卸载：销毁地图实例释放内存
    onUnmounted(() => {
      map?.destroy();
    });

    return {
      loading, scenic, spotImages, allSpotImages, currentImageIndex, currentMainImage, isWished,
      isLoggedIn, username, userAvatar, currentUserId,
      reviewList, reviewLoading, newReviewRating, newReviewContent,
      reviewCurrentPage, reviewPageSize, reviewTotal,
      switchImage, toggleWishlist, handleBook, scrollToMap,
      submitReview, deleteReview, parseImages, goToLogin, handleReviewPageChange,
      formatCount, formatDate, router
    };
  }
};
</script>

<style scoped>
.spot-detail-page {
  min-height: 100vh;
  background: #f1f5f9;
  padding: 2rem 2rem 3rem;
  background-image: radial-gradient(circle at 10% 20%, rgba(79, 70, 229, 0.02) 2px, transparent 2px);
  background-size: 32px 32px;
}

.not-found {
  padding: 100px 0;
}

.detail-pc {
  max-width: 1400px;
  margin: 0 auto;
  background: #FFFF;
  border-radius: 2rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.detail-main {
  display: flex;
  flex-wrap: wrap;
}

.gallery-section {
  /* flex: 2; */
  width: 100%;
  background: #1e293b;
  display: flex;
  flex-direction: column;
}

.main-image {
  position: relative;
  width: 100%;
  background: #0f172a;
}

.main-image img {
  width: 100%;
  height: auto;
  display: block;
  aspect-ratio: 2 / 1;
  max-height: 420px;
  object-fit: cover;
}

.image-badge {
  position: absolute;
  bottom: 1rem;
  left: 1rem;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  color: white;
  padding: 0.4rem 1rem;
  border-radius: 30px;
  font-size: 22px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.thumbnail-strip {
  display: flex;
  gap: 0.6rem;
  padding: 1rem;
  background: #0f172a;
  flex-wrap: wrap;
}

.thumbnail {
  width: 80px;
  height: 60px;
  object-fit: cover;
  border-radius: 12px;
  cursor: pointer;
  opacity: 0.7;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.thumbnail.active {
  opacity: 1;
  border-color: #6366f1;
  transform: scale(1.02);
}

.thumbnail:hover {
  opacity: 1;
}

.info-section {
  flex: 1.2;
  padding: 1.8rem 2rem 2rem;
  background: white;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  text-align: left;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 23px;
  color: #5b6e8c;
}

.breadcrumb .el-icon {
  font-size: 22px;
}

.wishlist-btn {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 23px;
  color: #5b6e8c;
  transition: color 0.2s;
}

.wishlist-btn:hover {
  color: #f59e0b;
}

.spot-title {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.spot-title h1 {
  font-size: 36px;
  font-weight: 800;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, #0f172a, #2d3a5e);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  margin: 0;
}

.rating-badge {
  background: #f8fafc;
  padding: 0.3rem 0.8rem;
  border-radius: 60px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.rating-value {
  font-weight: 800;
  font-size: 28px;
  color: #f59e0b;
}

.info-row {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  border-bottom: 1px solid #eef2ff;
  padding-bottom: 0.8rem;
}

.info-chip {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 24px;
  color: #334155;
}

.info-chip .el-icon {
  color: #6366f1;
}

.description {
  font-size: 24px;
  line-height: 1.7;
  color: #334155;
  margin-top: 0.2rem;
}

.spec-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.8rem;
  background: #f8fafc;
  border-radius: 1rem;
  padding: 1rem;
}

.spec-item {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

.spec-icon {
  width: 32px;
  height: 32px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4f46e5;
  flex-shrink: 0;
}

.spec-text .label {
  font-size: 22px;
  color: #5b6e8c;
}

.spec-text .value {
  font-weight: 700;
  font-size: 16px;
}



.price {
  font-size: 34px;
  font-weight: 800;
  color: #0f172a;
}

.price small {
  font-size: 22px;
  font-weight: 400;
}

.book-btn {
  background: linear-gradient(105deg, #4f46e5, #7c3aed);
  border: none;
  padding: 0.7rem 1.8rem;
  border-radius: 2rem;
  color: white;
  font-weight: 700;
  cursor: pointer;
  transition: 0.2s;
  font-size: 23px;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.book-btn:hover {
  transform: scale(0.97);
  background: linear-gradient(105deg, #4338ca, #6d28d9);
}

.map-buttons {
  display: flex;
  gap: 0.8rem;
  justify-content: space-between;
}

.btn-outline-sm {
  background: transparent;
  border: 1px solid #cbd5e1;
  border-radius: 30px;
  padding: 0.5rem 1.2rem;
  font-size: 22px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  color: #334155;
  transition: all 0.2s;
}

.btn-outline-sm:hover {
  background: #f8fafc;
  border-color: #6366f1;
  color: #4f46e5;
}

.separator {
  height: 1px;
  background: #eef2ff;
  margin: 0.3rem 0;
}

.reviews-section {
  margin-top: 0.3rem;
}

.review-header-title {
  margin-bottom: 0.8rem;
  display: flex;
  align-items: center;
}

.review-form {
  background: #f8fafc;
  padding: 1.2rem 1.2rem 0.8rem;
  border-radius: 1rem;
  margin-bottom: 1rem;
  border: 1px solid #eef2ff;
}

.review-form-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.4rem;
}

.review-username {
  font-weight: 700;
  font-size: 24px;
  color: #1e293b;
}

.review-star-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.review-star-label {
  font-size: 23px;
  color: #5b6e8c;
}

.review-textarea {
  margin-top: 0.5rem;
}

.review-textarea :deep(.el-textarea__inner) {
  border-radius: 12px;
  padding: 14px 18px;
  font-size: 22px;
  border: 2px solid #e2e8f0;
  box-shadow: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  resize: vertical;
  min-height: 120px;
  line-height: 1.6;
}

.review-textarea :deep(.el-textarea__inner:focus) {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.review-textarea :deep(.el-input__count) {
  font-size: 13px;
  color: #94a3b8;
  background: transparent;
  bottom: 6px;
  right: 12px;
}

.submit-review-btn {
  float: right;
  margin-top: 0.6rem;
  margin-bottom: 0.3rem;
  background: linear-gradient(105deg, #4f46e5, #7c3aed);
  border: none;
  border-radius: 2rem;
  padding: 0.6rem 1.8rem;
  font-weight: 600;
  font-size: 16px;
}

.submit-review-btn {
  float: right;
  margin-top: 0.5rem;
  background: linear-gradient(105deg, #4f46e5, #7c3aed);
  border: none;
  border-radius: 2rem;
  padding: 0.5rem 1.5rem;
  height: 40px;
  font-weight: 600;
  font-size: 22px;
}

.review-login-tip {
  text-align: center;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 1rem;
  margin-bottom: 1rem;
  border: 2px dashed #cbd5e1;
}

.review-item {
  border-top: 1px solid #ecf3fa;
  padding: 0.8rem 0;
  text-align: left;
}

.review-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.4rem;
  text-align: left;
}

.review-info {
  flex: 1;
  min-width: 0;
}

.review-user {
  font-weight: 700;
  font-size: 24px;
  color: #1e293b;
}

.review-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.review-date {
  font-size: 21px;
  color: #94a3b8;
}

.review-content {
  font-size: 23px;
  line-height: 1.6;
  color: #334155;
  padding-left: 0;
}

.review-images {
  padding-left: 0;
  margin-top: 0.5rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.review-img {
  width: 70px;
  height: 70px;
  border-radius: 8px;
  cursor: pointer;
  object-fit: cover;
}

.delete-review-btn {
  opacity: 0.6;
}

.delete-review-btn:hover {
  opacity: 1;
}

.review-empty {
  padding: 1rem 0;
}

.review-pagination {
  display: flex;
  justify-content: center;
  margin-top: 0.8rem;
}



.extra-links span {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  transition: color 0.2s;
}

.extra-links span:hover {
  color: #4f46e5;
}

#container {
  width: 100%;
  height: 400px;
}

@media (max-width: 1000px) {
  .spot-detail-page {
    padding: 1rem;
  }

  .detail-main {
    flex-direction: column;
  }

  .info-section {
    padding: 1.5rem;
  }
}
</style>
