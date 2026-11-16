<template>
  <!-- 模板部分完全不变，仅保留原结构 -->
  <div class="article-detail-container">
    <nav-component search-placeholder="搜索攻略..." />

    <!-- 攻略详情内容 -->
    <div class="article-detail-content">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="15" animated />
      </div>

      <!-- 攻略内容 -->
      <div v-else class="article-content-wrap">
        <!-- 攻略头部信息 -->
        <div class="article-header">
          <div class="article-meta">
            <div class="author-info" @click="viewAuthorProfile">
              <img :src="authorAvatarSrc" class="author-avatar" :alt="article.userName">
              <div class="author-info-inner">
                <div class="author-name">{{ article.userName }}</div>
                <div class="author-meta">
                  <span class="article-date">{{ formatDate(article.createdAt) }}</span>
                  <span class="article-category" v-if="article.categoryId">
                    {{ getCategoryName(article.categoryId) }}
                  </span>
                </div>
              </div>
            </div>
            <div class="article-actions">
              <el-button v-if="!isAuthor && isLoggedIn" :type="isFollowing ? 'default' : 'primary'" size="small"
                @click="toggleFollow" :loading="followLoading" class="follow-btn">
                <i :class="isFollowing ? 'el-icon-check' : 'el-icon-plus'"></i>
                {{ isFollowing ? '已关注' : '关注' }}
              </el-button>
              <template v-if="isAuthor">
                <!-- <el-button type="primary" size="small" @click="editArticle">编辑</el-button> -->
                <el-button type="danger" size="small" @click="confirmDelete">删除</el-button>
              </template>
            </div>
          </div>
          <h1 class="article-title">{{ article.title }}</h1>
          <div class="article-tags" v-if="article.tags && article.tags.length > 0">
            <span class="tag" v-for="tag in article.tags" :key="tag.id" @click="goToTagArticles(tag.id)">
              {{ tag.name }}
            </span>
          </div>
        </div>

        <!-- 攻略封面图-->
        <div class="article-cover-image" v-if="article.coverImage">
          <img :src="article.coverImage" alt="攻略封面" class="cover-image" @click="previewImage(article.coverImage)">
        </div>

        <!-- 攻略正文-->
        <div class="article-body" v-html="article.content" @click="handleBodyClick"></div>
        <!-- 攻略视频区 -->
        <div class="article-videos" v-if="!loading">
          <!-- 视频加载状态 -->
          <div v-if="videoLoading" class="video-loading">
            <el-skeleton :rows="1" width="100%" height="200px" animated />
          </div>

          <!-- 视频加载错误 -->
          <el-alert v-else-if="videoError" type="error" closable @close="videoError = ''" class="video-error-alert">
            {{ videoError }}
          </el-alert>

          <!-- 视频列表（有数据时） -->
          <div v-else-if="articleVideos.length > 0" class="video-list-container">
            <h2 class="video-section-title">攻略视频（{{ articleVideos.length }}）</h2>
            <div class="video-list">
              <div class="video-item" v-for="video in articleVideos" :key="video.mediaId">
                <!-- 视频封面+播放按钮 -->
                <div class="video-cover-wrapper" @click="playVideo(video.mediaUrl)">
                  <img :src="video.videoCoverUrl || '/default-video-cover.png'" :alt="video.mediaTitle || '视频封面'"
                    class="video-cover" @error="() => (video.loadError = true)">
                  <div class="video-play-btn">
                    <el-icon class="play-icon">
                      <VideoPlay />
                    </el-icon>
                  </div>
                  <div class="video-duration">
                    {{ formatDuration(video.videoDuration) }}
                  </div>
                  <div class="video-cover-error" v-if="video.loadError">
                    <el-icon class="error-icon">
                      <VideoCamera />
                    </el-icon>
                    <span>封面加载失败</span>
                  </div>
                </div>

                <!-- 视频信息 -->
                <div class="video-info">
                  <h3 class="video-title">{{ video.mediaTitle || `视频${video.mediaId}` }}</h3>
                  <p class="video-meta" v-if="video.extraInfo">
                    {{ formatFileSize(JSON.parse(video.extraInfo).size) }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- 视频空状态 -->
          <div v-else class="video-empty">
            <el-icon class="empty-icon">
              <VideoCamera />
            </el-icon>
            <p>暂无关联视频</p>
          </div>
        </div>
        <!-- 攻略底部统计与操作-->
        <div class="article-footer">
          <div class="article-stats">
            <span><i class="el-icon-view"></i> {{ formatNumber(article.viewCount) }} 阅读</span>
            <span><i class="el-icon-chat-dot-round"></i> {{ formatNumber(article.commentCount) }} 评论</span>
          </div>
          <div class="article-actions">
            <el-button :type="article.liked ? 'primary' : 'default'" @click="toggleLike"
              class="action-button like-button" :loading="likeLoading">
              <el-icon>
                <CircleCheckFilled v-if="article.liked" />
                <CircleCheck v-else />
              </el-icon>
            </el-button>
            <el-button @click="scrollToComments" class="action-button comment-button">
              <el-icon>
                <ChatDotRound />
              </el-icon>
            </el-button>
            <el-button class="action-button collect-button" :type="isCollected ? 'primary' : 'default'"
              @click="toggleCollect" :loading="collectLoading">
              <el-icon>
                <StarFilled v-if="isCollected" />
                <Star v-else />
              </el-icon>
            </el-button>
          </div>
        </div>

        <!-- 评论区-->
        <div class="article-comments" ref="commentsSection">
          <h2>评论 ({{ formatNumber(article.commentCount) }})</h2>
          <div class="comment-form" v-if="isLoggedIn">
            <div class="comment-form-header">

              <div class="comment-input-wrapper">
                <el-input v-model="commentContent" type="textarea" :rows="3" placeholder="写下你的评论..." maxlength="500"
                  show-word-limit @keyup.enter.prevent="submitComment"></el-input>
              </div>
            </div>
            <div class="comment-form-footer">
              <el-button type="primary" @click="submitComment" :disabled="!commentContent.trim()">发表评论</el-button>
            </div>
          </div>
          <div class="login-to-comment" v-else>
            <p>请
              <router-link to="/login" @click="recordReturnUrl">登录</router-link>
              后发表评论
            </p>
          </div>
          <div class="comments-list">
            <div v-if="comments.length === 0" class="no-comments">
              <p>暂无评论，快来发表第一条评论吧！</p>
            </div>
            <div v-else class="comment-item" v-for="comment in comments" :key="comment.commentId">
              <div class="comment-header">
                <img :src="comment.userAvatar" class="comment-avatar" :alt="comment.userName"
                  @click="goToUserProfile(comment.userId)">
                <div class="comment-meta">
                  <div class="comment-author">{{ comment.userName }}</div>
                  <div class="comment-date">{{ formatDate(comment.createdAt) }}</div>
                </div>
              </div>
              <div class="comment-content">{{ comment.content }}</div>
              <div class="comment-actions">
                <span @click="toggleCommentLike(comment)">
                  <i :class="comment.liked ? 'el-icon-star-on liked' : 'el-icon-star-off'"></i>
                  {{ comment.likeCount > 0 ? formatNumber(comment.likeCount) : '点赞' }}
                </span>
                <span @click="replyToComment(comment)">
                  <i class="el-icon-chat-dot-round"></i> 回复
                </span>
                <span v-if="comment.userId === currentUserId || article.userId === currentUserId"
                  @click="deleteComment(comment.commentId)">
                  <i class="el-icon-delete"></i> 删除
                </span>
                <span v-if="comment.children && comment.children.length > 0" @click="toggleExpand(comment)"
                  class="toggle-replies">
                  <i :class="comment.isExpanded ? 'el-icon-arrow-up' : 'el-icon-arrow-down'"></i>
                  {{ comment.isExpanded ? '收起回复' : '展开回复' }} ({{ formatNumber(comment.children.length) }})
                </span>
              </div>
              <div class="replies-list" v-if="comment.children && comment.children.length > 0"
                v-show="comment.isExpanded">
                <div class="reply-item" v-for="reply in comment.children" :key="reply.commentId">
                  <div class="reply-header">
                    <img :src="reply.userAvatar" class="reply-avatar" :alt="reply.userName"
                      @click="goToUserProfile(reply.userId)">
                    <div class="reply-meta">
                      <div class="reply-author">{{ reply.userName }}</div>
                      <div class="reply-date">{{ formatDate(reply.createdAt) }}</div>
                    </div>
                  </div>
                  <div class="reply-content">
                    <span class="reply-to" v-if="reply.replyToUsername">回复@{{ reply.replyToUsername }}</span>
                    {{ reply.content }}
                  </div>
                  <div class="reply-actions">
                    <span @click="toggleReplyLike(reply)">
                      <i :class="reply.liked ? 'el-icon-star-on liked' : 'el-icon-star-off'"></i>
                      {{ reply.likeCount > 0 ? formatNumber(reply.likeCount) : '点赞' }}
                    </span>
                    <span @click="replyToReply(comment.commentId, reply)">
                      <i class="el-icon-chat-dot-round"></i> 回复
                    </span>
                    <span v-if="reply.userId === currentUserId || article.userId === currentUserId"
                      @click="deleteReply(reply.commentId)">
                      <i class="el-icon-delete"></i> 删除
                    </span>
                  </div>
                  <!-- 二级评论的回复框 -->
                  <div v-if="activeReplyId === reply.commentId">
                    <div class="reply-form">
                      <div class="reply-input-wrapper">
                        <el-input v-model="replyContent" type="textarea" :rows="2"
                          :placeholder="replyToUsername ? `回复@${replyToUsername}...` : '写下你的回复...'" maxlength="300"
                          show-word-limit @keyup.enter.prevent="submitReply(comment.commentId)"></el-input>
                      </div>
                      <div class="reply-form-footer">
                        <el-button size="small" @click="cancelReply">取消</el-button>
                        <el-button type="primary" size="small" @click="submitReply(comment.commentId)"
                          :disabled="!replyContent.trim()">回复
                        </el-button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <!-- 一级评论的回复框 -->
              <div class="reply-form" v-if="activeReplyId === comment.commentId && isLoggedIn">
                <div class="reply-input-wrapper">
                  <el-input v-model="replyContent" type="textarea" :rows="2"
                    :placeholder="replyToUsername ? `回复@${replyToUsername}...` : '写下你的回复...'" maxlength="300"
                    show-word-limit @keyup.enter.prevent="submitReply(comment.commentId)"></el-input>
                </div>
                <div class="reply-form-footer">
                  <el-button size="small" @click="cancelReply">取消</el-button>
                  <el-button type="primary" size="small" @click="submitReply(comment.commentId)"
                    :disabled="!replyContent.trim()">回复
                  </el-button>
                </div>
              </div>

            </div>
          </div>
          <div class="pagination-container" v-if="totalComments > pageSize">
            <el-pagination background layout="prev, pager, next" :total="totalComments" :page-size="pageSize"
              :current-page="currentPage" @current-change="handlePageChange"></el-pagination>
          </div>
        </div>
      </div>
    </div>

    <el-dialog title="图片预览" v-model="imagePreviewVisible" width="90%" :show-close="true" class="image-preview-dialog">
      <div class="preview-image-container">
        <img :src="previewImageUrl" alt="图片预览" class="preview-image-full">
      </div>
    </el-dialog>
    <!-- 视频播放器弹窗 -->
    <el-dialog title="播放视频" v-model="videoPlayerVisible" width="80%" :fullscreen="true" append-to-body>
      <div class="video-player-container">
        <video :src="currentVideoUrl" class="video-player" controls playsinline webkit-playsinline x5-playsinline
          preload="auto" @error="handleVideoPlayError">
          您的浏览器不支持HTML5视频播放，请更新浏览器版本。
        </video>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import axios from 'axios';

import {
  VideoPlay,
  VideoCamera,
  CircleCheck,
  CircleCheckFilled,
  ChatDotRound,
  Star,
  StarFilled
} from '@element-plus/icons-vue';
import NavComponent from "@/components/NavComponent.vue";

export default {
  name: 'ArticleDetailView',
  // 注册视频相关图标
  components: {
    NavComponent,
    VideoPlay,
    VideoCamera,
    CircleCheck,
    CircleCheckFilled,
    ChatDotRound,
    Star,
    StarFilled
  },
  setup() {
    const router = useRouter();
    const route = useRoute();
    // 原有变量（无修改）
    const isLoggedIn = ref(false);
    const username = ref('');
    const userAvatar = ref('');
    const currentUserId = ref('');
    const article = ref({
      articleId: '',
      title: '',
      content: '',
      coverImage: '',
      viewCount: 0,
      commentCount: 0,
      likeCount: 0,
      liked: false,
      userName: '',
      userId: '',
      avatarUrl: '',
      createdAt: '',
      categoryId: null,
      tags: []
    });
    const loading = ref(true);
    const comments = ref([]);
    const commentContent = ref('');
    const replyContent = ref('');
    const activeReplyId = ref(null); // 当前显示回复框的评论ID
    const currentReplyParentId = ref(null); // 当前回复的目标评论ID（用于二级回复）
    const replyToUsername = ref('');
    const replyToUserId = ref(null);
    const currentPage = ref(1);
    const pageSize = ref(10);
    const totalComments = ref(0);
    const commentsSection = ref(null);
    const categoryTree = ref([]);
    const followLoading = ref(false);
    const likeLoading = ref(false);
    const collectLoading = ref(false);
    const isFollowing = ref(false);
    const isCollected = ref(false);
    const shareDialogVisible = ref(false);
    const imagePreviewVisible = ref(false);
    const previewImageUrl = ref('');
    // 视频相关变量
    const articleVideos = ref([]); // 攻略关联视频列表
    const videoLoading = ref(false); // 视频加载状态
    const videoError = ref(''); // 视频加载错误
    const videoPlayerVisible = ref(false); // 视频播放器弹窗显隐
    const currentVideoUrl = ref(''); // 当前播放视频URL
    // 原有计算属性
    const isAuthor = computed(() => {
      return article.value.userId && currentUserId.value
        ? String(article.value.userId) === String(currentUserId.value)
        : false;
    });
    // 计算作者头像URL，优先使用攻略数据中的avatarUrl字段，如果没有则使用默认头像
    const authorAvatarSrc = computed(() => {
      return article.value.avatarUrl || '/default-avatar.png';
    });
    // 工具函数
    const normalizeCategoryTree = (data) => {
      const list = Array.isArray(data) ? data : (data?.list ? data.list : []);
      const ensureChildren = (nodes) => {
        return Array.isArray(nodes)
          ? nodes.map(n => ({ ...n, children: ensureChildren(n.children) }))
          : [];
      };
      return ensureChildren(list);
    };
    const formatDate = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return isNaN(date.getTime())
        ? ''
        : date.toLocaleDateString('zh-CN', {
          year: 'numeric', month: 'long', day: 'numeric',
          hour: '2-digit', minute: '2-digit'
        });
    };
    const formatNumber = (num) => {
      if (num < 1000) return num;
      if (num < 10000) return `${(num / 1000).toFixed(1)}k`;
      return `${(num / 10000).toFixed(1)}w`;
    };
    // 视频时长格式化（秒 → 分:秒，如65→01:05）
    const formatDuration = (seconds) => {
      if (!seconds || isNaN(Number(seconds))) return '00:00';
      const mins = Math.floor(Number(seconds) / 60);
      const secs = Math.floor(Number(seconds) % 60);
      // 补零（确保两位数）
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };
    // 文件大小格式化（字节 → KB/MB，如1024→1.0 KB）
    const formatFileSize = (bytes) => {
      if (!bytes || isNaN(Number(bytes))) return '未知大小';
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };
    // 检查登录状态并获取用户信息
    const checkLoginStatus = () => {
      const token = localStorage.getItem('token');
      const storedUsername = localStorage.getItem('username');
      const userId = localStorage.getItem('userId');
      isLoggedIn.value = !!token;
      username.value = storedUsername || '';
      userAvatar.value = localStorage.getItem('userAvatar') || '/default-avatar.png';
      currentUserId.value = userId || '';
    };
    // 数据加载方法
    const fetchCategoryTree = async () => {
      try {
        const response = await axios.get('http://localhost:8080/category/getCategoryTree');
        if (response.data.code === 200) {
          categoryTree.value = normalizeCategoryTree(response.data.data);
        } else {
          ElMessage.error(response.data.message || '获取分类失败');
        }
      } catch (error) {
        console.error('获取分类树失败:', error);
        ElMessage.error('获取分类失败，请稍后重试');
      }
    };
    // 加载攻略关联视频
    const fetchArticleVideos = async () => {
      videoLoading.value = true;
      videoError.value = '';
      try {
        const articleId = route.params.id;
        if (!articleId || isNaN(Number(articleId))) {
          throw new Error('攻略ID无效，无法加载视频');
        }
        const response = await axios.get(
          `http://localhost:8080/articleMedia/media/${articleId}`, // 后端视频查询接口
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        if (response.data.code !== 200 || !Array.isArray(response.data.data)) {
          throw new Error(response.data.message || '获取视频列表失败');
        }
        // 处理视频数据，补充默认值
        articleVideos.value = response.data.data.map(video => ({
          ...video,
          videoCoverUrl: video.videoCoverUrl || '/default-video-cover.png',
          mediaTitle: video.mediaTitle || `视频${articleVideos.value.length + 1}`,
          videoDuration: video.videoDuration || 0,
          loadError: false
        }));
      } catch (error) {
        videoError.value = error.message || '视频加载失败，请稍后重试';
        console.error('获取攻略视频失败:', error);
      } finally {
        videoLoading.value = false;
      }
    };

    const getSessionId = () => {
      const match = document.cookie.match(/session_id=([^;]+)/);
      return match ? match[1] : null;
    };
    // 获取 extra 信息
    const getExtra = () => {
      const info = {
        platform: navigator.platform,
        deviceModel: navigator.userAgent
      };
      return JSON.stringify(info);
    };
    // 获取攻略详情
    const fetchArticle = async () => {
      loading.value = true;
      try {
        const articleId = route.params.id;
        if (!articleId || isNaN(Number(articleId))) {
          ElMessage.warning('攻略ID无效');
          router.push('/articles');
          return;
        }
        const response = await axios.get(`http://localhost:8080/article/getArticleById/${articleId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'X-Session-Id': getSessionId(),
            'X-Extra': getExtra()
          }
        });
        if (response.data.code !== 200) {
          ElMessage.error(response.data.message || '获取攻略失败');
          router.push('/articles');
          return;
        }
        const articleData = response.data.data;
        Object.assign(article.value, {
          ...articleData,
          tags: articleData.tags || [],
          userId: articleData.userId || ''
        });
        if (isLoggedIn.value) {
          // 并行检查关注、收藏和点赞状态
          await Promise.all([
            checkFollowStatus(),
            checkCollectStatus(),
            fetchArticleLikeStatus(Number(articleId))
          ]);
        }
        await fetchComments();
        // 加载攻略视频
        await fetchArticleVideos();


      } catch (error) {
        console.error('获取攻略详情失败:', error);
        ElMessage.error('获取攻略失败，请稍后重试');
        router.push('/articles');
      } finally {
        loading.value = false;
      }
    };
    // 获取攻略点赞状态
    const fetchArticleLikeStatus = async (articleId) => {
      try {
        const response = await axios.get(
          `http://localhost:8080/like/article/status/${articleId}`,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        if (response.data.code === 200) {
          article.value.liked = response.data.data.like;
          article.value.likeCount = response.data.data.count;
        }
      } catch (error) {
        console.error('获取攻略点赞状态失败:', error);
      }
    };
    // 获取评论列表
    const fetchComments = async () => {
      try {
        const articleId = route.params.id;
        if (!articleId) return;
        const response = await axios.get(`http://localhost:8080/comments/getCommentTree/${articleId}`);
        if (response.data.code !== 200) {
          ElMessage.error(response.data.message || '获取评论失败');
          return;
        }
        const processComments = (commentList, parentComment = null) => {
          return Array.isArray(commentList)
            ? commentList.map(c => {
              const processed = {
                ...c,
                userId: String(c.userId),
                isExpanded: true,
                replyToUsername: parentComment ? parentComment.userName : null,
                children: processComments(c.children, c)
              };
              return processed;
            })
            : [];
        };
        comments.value = processComments(response.data.data);
        totalComments.value = calculateCommentTotal(comments.value);
      } catch (error) {
        console.error('获取评论失败:', error);
        ElMessage.error('获取评论失败，请稍后重试');
      }
    };
    const calculateCommentTotal = (commentList) => {
      let total = 0;
      const count = (list) => {
        if (!Array.isArray(list)) return;
        total += list.length;
        list.forEach(c => count(c.children));
      };
      count(commentList);
      return total;
    };
    const updateViewCount = async () => {
      if (!isLoggedIn.value || isAuthor.value) return;
      const articleId = article.value.articleId;
      const lastViewKey = `lastArticleView_${articleId}`;
      const lastViewTimestamp = localStorage.getItem(lastViewKey);
      const currentTime = Date.now();
      if (lastViewTimestamp && (currentTime - parseInt(lastViewTimestamp) <= 20000)) {
        console.log('20秒内已更新阅读量，跳过');
        return;
      }
      try {
        const response = await axios.post(
          `http://localhost:8080/article/viewCount`,
          null,
          {
            params: { articleId },
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
              'X-Session-Id': getSessionId(),
              'X-Extra': getExtra()
            }
          }
        );
        if (response.data.code === 200) {
          article.value.viewCount += 1;
          localStorage.setItem(lastViewKey, currentTime.toString());
          console.log('阅读量更新请求已提交');
        } else {
          console.warn('阅读量更新失败:', response.data.message);
        }
      } catch (error) {
        console.error('更新阅读量失败:', error);
      }
    };
    // 检查关注状态
    const checkFollowStatus = async () => {
      try {
        const response = await axios.get(
          `http://localhost:8080/userFollow/isFollowing/${article.value.userId}`,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        if (response.data.code === 200) {
          isFollowing.value = response.data.message === '已关注';
        }
      } catch (error) {
        console.error('检查关注状态失败:', error);
      }
    };
    const toggleFollow = async () => {
      followLoading.value = true;
      try {
        let url = `http://localhost:8080/userFollow/`;
        const method = isFollowing.value ? 'delete' : 'post';
        if (isFollowing.value) {
          url += `deleteUserFollow/${article.value.userId}`;
        } else {
          url += 'addUserFollow';
        }
        const response = await axios[method](
          url,
          isFollowing.value ? undefined : article.value.userId,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          }
        );
        if (response.data.code === 200) {
          isFollowing.value = !isFollowing.value;
          ElMessage.success(response.data.message || (isFollowing.value ? '关注成功' : '取消关注成功'));
        } else {
          ElMessage.error(response.data.message || '操作失败');
        }
      } catch (error) {
        console.error('关注操作失败:', error);
        ElMessage.error('操作失败，请稍后重试');
      } finally {
        followLoading.value = false;
      }
    };
    // 检查收藏状态
    const checkCollectStatus = async () => {
      if (!isLoggedIn.value) return;
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:8080/bookMarks/list', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        console.log('收藏列表数据:', response.data);
        if (response.data.code === 200) {
          const collectList = response.data.data || [];
          const currentArticleId = article.value.articleId || article.value.id;
          console.log('当前攻略ID:', currentArticleId);
          console.log('收藏列表:', collectList);
          isCollected.value = collectList.some(item =>
            item.articleId === currentArticleId || item.article_id === currentArticleId
          );
          console.log('收藏状态:', isCollected.value);
        }
      } catch (error) {
        console.error('检查收藏状态失败:', error);
      }
    };
    const toggleCollect = async () => {
      if (!isLoggedIn.value) {
        ElMessage.warning('请先登录');
        router.push('/login');
        return;
      }
      collectLoading.value = true;
      try {
        const currentArticleId = article.value.articleId || article.value.id;
        if (isCollected.value) {
          const listResponse = await axios.get('http://localhost:8080/bookMarks/list', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          const collectList = listResponse.data.data || [];
          const collectItem = collectList.find(item =>
            item.articleId === currentArticleId || item.article_id === currentArticleId
          );
          if (collectItem) {
            await axios.delete(`http://localhost:8080/bookMarks/cancel/${collectItem.bookMarksId}`, {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
          }
        } else {
          await axios.post('http://localhost:8080/bookMarks/add', null, {
            params: { articleId: currentArticleId },
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
        }
        isCollected.value = !isCollected.value;
        ElMessage.success(isCollected.value ? '收藏成功' : '取消收藏成功');
      } catch (error) {
        console.error('收藏操作失败:', error);
        ElMessage.error('操作失败，请稍后重试');
      } finally {
        collectLoading.value = false;
      }
    };
    const toggleLike = async () => {
      if (!isLoggedIn.value) {
        ElMessage.warning('请先登录');
        router.push('/login');
        return;
      }
      likeLoading.value = true;
      try {
        const articleId = article.value.articleId;
        let response;
        if (article.value.liked) {
          response = await axios.delete(
            `http://localhost:8080/like/article/${articleId}`,
            { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
          );
        } else {
          response = await axios.post(
            `http://localhost:8080/like/article`,
            {},
            {
              params: { articleId: articleId },
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            }
          );
        }
        if (response.data.code === 200) {
          article.value.liked = !article.value.liked;
          article.value.likeCount = article.value.liked
            ? article.value.likeCount + 1
            : article.value.likeCount - 1;
          ElMessage.success(response.data.message || (article.value.liked ? '点赞成功' : '取消点赞成功'));
        } else {
          ElMessage.error(response.data.message || '操作失败');
        }
      } catch (error) {
        console.error('点赞操作失败:', error);
        ElMessage.error('操作失败，请稍后重试');
      } finally {
        likeLoading.value = false;
      }
    };

    const submitComment = async () => {
      if (!commentContent.value.trim()) {
        ElMessage.warning('评论内容不能为空');
        return;
      }
      try {
        const response = await axios.post(
          'http://localhost:8080/comments/addComment',
          {
            userId: currentUserId.value,
            articleId: article.value.articleId,
            parentId: 0,
            content: commentContent.value
          },
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        if (response.data.code === 200) {
          ElMessage.success('评论发表成功');
          commentContent.value = '';
          await fetchComments();
          article.value.commentCount += 1;
        } else {
          ElMessage.error(response.data.message || '评论发表失败');
        }
      } catch (error) {
        console.error('发表评论失败:', error);
        ElMessage.error('评论发表失败，请稍后重试');
      }
    };
    const replyToComment = (comment) => {
      activeReplyId.value = comment.commentId;
      replyToUsername.value = comment.userName;
      replyToUserId.value = comment.userId;
      replyContent.value = '';
    };
    // 点击回复按钮时
    // parentId: 父评论ID（回复框显示在其父评论下方）
    // reply: 被回复的评论对象
    const replyToReply = (parentId, reply) => {
      activeReplyId.value = reply.commentId; // 激活当前被回复评论下的回复框
      replyToUsername.value = reply.userName; // 被回复的用户名
      replyToUserId.value = reply.userId; // 被回复的用户ID
      replyContent.value = '';
      currentReplyParentId.value = reply.commentId; // 记录被回复的评论ID，传给后端
    };

    // 取消回复
    const cancelReply = () => {
      activeReplyId.value = null;
      currentReplyParentId.value = null;
      replyToUsername.value = '';
      replyToUserId.value = null;
      replyContent.value = '';
    };
    // 提交回复
    // parentId: 一级评论的ID（始终传递）
    const submitReply = async (parentId) => {
      if (!replyContent.value.trim()) {
        ElMessage.warning('回复内容不能为空');
        return;
      }
      try {
        // 始终使用一级评论ID作为parentId，形成两级评论结构
        const finalParentId = parentId;
        // 只有回复二级评论时才传userId参数
        const url = currentReplyParentId.value
          ? 'http://localhost:8080/comments/addComment?userId=' + replyToUserId.value
          : 'http://localhost:8080/comments/addComment';
        const response = await axios.post(
          url,
          {
            userId: currentUserId.value,
            articleId: article.value.articleId,
            parentId: finalParentId,
            content: replyContent.value
          },
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        if (response.data.code === 200) {
          ElMessage.success('回复发表成功');
          cancelReply();
          await fetchComments();
          article.value.commentCount += 1;
        } else {
          ElMessage.error(response.data.message || '回复发表失败');
        }
      } catch (error) {
        console.error('发表回复失败:', error);
        ElMessage.error('回复发表失败，请稍后重试');
      }
    };
    // 评论点赞/取消点赞
    const toggleCommentLike = async (comment) => {
      if (!isLoggedIn.value) {
        ElMessage.warning('请先登录');
        return;
      }
      try {
        const commentId = comment.commentId;
        let response;
        if (comment.liked) {
          response = await axios.delete(
            `http://localhost:8080/like/comment/${commentId}`,
            { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
          );
        } else {
          response = await axios.post(
            `http://localhost:8080/like/comment`,
            {},
            {
              params: { commentId: commentId },
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            }
          );
        }
        if (response.data.code === 200) {
          comment.liked = !comment.liked;
          comment.likeCount = comment.liked
            ? comment.likeCount + 1
            : comment.likeCount - 1;
        } else {
          ElMessage.error(response.data.message || '操作失败');
        }
      } catch (error) {
        console.error('评论点赞失败:', error);
        ElMessage.error('操作失败，请稍后重试');
      }
    };

    // 回复点赞/取消点赞
    const toggleReplyLike = async (reply) => {
      if (!isLoggedIn.value) {
        ElMessage.warning('请先登录');
        return;
      }
      try {
        const commentId = reply.commentId;
        let response;
        if (reply.liked) {
          response = await axios.delete(
            `http://localhost:8080/like/comment/${commentId}`,
            { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
          );
        } else {
          response = await axios.post(
            `http://localhost:8080/like/comment`,
            {},
            {
              params: { commentId: commentId },
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            }
          );
        }
        if (response.data.code === 200) {
          reply.liked = !reply.liked;
          reply.likeCount = reply.liked
            ? reply.likeCount + 1
            : reply.likeCount - 1;
        } else {
          ElMessage.error(response.data.message || '操作失败');
        }
      } catch (error) {
        console.error('回复点赞失败:', error);
        ElMessage.error('操作失败，请稍后重试');
      }
    };
    // 删除评论/回复（只有作者或攻略作者可见删除按钮）
    const deleteComment = async (commentId) => {
      ElMessageBox.confirm('确定删除这条评论吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async () => {
        try {
          const response = await axios.delete(
            `http://localhost:8080/comments/deleteComment/${commentId}`,
            { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
          );
          if (response.data.code === 200) {
            ElMessage.success('评论删除成功');
            await fetchComments();
            article.value.commentCount -= 1;
          } else {
            ElMessage.error(response.data.message || '评论删除失败');
          }
        } catch (error) {
          console.error('删除评论失败:', error);
          ElMessage.error('删除评论失败，请稍后重试');
        }
      }).catch(() => {
        ElMessage.info('已取消删除');
      });
    };
    // 删除回复
    const deleteReply = async (replyId) => {
      ElMessageBox.confirm('确定删除这条回复吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async () => {
        try {
          const response = await axios.delete(
            `http://localhost:8080/comments/deleteComment/${replyId}`,
            { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
          );
          if (response.data.code === 200) {
            ElMessage.success('回复删除成功');
            await fetchComments();
            article.value.commentCount -= 1;
          } else {
            ElMessage.error(response.data.message || '回复删除失败');
          }
        } catch (error) {
          console.error('删除回复失败:', error);
          ElMessage.error('删除回复失败，请稍后重试');
        }
      }).catch(() => {
        ElMessage.info('已取消删除');
      });
    };
    // 展开/收起评论树
    const toggleExpand = (comment) => {
      comment.isExpanded = !comment.isExpanded;
    };
    // 分页切换
    const handlePageChange = (page) => {
      currentPage.value = page;
      fetchComments();
    };

    // 滚动到评论区
    const scrollToComments = () => {
      commentsSection.value?.scrollIntoView({ behavior: 'smooth' });
    };
    // 显示分享弹窗
    const showShareDialog = () => {
      ElMessage.info('分享功能开发中');
    };

    // 查看作者主页
    const viewAuthorProfile = () => {
      if (article.value.userId) {
        router.push({ name: 'profile', params: { id: article.value.userId } });
      } else {
        ElMessage.warning('作者信息不存在');
      }
    };

    // 点击用户名跳转到用户主页
    const goToUserProfile = (userId) => {
      if (userId) {
        router.push({ name: 'profile', params: { id: userId } });
      }
    };
    // 点击标签跳转到标签相关攻略列表
    const goToTagArticles = (tagId) => {
      router.push({ name: 'tagArticles', params: { tagId } });
    };
    // 编辑攻略
    const editArticle = () => {
      router.push(`/article/edit/${article.value.articleId}`);
    };

    // 删除攻略（只有作者可见）
    const confirmDelete = async () => {
      try {
        await ElMessageBox.confirm(
          '确定要删除这篇攻略吗？删除后将无法恢复！',
          '警告',
          { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' }
        );
        const response = await axios.delete(
          `http://localhost:8080/article/deleteArticle/${article.value.articleId}`,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        if (response.data.code === 200) {
          ElMessage.success('攻略已删除');
          router.push('/articles');
        } else {
          ElMessage.error(response.data.message || '删除失败');
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('删除攻略失败:', error);
          ElMessage.error('删除失败，请稍后重试');
        }
      }
    };

    // 记录返回URL（在登录页调用，登录成功后可返回之前的页面）
    const recordReturnUrl = () => {
      localStorage.setItem('returnUrl', window.location.href);
    };
    // 处理用户菜单操作
    const handleDropdownCommand = (command) => {
      switch (command) {
        case 'profile':
          router.push(`/profile/${currentUserId.value}`);
          break;
        case 'editArticle':
          router.push('/article/edit');
          break;
        case 'messages':
          router.push('/messages');
          break;
        case 'notifications':
          router.push('/notifications');
          break;
        case 'logout':
          localStorage.removeItem('token');
          localStorage.removeItem('username');
          localStorage.removeItem('userId');
          localStorage.removeItem('userAvatar');
          isLoggedIn.value = false;
          ElMessage.success('已退出登录');
          router.push('/');
          break;
      }
    };

    // 图片预览方法
    const previewImage = (url) => {
      previewImageUrl.value = url;
      imagePreviewVisible.value = true;
    };
    // 监听文章内容中的图片点击事件，触发预览
    const handleBodyClick = (event) => {
      const target = event.target;
      if (target.tagName === 'IMG') {
        previewImage(target.src);
      }
    };


    // 视频播放相关方法
    const playVideo = (videoUrl) => {
      currentVideoUrl.value = videoUrl;
      videoPlayerVisible.value = true;
    };
    const handleVideoPlayError = () => {
      ElMessage.error('视频加载失败，请检查URL或网络');
      videoPlayerVisible.value = false;
    };

    onMounted(async () => {
      checkLoginStatus();
      await fetchCategoryTree();
      await fetchArticle();
      setTimeout(updateViewCount, 1000);
    });
    onUnmounted(() => {
      activeReplyId.value = null;
      replyContent.value = '';
    });
    return {
      isLoggedIn,
      username,
      userAvatar,
      currentUserId,
      article,
      loading,
      comments,
      commentContent,
      replyContent,
      activeReplyId,
      replyToUsername,
      replyToUserId,
      currentPage,
      pageSize,
      totalComments,
      commentsSection,
      isAuthor,
      followLoading,
      likeLoading,
      collectLoading,
      isFollowing,
      isCollected,
      shareDialogVisible,
      imagePreviewVisible,
      previewImageUrl,

      authorAvatarSrc,
      // 视频相关返回值
      articleVideos,
      videoLoading,
      videoError,
      videoPlayerVisible,
      currentVideoUrl,
      formatDate,
      formatNumber,
      formatDuration, // 导出时长格式化方法
      formatFileSize, // 导出文件大小格式化方法
      toggleLike,
      submitComment,
      replyToComment,
      replyToReply,
      cancelReply,
      submitReply,
      toggleCommentLike,
      toggleReplyLike,
      deleteComment,
      deleteReply,
      editArticle,
      confirmDelete,
      viewAuthorProfile,
      goToUserProfile,
      goToTagArticles,
      scrollToComments,
      showShareDialog,
      handlePageChange,
      toggleExpand,
      handleDropdownCommand,
      previewImage,
      recordReturnUrl,
      handleBodyClick,
      toggleCollect,
      toggleFollow,
      getCategoryName: (categoryId) => {
        if (!categoryId) return '未知分类';
        const findName = (nodes, id) => {
          for (const node of nodes) {
            if (String(node.categoryId || node.id) === String(categoryId)) {
              return node.name;
            }
            if (node.children && node.children.length > 0) {
              const childName = findName(node.children, id);
              if (childName) return childName;
            }
          }
          return '未知分类';
        };
        return findName(categoryTree.value, categoryId);
      },
      // 视频相关方法返回
      playVideo,
      handleVideoPlayError
    };
  }
};
</script>
<style scoped>
.article-detail-container {
  min-height: 100vh;
  background: #f8fafc;
  background-image: radial-gradient(#e2e8f0 0.5px, transparent 0.5px);
  background-size: 20px 20px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

/* 导航栏：优化布局对齐与间距 */
.nav-header {
  padding: 14px 40px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  border-bottom: 1px solid #f1f5f9;
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  font-size: 24px;
  font-weight: 700;
  color: #d4a574;
  text-shadow: 0 1px 2px rgba(212, 165, 116, 0.1);
}

.nav-links {
  display: flex;
  gap: 32px;
}

.nav-link {
  color: #64748b;
  text-decoration: none;
  font-size: 16px;
  font-weight: 500;
  transition: color 0.2s ease;
  position: relative;
  padding: 4px 0;
}

.nav-link:hover,
.nav-link.router-link-active {
  color: #d4a574;
}

.nav-link::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  height: 2px;
  background: #d4a574;
  transition: width 0.3s ease;
}

.nav-link:hover::after,
.nav-link.router-link-active::after {
  width: 100%;
}

.auth-buttons {
  display: flex;
  gap: 12px;
}

.auth-button {
  color: #8b7d6b;
  border: 2px solid #d4a574;
  padding: 7px 16px;
  border-radius: 30px;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.2s ease;
  background: transparent;
  font-size: 14px;
}

.auth-button:hover {
  background: rgba(212, 165, 116, 0.1);
  color: #d4a574;
}

.register-button {
  background: #d4a574;
  color: white;
  border: none;
  box-shadow: 0 2px 8px rgba(212, 165, 116, 0.3);
}

.register-button:hover {
  background: #c19a6b;
  box-shadow: 0 4px 12px rgba(212, 165, 116, 0.4);
}

.user-profile .avatar-wrapper {
  display: flex;
  align-items: center;
  cursor: pointer;
  gap: 10px;
  padding: 6px 14px;
  border-radius: 25px;
  transition: background-color 0.2s ease;
}

.user-profile .avatar-wrapper:hover {
  background: rgba(212, 165, 116, 0.08);
}

.user-profile .user-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 2px solid #d4a574;
  object-fit: cover;
}

.user-profile .username {
  color: #5d5347;
  font-weight: 600;
  font-size: 15px;
  max-width: 110px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 主内容容器：优化间距与居中 */
.article-detail-content {
  max-width: 1300px;
  margin: 0 auto;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 加载状态：优化骨架屏卡片感 */
.loading-container {
  padding: 24px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}

/* 攻略头部信息：优化内边距与阴影 */
.article-header {
  background: #fff;
  border-radius: 16px;
  padding: 22px 28px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #f1f5f9;
  margin-bottom: 0;
}

.article-title {
  font-size: 2em;
  color: #4a4235;
  margin-bottom: 16px;
  text-align: left;
  line-height: 1.4;
  font-weight: 700;
  letter-spacing: -0.3px;
}

.article-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
  flex-wrap: wrap;
  gap: 12px;
}

.author-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 20px;
  transition: background-color 0.2s ease;
}

.author-info:hover {
  background: rgba(212, 165, 116, 0.08);
}

.author-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  margin-right: 12px;
  border: 2px solid #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.author-name {
  font-weight: 600;
  color: #4a4235;
  font-size: 1em;
}

.article-date {
  color: #8b7d6b;
  font-size: 0.85em;
  margin-top: 3px;
}

.article-category {
  background: rgba(33, 150, 243, 0.1);
  color: #2196f3;
  padding: 3px 9px;
  border-radius: 15px;
  font-size: 0.75em;
  font-weight: 600;
  margin-left: 8px;
  display: inline-block;
}

.article-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.tag {
  background: rgba(212, 165, 116, 0.2);
  color: #8b7d6b;
  padding: 4px 10px;
  border-radius: 15px;
  font-size: 0.85em;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tag:hover {
  background: rgba(212, 165, 116, 0.3);
  transform: translateY(-1px);
}

/* 攻略封面图：优化间距与阴影 */
.article-cover-image {
  margin-bottom: 0;
  text-align: center;
  padding: 0 28px;
}

.cover-image {
  max-width: 100%;
  height: 350px;
  width: 100%;
  object-fit: cover;
  border-radius: 12px;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: transform 0.4s ease;
}

.cover-image:hover {
  transform: scale(1.005);
}

/* 攻略正文：优化内边距与行高 */
.article-body {
  font-size: 1em;
  line-height: 1.7;
  color: #5d5347;
  margin-bottom: 0;
  text-align: left;
  background: #fff;
  border-radius: 16px;
  padding: 24px 28px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #f1f5f9;
  transition: box-shadow 0.3s ease;
}

:deep(.article-body img) {
  max-width: 80%;
  max-height: 500px;
  width: auto;
  height: auto;
  display: block;
  margin: 12px auto;
  border-radius: 8px;
}

.article-body a {
  color: #d4a574;
  text-decoration: none;
  border-bottom: 1px dashed #d4a574;
  transition: all 0.2s ease;
}

.article-body a:hover {
  color: #c19a6b;
  border-bottom-style: solid;
}

/* 富文本表格样式 */
.article-body table {
  width: 100%;
  max-width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
}

.article-body table th,
.article-body table td {
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  text-align: left;
}

.article-body table th {
  background: #f8fafc;
  font-weight: 600;
}

/* 富文本段落样式 */
.article-body p {
  margin: 8px 0;
  line-height: 1.7;
}

/* 视频区域样式：优化布局与间距 */
.article-videos {
  margin: 0;
  padding: 24px 28px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #f1f5f9;
  transition: box-shadow 0.3s ease;
}

.article-videos:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.07);
}

.video-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px 0;
}

.video-error-alert {
  margin-bottom: 12px;
}

.video-section-title {
  font-size: 1.2em;
  color: #4a4235;
  margin-bottom: 18px;
  font-weight: 600;
  padding-bottom: 6px;
  border-bottom: 1px solid #f1f5f9;
}

.video-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.video-item {
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-radius: 12px;
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  padding: 10px;
  background: #f8fafc;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.video-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
}

.video-cover-wrapper {
  position: relative;
  width: 100%;
  height: 180px;
  cursor: pointer;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #f1f5f9;
}

.video-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: opacity 0.2s ease;
}

.video-cover-wrapper:hover .video-cover {
  opacity: 0.92;
}

.video-play-btn {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: rgba(212, 165, 116, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
  box-shadow: 0 3px 10px rgba(212, 165, 116, 0.3);
}

.video-cover-wrapper:hover .video-play-btn {
  opacity: 1;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }

  50% {
    transform: translate(-50%, -50%) scale(1.03);
    opacity: 0.9;
  }

  100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
}

.play-icon {
  color: #fff;
  font-size: 22px;
}

.video-duration {
  position: absolute;
  bottom: 6px;
  right: 6px;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
}

.video-cover-error {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #f56c6c;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.error-icon {
  font-size: 15px;
}

.video-info {
  padding: 0 6px;
}

.video-title {
  font-size: 14px;
  color: #4a4235;
  margin: 0;
  font-weight: 600;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.video-meta {
  font-size: 11px;
  color: #8b7d6b;
  margin: 3px 0 0 0;
}

.video-empty {
  text-align: center;
  padding: 30px 0;
  color: #8b7d6b;
}

.empty-icon {
  font-size: 38px;
  margin-bottom: 12px;
  opacity: 0.4;
  color: #d4a574;
}

.video-player-container {
  width: 100%;
  height: 380px;
}

.article-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 28px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #f1f5f9;
  margin-bottom: 0;
  flex-wrap: wrap;
  gap: 12px;
}

.article-stats {
  display: flex;
  gap: 22px;
}

.article-stats span {
  color: #8b7d6b;
  font-size: 0.9em;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: color 0.2s ease;
}

.article-stats span:hover {
  color: #d4a574;
}

.article-actions {
  display: flex;
  gap: 12px;
}

.action-button {
  border-radius: 22px;
  padding: 7px 14px;
  transition: all 0.3s ease;
  border: 1px solid #e2e8f0;
  background: #fff;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.action-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.06);
  border-color: #d4a574;
}

.like-button.el-button--primary {
  background-color: rgba(212, 165, 116, 0.15);
  border-color: #d4a574;
  color: #8b7d6b;
}

.like-button.el-button--primary:hover {
  background-color: rgba(212, 165, 116, 0.25);
  color: #d4a574;
}

.collect-button.el-button--primary {
  background-color: rgba(100, 181, 246, 0.15);
  border-color: #409eff;
  color: #409eff;
}

.collect-button.el-button--primary:hover {
  background-color: rgba(100, 181, 246, 0.25);
  color: #2196f3;
}

/* 评论区样式：完善层级与交互 */
.article-comments {
  background: #fff;
  border-radius: 16px;
  padding: 24px 28px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #f1f5f9;
  margin-top: 0;
}

.article-comments h2 {
  font-size: 1.3em;
  color: #4a4235;
  margin-bottom: 18px;
  text-align: left;
  font-weight: 600;
  padding-bottom: 8px;
  border-bottom: 1px solid #f1f5f9;
}

.comment-form {
  background: #f8fafc;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  margin-bottom: 24px;
  transition: box-shadow 0.3s ease;
  text-align: left;
}

.comment-form:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.07);
}

.comment-form-header {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  justify-content: flex-start;
}

.comment-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}

.comment-input-wrapper {
  flex: 1;
}

.comment-input-wrapper .el-input__textarea {
  border-radius: 8px;
  border-color: #e2e8f0;
}

.comment-form-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.login-to-comment {
  text-align: left;
  padding: 18px;
  background: #f8fafc;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  margin-bottom: 24px;
  color: #8b7d6b;
  font-size: 0.95em;
}

.login-to-comment a {
  color: #2196f3;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
}

.login-to-comment a:hover {
  color: #1890ff;
  text-decoration: underline;
}

.comments-list {
  margin-top: 16px;
}

.no-comments {
  text-align: center;
  padding: 28px 0;
  color: #8b7d6b;
  font-size: 0.95em;
}

.comment-item {
  display: flex;
  flex-direction: column;
  padding: 16px 0;
  border-bottom: 1px solid #f1f5f9;
  text-align: left;
}

.comment-item:last-child {
  border-bottom: none;
}

.comment-header {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  gap: 12px;
  text-align: left;
}

.comment-meta {
  display: flex;
  flex-direction: column;
  text-align: left;
}

.comment-author {
  font-weight: 600;
  color: #4a4235;
  font-size: 14px;
}

.comment-date {
  color: #8b7d6b;
  font-size: 11px;
}

.comment-content {
  color: #5d5347;
  line-height: 1.6;
  margin-bottom: 10px;
  word-wrap: break-word;
  white-space: pre-wrap;
  font-size: 0.95em;
  text-align: left;
}

.comment-actions {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #8b7d6b;
  cursor: pointer;
}

.comment-actions span {
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 3px;
}

.comment-actions span:hover {
  color: #409eff;
  transform: translateY(-1px);
}

.comment-actions .liked {
  color: #f56c6c;
}

.replies-list {
  margin-top: 12px;
  margin-left: 48px;
  border-left: 2px solid #f1f5f9;
  padding-left: 14px;
}

.reply-item {
  display: flex;
  flex-direction: column;
  padding: 12px 0;
  border-bottom: 1px dashed #f1f5f9;
}

.reply-item:last-child {
  border-bottom: none;
}

.reply-header {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
  gap: 10px;
}

.reply-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  margin-right: 0;
  object-fit: cover;
  border: 1px solid #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.reply-meta {
  display: flex;
  flex-direction: column;
}

.reply-author {
  font-weight: 600;
  color: #4a4235;
  font-size: 13px;
}

.reply-date {
  color: #8b7d6b;
  font-size: 10px;
}

.reply-content {
  color: #5d5347;
  line-height: 1.5;
  margin-bottom: 8px;
  word-wrap: break-word;
  white-space: pre-wrap;
  font-size: 0.9em;
}

.reply-to {
  color: #409eff;
  font-weight: 600;
  margin-right: 4px;
}

.reply-actions {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: #8b7d6b;
  cursor: pointer;
}

.reply-actions span {
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 2px;
}

.reply-actions span:hover {
  color: #409eff;
  transform: translateY(-1px);
}

.reply-actions .liked {
  color: #f56c6c;
}

.reply-form {
  background-color: #f8fafc;
  padding: 12px;
  border-radius: 8px;
  margin-top: 12px;
  margin-left: 48px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.reply-form:focus-within {
  border-color: #d4a574;
  box-shadow: 0 0 0 2px rgba(212, 165, 116, 0.1);
}

.reply-form-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
  gap: 8px;
}

.reply-form-footer .el-button {
  padding: 4px 10px;
  font-size: 12px;
}

.toggle-replies {
  margin-left: auto;
  font-size: 0.8em;
  color: #409eff;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 3px;
  transition: all 0.2s ease;
}

.toggle-replies:hover {
  color: #1890ff;
  transform: translateY(-1px);
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 24px;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
}

.pagination-container .el-pagination {
  --el-pagination-item-size: 30px;
  --el-pagination-font-size: 13px;
}

/* 弹窗样式：统一弹窗布局与阴影 */
.share-container {
  padding: 18px;
}

.share-link {
  margin-bottom: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.share-link label {
  font-size: 0.95em;
  color: #4a4235;
  font-weight: 500;
}

.share-qrcode {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
}

.share-qrcode label {
  font-size: 0.95em;
  color: #4a4235;
  font-weight: 500;
}

.qrcode-img {
  width: 180px;
  height: 180px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.preview-image {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.1);
}

.preview-image-container {
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.85);
  width: 100%;
  height: 80vh;
  overflow: hidden;
}

.preview-image-full {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
}

.video-player-container {
  width: 100%;
  height: 380px;
}

.video-player {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 8px;
}

/* 关注按钮样式：优化渐变与阴影 */
.follow-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 20px;
  color: white;
  font-weight: 500;
  padding: 6px 14px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
  font-size: 13px;
}

.follow-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  background: linear-gradient(135deg, #5a6ddb 0%, #6a4092 100%);
}

.follow-btn.el-button--default {
  background: linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%);
  box-shadow: 0 2px 8px rgba(149, 165, 166, 0.3);
}

.follow-btn.el-button--default:hover {
  background: linear-gradient(135deg, #849394 0%, #6e7a7b 100%);
  box-shadow: 0 4px 12px rgba(149, 165, 166, 0.4);
}

/* 模块分隔线：优化渐变效果 */
.section-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(212, 165, 116, 0.15), transparent);
  margin: 20px 0;
  border: none;
}

/* 移动端适配：完善小屏幕布局 */
@media (max-width: 768px) {

  .nav-links,
  .auth-buttons,
  .user-profile {
    display: none;
  }

  .nav-header {
    justify-content: space-between;
    padding: 12px 16px;
  }

  .logo {
    font-size: 22px;
  }

  /* 移动端菜单按钮（原模板未加，补充默认样式） */
  .mobile-menu-btn {
    display: flex;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: #d4a574;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 18px;
    box-shadow: 0 2px 8px rgba(212, 165, 116, 0.3);
  }

  .article-detail-content {
    padding: 16px 12px;
    gap: 16px;
  }

  .article-header {
    padding: 18px 16px;
    border-radius: 12px;
  }

  .article-title {
    font-size: 1.6em;
    margin-bottom: 12px;
  }

  .article-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .author-avatar {
    width: 40px;
    height: 40px;
    margin-right: 10px;
  }

  .article-tags {
    gap: 6px;
    margin-bottom: 12px;
  }

  .tag {
    padding: 3px 8px;
    font-size: 0.8em;
  }

  .article-cover-image {
    padding: 0 16px;
  }

  .cover-image {
    border-radius: 8px;
  }

  .article-body {
    padding: 18px 16px;
    border-radius: 12px;
    font-size: 0.95em;
  }

  .article-videos {
    padding: 18px 16px;
    border-radius: 12px;
  }

  .video-section-title {
    font-size: 1.1em;
    margin-bottom: 14px;
  }

  .video-list {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .video-cover-wrapper {
    height: 150px;
  }

  .video-item {
    padding: 8px;
    border-radius: 8px;
  }

  .video-empty {
    padding: 24px 0;
  }

  .empty-icon {
    font-size: 32px;
    margin-bottom: 10px;
  }

  .video-player-container {
    height: 220px;
  }

  .article-footer {
    padding: 14px 16px;
    border-radius: 12px;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .article-stats {
    gap: 16px;
    width: 100%;
  }

  .article-actions {
    width: 100%;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
  }

  .action-button {
    padding: 6px 12px;
    font-size: 13px;
    flex: 1;
    justify-content: center;
  }

  .article-comments {
    padding: 18px 16px;
    border-radius: 12px;
  }

  .article-comments h2 {
    font-size: 1.2em;
    margin-bottom: 14px;
  }

  .comment-form {
    padding: 12px;
    margin-bottom: 18px;
    border-radius: 8px;
  }

  .comment-avatar {
    width: 34px;
    height: 34px;
  }

  .login-to-comment {
    padding: 14px;
    margin-bottom: 18px;
    border-radius: 8px;
    font-size: 0.9em;
  }

  .comment-item {
    padding: 12px 0;
  }

  .replies-list {
    margin-left: 32px;
    padding-left: 10px;
  }

  .reply-form {
    margin-left: 32px;
    padding: 10px;
    border-radius: 6px;
  }

  .reply-item {
    padding: 10px 0;
  }

  .reply-avatar {
    width: 28px;
    height: 28px;
  }

  .qrcode-img {
    width: 140px;
    height: 140px;
  }
}
</style>