<template>
  <div class="profile-page">
    <!-- 导航栏：使用 NavComponent -->
    <NavComponent search-placeholder="搜索攻略或景点..." />

    <!-- 主页容器 -->
    <div class="profile-container">
      <!-- 头部区域 -->
      <div class="profile-header">
        <!-- 封面图-->
        <div class="profile-cover">
          <div class="cover-overlay"></div>
        </div>

        <!-- 头像裁剪弹窗 -->
        <el-dialog v-model="showCropper" title="裁剪头像" width="600px" :before-close="cancelCrop" close-on-click-modal>
          <div class="cropper-wrapper">
            <img ref="cropperImage" :src="originalImage" class="cropper-image" @load="initCropper">
          </div>
          <div class="cropper-controls">
            <el-button type="primary" @click="cropImage">确认裁剪</el-button>
            <el-button @click="cancelCrop">取消</el-button>
          </div>
        </el-dialog>

        <!-- 个人信息 -->
        <div class="profile-header">
          <div class="header-avatar-wrap">
            <div class="profile-avatar" :class="{ 'is-own': isOwnProfile }">
              <img :src="profileData.avatarUrl || '/default-avatar.png'" :alt="profileData.userName" class="avatar-img">
              <el-upload v-if="isOwnProfile" class="avatar-upload-overlay" :auto-upload="false" :show-file-list="false"
                :on-change="handleAvatarChange" accept="image/*">
                <div class="avatar-upload-mask">
                  <el-icon><Camera /></el-icon>
                  <span>更换头像</span>
                </div>
              </el-upload>
            </div>
          </div>
          <div class="header-info">
            <div class="header-name-row">
              <h1 class="header-name">{{ profileData.userName }}</h1>
              <span class="level-badge" :style="{ background: userLevel.color }">
                Lv.{{ userLevel.level }} {{ userLevel.label }}
              </span>
            </div>
            <p class="header-bio">{{ profileData.bio || '这个人很懒，还没有填写个人简介' }}</p>
            <div class="header-meta">
              <span class="header-meta-item"><el-icon><Calendar /></el-icon> 加入 {{ formatJoinDate(profileData.createdAt) }}</span>
            </div>
          </div>
          <div class="header-actions">
            <button v-if="isOwnProfile" class="edit-profile-btn" @click="editProfile"><el-icon><Edit /></el-icon> 编辑资料</button>
            <template v-else>
              <el-button :class="{ 'is-following': isFollowing }" @click="toggleFollow" class="follow-btn">
                {{ isFollowing ? '已关注' : '关注' }}
              </el-button>
              <el-button @click="sendMessage" class="message-btn">发送私信</el-button>
            </template>
          </div>
        </div>
      </div>

      <!-- 统计卡片 -->
      <div class="stats-card">
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-icon"><el-icon><Edit /></el-icon></div>
            <div class="stat-number">{{ profileData.articleCount || 0 }}</div>
            <div class="stat-label">发布攻略</div>
          </div>
          <div class="stat-item">
            <div class="stat-icon"><el-icon><StarFilled /></el-icon></div>
            <div class="stat-number">{{ userSpotsFav.length || 0 }}</div>
            <div class="stat-label">收藏景点</div>
          </div>
          <div class="stat-item">
            <div class="stat-icon"><el-icon><ChatDotSquare /></el-icon></div>
            <div class="stat-number">{{ profileData.commentCount || 0 }}</div>
            <div class="stat-label">景区点评</div>
          </div>
          <div class="stat-item" style="cursor:pointer;" @click="showFollowList('following')">
            <div class="stat-icon"><el-icon><User /></el-icon></div>
            <div class="stat-number">{{ profileData.followerCount || 0 }}</div>
            <div class="stat-label">关注</div>
          </div>
          <div class="stat-item" style="cursor:pointer;" @click="showFollowList('follower')">
            <div class="stat-icon"><el-icon><UserFilled /></el-icon></div>
            <div class="stat-number">{{ profileData.followingCount || 0 }}</div>
            <div class="stat-label">粉丝</div>
          </div>
        </div>
      </div>

      <!-- 双栏布局 -->
      <div class="two-columns">
        <!-- 左侧：收藏攻略 + 收藏景点 -->
        <div class="column-left">
          <div class="content-card">
            <div class="content-card-header card-tabs-header">
              <div class="card-tabs">
                <span :class="['card-tab', { active: likedTab === 'bookmarked' }]" @click="switchLikedTab('bookmarked')">收藏攻略</span>
                <span :class="['card-tab', { active: likedTab === 'liked' }]" @click="switchLikedTab('liked')">点赞攻略</span>
              </div>
            </div>
            <div class="content-card-body">
              <div v-show="likedTab === 'bookmarked'">
                <div class="fav-list" v-if="userArticlesFav.length > 0">
                  <div v-for="art in userArticlesFav" :key="art.bookmarkId || art.articleId" class="fav-item"
                    @click="router.push(`/article/${art.articleId}`)">
                    <img :src="art.coverImage || ''" :alt="art.title" class="fav-img">
                    <div class="fav-info">
                      <div class="fav-name">{{ art.title || '无标题' }}</div>
                      <div class="fav-location">{{ art.categoryName || '攻略' }}</div>
                    </div>
                  </div>
                </div>
                <el-empty v-else description="暂无收藏攻略" :image-size="60" />
              </div>
              <div v-show="likedTab === 'liked'">
                <div class="fav-list" v-if="userLikedArticles.length > 0">
                  <div v-for="art in userLikedArticles" :key="art.articleId" class="fav-item"
                    @click="router.push(`/article/${art.articleId}`)">
                    <img :src="art.coverImage || ''" :alt="art.title" class="fav-img">
                    <div class="fav-info">
                      <div class="fav-name">{{ art.title || '无标题' }}</div>
                      <div class="fav-location">{{ art.categoryName || '攻略' }}</div>
                    </div>
                  </div>
                </div>
                <el-empty v-else description="暂无点赞攻略" :image-size="60" />
              </div>
            </div>
          </div>
          <div class="content-card" style="margin-top: 1rem;">
            <div class="content-card-header">
              <span><el-icon><StarFilled /></el-icon> 收藏景点</span>
            </div>
            <div class="content-card-body">
              <div class="fav-list" v-if="userSpotsFav.length > 0">
                <div v-for="spot in userSpotsFav.slice(0, 5)" :key="spot.scenicId" class="fav-item"
                  @click="router.push(`/spot/${spot.scenicId}`)">
                  <img :src="spot.coverImage || ''" :alt="spot.name" class="fav-img">
                  <div class="fav-info">
                    <div class="fav-name">{{ spot.name }}</div>
                    <div class="fav-location">{{ spot.location || '未知位置' }}</div>
                  </div>
                  <el-icon class="fav-remove" @click.stop="removeFavorite(spot.scenicId)"><Delete /></el-icon>
                </div>
              </div>
              <el-empty v-else description="暂无收藏景点" :image-size="60" />
            </div>
          </div>
        </div>

        <!-- 右侧-->
        <div class="column-right">
          <div class="content-card">
            <div class="content-card-header card-tabs-header">
              <div class="card-tabs">
                <span :class="['card-tab', { active: activeRightTab === 'articles' }]" @click="activeRightTab = 'articles'">我的攻略</span>
                <span :class="['card-tab', { active: activeRightTab === 'activity' }]" @click="activeRightTab = 'activity'">近期动态</span>
              </div>
            </div>

            <!-- 我的攻略 Tab -->
            <div class="content-card-body" v-show="activeRightTab === 'articles'">
              <div class="article-filter-bar">
                <el-select v-model="articleStatus" placeholder="状态筛选" size="small" @change="handleStatusChange" class="status-filter">
                  <el-option v-for="opt in articleStatusOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
                </el-select>
                <el-button size="small" type="primary" @click="goToArticleEdit" class="new-article-btn">
                  <el-icon><Edit /></el-icon> 写攻略
                </el-button>
              </div>
              <div class="article-manage-list" v-if="userArticles.length > 0">
                <div v-for="art in userArticles" :key="art.articleId" class="article-manage-item">
                  <div class="article-manage-cover" v-if="art.coverImage">
                    <img :src="art.coverImage" :alt="art.title">
                  </div>
                  <div class="article-manage-info" @click="viewArticle(art.articleId)">
                    <div class="article-manage-title">{{ art.title || '无标题' }}</div>
                    <div class="article-manage-meta">
                      <span :class="'status-badge ' + ({0:'draft',1:'published',2:'hidden',3:'pending',4:'rejected'}[art.status]||'')">{{ ({0:'草稿',1:'已发布',2:'隐藏',3:'待审核',4:'审核不通过'})[art.status] || '未知' }}</span>
                      <span><el-icon><View /></el-icon> {{ art.viewCount || 0 }}</span>
                      <span><el-icon><StarFilled /></el-icon> {{ art.likeCount || 0 }}</span>
                      <span><el-icon><ChatDotRound /></el-icon> {{ art.commentCount || 0 }}</span>
                      <span class="article-date">{{ formatDate(art.createdAt) }}</span>
                    </div>
                  </div>
                  <div class="article-manage-actions">
                    <el-tooltip content="编辑" placement="top">
                      <el-button circle size="small" @click.stop="router.push(`/article/edit/${art.articleId}`)">
                        <el-icon><Edit /></el-icon>
                      </el-button>
                    </el-tooltip>
                    <el-tooltip content="查看" placement="top">
                      <el-button circle size="small" @click.stop="viewArticle(art.articleId)">
                        <el-icon><View /></el-icon>
                      </el-button>
                    </el-tooltip>
                    <el-popconfirm title="确定删除此攻略？" @confirm="deleteArticle(art.articleId)">
                      <template #reference>
                        <el-button circle size="small" type="danger" plain>
                          <el-icon><Delete /></el-icon>
                        </el-button>
                      </template>
                    </el-popconfirm>
                  </div>
                </div>
              </div>
              <el-empty v-else description="暂无攻略" :image-size="60" />
              <div class="pagination-wrap" v-if="total > 0">
                <el-pagination background layout="prev, pager, next" :total="total" :page-size="pageSize"
                  :current-page="pageNum" @current-change="handleCurrentChange" small />
              </div>
            </div>

            <!-- 近期动态 Tab -->
            <div class="content-card-body" v-show="activeRightTab === 'activity'">
              <div class="activity-list" v-if="recentActivities.length > 0">
                <div class="activity-item" v-for="(act, i) in recentActivities" :key="i">
                  <div class="activity-icon" :style="{ background: act.bg }">
                    <el-icon :style="{ color: act.color }"><component :is="act.icon" /></el-icon>
                  </div>
                  <div class="activity-info">
                    <div class="activity-title">{{ act.title }}</div>
                    <div class="activity-time">{{ act.time }}</div>
                  </div>
                  <div class="activity-score" v-if="act.score">{{ act.score }}</div>
                </div>
              </div>
              <el-empty v-else description="暂无动态" :image-size="60" />
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- 关注/粉丝列表对话框 -->
    <el-dialog v-model="showFollowDialog" width="600px" class="following-dialog"
      :before-close="handleDialogClose" close-on-click-modal close-on-press-escape>
      <div class="dialog-header">
        <div class="card-tabs" style="background:transparent;padding:0;">
          <span :class="['card-tab', { active: followTab === 'following' }]" @click="switchFollowTab('following')">关注 {{ profileData.followerCount || 0 }}</span>
          <span :class="['card-tab', { active: followTab === 'follower' }]" @click="switchFollowTab('follower')">粉丝 {{ profileData.followingCount || 0 }}</span>
        </div>
      </div>
      <div class="following-list" v-if="currentFollowList.length > 0">
        <div v-for="user in currentFollowList" :key="user.userId" class="following-item"
          @mouseenter="hoveredFollow = user.userId" @mouseleave="hoveredFollow = null">
          <div class="user-info" @click="goToUserProfile(user.userId)"
            :class="{ 'user-info-hover': hoveredFollow === user.userId }">
            <img :src="user.avatarUrl || '/default-avatar.png'" :alt="user.userName" class="follow-avatar">
            <div class="user-details">
              <h4 class="user-name">{{ user.userName }}</h4>
              <p class="user-bio">{{ user.bio || '这个人很懒，还没有填写个人简介' }}</p>
            </div>
          </div>
          <div class="follow-actions" v-if="isLoggedIn && user.userId !== currentUserId && followTab === 'following'">
            <el-button :type="user.isFollowing ? 'default' : 'primary'" size="small" @click="toggleFollowUser(user)"
              :class="{ 'follow-btn-active': hoveredFollow === user.userId }">
              {{ user.isFollowing ? '已关注' : '关注' }}
            </el-button>
          </div>
        </div>
      </div>
      <el-empty v-else :description="followTab === 'following' ? '暂无关注的用户' : '暂无粉丝'" class="follow-empty" />

      <div class="pagination-container" v-if="currentFollowList.length > 0">
        <el-pagination background layout="prev, pager, next" :total="currentFollowTotal" :page-size="followPageSize"
          :current-page="followPageNum" @current-change="handleFollowPageChange" class="follow-pagination" />
      </div>
    </el-dialog>

    <!-- 编辑个人资料对话框 -->
    <el-dialog v-model="showEditDialog" title="编辑个人资料" width="500px" class="edit-dialog"
      :before-close="handleDialogClose" close-on-click-modal close-on-press-escape>
      <el-tabs v-model="editActiveTab" class="edit-tabs">
        <!-- 基本信息编辑 -->
        <el-tab-pane label="基本信息" name="basic">
          <el-form :model="userForm" label-width="80px" class="edit-form">
            <el-form-item label="用户名" prop="userName" :rules="[{ required: true, message: '请输入用户名', trigger: 'blur' }]">
              <el-input v-model="userForm.userName" placeholder="请输入用户名" class="form-input"></el-input>
            </el-form-item>
            <el-form-item label="邮箱" prop="email" :rules="[{ type: 'email', message: '请输入正确邮箱格式', trigger: 'blur' }]">
              <div class="email-input-wrapper">
                <el-input v-model="userForm.email" placeholder="请输入邮箱" class="form-input"></el-input>
                <el-button type="primary" size="small" @click="sendVerifyCodeForUpdate" :disabled="emailCountdown > 0"
                  class="send-code-btn">
                  {{ emailCountdown > 0 ? `${emailCountdown}s` : '获取验证码' }}
                </el-button>
              </div>
            </el-form-item>
            <el-form-item v-if="showVerifyCodeInput" label="验证码">
              <el-input v-model="userForm.verifyCode" placeholder="请输入验证码" class="form-input"></el-input>
            </el-form-item>
            <el-form-item label="个人简介" prop="bio">
              <el-input v-model="userForm.bio" type="textarea" :rows="4" placeholder="请输入个人简介"
                class="form-input"></el-input>
            </el-form-item>
            <el-form-item class="form-btn-group">
              <el-button type="primary" @click="updateUserInfo" class="submit-btn">保存</el-button>
              <el-button @click="showEditDialog = false" class="cancel-btn">取消</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 修改密码 -->
        <el-tab-pane label="修改密码" name="password">
          <el-form :model="passwordForm" label-width="100px" class="edit-form" :rules="passwordRules">
            <el-form-item label="原密码" prop="oldPassword">
              <el-input v-model="passwordForm.oldPassword" type="password" placeholder="请输入原密码" show-password
                class="form-input"></el-input>
            </el-form-item>
            <el-form-item label="新密码" prop="newPassword">
              <el-input v-model="passwordForm.newPassword" type="password" placeholder="请输入 8-20 位包含字母和数字的新密码"
                show-password class="form-input"></el-input>
            </el-form-item>
            <el-form-item label="确认新密码" prop="confirmPassword">
              <el-input v-model="passwordForm.confirmPassword" type="password" placeholder="请再次输入新密码" show-password
                class="form-input"></el-input>
            </el-form-item>
            <el-form-item class="form-btn-group">
              <el-button type="primary" @click="updatePassword" class="submit-btn">修改密码</el-button>
              <el-button @click="showEditDialog = false" class="cancel-btn">取消</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 账号管理 -->
        <el-tab-pane label="账号管理" name="account">
          <div class="danger-zone">
            <h3 class="danger-title">
              <el-icon class="danger-icon">
                <WarningFilled />
              </el-icon>
              危险区域
            </h3>
            <p class="danger-desc">注销账号后，您的所有数据将被永久回收且无法恢复，请谨慎操作。</p>
            <el-form :model="deleteForm" label-width="80px" class="delete-form" :rules="deleteRules">
              <el-form-item label="密码" prop="password">
                <el-input v-model="deleteForm.password" type="password" placeholder="请输入密码以确认删除" show-password
                  class="form-input"></el-input>
              </el-form-item>
              <el-form-item class="form-btn-group">
                <el-popconfirm title="确定要删除您的账号吗？此操作不可逆！" @confirm="deleteAccount" confirm-button-text="确认注销"
                  cancel-button-text="取消" type="danger">
                  <template #reference>
                    <el-button type="danger" class="delete-btn">注销账号</el-button>
                  </template>
                </el-popconfirm>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-dialog>
  </div>
</template>

<script>
import { ref, onMounted, computed, reactive, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage, ElForm, ElFormItem, ElInput, ElSelect, ElOption, ElPopconfirm, ElEmpty, ElPagination, ElTabs, ElTabPane, ElIcon, ElDialog, ElButton, ElTooltip } from 'element-plus';
import { View, ChatDotRound, ChatDotSquare, Star, StarFilled, User, Edit, WarningFilled, Location, Check, Camera, Calendar, Delete, CollectionTag, Operation, Clock, UserFilled, Lock, Bell, Brush, SwitchButton, ArrowRight } from '@element-plus/icons-vue';
import NavComponent from '@/components/NavComponent.vue';
import axios from 'axios';
import 'cropperjs/dist/cropper.css';
import Cropper from 'cropperjs';

export default {
  name: 'ProfileView',
  components: {
    NavComponent,
    ElForm, ElFormItem, ElInput, ElSelect, ElOption, ElPopconfirm, ElEmpty, ElPagination,
    ElTabs, ElTabPane, ElIcon, ElDialog, ElButton, ElTooltip,
    View, ChatDotRound, ChatDotSquare, Star, StarFilled, User,
    Edit, WarningFilled, Location, Check, Camera, Calendar,
    Delete, CollectionTag, Operation, Clock, UserFilled,
    Lock, Bell, Brush, SwitchButton, ArrowRight
  },
  setup() {
    const router = useRouter();
    const route = useRoute();

    // 清洗路由参数：Vue Router 可能传字符串 "null"
    const profileId = computed(() => {
      const id = route.params.id;
      if (!id || id === 'null' || id === 'undefined') return null;
      return id;
    });

    // 交互状态变量
    const isAvatarHover = ref(false);
    const hoveredStat = ref('');
    const hoveredCard = ref(null);
    const hoveredFollow = ref(null);

    // 用户登录状态
    const isLoggedIn = ref(false);
    const userName = ref('');
    const userAvatar = ref('');
    const currentUserId = ref(null);

    // 近期活动（从接口获取）
    const recentActivities = ref([]);

    // 个人资料数据
    const profileData = ref({
      userName: '',
      avatarUrl: '',
      bio: '',
      preferences: [],
      articleCount: 0,
      followerCount: 0,
      followingCount: 0,
      totalLikes: 0
    });

    // 用户文章和收藏
    const userArticles = ref([]);
    const userFavorites = ref([]);
    const userArticlesFav = ref([]);
    const userSpotsFav = ref([]);
    const userLikes = ref([]);
    const userLikedArticles = ref([]);
    const likedTab = ref('bookmarked');
    const favType = ref('all');
    const activeTab = ref('articles');
    const pageNum = ref(1);
    const pageSize = ref(10);
    const total = ref(0);
    const totalPages = ref(0);

    // 文章状态筛选（0=草稿,1=已发布,2=隐藏,3=待审核,4=不通过）
    const articleStatus = ref('');
    const articleStatusOptions = [
      { label: '全部', value: '' },
      { label: '已发布', value: 1 },
      { label: '草稿', value: 0 },
      { label: '隐藏', value: 2 },
      { label: '待审核', value: 3 },
      { label: '审核不通过', value: 4 }
    ];

    // 关注状态
    const isFollowing = ref(false);

    // 用户等级计算
    const userLevel = computed(() => {
      const count = (profileData.value.articleCount || 0) + (profileData.value.commentCount || 0) + (userSpotsFav.value.length || 0);
      if (count >= 50) return { label: '资深旅行家', level: 5, color: '#ef4444' };
      if (count >= 30) return { label: '旅行达人', level: 4, color: '#f59e0b' };
      if (count >= 15) return { label: '活跃行者', level: 3, color: '#0ea5e9' };
      if (count >= 5) return { label: '起步旅人', level: 2, color: '#10b981' };
      return { label: '新手上路', level: 1, color: '#94a3b8' };
    });

    // 右侧卡片标签切换
    const activeRightTab = ref('articles');



    // 删除文章
    const deleteArticle = async (articleId) => {
      try {
        const res = await axios.delete(`http://localhost:8080/article/deleteArticle/${articleId}`);
        if (res.data.code === 200) {
          ElMessage.success('删除成功');
          userArticles.value = userArticles.value.filter(a => a.articleId !== articleId);
          total.value--;
        } else {
          ElMessage.error(res.data.message || '删除失败');
        }
      } catch (e) {
        console.error('删除文章失败:', e);
        ElMessage.error('删除失败');
      }
    };

    // 是否是自己的个人主页
    const isOwnProfile = computed(() => {
      const userId = localStorage.getItem('userId');
      return !profileId.value || userId === profileId.value;
    });

    // 关注/粉丝列表相关
    const showFollowDialog = ref(false);
    const followTab = ref('following');
    const followingList = ref([]);
    const followerList = ref([]);
    const followPageNum = ref(1);
    const followPageSize = ref(10);
    const followTotal = ref(0);
    const followerTotal = ref(0);
    const currentFollowList = computed(() => followTab.value === 'following' ? followingList.value : followerList.value);
    const currentFollowTotal = computed(() => followTab.value === 'following' ? followTotal.value : followerTotal.value);

    // 编辑个人资料相关
    const showEditDialog = ref(false);
    const editActiveTab = ref('basic');
    const userForm = reactive({
      userName: '',
      email: '',
      bio: '',
      avatar: '',
      verifyCode: ''
    });
    const originalEmail = ref('');
    const emailCountdown = ref(0);
    const showVerifyCodeInput = ref(false);
    const avatarFile = ref(null);
    const avatarPreview = ref('');
    const uploadingAvatar = ref(false);

    // 裁剪相关变量
    const showCropper = ref(false);
    const originalImage = ref('');
    const cropperImage = ref(null);
    const cropperInstance = ref(null);

    const passwordForm = reactive({
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    const deleteForm = reactive({
      password: ''
    });

    // 表单验证规则
    const passwordRules = reactive({
      oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
      newPassword: [
        { required: true, message: '请输入新密码', trigger: 'blur' },
        { min: 8, max: 20, message: '密码长度需在 8-20 位之间', trigger: 'blur' },
        { pattern: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,20}$/, message: '密码需包含字母和数字', trigger: 'blur' }
      ],
      confirmPassword: [
        {
          validator: (rule, value, callback) => {
            if (value !== passwordForm.newPassword) {
              callback(new Error('两次输入的密码不一致'));
            } else {
              callback();
            }
          },
          trigger: 'blur'
        }
      ]
    });

    const deleteRules = reactive({
      password: [{ required: true, message: '请输入密码确认', trigger: 'blur' }]
    });

    // 检查登录状态
    const checkLoginStatus = () => {
      const token = localStorage.getItem('token');
      if (token) {
        isLoggedIn.value = true;
        userName.value = localStorage.getItem('username') || '';
        userAvatar.value = localStorage.getItem('userAvatar') || '/default-avatar.png';
        currentUserId.value = parseInt(localStorage.getItem('userId')) || null;
      } else {
        isLoggedIn.value = false;
        currentUserId.value = null;
      }
    };

    // 获取用户资料


    const fetchProfileData = async () => {
      try {
        let response;
        const currentLoggedInUserId = localStorage.getItem('userId');
        if (!profileId.value || currentLoggedInUserId === profileId.value) {
          response = await axios.
          get(`http://localhost:8080/user/info`);
        } else {
          response = await axios.
          get(`http://localhost:8080/user/selectUserById/${profileId.value}`);
        }

        profileData.value = response.data.data;
        originalEmail.value = profileData.value.email || '';
        // 同步表单数据
        userForm.userName = profileData.value.userName;
        userForm.email = profileData.value.email || '';
        userForm.bio = profileData.value.bio;

      } catch (error) {
        console.error('获取用户资料失败:', error);
        ElMessage.error('获取用户资料失败，请稍后重试');
      }
    };

    // 获取用户攻略文章
    const fetchUserArticles = async () => {
      try {
        const userIdToFetch = profileId.value || currentUserId.value;
        if (!userIdToFetch) {
          ElMessage.warning('用户信息不存在');
          return;
        }
        const params = {
          pageNum: pageNum.value,
          size: pageSize.value
        };
        // 只有筛选特定状态时才传status参数
        if (articleStatus.value !== '') {
          params.status = articleStatus.value;
        }
        const response = await axios.get(`http://localhost:8080/article/getArticleByUserId/${userIdToFetch}`, {
          params: params
        });

        if (response.data.code === 200) {
          userArticles.value = response.data.data.list;
          total.value = response.data.data.total;
          totalPages.value = response.data.data.pages;
        } else {
          ElMessage.error(response.data.message || '获取文章失败');
        }
      } catch (error) {
        console.error('获取用户文章失败:', error);
        ElMessage.error('获取用户文章失败，请稍后重试');
      }
    };

    // 文章状态筛选变化
    const handleStatusChange = () => {
      pageNum.value = 1;
      fetchUserArticles();
    };

    // 获取用户收藏的攻略和景点
    const fetchUserFavorites = async () => {
      try {
        // 并行获取收藏的攻略和景点
        const [bookRes, spotRes] = await Promise.all([
          axios.get('http://localhost:8080/bookMarks/list'),
          axios.get('http://localhost:8080/user-scenic-favorites/list', { params: { pageNum: 1, size: 999 } })
        ]);
        // 收集攻略
        let articles = [];
        if (bookRes.data.code === 200) {
          articles = (bookRes.data.data || []).map(item => ({ ...item, _type: 'article' }));
        }
        // 收集景点
        let spots = [];
        if (spotRes.data.code === 200) {
          const list = spotRes.data.data.list || [];
          for (const item of list) {
            try {
              const detailRes = await axios.get(`http://localhost:8080/scenic-spots/get/${item.scenicId}`);
              if (detailRes.data.code === 200) {
                spots.push({ ...detailRes.data.data, _type: 'spot' });
              }
            } catch (e) {
              console.warn(`获取景点 ${item.scenicId} 详情失败`, e);
            }
          }
        }
        userArticlesFav.value = articles;
        userSpotsFav.value = spots;
      } catch (error) {
        console.error('获取用户收藏失败:', error);
        ElMessage.error('获取收藏失败，请稍后重试');
      }
    };

    // 获取用户点赞
    const fetchUserLikes = async () => {
      try {
        const response = await axios.get('http://localhost:8080/like/list');

        if (response.data.code === 200) {
          userLikes.value = response.data.data.list || [];
        } else {
          ElMessage.error(response.data.message || '获取点赞失败');
        }
      } catch (error) {
        console.error('获取用户点赞失败:', error);
        ElMessage.error('获取用户点赞失败，请稍后重试');
      }
    };

    // 获取点赞攻略详情
    const fetchUserLikedArticles = async () => {
      userLikedArticles.value = [];
      const likes = Array.isArray(userLikes.value) ? userLikes.value : [];
      const ids = likes.map(l => l && l.targetId).filter(Boolean);
      if (ids.length === 0) return;
      const results = await Promise.allSettled(
        ids.map(id => axios.get(`http://localhost:8080/article/getArticleById/${id}`))
      );
      results.forEach(r => {
        if (r.status === 'fulfilled' && r.value.data.code === 200) {
          userLikedArticles.value.push(r.value.data.data);
        }
      });
    };

    const switchLikedTab = async (tab) => {
      likedTab.value = tab;
      if (tab === 'liked' && userLikedArticles.value.length === 0) {
        await fetchUserLikedArticles();
      }
    };

    // 获取近期动态（合并评论、收藏、点赞等行为）
    const fetchRecentActivities = async () => {
      const activities = [];
      try {
        const userId = profileId.value || currentUserId.value;
        // 获取最近的评论作为动态
        const commentRes = await axios.get(`http://localhost:8080/article/getArticleByUserId/${userId}`, {
          params: { pageNum: 1, size: 5 }
        });
        if (commentRes.data.code === 200 && commentRes.data.data.list) {
          commentRes.data.data.list.forEach(art => {
            if (art.createdAt) {
              activities.push({
                icon: 'Edit',
                title: `发布了攻略「${art.title || '无标题'}」`,
                time: formatDate(art.createdAt),
                score: '',
                bg: '#eef2ff',
                color: '#0ea5e9',
                createdAt: new Date(art.createdAt)
              });
            }
          });
        }
        // 获取收藏作为动态
        const favRes = await axios.get('http://localhost:8080/user-scenic-favorites/list', {
          params: { pageNum: 1, size: 5 }
        });
        if (favRes.data.code === 200 && favRes.data.data.list) {
          favRes.data.data.list.forEach(fav => {
            if (fav.createdAt) {
              activities.push({
                icon: 'StarFilled',
                title: `收藏了景点 #${fav.scenicId}`,
                time: formatDate(fav.createdAt),
                score: '',
                bg: '#fef3c7',
                color: '#f59e0b',
                createdAt: new Date(fav.createdAt)
              });
            }
          });
        }
        // 获取点赞动态
        const likeRes = await axios.get('http://localhost:8080/like/list');
        if (likeRes.data.code === 200 && likeRes.data.data.list) {
          likeRes.data.data.list.slice(0, 5).forEach(lk => {
            if (lk.createdAt) {
              activities.push({
                icon: 'StarFilled',
                title: `点赞了内容 #${lk.targetId}`,
                time: formatDate(lk.createdAt),
                score: '',
                bg: '#fce7f3',
                color: '#ec4899',
                createdAt: new Date(lk.createdAt)
              });
            }
          });
        }
        // 按时间排序取最新10条
        activities.sort((a, b) => b.createdAt - a.createdAt);
        recentActivities.value = activities.slice(0, 10);
      } catch (e) {
        console.warn('获取动态失败', e);
      }
    };

    // 未实现功能提示
    const notImplemented = (msg) => {
      ElMessage.info(msg || '功能开发中，敬请期待');
    };

    // 移除收藏景点
    const removeFavorite = async (scenicId) => {
      try {
        const res = await axios.delete(`http://localhost:8080/user-scenic-favorites/delete/${scenicId}`);
        if (res.data.code === 200) {
          userSpotsFav.value = userSpotsFav.value.filter(s => s.scenicId !== scenicId);
          ElMessage.success('已取消收藏');
        }
      } catch (e) {
        console.error('移除收藏失败', e);
        ElMessage.error('操作失败');
      }
    };

    // 格式化加入日期
    const formatJoinDate = (date) => {
      if (!date) return '未知';
      const d = new Date(date);
      return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
    };

    // 格式化日期
    const formatDate = (date) => {
      const d = new Date(date);
      const now = new Date();
      const diff = Math.floor((now - d) / 1000);

      if (diff < 60) {
        return '刚刚';
      } else if (diff < 3600) {
        return Math.floor(diff / 60) + '分钟前';
      } else if (diff < 86400) {
        return Math.floor(diff / 3600) + '小时前';
      } else if (diff < 2592000) {
        return Math.floor(diff / 86400) + '天前';
      } else {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
    };

    // 切换关注状态
    const toggleFollow = async () => {
      if (!isLoggedIn.value) {
        ElMessage.warning('请先登录');
        router.push('/login');
        return;
      }
      if (!profileId.value) {
        ElMessage.warning('用户信息不存在');
        return;
      }

      try {
        let response;
        const targetId = Number(profileId.value);

        if (isFollowing.value) {
          response = await axios.delete(`http://localhost:8080/userFollow/deleteUserFollow/${targetId}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          profileData.value.followingCount = Math.max((profileData.value.followingCount || 0) - 1, 0);
        } else {
          response = await axios.post('http://localhost:8080/userFollow/addUserFollow', targetId, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          });
          profileData.value.followingCount = (profileData.value.followingCount || 0) + 1;
        }

        if (response.data.code === 200) {
          isFollowing.value = !isFollowing.value;
          ElMessage.success(isFollowing.value ? '关注成功' : '已取消关注');
        } else {
          ElMessage.error(response.data.message || '操作失败');
        }
      } catch (error) {
        console.error('操作失败:', error);
        ElMessage.error('操作失败，请稍后重试');
      }
    };

    // 发送私信
    const sendMessage = async () => {
      if (!isLoggedIn.value) {
        ElMessage.warning('请先登录');
        router.push('/login');
        return;
      }

      router.push({
        path: '/messages',
        query: {
          to: profileId.value
        }
      });
    };

    // 编辑个人资料
    const editProfile = () => {
      showEditDialog.value = true;
      originalEmail.value = profileData.value.email || '';
      userForm.userName = profileData.value.userName;
      userForm.email = profileData.value.email || '';
      userForm.bio = profileData.value.bio;
      userForm.verifyCode = '';
      emailCountdown.value = 0;
      showVerifyCodeInput.value = false;
    };

    // 头像上传相关 - 打开裁剪
    const handleAvatarChange = (file) => {
      const isImage = file.raw.type.startsWith('image/');
      const isLt2M = file.raw.size / 1024 / 1024 < 2;

      if (!isImage) {
        ElMessage.error('只能上传图片文件');
        return false;
      }
      if (!isLt2M) {
        ElMessage.error('图片大小不能超过 2MB');
        return false;
      }

      // 读取原始图片用于裁剪
      const reader = new FileReader();
      reader.onload = (e) => {
        originalImage.value = e.target.result;
        showCropper.value = true;
      };
      reader.readAsDataURL(file.raw);
      return false;
    };

    // 初始化裁剪器
    const initCropper = () => {
      nextTick(() => {
        if (cropperInstance.value) {
          cropperInstance.value.destroy();
        }

        cropperInstance.value = new Cropper(cropperImage.value, {
          aspectRatio: 1,
          viewMode: 1,
          dragMode: 'move',
          autoCropArea1: 0.8,
          restore: false,
          modal: true,
          guides1: true,
          highlight1: true,
          cropBoxMovable1: true,
          cropBoxResizable1: true,
          toggleDragModeOnDblclick: false,
          cropBoxResizable: true,
          guides: false,
          center: true,
          highlight: false,
          background: false,
          autoCrop: true,
          autoCropArea: 1,
          movable: true,
          rotatable: false,
          scalable: false,
          zoomable: true,
          zoomOnTouch: true,
          zoomOnWheel: true,
          wheelZoomRatio: 0.1,
          cropBoxMovable: true,
          data: {
            width: 200,
            height: 200,
          },
        });
      });
    };

    // 裁剪图片
    const cropImage = () => {
      if (!cropperInstance.value) return;

      const canvas = cropperInstance.value.getCroppedCanvas({
        width: 200,
        height: 200,
        fillColor: '#fff',
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
      });

      canvas.toBlob((blob) => {
        avatarFile.value = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
        profileData.value.avatarUrl = canvas.toDataURL('image/jpeg');

        showCropper.value = false;
        cropperInstance.value.destroy();
        cropperInstance.value = null;

        uploadAvatar();
      }, 'image/jpeg', 0.9);
    };

    // 取消裁剪
    const cancelCrop = () => {
      showCropper.value = false;
      if (cropperInstance.value) {
        cropperInstance.value.destroy();
        cropperInstance.value = null;
      }
    };

    const uploadAvatar = async () => {
      if (!avatarFile.value) return;

      uploadingAvatar.value = true;
      try {
        const formData = new FormData();
        formData.append('file', avatarFile.value);

        const response = await axios.post(
          `http://localhost:8080/avatar/upload/${currentUserId.value}`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );

        if (response.data.code === 200) {
          profileData.value.avatarUrl = response.data.data;
          userAvatar.value = response.data.data;
          localStorage.setItem('userAvatar', response.data.data);
          window.dispatchEvent(new Event('user-info-updated'));
          ElMessage.success('头像上传成功');
          avatarFile.value = null;
        } else {
          ElMessage.error(response.data.message || '头像上传失败');
        }
      } catch (error) {
        console.error('头像上传失败:', error);
        ElMessage.error('头像上传失败，请稍后重试');
      } finally {
        uploadingAvatar.value = false;
      }
    };

    const cancelAvatarChange = () => {
      avatarFile.value = null;
      avatarPreview.value = '';
    };

    // 邮箱是否改变
    const emailChanged = computed(() => {
      return userForm.email !== originalEmail.value;
    });

    // 发送验证码（用于更新邮箱）
    const sendVerifyCodeForUpdate = async () => {
      if (!userForm.email) {
        ElMessage.warning('请先输入邮箱');
        return;
      }
      if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(userForm.email)) {
        ElMessage.error('请输入正确的邮箱格式');
        return;
      }

      try {
        const response = await axios.post('http://localhost:8080/registers/sendCode', null, {
          params: { email: userForm.email }
        });

        if (response.data.code === 200) {
          ElMessage.success('验证码已发送');
          showVerifyCodeInput.value = true;
          emailCountdown.value = 60;
          const timer = setInterval(() => {
            emailCountdown.value--;
            if (emailCountdown.value <= 0) {
              clearInterval(timer);
            }
          }, 1000);
        } else if (response.data.code === 400 && response.data.message === '邮箱已存在') {
          ElMessage.error('该邮箱已被使用');
        } else {
          ElMessage.error(response.data.message || '发送失败');
        }
      } catch (error) {
        console.error('发送验证码失败:', error);
        ElMessage.error('发送验证码失败');
      }
    };

    // 更新用户信息
    const updateUserInfo = async () => {
      // 检查信息是否有变化
      const hasChanges =
        userForm.userName !== profileData.value.userName ||
        userForm.email !== (profileData.value.email || '') ||
        userForm.bio !== (profileData.value.bio || '');

      if (!hasChanges) {
        ElMessage.warning('未修改任何信息');
        return;
      }

      // 如果邮箱改变了，需要填写验证码
      if (emailChanged.value && !userForm.verifyCode) {
        ElMessage.warning('请输入验证码');
        return;
      }

      try {
        const updateData = {
          userName: userForm.userName,
          email: userForm.email,
          bio: userForm.bio
        };

        if (emailChanged.value) {
          updateData.code = userForm.verifyCode;
        }

        const response = await axios.post('http://localhost:8080/user/update', updateData);

        if (response.data.code === 200) {
          ElMessage.success('个人资料更新成功');
          profileData.value.userName = userForm.userName;
          userName.value = userForm.userName;
          profileData.value.bio = userForm.bio;
          localStorage.setItem('username', userForm.userName);
          window.dispatchEvent(new Event('user-info-updated'));
          showEditDialog.value = false;
        } else {
          ElMessage.error(response.data.message || '更新失败，请稍后重试');
        }
      } catch (error) {
        console.error('更新个人资料失败:', error);
        ElMessage.error('更新失败，请稍后重试');
      }
    };

    // 更新密码
    const updatePassword = async () => {
      try {
        const response = await axios.post('/user/passwordUpdate', {
          oldPassword: passwordForm.oldPassword,
          newPassword: passwordForm.newPassword
        });

        if (response.data.code === 200) {
          ElMessage.success('密码修改成功');
          passwordForm.oldPassword = '';
          passwordForm.newPassword = '';
          passwordForm.confirmPassword = '';
          showEditDialog.value = false;
        } else if (response.data.code === 400) {
          ElMessage.error('原密码错误');
        } else {
          ElMessage.error(response.data.message || '密码修改失败，请稍后重试');
        }
      } catch (error) {
        console.error('修改密码失败:', error);
        ElMessage.error('修改密码失败，请稍后重试');
      }
    };

    // 注销账号
    const deleteAccount = async () => {
      try {
        const response = await axios.delete(`/user/delete?password=${deleteForm.password}`);

        if (response.data.code === 200) {
          ElMessage.success('账号已成功注销');
          localStorage.removeItem('token');
          localStorage.removeItem('userName');
          localStorage.removeItem('userId');
          localStorage.removeItem('userAvatar');
          router.push('/');
        } else if (response.data.code === 401) {
          ElMessage.error('密码验证失败');
        } else {
          ElMessage.error(response.data.message || '注销账号失败，请稍后重试');
        }
      } catch (error) {
        console.error('注销账号失败:', error);
        ElMessage.error('注销账号失败，请稍后重试');
      }
    };

    // 查看文章详情
    const viewArticle = (articleId) => {
      if (articleId) {
        router.push({ name: 'article-detail', params: { id: articleId } });
      } else {
        ElMessage.error('文章 ID 不存在，无法查看详情');
      }
    };

    // 导航到个人主页
    const goToProfile = () => {
      const userId = localStorage.getItem('userId');
      router.push(`/profile/${userId}`);
    };

    // 导航到文章编辑页
    const goToArticleEdit = () => {
      router.push('/article/edit');
    };

    // 导航到私信页面
    const goToMessages = () => {
      router.push('/messages');
    };

    // 导航到通知中心
    const goToNotifications = () => {
      router.push('/notifications');
    };

    // 处理退出登录
    const handleLogout = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('userName');
      localStorage.removeItem('userId');
      localStorage.removeItem('userAvatar');
      localStorage.removeItem('role');

      isLoggedIn.value = false;
      ElMessage.success('已退出登录');
      router.push('/');
    };

    // 检查关注状态
    const checkFollowStatus = async () => {
      if (!isLoggedIn.value || isOwnProfile.value || !profileId.value) return;

      try {
        const response = await axios.get(`http://localhost:8080/userFollow/isFollowing/${profileId.value}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        isFollowing.value = response.data.message === '已关注';
      } catch (error) {
        console.error('检查关注状态失败:', error);
      }
    };

    // 显示关注/粉丝列表
    const showFollowList = async (tab) => {
      if (!isLoggedIn.value) {
        ElMessage.warning('请先登录');
        return;
      }
      followTab.value = tab;
      showFollowDialog.value = true;
      followPageNum.value = 1;
      if (tab === 'following') {
        await fetchFollowingList();
      } else {
        await fetchFollowerList();
      }
    };

    const switchFollowTab = async (tab) => {
      followTab.value = tab;
      followPageNum.value = 1;
      if (tab === 'following') {
        if (followingList.value.length === 0) await fetchFollowingList();
      } else {
        if (followerList.value.length === 0) await fetchFollowerList();
      }
    };

    // 获取关注列表
    const fetchFollowingList = async () => {
      try {
        const response = await axios.get(`http://localhost:8080/userFollow/getUserFollow`, {
          params: {
            pageNum: followPageNum.value,
            pageSize: followPageSize.value
          },
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.data.code === 200) {
          const followingData = response.data.data.list;
          followTotal.value = response.data.data.total;

          const userPromises = followingData.map(async (follow) => {
            try {
              const userResponse = await axios.get(`http://localhost:8080/user/selectUserById/${follow.followingId}`);
              const userData = userResponse.data.data;

              let isFollowing = false;
              if (isLoggedIn.value) {
                try {
                  const followStatusResponse = await axios.get(`http://localhost:8080/userFollow/isFollowing/${follow.followingId}`, {
                    headers: {
                      'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                  });
                  isFollowing = followStatusResponse.data.message === '已关注';
                } catch (error) {
                  console.error('检查关注状态失败:', error);
                }
              }

              return {
                ...userData,
                followId: follow.followId,
                followingId: follow.followingId,
                isFollowing
              };
            } catch (error) {
              console.error('获取用户信息失败:', error);
              return null;
            }
          });

          const users = await Promise.all(userPromises);
          followingList.value = users.filter(user => user !== null);
        } else {
          ElMessage.error(response.data.message || '获取关注列表失败');
        }
      } catch (error) {
        console.error('获取关注列表失败:', error);
        ElMessage.error('获取关注列表失败，请稍后重试');
      }
    };

    // 获取粉丝列表
    const fetchFollowerList = async () => {
      try {
        const response = await axios.get(`http://localhost:8080/userFollow/getFollower`, {
          params: {
            pageNum: followPageNum.value,
            pageSize: followPageSize.value
          },
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.data.code === 200) {
          const followerData = response.data.data.list;
          followerTotal.value = response.data.data.total;

          const userPromises = followerData.map(async (follow) => {
            try {
              const userResponse = await axios.get(`http://localhost:8080/user/selectUserById/${follow.followerId}`);
              return userResponse.data.data;
            } catch (error) {
              console.error('获取用户信息失败:', error);
              return null;
            }
          });

          const users = await Promise.all(userPromises);
          followerList.value = users.filter(user => user !== null);
        } else {
          ElMessage.info('粉丝列表功能暂不可用');
          followerList.value = [];
        }
      } catch (error) {
        console.error('获取粉丝列表失败:', error);
        followerList.value = [];
      }
    };

    // 关注/粉丝列表分页处理
    const handleFollowPageChange = (page) => {
      followPageNum.value = page;
      if (followTab.value === 'following') {
        fetchFollowingList();
      } else {
        fetchFollowerList();
      }
    };

    // 跳转到用户主页
    const goToUserProfile = (userId) => {
      router.push(`/profile/${userId}`);
      showFollowDialog.value = false;
    };

    // 在关注列表中关注/取消关注用户
    const toggleFollowUser = async (user) => {
      try {
        let response;

        if (user.isFollowing) {
          if (!user.followingId) {
            ElMessage.error('用户 ID 无效，无法取消关注');
            return;
          }
          response = await axios.delete(`http://localhost:8080/userFollow/deleteUserFollow/${user.followingId}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
        } else {
          if (!user.followingId) {
            ElMessage.error('用户 ID 无效，无法关注');
            return;
          }
          response = await axios.post('http://localhost:8080/userFollow/addUserFollow', Number(user.followingId), {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          });
        }

        if (response.data.code === 200) {
          user.isFollowing = !user.isFollowing;
          ElMessage.success(user.isFollowing ? '关注成功' : '已取消关注');

          if (!user.isFollowing) {
            followingList.value = followingList.value.filter(u => u.followId !== user.followId);
            followTotal.value--;
          }
        } else {
          ElMessage.error(response.data.message || '操作失败');
        }
      } catch (error) {
        console.error('操作失败:', error);
        ElMessage.error('操作失败，请稍后重试');
      }
    };

    // 标签页切换处理
    const handleTabChange = (tab) => {
      activeTab.value = tab.name;
      // 切换到攻略tab时重置状态筛选
      if (tab.name === 'articles') {
        articleStatus.value = '';
        pageNum.value = 1;
        fetchUserArticles();
      } else if (tab.name === 'favorites') {
        fetchUserFavorites();
      } else if (tab.name === 'likes') {
        fetchUserLikes();
      }
    };

    // 对话框关闭处理
    const handleDialogClose = () => {
      // 重置表单状态
      if (editActiveTab.value === 'password') {
        passwordForm.oldPassword = '';
        passwordForm.newPassword = '';
        passwordForm.confirmPassword = '';
      } else if (editActiveTab.value === 'account') {
        deleteForm.password = '';
      }
      showEditDialog.value = false;
      showFollowDialog.value = false;
    };

    // 分页变化处理
    const handleCurrentChange = (val) => {
      pageNum.value = val;
      fetchUserArticles();
    };

    onMounted(() => {
      checkLoginStatus();
      fetchProfileData();
      fetchUserArticles();
      fetchUserFavorites();
      fetchUserLikes();
      fetchRecentActivities();

      if (isLoggedIn.value && !isOwnProfile.value) {
        checkFollowStatus();
      }
    });

    return {
      isLoggedIn,
      userName,
      userAvatar,
      currentUserId,
      profileData,
      userArticles,
      userFavorites,
      userLikes,
      activeTab,
      isFollowing,
      isOwnProfile,
      articleStatus,
      articleStatusOptions,
      handleStatusChange,
      formatDate,
      toggleFollow,
      sendMessage,
      editProfile,
      viewArticle,
      handleCurrentChange,
      total,
      pageNum,
      pageSize,
      showEditDialog,
      editActiveTab,
      userForm,
      emailChanged,
      emailCountdown,
      showVerifyCodeInput,
      sendVerifyCodeForUpdate,
      avatarFile,
      avatarPreview,
      uploadingAvatar,
      handleAvatarChange,
      uploadAvatar,
      cancelAvatarChange,
      showCropper,
      originalImage,
      cropperImage,
      initCropper,
      cropImage,
      cancelCrop,
      passwordForm,
      deleteForm,
      passwordRules,
      deleteRules,
      updateUserInfo,
      updatePassword,
      deleteAccount,
      goToProfile,
      goToArticleEdit,
      goToMessages,
      goToNotifications,
      handleLogout,
      showFollowDialog,
      followTab,
      followingList,
      followerList,
      currentFollowList,
      currentFollowTotal,
      followPageNum,
      followPageSize,
      showFollowList,
      switchFollowTab,
      fetchFollowingList,
      fetchFollowerList,
      handleFollowPageChange,
      goToUserProfile,
      toggleFollowUser,
      handleTabChange,
      handleDialogClose,
      isAvatarHover,
      hoveredStat,
      hoveredCard,
      hoveredFollow,
      router, favType, userArticlesFav, userSpotsFav,
      recentActivities,
      formatJoinDate, removeFavorite, notImplemented,
      activeRightTab, deleteArticle, userLevel,
      likedTab, switchLikedTab, userLikedArticles,
    };
  }
};
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f0f4f8 0%, #e2e8f0 100%);
  display: flex;
  flex-direction: column;
  color: #1f2b38;
}

.profile-container {
  max-width: 1280px;
  width: 100%;
  margin: 24px auto;
  padding: 0 20px;
  flex: 1;
}

/* ========== 公用卡片 ========== */
.content-card {
  background: rgba(255, 255, 255, 0.96);
  border-radius: 2rem;
  box-shadow: 0 12px 28px -8px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.02);
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s;
  border: 1px solid rgba(255, 255, 255, 0.7);
}

.content-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 20px 32px -12px rgba(0, 0, 0, 0.12);
}

.content-card-header {
  padding: 1.2rem 1.8rem 0.4rem 1.8rem;
  font-weight: 700;
  font-size: 1.1rem;
  color: #0f172a;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.content-card-body {
  padding: 0.5rem 1.8rem 1.6rem 1.8rem;
}

.card-divider {
  margin: 0.8rem 1.8rem;
  height: 1px;
  background: #ecf3fa;
}

.card-link {
  color: #0ea5e9;
  font-weight: 500;
  font-size: 0.85rem;
  cursor: pointer;
}

/* ========== 头像 ========== */
.profile-avatar {
  width: 110px;
  height: 110px;
  border-radius: 50%;
  overflow: hidden;
  border: 4px solid white;
  box-shadow: 0 12px 18px -8px rgba(0,0,0,0.1);
  background: #e2e8f0;
  position: relative;
  flex-shrink: 0;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: all 0.3s;
}

.profile-avatar.is-own:hover .avatar-img {
  transform: scale(1.08);
}

.avatar-upload-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.avatar-upload-overlay .el-upload {
  width: 100%;
  height: 100%;
}

.avatar-upload-mask {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.3s;
  cursor: pointer;
}

.profile-avatar.is-own:hover .avatar-upload-mask {
  opacity: 1;
}

.avatar-upload-mask .el-icon {
  font-size: 20px;
  margin-bottom: 4px;
}

/* ========== Profile Header ========== */
.profile-header {
  display: flex;
  align-items: center;
  gap: 2rem;
  flex-wrap: wrap;
  padding: 1.6rem 2rem;
  background: rgba(255, 255, 255, 0.96);
  border-radius: 2rem;
  box-shadow: 0 12px 28px -8px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.7);
  margin-bottom: 1.5rem;
}

.header-info {
  flex: 1;
}

.header-name-row {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  flex-wrap: wrap;
}

.header-name {
  font-size: 1.9rem;
  font-weight: 800;
  background: linear-gradient(135deg, #1E293B, #2d3a5e);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  line-height: 1.2;
  margin: 0;
}

.level-badge {
  font-size: 0.7rem;
  font-weight: 700;
  color: #fff;
  padding: 0.2rem 0.7rem;
  border-radius: 20px;
  white-space: nowrap;
  letter-spacing: 0.02em;
  box-shadow: 0 2px 6px rgba(0,0,0,0.12);
}

.header-bio {
  color: #475569;
  font-size: 0.95rem;
  max-width: 500px;
  margin: 0.5rem 0 0.8rem;
}

.header-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1.2rem;
}

.header-meta-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  color: #5b6e8c;
  background: #f8fafc;
  padding: 0.3rem 0.9rem;
  border-radius: 60px;
}

.header-meta-item .el-icon {
  font-size: 0.85rem;
  color: #0ea5e9;
}

.header-actions {
  display: flex;
  gap: 0.8rem;
}

.edit-profile-btn {
  background: #f1f5f9;
  border: none;
  padding: 0.55rem 1.6rem;
  border-radius: 2rem;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
  color: #1e293b;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.edit-profile-btn:hover {
  background: #e2e8f0;
}

/* ========== Stats ========== */
.stats-card {
  background: rgba(255, 255, 255, 0.96);
  border-radius: 2rem;
  box-shadow: 0 12px 28px -8px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.7);
  padding: 1rem 1.8rem;
  margin-bottom: 1.5rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.8rem;
}

.stat-item {
  background: #f8fafc;
  border-radius: 1.5rem;
  padding: 1.2rem 1rem;
  text-align: center;
  transition: all 0.2s;
}

.stat-item:hover {
  background: #eef2ff;
  transform: translateY(-2px);
}

.stat-icon {
  font-size: 1.4rem;
  color: #0ea5e9;
  margin-bottom: 0.5rem;
}

.stat-number {
  font-size: 1.8rem;
  font-weight: 800;
  color: #0f172a;
}

.stat-label {
  font-size: 0.8rem;
  color: #64748b;
  margin-top: 0.2rem;
}

/* ========== Two Columns ========== */
.two-columns {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.column-left {
  flex: 1.4;
  min-width: 260px;
}

.column-right {
  flex: 2;
  min-width: 300px;
}

/* ========== 收藏列表 ========== */
.fav-list {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.fav-item {
  display: flex;
  gap: 0.8rem;
  align-items: center;
  cursor: pointer;
  padding: 0.3rem;
  border-radius: 12px;
  transition: background 0.2s;
}

.fav-item:hover {
  background: #f8fafc;
}

.fav-img {
  width: 56px;
  height: 56px;
  border-radius: 1rem;
  object-fit: cover;
  background: #e2e8f0;
  flex-shrink: 0;
}

.fav-info {
  flex: 1;
  min-width: 0;
}

.fav-name {
  font-weight: 700;
  font-size: 0.9rem;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fav-location {
  font-size: 0.75rem;
  color: #5b6e8c;
  margin-top: 0.15rem;
}

.fav-remove {
  color: #94a3b8;
  cursor: pointer;
  flex-shrink: 0;
  transition: color 0.2s;
}

.fav-remove:hover {
  color: #ef4444;
}

/* ========== 偏好标签 ========== */
.pref-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.pref-tag {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 60px;
  padding: 0.3rem 1rem;
  font-size: 0.8rem;
  cursor: default;
  transition: all 0.2s;
}

.pref-tag:hover {
  background: #eef2ff;
  border-color: #bae6fd;
}

.add-tag {
  color: #0ea5e9;
  border-style: dashed;
  cursor: pointer;
}

/* ========== 活动列表 ========== */
.activity-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.8rem 0;
  border-bottom: 1px solid #ecf3fa;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-icon {
  width: 44px;
  height: 44px;
  border-radius: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.activity-icon .el-icon {
  font-size: 1.2rem;
}

.activity-info {
  flex: 1;
  min-width: 0;
}

.activity-title {
  font-weight: 600;
  font-size: 0.9rem;
  color: #1e293b;
}

.activity-time {
  font-size: 0.75rem;
  color: #94a3b8;
  margin-top: 0.15rem;
}

.activity-score {
  font-size: 0.8rem;
  font-weight: 600;
  color: #f59e0b;
  flex-shrink: 0;
}

/* ========== 设置列表 ========== */
.settings-list {
  display: flex;
  flex-direction: column;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.8rem 0;
  border-bottom: 1px solid #ecf3fa;
  cursor: pointer;
  transition: background 0.2s;
}

.setting-item:hover {
  background: #f8fafc;
  margin: 0 -0.5rem;
  padding: 0.8rem 0.5rem;
  border-radius: 10px;
}

.setting-left {
  display: flex;
  gap: 0.9rem;
  align-items: center;
  font-size: 0.9rem;
  color: #1e293b;
}

.setting-left .el-icon {
  color: #5b6e8c;
  font-size: 1.1rem;
}

.setting-item .el-icon:last-child {
  color: #cbd5e1;
  font-size: 0.85rem;
}

.setting-value {
  font-size: 0.75rem;
  color: #94a3b8;
}

.logout-item {
  border-bottom: none;
  color: #ef4444;
}

.logout-item .setting-left .el-icon {
  color: #ef4444;
}

/* ========== 卡片标签切换 ========== */
.card-tabs-header {
  padding-bottom: 0 !important;
}

.card-tabs {
  display: flex;
  gap: 0.2rem;
  background: #f1f5f9;
  border-radius: 12px;
  padding: 0.2rem;
}

.card-tab {
  padding: 0.4rem 1.2rem;
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  color: #64748b;
}

.card-tab.active {
  background: #fff;
  color: #0ea5e9;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

/* ========== 文章管理列表 ========== */
.article-filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.8rem;
  gap: 0.5rem;
}

.status-filter {
  width: 130px;
}

.new-article-btn {
  border-radius: 8px !important;
  white-space: nowrap;
}

.article-manage-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.article-manage-item {
  display: flex;
  gap: 0.8rem;
  align-items: center;
  padding: 0.6rem;
  border-radius: 12px;
  border: 1px solid #f1f5f9;
  transition: all 0.2s;
}

.article-manage-item:hover {
  background: #f8fafc;
  border-color: #e2e8f0;
}

.article-manage-cover {
  width: 52px;
  height: 52px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
  background: #e2e8f0;
}

.article-manage-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.article-manage-info {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.article-manage-title {
  font-weight: 700;
  font-size: 0.88rem;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 0.25rem;
}

.article-manage-meta {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.72rem;
  color: #94a3b8;
  flex-wrap: wrap;
}

.article-manage-meta .el-icon {
  font-size: 0.72rem;
}

.article-manage-actions {
  display: flex;
  gap: 0.3rem;
  flex-shrink: 0;
}

.article-date {
  color: #94a3b8;
}

.pagination-wrap {
  margin-top: 0.8rem;
  display: flex;
  justify-content: center;
}

/* ========== 状态徽章 ========== */
.status-badge {
  font-size: 0.68rem;
  font-weight: 600;
  padding: 0.12rem 0.5rem;
  border-radius: 20px;
  white-space: nowrap;
}

.status-badge.published {
  background: #d1fae5;
  color: #059669;
}

.status-badge.draft {
  background: #f1f5f9;
  color: #64748b;
}

.status-badge.hidden {
  background: #fef3c7;
  color: #d97706;
}

.status-badge.pending {
  background: #dbeafe;
  color: #2563eb;
}

.status-badge.rejected {
  background: #fee2e2;
  color: #dc2626;
}

/* ========== 空状态 ========== */
:deep(.empty-state) {
  padding: 48px 24px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
}

/* ========== 响应式 ========== */
@media (max-width: 850px) {
  .profile-container {
    padding: 0 16px;
    margin: 16px auto;
  }
  .profile-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }
  .stat-item {
    padding: 1rem 0.6rem;
  }
  .stat-number {
    font-size: 1.4rem;
  }
}

/* 关注列表对话框 */
:deep(.following-dialog .el-dialog__body) {
  padding: 18px 26px;
}

.dialog-header {
  margin-bottom: 18px;
}

.dialog-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.following-list {
  max-height: 420px;
  overflow-y: auto;
  padding-right: 10px;
}

.following-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 0;
  border-bottom: 1px solid #e5e7eb;
}

.following-item:last-child {
  border-bottom: none;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1;
  transition: all 0.3s;
  padding: 10px;
  border-radius: 10px;
  cursor: pointer;
}

.user-info:hover {
  background: #f3f4f6;
}

.follow-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
}

.user-details {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 5px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-bio {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.follow-actions {
  display: flex;
  gap: 10px;
}

.follow-btn-active {
  border-color: #1d7a9c !important;
  color: #1d7a9c !important;
}

:deep(.follow-empty) {
  padding: 48px 24px;
}

:deep(.follow-pagination) {
  margin-top: 18px;
}

/* 编辑资料对话框 */
:deep(.edit-dialog .el-dialog__body) {
  padding: 18px 26px;
}

:deep(.edit-tabs) {
  --el-tabs-nav-scroll-container-padding: 0 0 18px 0;
  --el-tabs-bottom-bar-color: #0ea5e9;
}

:deep(.edit-tabs .el-tabs__item) {
  font-size: 14px;
  font-weight: 600;
}

:deep(.edit-dialog .el-dialog__header) {
  border-bottom: 1px solid #eef2ff;
  padding: 18px 26px;
  margin: 0;
}

:deep(.edit-dialog .el-dialog__title) {
  font-weight: 700;
  font-size: 18px;
  color: #1e293b;
}

:deep(.following-dialog .el-dialog__header) {
  border-bottom: 1px solid #eef2ff;
  padding: 18px 26px;
  margin: 0;
}

:deep(.following-dialog .el-dialog__title) {
  font-weight: 700;
  font-size: 18px;
  color: #1e293b;
}

.edit-form {
  margin-top: 10px;
}

.edit-form .el-form-item {
  margin-bottom: 18px;
}

:deep(.form-input) {
  border-radius: 10px;
  border-color: #e2e8f0;
  transition: all 0.3s;
}

.email-input-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
}

.email-input-wrapper .form-input {
  flex: 1;
}

.send-code-btn {
  white-space: nowrap;
  border-radius: 10px !important;
}

:deep(.form-input:focus) {
  border-color: #0ea5e9 !important;
  box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1) !important;
}

:deep(.form-select) {
  border-radius: 10px;
}

.form-btn-group {
  display: flex;
  gap: 14px;
  justify-content: flex-end;
  margin-top: 22px;
}

:deep(.submit-btn) {
  background: linear-gradient(135deg, #0ea5e9, #0284c7);
  border: none;
  border-radius: 10px !important;
  padding: 10px 24px;
  font-weight: 600;
  font-size: 14px;
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.25);
}

:deep(.submit-btn:hover) {
  background: linear-gradient(135deg, #0284c7, #0369a1);
  box-shadow: 0 6px 18px rgba(14, 165, 233, 0.35);
  transform: translateY(-2px);
}

:deep(.cancel-btn) {
  border: 2px solid #e2e8f0 !important;
  color: #64748b !important;
  border-radius: 10px !important;
  background: #f8fafc;
  font-weight: 500;
}

:deep(.cancel-btn:hover) {
  background: #f1f5f9;
  border-color: #cbd5e1 !important;
}

/* 危险区域 */
.danger-zone {
  background-color: #fff8f8;
  border-radius: 16px;
  padding: 20px;
  border: 1px solid #fee2e2;
}

.danger-title {
  font-size: 16px;
  font-weight: 600;
  color: #dc2626;
  margin: 0 0 14px 0;
  display: flex;
  align-items: center;
  gap: 9px;
}

.danger-icon {
  font-size: 18px;
}

.danger-desc {
  margin-bottom: 18px;
  color: #b91c1c;
  font-size: 14px;
  line-height: 1.6;
}

.delete-form .el-form-item {
  margin-bottom: 10px;
}

:deep(.delete-btn) {
  background: #dc2626 !important;
  border-color: #dc2626 !important;
  border-radius: 11px !important;
}

:deep(.delete-btn:hover) {
  background: #b91c1c !important;
  border-color: #b91c1c !important;
  transform: translateY(-2px);
}

/* 响应式调整 */
@media (max-width: 1024px) {
  .profile-container {
    max-width: 100%;
    padding: 0 24px;
  }

  .guide-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 18px;
  }

  .profile-content {
    padding: 24px;
  }
}

@media (max-width: 768px) {
  .profile-container {
    margin: 20px auto;
    padding: 0 20px;
  }

  .profile-cover {
    height: 150px;
  }

  .profile-info {
    padding: 0 24px;
    margin-top: -40px;
  }

  .profile-head {
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 16px;
  }

  .profile-avatar {
    width: 80px;
    height: 80px;
  }

  .profile-name {
    font-size: 1.4rem;
  }

  .profile-bio {
    justify-content: center;
  }

  .profile-actions {
    margin-left: 0;
    width: 100%;
    justify-content: center;
  }

  .profile-stats {
    gap: 18px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .stat-block {
    padding: 7px 12px;
  }

  .stat-number {
    font-size: 1.3rem;
  }

  .stat-label {
    font-size: 0.8rem;
  }

  .guide-grid {
    grid-template-columns: 1fr;
  }

  .profile-content {
    padding: 22px;
  }

  .card-image {
    height: 150px;
  }
}

@media (max-width: 480px) {
  .profile-cover {
    height: 130px;
  }

  .profile-avatar {
    width: 70px;
    height: 70px;
  }

  .profile-name {
    font-size: 1.25rem;
  }

  .profile-bio {
    font-size: 0.9rem;
  }

  .stat-number {
    font-size: 1.2rem;
  }

  .stat-label {
    font-size: 0.75rem;
  }

  .profile-stats {
    gap: 14px;
  }

  .follow-btn,
  .message-btn,
  .edit-btn {
    padding: 8px 18px;
    font-size: 0.9rem;
  }
}

/* 头像裁剪样式 */
.cropper-wrapper {
  width: 100%;
  max-height: 400px;
  background: #f8fafc;
  border-radius: 12px;
  overflow: hidden;
}

.cropper-image {
  display: block;
  max-width: 100%;
}

.cropper-controls {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 20px;
}

.cropper-controls .el-button {
  padding: 8px 20px;
  border-radius: 8px;
  font-weight: 600;
}
</style>
