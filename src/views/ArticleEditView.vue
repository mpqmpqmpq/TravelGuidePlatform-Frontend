<template>
  <div class="article-edit-page">
    <nav-component search-placeholder="搜索攻略..." />
    <!-- 编辑页面主体 -->
    <div class="article-edit-container" v-if="!isLoading">
      <!-- 发布失败提示 -->
      <el-alert v-if="errorMsg" type="error" closable @close="errorMsg = ''" class="error-alert">
        {{ errorMsg }}
      </el-alert>

      <div class="article-edit-header">
        <h1>{{ isEdit ? '编辑攻略' : '创建攻略' }}</h1>
        <div class="article-actions">
          <el-button type="text" color="#ff4d4f" @click="handleCancel"
            :loading="isSaving || chunkUploadState.isChunkUploading">
            取消
          </el-button>
          <el-button @click="saveAsDraft" :loading="isSaving || chunkUploadState.isChunkUploading">保存草稿</el-button>
          <el-button type="primary" @click="handlePublish" :loading="isSaving || chunkUploadState.isChunkUploading">
            {{ isEdit ? '更新攻略' : '提交审核' }}
          </el-button>
        </div>
      </div>

      <!-- 表单内容 -->
      <div class="article-form">
        <!-- 攻略标题 -->
        <div class="form-group">
          <el-input v-model="articleForm.title" placeholder="请输入攻略标题（必填）" maxlength="100" show-word-limit
            @blur="validateTitle" />
          <p v-if="titleError" class="error-text">{{ titleError }}</p>
        </div>

        <!-- 攻略分类 -->
        <div class="form-group">
          <el-tree-select v-model="articleForm.categoryId" :data="categoryTree" placeholder="请选择攻略分类（必填）"
            class="category-select" :props="{ value: 'categoryId', label: 'name', children: 'children' }" clearable
            check-strictly :disabled="categoryTree.length === 0" @change="validateCategory" />
          <p class="form-tip" v-if="categoryTree.length === 0">暂无分类数据，请联系管理员添加</p>
          <p v-if="categoryError" class="error-text">{{ categoryError }}</p>
        </div>

        <!-- 封面图片 -->
        <div class="form-group cover-upload">
          <p class="form-label">封面图片（建议：尺寸1200x630）</p>
          <el-upload class="cover-uploader" action="#" :auto-upload="false" :show-file-list="false"
            :on-change="handleCoverChange" :before-change="beforeCoverUpload" accept="image/jpeg,image/png,image/gif">
            <div v-if="coverImageUrl" class="cover-preview">
              <img :src="coverImageUrl" class="cover-image" />
              <el-button type="text" class="cover-remove" @click="handleCoverRemove">
                <el-icon>
                  <Delete />
                </el-icon> 移除封面
              </el-button>
            </div>
            <div v-else class="cover-placeholder">
              <el-icon>
                <Plus />
              </el-icon>
              <span>点击上传封面</span>
              <p class="cover-tip">支持JPG/PNG/GIF，大小不超过5MB</p>
            </div>
          </el-upload>
        </div>

        <!-- 攻略内容（富文本编辑器） -->
        <div class="form-group">
          <p class="form-label">内容（必填）</p>
          <div class="editor-container" id="quillEditorContainer">
            <!-- 隐藏的媒体上传组件 -->
            <el-upload class="avatar-uploader" :http-request="handleCustomMediaUpload"
              :before-upload="beforeMediaUpload" :show-file-list="false" accept="image/*,video/*" ref="mediaUploadRef"
              style="display: none">
            </el-upload>

            <!-- Quill富文本编辑器 -->
            <QuillEditor ref="quillRef" class="editor" v-model:content="articleForm.content" :options="editorOptions"
              @ready="onQuillReady" />


            <!-- 上传状态提示 -->
            <div class="media-upload-tip" v-if="mediaUploadStatus">
              <el-icon>
                <Loading />
              </el-icon>
              <span>{{ mediaUploadStatus }}</span>
              <el-button type="text" size="mini" class="cancel-chunk-btn" v-if="chunkUploadState.isChunkUploading"
                @click="handleChunkUploadAbort">
                取消
              </el-button>
            </div>
            <div class="media-upload-error" v-if="mediaUploadError">
              <el-icon>
                <CircleClose />
              </el-icon>
              <span>{{ mediaUploadError }}</span>
              <el-button type="text" @click="retryMediaUpload">重试</el-button>
            </div>
          </div>
          <p v-if="contentError" class="error-text">{{ contentError }}</p>
        </div>

        <!-- 攻略标签 -->
        <div class="form-group">
          <p class="form-label">标签（最多5个）</p>
          <el-tag v-for="tag in articleForm.tags" :key="tag" closable @close="removeTag(tag)" class="article-tag">
            {{ tag }}
          </el-tag>
          <el-input v-if="inputTagVisible" ref="tagInputRef" v-model="inputTagValue" class="tag-input" size="small"
            placeholder="输入标签" @keyup.enter="addTag" @blur="addTag" />
          <el-button v-else class="button-new-tag" size="small" @click="showTagInput"
            :disabled="articleForm.tags.length >= 5">
            + 添加标签
          </el-button>
          <p v-if="tagError" class="error-text">{{ tagError }}</p>
        </div>

        <!-- 专门的视频上传区域 -->
        <div class="form-group">
          <p class="form-label">视频上传</p>
          <el-upload class="video-uploader" :http-request="handleCustomMediaUpload" :before-upload="beforeMediaUpload"
            :show-file-list="false" accept="video/*" ref="videoUploadRef" style="display: none">
          </el-upload>
          <el-button type="primary" @click="handleVideoUpload" :disabled="chunkUploadState.isChunkUploading">
            <el-icon class="el-icon--left">
              <Upload />
            </el-icon> 上传视频
          </el-button>
          <p class="form-tip">支持MP4、AVI等视频格式，大小不超过2GB</p>
        </div>

        <!-- 已上传媒体列表 -->
        <div class="form-group" v-if="mediaList.length > 0">
          <p class="form-label">已上传媒体（{{ mediaList.length }}个）</p>
          <div class="media-preview-list">
            <div class="media-preview-item" v-for="media in mediaList" :key="media.mediaId">
              <div class="media-thumb">
                <img v-if="media.mediaType === 'image'" :src="media.mediaUrl" :alt="media.altText || '图片'"
                  class="image-thumb" @error="handleMediaLoadError(media.mediaId)">
                <div v-else class="video-thumb">
                  <img :src="media.videoCoverUrl || '/default-video-cover.png'" alt="视频封面" class="video-cover"
                    @error="() => handleMediaLoadError(media.mediaId)">
                  <span class="video-duration">{{ formatDuration(media.videoDuration) }}</span>
                </div>
              </div>
              <div class="media-info">
                <p class="media-title">{{ media.mediaTitle || (media.mediaType === 'image' ? '图片' : '视频') }}</p>
                <p class="media-size">{{ formatFileSize(media.extraInfo?.size) }}</p>
                <p class="media-status" v-if="media.loadError">
                  <el-icon class="error-icon">
                    <CircleClose />
                  </el-icon>
                  <span>媒体加载失败</span>
                </p>
              </div>
              <el-button type="text" class="media-remove-btn" @click="removeMedia(media.mediaId)"
                :loading="media.isRemoving">
                <el-icon>
                  <Delete />
                </el-icon> 删除
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 页面加载中 -->
    <div class="page-loading" v-if="isLoading">
      <div class="custom-spinner"></div>
      <p class="loading-text">加载中...</p>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted, nextTick, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage, ElMessageBox, ElUpload } from 'element-plus';
import {
  Plus, Delete,
  Loading, CircleClose, Upload
} from '@element-plus/icons-vue';
import axios from 'axios';
import * as Quill from 'quill';
import { QuillEditor } from '@vueup/vue-quill';
import '@vueup/vue-quill/dist/vue-quill.snow.css';
import NavComponent from '../components/NavComponent.vue';

// 1. 攻略状态枚举
const ARTICLE_STATUS = {
  DRAFT: 0,        // 草稿
  PUBLISHED: 1,    // 已发布
  HIDDEN: 2,       // 隐藏
  PENDING: 3,      // 待审核
  REJECTED: 4      // 审核驳回
};

// 2. 富文本工具栏配置
const toolbarOptions = [
  ['bold', 'italic', 'underline', 'strike'],
  ['blockquote', 'code-block'],
  [{ 'header': 1 }, { 'header': 2 }],
  [{ 'list': 'ordered' }, { 'list': 'bullet' }],
  [{ 'script': 'sub' }, { 'script': 'super' }],
  [{ 'indent': '-1' }, { 'indent': '+1' }],
  [{ 'direction': 'rtl' }],
  [{ 'size': ['small', false, 'large', 'huge'] }],
  [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
  [{ 'color': [] }, { 'background': [] }],
  [{ 'font': [] }],
  [{ 'align': [] }],
  ['link', 'image'],
  ['clean']
];

// 3. 基础配置
const BASE_API = 'http://localhost:8080';

export default {
  name: 'ArticleEditView',
  components: {
    NavComponent,
    Plus, QuillEditor, Delete,
    Loading, CircleClose, ElUpload, Upload
  },
  setup() {
    // 基础变量与状态（保持不变）
    const router = useRouter();
    const route = useRoute();
    const tagInputRef = ref(null);
    const quillRef = ref(null);
    const mediaUploadRef = ref(null);
    const videoUploadRef = ref(null); // 视频上传组件的引用
    const quillInstance = ref(null);
    const isTextChangeBound = ref(false);
    const currentUploadFile = ref(null);

    const quillModule = Quill;
    console.log('Quill模块加载成功', quillModule.version);

    const isLoggedIn = ref(false);
    const username = ref('');
    const userAvatar = ref('/default-avatar.png');
    const isEdit = ref(false);
    const isLoading = ref(true);
    const isSaving = ref(false);
    const errorMsg = ref('');
    const mediaUploadStatus = ref('');
    const mediaUploadError = ref('');
    const retryMediaInfo = ref(null);

    // 处理视频上传
    const handleVideoUpload = () => {
      currentUploadFile.value = { type: 'video' };
      videoUploadRef.value.$el.querySelector('input').click();
    };

    const titleError = ref('');
    const contentError = ref('');
    const categoryError = ref('');
    const tagError = ref('');

    // 写攻略时每次都创建新攻略
    const articleId = ref(route.params.id ? Number(route.params.id) : null);
    const coverImageUrl = ref('');
    const coverFile = ref(null);
    const inputTagVisible = ref(false);
    const inputTagValue = ref('');
    const categoryTree = ref([]);
    const mediaList = ref([]);
    const token = ref(localStorage.getItem('token'));

    // 根据文件名和媒体类型推断 MIME
    const getMimeType = (fileName, mediaType) => {
      const ext = fileName.split('.').pop().toLowerCase();
      const imageMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };
      const videoMap = { mp4: 'video/mp4', avi: 'video/x-msvideo', mov: 'video/quicktime', wmv: 'video/x-ms-wmv', flv: 'video/x-flv', webm: 'video/webm' };
      return (mediaType === 'image' ? imageMap[ext] : videoMap[ext]) || `application/octet-stream`;
    };

    const chunkUploadState = reactive({
      isChunkUploading: false,
      currentChunkInfo: null,
      uploadId: '',
      objectName: '',
      chunkSize: 5 * 1024 * 1024,
      totalChunks: 0,
      uploadedChunks: 0,
      chunkETags: [],
      chunkError: ''
    });

    const articleForm = reactive({
      title: '',
      content: '',
      categoryId: '',
      tags: []
    });

    const uploadHeaders = ref({
      Authorization: `Bearer ${token.value}`
    });
    const uploadMediaUrl = ref(`${BASE_API}/articleMedia/add`);

    const editorOptions = ref({
      placeholder: '必填',
      modules: {
        toolbar: {
          container: toolbarOptions,
          handlers: {
            'image': function (value) {
              if (value) {
                currentUploadFile.value = { type: 'image' };
                document.querySelector('#quillEditorContainer .avatar-uploader input').click();
              } else {
                this.quill.format('image', false);
              }
            }
          }
        },
        history: {
          delay: 1000,
          maxStack: 50,
          userOnly: true
        }
      },
      theme: 'snow'
    });

    // 检查登录状态
    const checkLoginStatus = () => {
      if (!token.value) {
        isLoading.value = false; // 修复：在跳转前解除加载状态
        router.push({ path: '/login', query: { redirect: `/article/edit/${articleId.value || ''}` } });
        return false;
      }

      const storedUsername = localStorage.getItem('username');
      const storedUserAvatar = localStorage.getItem('userAvatar');
      const storedUserId = localStorage.getItem('userId');

      if (!storedUsername || !storedUserId) {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('userId');
        localStorage.removeItem('userAvatar');
        isLoading.value = false; // 修复：在跳转前解除加载状态
        router.push({ path: '/login', query: { redirect: `/article/edit/${articleId.value || ''}` } });
        ElMessage.warning('登录信息失效，请重新登录');
        return false;
      }

      isLoggedIn.value = true;
      username.value = storedUsername;
      userAvatar.value = storedUserAvatar || '/default-avatar.png';
      localStorage.setItem('currentUserId', storedUserId);
      return true;
    };

    // 标记是否新创建了攻略（用于取消时判断是否删除）
    const isNewArticleCreated = ref(false);

    // 创建攻略并设置ID
    const createArticleAndSetId = async () => {
      try {
        const createResponse = await axios.post(
          `${BASE_API}/article/createArticle`,
          { title: '无标题攻略', content: '', status: ARTICLE_STATUS.DRAFT },
          { headers: uploadHeaders.value }
        );

        if (!createResponse?.data || createResponse.data.code !== 200 || !createResponse.data.data) {
          throw new Error('创建攻略失败：' + (createResponse?.data?.message || '服务器无响应'));
        }

        const newArticleId = createResponse.data.data.id || createResponse.data.data.articleId || createResponse.data.data;
        if (!newArticleId || isNaN(Number(newArticleId))) {
          throw new Error('创建攻略失败：无效的攻略ID');
        }

        articleId.value = Number(newArticleId);
        localStorage.setItem('draftArticleId', articleId.value);
        isNewArticleCreated.value = true;
        ElMessage.success('攻略已自动创建');
        return true;
      } catch (error) {
        ElMessage.error(error.message);
        return false;
      }
    };

    // 处理媒体上传成功
    const handleMediaUploadSuccess = async (response, file) => {
      try {
        // 先校验 response 和 response.data 是否存在，避免 null 报错
        if (!response || !response.data) {
          throw new Error('上传失败：后端返回数据格式异常');
        }

       
        const resultCode = response.data.code;
        const resultData = response.data.data;
        const resultMsg = response.data.message || '操作失败';

        // 校验返回状态码
        if (resultCode !== 200) {
          throw new Error(resultMsg || '上传失败，请重试');
        }

        // 校验返回的媒体数据是否存在
        if (!resultData) {
          throw new Error('上传成功，但未获取到媒体信息');
        }

        // 正常业务逻辑
        const media = resultData;
        const quill = quillInstance.value;
        if (!quill) {
          ElMessage.error('编辑器未初始化，无法删除媒体');
          return;
        }
        if (quill) {
          const selection = quill.getSelection();
          const insertIndex = selection ? selection.index : quill.getLength();

          // 插入图片到富文本
          if (currentUploadFile.value.type === 'image') {
            quill.insertEmbed(insertIndex, 'image', media.mediaUrl);
            quill.setSelection(insertIndex + 3, 0); // 将光标设置到第二个换行符之后
          }
          // 如果是视频，不再插入到富文本中，只添加到媒体列表

          // 添加到媒体列表
          mediaList.value.push({
            mediaId: media.mediaId,          // 后端返回的媒体ID
            articleId: articleId.value,     // 关联攻略ID
            mediaType: currentUploadFile.value.type, // 媒体类型（image/video）
            mediaUrl: media.mediaUrl,       // 媒体URL
            mediaTitle: file.name,          // 原始文件名
            position: mediaList.value.length, // 媒体顺序
            videoDuration: media.videoDuration || 0, // 视频时长（后端返回）
            videoCoverUrl: media.videoCoverUrl || '/default-video-cover.png', // 视频封面
            extraInfo: { size: file.size, type: file.type }, // 文件额外信息
            status: media.status || 1,      // 媒体状态
            uploadUserId: media.uploadUserId || null, // 上传用户ID
            isRemoving: false,
            loadError: false
          });
        }

        mediaUploadStatus.value = '';
        ElMessage.success(`${currentUploadFile.value.type === 'image' ? '图片' : '视频'}上传成功`);
      } catch (error) {
        // 统一错误处理，避免崩溃
        mediaUploadStatus.value = '';
        mediaUploadError.value = error.message || '上传失败，请重试';
        ElMessage.error(mediaUploadError.value);
        // 刷新验证码（如果有）
        if (currentUploadFile.value) {
          retryMediaInfo.value = { file, type: currentUploadFile.value.type };
        }
      }
    };

    // 处理分片上传完成
    const handleChunkUploadComplete = async (mediaType) => {
      try {
        mediaUploadStatus.value = '正在合并分片...';
        const { file } = chunkUploadState.currentChunkInfo;
        const { uploadId, objectName, chunkETags, totalChunks } = chunkUploadState;
        const contentType = file.type || getMimeType(file.name, mediaType);

        const completeResponse = await axios.post(`${BASE_API}/articleMedia/chunk/complete`, {
          articleId: articleId.value,
          uploadId: uploadId,
          fileName: objectName,
          etagList: chunkETags,
          totalChunks: totalChunks,
          contentType: contentType,
          mediaTitle: file.name
        }, { headers: uploadHeaders.value });

        await handleMediaUploadSuccess(completeResponse, file);

        // 重置分片状态
        Object.assign(chunkUploadState, {
          isChunkUploading: false,
          currentChunkInfo: null,
          uploadId: '',
          objectName: '',
          totalChunks: 0,
          uploadedChunks: 0,
          chunkETags: [],
          chunkError: ''
        });
      } catch (error) {
        mediaUploadStatus.value = '';
        mediaUploadError.value = error.message || '分片合并失败，请重试';
        ElMessage.error(mediaUploadError.value);
      }
    };

    // 初始化分类列表
    const initCategories = async () => {
      try {
        const response = await axios.get(`${BASE_API}/category/getCategoryTree`, {
          headers: uploadHeaders.value
        });

        // 同样增强数据校验
        if (!response || !response.data || response.data.code !== 200 || !response.data.data) {
          throw new Error('加载分类失败：' + (response?.data?.message || '后端返回异常'));
        }

        // 后端返回格式为 { data: { list: [...] } }，提取分类列表
        const categoryList = response.data.data.list;
        categoryTree.value = categoryList;
      } catch (error) {
        console.error('加载分类失败:', error);
        categoryError.value = error.message || '加载分类失败，请联系管理员';
      }
    };

    // 重试媒体上传
    const retryMediaUpload = () => {
      if (retryMediaInfo.value) {
        const { file, type } = retryMediaInfo.value;
        currentUploadFile.value = { type };
        if (file.size > 5 * 1024 * 1024) {
          handleChunkUploadInit(file, type);
        } else {
          mediaUploadRef.value.submit(file);
        }
      }
    };

    // 取消分片上传
    const handleChunkUploadAbort = async () => {
      if (!chunkUploadState.uploadId) return;
      try {
        await axios.post(`${BASE_API}/articleMedia/chunk/abort`, {
          uploadId: chunkUploadState.uploadId,
          objectName: chunkUploadState.objectName
        }, { headers: uploadHeaders.value });
        chunkUploadState.isChunkUploading = false;
        mediaUploadStatus.value = '';
        ElMessage.success('已取消上传');
      } catch (error) {
        mediaUploadError.value = '取消上传失败：' + error.message;
        ElMessage.error(mediaUploadError.value);
      }
    };

    // 取消编辑
    let isCancelling = false;
    const handleCancel = async () => {
      if (isCancelling) return;
      isCancelling = true;

      try {
        await ElMessageBox.confirm(
          '确定要取消编辑吗？未保存的内容可能会丢失',
          '确认取消',
          { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
        );

        // 如果是预创建的攻略，则删除
        if (isNewArticleCreated.value && articleId.value) {
          try {
            await axios.delete(`${BASE_API}/article/deleteArticle/${articleId.value}`, {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
          } catch (e) {
            console.warn('删除草稿攻略失败:', e);
          }
        }

        router.push('/articles');
      } catch (_) {
        // 用户取消操作
      } finally {
        isCancelling = false;
      }
    };

    // 退出登录
    const handleLogout = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('userId');
      localStorage.removeItem('userAvatar');
      localStorage.removeItem('currentUserId');
      localStorage.removeItem('draftArticleId');
      if (articleId.value) localStorage.removeItem(`draft_${articleId.value}`);
      router.push('/login');
    };

    // 跳转个人主页
    const goToProfile = () => {
      const userId = localStorage.getItem('userId');
      if (userId) {
        router.push({ name: 'profile', params: { id: userId } });
      } else {
        ElMessage.error('用户不存在，无法跳转到个人主页');
      }
    };
    // 跳转编辑页
    const goToArticleEdit = () => router.push('/article/edit');
    // 跳转消息页
    const goToMessages = () => router.push('/messages');
    // 跳转通知页
    const goToNotifications = () => router.push('/notifications');

    // 媒体上传失败处理
    const handleMediaUploadError = (error) => {
      mediaUploadStatus.value = '';
      mediaUploadError.value = error.message || '上传失败，请重试';
      ElMessage.error(mediaUploadError.value);
      if (currentUploadFile.value) {
        retryMediaInfo.value = { file: error.file, type: currentUploadFile.value.type };
      }
    };

    // 2.1 上传前校验：确保 articleId 已存在
    // 媒体上传前校验
    const beforeMediaUpload = (file) => {
      if (!articleId.value) {
        mediaUploadError.value = '攻略未初始化（无攻略ID），无法上传媒体';
        ElMessage.error(mediaUploadError.value);
        return false;
      }

      mediaUploadStatus.value = `正在上传${currentUploadFile.value.type === 'image' ? '图片' : '视频'}...`;
      mediaUploadError.value = '';
      retryMediaInfo.value = { file, type: currentUploadFile.value.type };

      // 媒体类型校验
      const isImage = currentUploadFile.value.type === 'image' && ['image/jpeg', 'image/png', 'image/gif'].includes(file.type);
      const isVideo = currentUploadFile.value.type === 'video' && ['video/mp4', 'video/avi', 'video/mov'].includes(file.type);

      if (!isImage && !isVideo) {
        mediaUploadError.value = currentUploadFile.value.type === 'image' ? '请上传JPG/PNG/GIF图片' : '请上传MP4/AVI/MOV视频';
        return false;
      }

      // 大文件走分片上传
      if (file.size > 5 * 1024 * 1024) {
        handleChunkUploadInit(file, currentUploadFile.value.type);
        return false;
      }

      return true;
    };

    // 2.2 自定义上传请求：携带 articleId
    // 自定义媒体上传
    const handleCustomMediaUpload = async (options) => {
      // 检查攻略ID是否存在，如果不存在，则提示用户先保存
      console.log('articleId.value:', articleId.value);
      if (!articleId.value) {
        ElMessage.warning('请先保存攻略草稿，再上传媒体文件。');
        mediaUploadStatus.value = '';
        mediaUploadError.value = '攻略未初始化，无法上传媒体';
        return;
      }
      try {
        // 1. 确保攻略ID存在
        if (!articleId.value) {
          mediaUploadStatus.value = '正在初始化攻略...';
          // 尝试创建新攻略获取ID
          const createResponse = await axios.post(
            `${BASE_API}/article/createArticle`,
            {},
            { headers: uploadHeaders.value }
          );

          if (!createResponse?.data || createResponse.data.code !== 200 || !createResponse.data.data) {
            throw new Error('初始化攻略失败：' + (createResponse?.data?.message || '服务器响应异常'));
          }

          console.log('createArticle 接口响应数据:', createResponse.data);
          const newArticleId = createResponse.data.data.id || createResponse.data.data.articleId || createResponse.data.data;
          if (!newArticleId || isNaN(Number(newArticleId))) {
            throw new Error('初始化攻略失败：无效的攻略ID');
          }

          articleId.value = Number(newArticleId);
          localStorage.setItem('draftArticleId', articleId.value);
          mediaUploadStatus.value = '攻略初始化成功，开始上传文件...';
        }

        // 2. 处理文件上传
        const formData = new FormData();
        formData.append('mediaFile', options.file); 
        // articleId 存在且为有效数字
        if (!articleId.value || isNaN(Number(articleId.value))) {
          throw new Error('攻略不存在，无法上传媒体');
        }
        formData.append('articleId', articleId.value); // 确保转换为字符串
        formData.append('mediaType', currentUploadFile.value?.type || 'image');

        // 3. 上传文件
        mediaUploadStatus.value = '正在上传文件...';
        const response = await axios.post(
          `${BASE_API}/articleMedia/add`,
          formData,
          {
            headers: {
              ...uploadHeaders.value,
              'Content-Type': 'multipart/form-data'
            },
            onUploadProgress: (progressEvent) => {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              mediaUploadStatus.value = `正在上传文件...${progress}%`;
            }
          }
        );

        await handleMediaUploadSuccess(response, options.file);
      } catch (error) {
        console.error('媒体上传失败:', error);

        // 区分错误类型
        if (error.response) {
          // 服务器返回错误
          const status = error.response.status;
          const message = error.response.data?.message || '未知错误';

          if (status === 401) {
            mediaUploadError.value = '登录已过期，请重新登录';
            handleLogout(); // 登录过期，执行登出
          } else if (status === 413) {
            mediaUploadError.value = '文件太大，请选择小于5MB的文件';
          } else {
            mediaUploadError.value = `上传失败(${status}): ${message}`;
          }
        } else if (error.request) {
          // 网络错误
          mediaUploadError.value = '网络连接失败，请检查网络后重试';
        } else {
          // 其他错误
          mediaUploadError.value = error.message || '上传失败，请重试';
        }

        ElMessage.error(mediaUploadError.value);
        if (options.onError) {
          options.onError(new Error(mediaUploadError.value));
        }

        // 重置上传状态
        mediaUploadStatus.value = '';
      }
    };

 
    // 分片上传初始化
    const handleChunkUploadInit = async (file, mediaType) => {
      try {
        // articleId 存在且为有效数字
        if (!articleId.value || isNaN(Number(articleId.value))) {
          throw new Error('攻略ID无效，无法上传媒体分片');
        }
        chunkUploadState.isChunkUploading = true;
        chunkUploadState.currentChunkInfo = { file, mediaType };

        // 传递articleId到后端
        const contentType = file.type || getMimeType(file.name, mediaType);
        const initResponse = await axios.post(`${BASE_API}/articleMedia/chunk/init`, {
          articleId: Number(articleId.value),
          fileName: file.name,
          contentType: contentType,
          fileSize: file.size,
          mediaType: mediaType
        }, { headers: uploadHeaders.value });

        const initData = initResponse.data?.data;
        if (initData) {
          chunkUploadState.uploadId = initData.uploadId || '';
          chunkUploadState.objectName = initData.objectName || file.name;
          chunkUploadState.totalChunks = initData.totalChunks || Math.ceil(file.size / chunkUploadState.chunkSize);
        }

        await uploadAllChunks(mediaType);

      } catch (error) {
        mediaUploadError.value = error.message;
        chunkUploadState.isChunkUploading = false;
        ElMessage.error(mediaUploadError.value);
      }
    };

    // 上传所有分片
    const uploadAllChunks = async (mediaType) => {
      const { file } = chunkUploadState.currentChunkInfo;
      const { chunkSize, totalChunks, uploadId, objectName } = chunkUploadState;

      for (let i = 0; i < totalChunks; i++) {
        if (chunkUploadState.uploadedChunks > i) continue;

        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunkFile = file.slice(start, end);

        const formData = new FormData();
        formData.append('chunkFile', chunkFile);
        formData.append('uploadId', uploadId);
        formData.append('fileName', objectName);
        formData.append('chunkIndex', i);
        formData.append('totalChunks', totalChunks);
        formData.append('articleId', Number(articleId.value)); // 确保 articleId 为数字类型

        const response = await axios.post(`${BASE_API}/articleMedia/chunk/upload`, formData, {
          headers: uploadHeaders.value,
          onUploadProgress: (e) => {
            const progress = (i + e.loaded / e.total) / totalChunks;
            mediaUploadStatus.value = `分片上传中(${Math.round(progress * 100)}%)`;
          }
        });

        if (!response || !response.data || response.data.code !== 200) {
          throw new Error(`第${i + 1}个分片上传失败：` + (response?.data?.message || '未知错误'));
        }

        chunkUploadState.chunkETags[i] = response.data.data.etag;
        chunkUploadState.uploadedChunks = i + 1;
      }

      await handleChunkUploadComplete(mediaType);
    };

    // 保存草稿
    const saveAsDraft = async () => {
      if (!validateForm()) return;
      isSaving.value = true;
      try {
        const quillHtml = quillRef.value ? quillRef.value.getHTML() : '';
        let coverImage = coverImageUrl.value;
        if (coverFile.value) {
          const formData = new FormData();
          formData.append('coverFile', coverFile.value);
          formData.append('articleId', articleId.value || '');

          const coverResponse = await axios.post(`${BASE_API}/article/publish`, formData, {
            headers: { ...uploadHeaders.value, 'Content-Type': 'multipart/form-data' }
          });

          if (coverResponse.data.code === 200) {
            coverImage = coverResponse.data.data.coverUrl;
          }
        }

        const payload = {
          articleId: articleId.value || '',
          title: articleForm.title,
          content: quillHtml, // 替换为HTML字符串
          categoryId: articleForm.categoryId,
          tags: articleForm.tags.map(tag => ({
            articleId: articleId.value || '',
            tagName: tag,
            tagSlug: tag.toLowerCase().replace(/\s+/g, '-')
          })),
          cover_image: coverImage,
          status: ARTICLE_STATUS.DRAFT,
          updatedAt: new Date().toISOString()
        };

        const response = await axios.post(`${BASE_API}/article/publish`, payload, {
          headers: uploadHeaders.value
        });

        if (response.data.code === 200) {
          articleId.value = response.data.data.articleId;
          localStorage.setItem('draftArticleId', articleId.value);
          saveToLocalStorage();
          ElMessage.success('草稿保存成功');
        }
      } catch (error) {
        errorMsg.value = error.message || '保存失败，请重试';
      } finally {
        isSaving.value = false;
      }
    };

    // 发布攻略
    const handlePublish = async () => {
      if (!validateForm()) return;
      isSaving.value = true;
      try {
        const formData = new FormData();
        // 关键：获取HTML内容并传递
        const quillHtml = quillRef.value ? quillRef.value.getHTML() : '';
        formData.append('articleId', articleId.value || '');
        formData.append('title', articleForm.title);
        formData.append('content', quillHtml);
        formData.append('categoryId', articleForm.categoryId);
        articleForm.tags.forEach((tagString, index) => {
          formData.append(`tags[${index}].tagName`, tagString);
          formData.append(`tags[${index}].tagSlug`, tagString.toLowerCase().replace(/\s+/g, '-'));
        });
        formData.append('status', ARTICLE_STATUS.PENDING); // 待审核状态

        if (coverFile.value) {
          formData.append('file', coverFile.value); // 'file' 是后端期望的参数名
        }

        // 3. 调用发布接口
        const response = await axios.post(`${BASE_API}/article/publish`, formData, {
          headers: { ...uploadHeaders.value, 'Content-Type': 'multipart/form-data' }
        });

        if (response.data.code === 200) {
          localStorage.removeItem('draftArticleId');
          if (articleId.value) localStorage.removeItem(`draft_${articleId.value}`);

          // 保存标签
          console.log('准备保存标签, articleForm.tags:', articleForm.tags, 'response:', response.data);
          if (articleForm.tags && articleForm.tags.length > 0) {
            try {
              const savedArticleId = response.data.data?.articleId || response.data.data?.id || articleId.value;
              console.log('保存标签，攻略ID:', savedArticleId, '标签:', articleForm.tags);
              const tagResponse = await axios.post(
                `${BASE_API}/tags/saveWithArticle/${savedArticleId}`,
                articleForm.tags,
                { headers: uploadHeaders.value }
              );
              console.log('标签保存成功', tagResponse.data);
            } catch (e) {
              console.error('保存标签失败', e);
            }
          }

          ElMessage.success(isEdit.value ? '攻略更新成功' : '攻略提交审核成功');
          const userId = localStorage.getItem('userId');
          if (userId) {
            router.push({ name: 'profile', params: { id: userId } });
          } else {
            router.push('/'); // 如果获取不到用户ID，则跳转到首页
          }
        }
      } catch (error) {
        errorMsg.value = error.message || '发布失败，请重试';
      } finally {
        isSaving.value = false;
      }
    };

    // 获取当前用户ID
    const getCurrentUserId = () => localStorage.getItem('currentUserId') || null;
    // 保存到本地存储
    const saveToLocalStorage = () => {
      if (!articleId.value) return;
      const quill = quillInstance .value;
      localStorage.setItem(`draft_${articleId.value}`, JSON.stringify({
        title: articleForm.title,
        content: quill ? quill.root.innerHTML : articleForm.content,
        categoryId: articleForm.categoryId,
        tags: articleForm.tags,
        cover_image: coverImageUrl.value,
        status: ARTICLE_STATUS.DRAFT,
        updatedAt: new Date().toISOString()
      }));
    };

    // 校验标题
    const validateTitle = () => {
      if (!articleForm.title.trim()) {
        titleError.value = '请输入攻略标题';
        return false;
      }
      titleError.value = '';
      return true;
    };
    // 校验内容
    const validateContent = () => {
      const quillHtml = quillRef.value ? quillRef.value.getHTML() : '';
      const pureText = quillHtml.replace(/<[^>]+>/g, '').trim();
      if (!pureText) {
        contentError.value = '请输入攻略内容';
        return false;
      }
      contentError.value = '';
      return true;
    };
    // 校验分类
    const validateCategory = () => {
      if (!articleForm.categoryId || isNaN(Number(articleForm.categoryId))) {
        categoryError.value = '请选择有效的攻略分类';
        return false;
      }
      articleForm.categoryId = Number(articleForm.categoryId);
      categoryError.value = '';
      return true;
    };
    // 校验标签
    const validateTags = () => {
      if (articleForm.tags.some(tag => !tag.trim())) {
        tagError.value = '标签不能为空';
        return false;
      }
      tagError.value = '';
      return true;
    };
    // 校验整个表单
    const validateForm = () => [validateTitle(), validateContent(), validateCategory(), validateTags()].every(v => v);

    // Quill编辑器准备
    const onQuillReady = (quill) => {
      // 注册自定义 Video Blot，确保 Quill 正确处理视频元素
      const BlockEmbed = quill.constructor.import('blots/block/embed');
      class VideoBlot extends BlockEmbed {
        static blotName = 'video';
        static tagName = 'div';
        static create(value) {
          const node = super.create(value); // 创建 div 节点
          const video = document.createElement('video'); // 创建 video 元素
          video.setAttribute('src', value);
          video.setAttribute('controls', '');
          video.setAttribute('playsinline', '');
          video.setAttribute('webkit-playsinline', '');
          video.setAttribute('x5-playsinline', '');
          video.setAttribute('preload', 'auto');
          video.setAttribute('width', '100%');
          video.setAttribute('height', 'auto');
          node.appendChild(video); // 将 video 元素添加到 div 节点中
          node.contentEditable = false; // 标记为不可编辑
          return node;
        }
        static value(node) {
          return node.querySelector('video').getAttribute('src'); // 从 video 元素中获取 src
        }
      }
      quill.constructor.register(VideoBlot);

      // 定义并注册 VideoIdentifierBlot
      class VideoIdentifierBlot extends BlockEmbed {
        static blotName = 'videoIdentifier';
        static tagName = 'div';
        static className = 'ql-video-identifier'; // 用于样式化

        static get length() {
          return 1;
        }

        static create(value) {
          const node = super.create();
          node.textContent = `[视频: ${value.fileName}]`;
          node.dataset.mediaUrl = value.mediaUrl; // 存储视频URL，以便后续删除时匹配
          node.contentEditable = false; // 标记为不可编辑，使其成为原子单元
          return node;
        }

        static value(node) {
          return {
            mediaUrl: node.dataset.mediaUrl,
            fileName: node.textContent.substring(4, node.textContent.length - 1) // 从文本中提取文件名
          };
        }
      }
      quill.constructor.register(VideoIdentifierBlot);

      // 1. 强制赋值实例
      quillInstance.value = quill;

      // 2. 强制启用编辑器
      quill.enable(true);
      console.log('编辑器启用状态：', quill.isEnabled());

      // 3. 绑定文本变化事件（确保只绑定一次）
      if (!isTextChangeBound.value) {
        quill.on('text-change', (delta, oldContents, source) => {
          if (source === 'user') { // 仅同步用户输入
            // 移除手动更新 articleForm.content，让 v-model:content 处理
            saveToLocalStorage();
          }
        });
        isTextChangeBound.value = true;
        console.log('文本变化事件绑定成功');
      }

      // 4. 初始化编辑器内容
      const emptyContent = '<p><br></p>';
      const initContent = isEdit.value && articleForm.content ? String(articleForm.content) : emptyContent;
      quill.pasteHTML(initContent);
      console.log('编辑器初始内容设置完成');
    };

    // 封面上传前校验
    const beforeCoverUpload = (file) => {

      const isImage = ['image/jpeg', 'image/png', 'image/gif'].includes(file.type);
      const isLt5M = file.size / 1024 / 1024 < 5;
      if (!isImage) { ElMessage.error('请上传JPG/PNG/GIF图片'); return false; }
      if (!isLt5M) { ElMessage.error('封面图片大小不能超过5MB'); return false; }
      return true;
    };
    // 处理封面变化
    const handleCoverChange = (file) => {
      coverFile.value = file.raw;
      coverImageUrl.value = URL.createObjectURL(file.raw);
      saveToLocalStorage();
    };
    // 移除封面
    const handleCoverRemove = () => {
      if (coverFile.value) URL.revokeObjectURL(coverImageUrl.value);
      coverFile.value = null;
      coverImageUrl.value = '';
      saveToLocalStorage();
    };

    // 显示标签输入框
    const showTagInput = () => {
      inputTagVisible.value = true;
      nextTick(() => tagInputRef.value.focus());
    };
    // 添加标签
    const addTag = () => {
      const tag = inputTagValue.value.trim();
      if (tag && !articleForm.tags.includes(tag) && articleForm.tags.length < 5) {
        articleForm.tags.push(tag);
        validateTags();
        saveToLocalStorage();
      }
      inputTagValue.value = '';
      inputTagVisible.value = false;
    };
    // 移除标签
    const removeTag = (tag) => {
      articleForm.tags = articleForm.tags.filter(t => t !== tag);
      saveToLocalStorage();
    };

    // 处理媒体加载失败
    const handleMediaLoadError = (mediaId) => {
      const media = mediaList.value.find(m => m.mediaId === mediaId);
      if (media) media.loadError = true;
    };
    // 删除媒体
    const removeMedia = async (mediaId) => {
      const media = mediaList.value.find(m => m.mediaId === mediaId);
      if (!media) {
        ElMessage.warning('未找到要删除的媒体');
        return;
      }

      media.isRemoving = true;
      try {
        const currentUserId = getCurrentUserId();
        if (!currentUserId) throw new Error('用户未登录，无法删除媒体');

        const response = await axios.delete(
          `${BASE_API}/articleMedia/delete/${mediaId}`,
          { headers: uploadHeaders.value }
        );

        if (response.data.code === 200) {
          mediaList.value = mediaList.value.filter(m => m.mediaId !== mediaId);
          ElMessage.success('媒体已删除');

          // 从Quill编辑器中删除对应的媒体
          const quill = quillInstance.value;
          if (!quill) {
            ElMessage.error('编辑器未初始化，无法删除媒体');
            return;
          }
          if (quill) {
            const ops = quill.getContents().ops;
            let currentQuillIndex = 0; // Quill 内部的索引
            let mediaFoundAndDeleted = false;
            let deleteIndex = -1;

            for (let i = 0; i < ops.length; i++) {
              const op = ops[i];
              if (op.insert && typeof op.insert === 'object') {
                const mediaType = Object.keys(op.insert)[0];
                const mediaUrl = op.insert[mediaType];

                // 检查是否是图片或视频，并且 URL 匹配
                if ((mediaType === 'image' || mediaType === 'video') && mediaUrl === media.mediaUrl) {
                  deleteIndex = currentQuillIndex; // 记录媒体 Blot 的起始位置
                  mediaFoundAndDeleted = true;
                  break;
                }
                currentQuillIndex += 1; // 对于嵌入式 Blot (图片/视频)，Quill 内部长度为 1
              } else if (typeof op.insert === 'string') {
                currentQuillIndex += op.insert.length; // 对于文本，累加文本长度
              }
            }

            if (mediaFoundAndDeleted && deleteIndex !== -1) {
              // 精确删除媒体 Blot (长度为 1)
              quill.deleteText(deleteIndex, 1);
              // 立即更新 articleForm.content
              articleForm.content = String(quill.root.innerHTML);
              // 设置光标位置到删除点，避免选中整个文档
              quill.setSelection(Math.min(deleteIndex, quill.getLength()), 0);
            }
          }
        } else {
          throw new Error(response.data.message || '删除失败');
        }
      } catch (error) {
        ElMessage.error(error.message);
      } finally {
        media.isRemoving = false;
      }
    };

    // 初始化攻略数据
    const initArticleData = async () => {
      try {
        let isNewArticleCreated = false; // 标记是否新创建了攻略

        if (!articleId.value) {
          const savedDraftId = localStorage.getItem('draftArticleId');
          if (savedDraftId) {
           const savedDraft = localStorage.getItem(`draft_${savedDraftId}`);
            if (savedDraft) {
             articleId.value = Number(savedDraftId);
            }
          }
          } 
           // 如果没有 articleId，则自动创建攻略
          if (!articleId.value) {
          const created = await createArticleAndSetId();
          if (!created) {
            // 如果创建失败，则直接返回，不进行后续加载
            isLoading.value = false;
            return;
          }
          isNewArticleCreated = true; // 标记为新创建的攻略
        }

        // 检查本地是否有草稿
        const localDraft = localStorage.getItem(`draft_${articleId.value}`);
        if (localDraft) {
          ElMessageBox.confirm('检测到本地有未保存的草稿，是否加载？', '提示', {
            confirmButtonText: '加载',
            cancelButtonText: '放弃',
            type: 'warning'
          }).then(() => {
            const draftData = JSON.parse(localDraft);
            articleForm.title = draftData.title;
            articleForm.content = String(draftData.content);
            console.log(draftData.content)
            articleForm.categoryId = draftData.categoryId;
            articleForm.tags = draftData.tags;
            coverImageUrl.value = draftData.cover_image;
            isEdit.value = true;
            const quill = quillInstance.value;
            if (quill && draftData.content) { 
              quill.pasteHTML(articleForm.content);
            }
            ElMessage.success('草稿已加载');
          }).catch(() => {
            localStorage.removeItem('draftArticleId');
            localStorage.removeItem(`draft_${articleId.value}`);

            // 放弃草稿，不再从服务器加载
          });
        } else if (!isNewArticleCreated) { // 没有草稿，且不是新创建的攻略，不再从服务器加载
          // fetchArticleData(); // 根据用户指示，暂时不查询攻略数据
        }
      } catch (error) {
        errorMsg.value = error.message;
        ElMessage.error(errorMsg.value);
        router.push('/articles');
      } finally {
        isLoading.value = false;
        console.log('页面加载状态解除，编辑器可交互');
      }
    };

    // 页面挂载初始化
    onMounted(async () => {

      try {
        const isLogin = checkLoginStatus();
        if (!isLogin) return;

        // 增加Quill模块存在性校验
        if (!window.Quill && !quillModule) {
          throw new Error('Quill模块未加载，请检查引入路径');
        }
        console.log('Quill模块加载正常', quillModule.version);

        await initArticleData();
        await initCategories();
      } catch (error) {
        console.error('初始化失败:', error);
        errorMsg.value = error.message || '页面初始化失败';
        ElMessage.error(errorMsg.value);
        isLoading.value = false; // 失败时也解除加载
      }
    })
    onUnmounted(() => {
      if (coverFile.value && coverImageUrl.value) URL.revokeObjectURL(coverImageUrl.value);
      if (quillInstance.value && isTextChangeBound.value) {
        quillInstance.value.off('text-change');
      }
    });

    // 返回方法与状态
    return {
      isLoggedIn, username, userAvatar, isEdit, isLoading, isSaving,
      errorMsg, mediaUploadStatus, mediaUploadError,
      titleError, contentError, categoryError, tagError,
      coverImageUrl, inputTagVisible, inputTagValue, categoryTree,
      mediaList, chunkUploadState, articleForm, editorOptions,
      uploadHeaders, uploadMediaUrl,
      tagInputRef, quillRef, mediaUploadRef, videoUploadRef, // Added videoUploadRef
      addTag,
      beforeCoverUpload,
      beforeMediaUpload,
      formatDuration: (seconds) => {
        if (!seconds) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      },
      formatFileSize: (bytes) => {
        if (!bytes) return '未知大小';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
      },
      goToArticleEdit,
      goToMessages,
      goToNotifications,
      goToProfile,
      handleCancel,
      handleChunkUploadAbort,
      handleCoverChange,
      handleCoverRemove,
      handleLogout,
      handleMediaLoadError,
      handleMediaUploadError,
      handleMediaUploadSuccess,
      handlePublish,
      handleVideoUpload,
      onQuillReady,
      removeMedia,
      removeTag,
      retryMediaUpload,
      saveAsDraft,
      showTagInput,
      validateCategory,
      validateTags,
      validateTitle,
      handleCustomMediaUpload,

    };
  }
};
</script>

<style scoped>
.article-edit-page {
  min-height: 100vh;
  background-color: #f9fafb;
}

.nav-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 60px;
  background-color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.logo {
  font-size: 20px;
  font-weight: bold;
  color: #165DFF;
}

.nav-links {
  display: flex;
  gap: 30px;
}

.nav-link {
  color: #333;
  text-decoration: none;
  font-size: 14px;
  transition: color 0.2s;
}

.nav-link:hover {
  color: #165DFF;
}

.auth-buttons {
  display: flex;
  gap: 15px;
}

.auth-button {
  padding: 6px 16px;
  border-radius: 4px;
  text-decoration: none;
  font-size: 14px;
  transition: all 0.2s;
}

.login-button {
  color: #165DFF;
  border: 1px solid #165DFF;
}

.register-button {
  color: #fff;
  background-color: #165DFF;
  border: 1px solid #165DFF;
}

.user-profile {
  display: flex;
  align-items: center;
}

.avatar-wrapper {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
}

.username {
  margin-left: 8px;
  font-size: 14px;
  color: #333;
}

.article-edit-container {
  max-width: 1000px;
  margin: 20px auto;
  padding: 0 20px;
}

.error-alert {
  margin-bottom: 20px;
}

.article-edit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.article-edit-header h1 {
  font-size: 24px;
  color: #1f2937;
}

.article-actions {
  display: flex;
  gap: 10px;
}

.article-form {
  background-color: #fff;
  border-radius: 8px;
  padding: 30px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

.form-group {
  margin-bottom: 25px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #374151;
}

.error-text {
  margin-top: 5px;
  font-size: 12px;
  color: #f56c6c;
}

.cover-uploader {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  transition: border-color 0.2s;
}

.cover-uploader:hover {
  border-color: #165DFF;
}

.cover-placeholder {
  padding: 40px 20px;
  text-align: center;
}

.cover-preview {
  position: relative;
  width: 100%;
  border-radius: 6px;
  overflow: hidden;
}

.cover-image {
  width: 100%;
  height: auto;
  display: block;
}

.cover-remove {
  position: absolute;
  right: 10px;
  top: 10px;
  background-color: rgba(0, 0, 0, 0.5);
  color: #fff;
  border-radius: 4px;
}

.editor-container {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
}

.editor {
  min-height: 400px;
}

.media-upload-tip {
  padding: 8px 12px;
  background-color: #f0f9ff;
  color: #165DFF;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.media-upload-error {
  padding: 8px 12px;
  background-color: #fff2f0;
  color: #f56c6c;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.article-tag {
  margin-right: 8px;
  margin-bottom: 8px;
}

.tag-input {
  width: 120px;
  margin-left: 8px;
  margin-bottom: 8px;
  vertical-align: middle;
}

.media-preview-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 10px;
}

.media-preview-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  width: calc(50% - 8px);
  box-sizing: border-box;
}

.media-thumb {
  width: 80px;
  height: 60px;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.image-thumb,
.video-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-duration {
  position: absolute;
  bottom: 2px;
  right: 2px;
  background-color: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 2px;
}

.media-info {
  flex: 1;
  min-width: 0;
}

.media-title {
  margin: 0 0 4px 0;
  font-size: 14px;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.media-size {
  margin: 0;
  font-size: 12px;
  color: #6b7280;
}

.media-remove-btn {
  color: #f56c6c;
  padding: 0;
  height: auto;
}

.page-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
}

.custom-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #165DFF;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .media-preview-item {
    width: 100%;
  }

  .article-edit-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }

  .article-actions {
    width: 100%;
    justify-content: space-between;
  }
}
</style>