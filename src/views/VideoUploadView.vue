<template>
  <div class="upload-page">
    <div class="upload-card">
      <div class="header">
        <el-icon class="header-icon">
          <VideoCameraFilled />
        </el-icon>
        <h1>视频上传</h1>
        <p>支持 mp4、webm、mov 等常见视频格式</p>
      </div>

      <div class="article-id-input">
        <label>关联文章ID：</label>
        <input type="number" v-model="articleId" placeholder="请输入文章ID（必填）" class="id-input">
      </div>

      <div class="upload-area" @dragover.prevent @drop.prevent="handleDrop">
        <label class="upload-label">
          <input type="file" accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,.mp4,.webm,.mov,.avi"
            class="hidden-input" @change="handleFileChange">

          <template v-if="!previewUrl">
            <el-icon class="upload-icon">
              <UploadFilled />
            </el-icon>
            <p class="upload-text">点击或拖拽视频到此处上传</p>
            <p class="upload-hint">支持 mp4、webm、mov 格式，大小不超过 200MB</p>
          </template>

          <template v-else>
            <video :src="previewUrl" class="preview-video" controls></video>
            <div class="preview-actions">
              <button class="action-btn delete" @click.stop="removeVideo">
                <el-icon>
                  <Delete />
                </el-icon>
                <span>删除</span>
              </button>
            </div>
          </template>
        </label>
      </div>

      <div class="upload-info" v-if="selectedFile">
        <div class="file-info">
          <span class="file-name">{{ selectedFile.name }}</span>
          <span class="file-size">{{ formatFileSize(selectedFile.size) }}</span>
        </div>
        <div class="progress-bar" v-if="uploading">
          <div class="progress-fill" :style="{ width: uploadProgress + '%' }"></div>
        </div>
        <div class="upload-status" v-if="uploading">
          <span>上传进度: {{ uploadProgress }}%</span>
        </div>
      </div>

      <button class="upload-btn" @click="uploadVideo" :disabled="!selectedFile || uploading">
        <span v-if="uploading">上传中...</span>
        <span v-else>确认上传</span>
        <el-icon v-if="!uploading">
          <Upload />
        </el-icon>
      </button>

      <div class="result-area" v-if="uploadedUrl">
        <p class="result-label">上传成功，视频地址：</p>
        <div class="url-box">
          <input type="text" :value="uploadedUrl" readonly class="url-input">
          <button class="copy-btn" @click="copyUrl">复制</button>
        </div>
      </div>

      <div class="history-section" v-if="uploadHistory.length > 0">
        <h3>上传历史</h3>
        <div class="history-list">
          <div class="history-item" v-for="(item, index) in uploadHistory" :key="index" @click="copyUrl(item)">
            <video :src="item" class="history-thumb" muted></video>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { VideoCameraFilled, UploadFilled, Delete, Upload } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import axios from "axios";
import { ref, onMounted } from "vue";

export default {
  components: {
    VideoCameraFilled,
    UploadFilled,
    Delete,
    Upload
  },
  setup() {
    const selectedFile = ref(null);
    const previewUrl = ref(null);
    const uploadedUrl = ref("");
    const uploading = ref(false);
    const uploadProgress = ref(0);
    const uploadHistory = ref([]);
    const articleId = ref("");

    const validateAndSetFile = (file) => {
      const maxSize = 200 * 1024 * 1024;
      if (file.size > maxSize) {
        ElMessage.error("文件大小不能超过 200MB");
        return;
      }
      const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
      const allowedExts = ['.mp4', '.webm', '.mov', '.avi'];
      const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

      if (!allowedTypes.includes(file.type) && !allowedExts.includes(ext)) {
        ElMessage.error("不支持的视频格式，请上传 mp4、webm、mov 或 avi 格式");
        return;
      }

      selectedFile.value = file;
      previewUrl.value = URL.createObjectURL(file);
      uploadedUrl.value = "";
      uploadProgress.value = 0;
    };

    const handleFileChange = (event) => {
      const file = event.target.files[0];
      if (file) {
        validateAndSetFile(file);
      }
    };

    const handleDrop = (event) => {
      const file = event.dataTransfer.files[0];
      if (file && file.type.startsWith("video/")) {
        validateAndSetFile(file);
      } else {
        ElMessage.error("请上传视频文件");
      }
    };

    onMounted(() => {
      const history = localStorage.getItem("videoUploadHistory");
      if (history) {
        uploadHistory.value = JSON.parse(history).slice(0, 10);
      }
    });

    const removeVideo = () => {
      if (previewUrl.value) {
        URL.revokeObjectURL(previewUrl.value);
      }
      selectedFile.value = null;
      previewUrl.value = null;
    };

    const uploadVideo = async () => {
      if (!selectedFile.value) {
        ElMessage.warning("请先选择文件");
        return;
      }
      if (!articleId.value) {
        ElMessage.warning("请输入关联的文章ID");
        return;
      }

      uploading.value = true;
      uploadProgress.value = 0;

      try {
        const formData = new FormData();
        formData.append("mediaFile", selectedFile.value);
        formData.append("articleId", articleId.value);

        const response = await axios.post(
          "http://localhost:8080/articleMedia/add",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
            onUploadProgress: (progressEvent) => {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              uploadProgress.value = percent;
            },
          }
        );

        if (response.data.code === 200) {
          const mediaId = response.data.data.id;
          uploadedUrl.value = `http://localhost:8080/articleMedia/${mediaId}`;
          ElMessage.success("上传成功");

          const history = JSON.parse(localStorage.getItem("videoUploadHistory") || "[]");
          history.unshift(uploadedUrl.value);
          localStorage.setItem("videoUploadHistory", JSON.stringify(history.slice(0, 20)));
          uploadHistory.value = history.slice(0, 10);
        } else {
          ElMessage.error(response.data.message || "上传失败");
        }
      } catch (error) {
        console.error("上传错误:", error);
        ElMessage.error("上传失败，请稍后重试");
      } finally {
        uploading.value = false;
      }
    };

    const copyUrl = (url = uploadedUrl.value) => {
      if (url) {
        navigator.clipboard.writeText(url).then(() => {
          ElMessage.success("链接已复制");
        });
      }
    };

    const formatFileSize = (bytes) => {
      if (bytes < 1024) return bytes + " B";
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
      if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + " MB";
      return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
    };

    return {
      selectedFile,
      previewUrl,
      uploadedUrl,
      uploading,
      uploadProgress,
      uploadHistory,
      articleId,
      handleFileChange,
      handleDrop,
      removeVideo,
      uploadVideo,
      copyUrl,
      formatFileSize,
    };
  },
};
</script>

<style scoped>
.upload-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: linear-gradient(135deg, #f5f7fe 0%, #e9eefa 100%);
}

.upload-card {
  background: rgba(255, 255, 255, 0.96);
  border-radius: 1.5rem;
  box-shadow: 0 25px 45px -12px rgba(0, 0, 0, 0.15);
  width: 100%;
  max-width: 600px;
  padding: 2rem;
}

.header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.article-id-input {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.article-id-input label {
  font-size: 0.9rem;
  color: #475569;
  font-weight: 500;
}

.id-input {
  padding: 0.5rem 0.8rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.9rem;
  width: 180px;
  outline: none;
  transition: border-color 0.2s;
}

.id-input:focus {
  border-color: #f59e0b;
}

.header-icon {
  font-size: 40px;
  color: #f59e0b;
  margin-bottom: 0.5rem;
}

.header h1 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.header p {
  font-size: 0.85rem;
  color: #64748b;
  margin-top: 0.3rem;
}

.upload-area {
  border: 2px dashed #cbd5e1;
  border-radius: 1rem;
  padding: 2.5rem 1rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.upload-area:hover {
  border-color: #f59e0b;
  background: #fffbeb;
}

.upload-label {
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 200px;
}

.hidden-input {
  display: none;
}

.upload-icon {
  font-size: 48px;
  color: #94a3b8;
  margin-bottom: 0.5rem;
}

.upload-text {
  font-size: 1rem;
  color: #475569;
  font-weight: 500;
  margin: 0.5rem 0;
}

.upload-hint {
  font-size: 0.8rem;
  color: #94a3b8;
  margin: 0;
}

.preview-video {
  max-width: 100%;
  max-height: 250px;
  border-radius: 0.5rem;
  object-fit: contain;
}

.preview-actions {
  position: absolute;
  bottom: 0.5rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 0.5rem;
  opacity: 0;
  transition: opacity 0.3s;
}

.upload-area:hover .preview-actions {
  opacity: 1;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.4rem 0.8rem;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 0.2s;
}

.action-btn:hover {
  background: rgba(0, 0, 0, 0.8);
}

.action-btn.delete:hover {
  background: #dc2626;
}

.action-btn .el-icon {
  font-size: 14px;
}

.upload-info {
  margin-top: 1rem;
}

.file-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.8rem;
  background: #f1f5f9;
  border-radius: 0.5rem;
  font-size: 0.85rem;
}

.file-name {
  color: #334155;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 70%;
}

.file-size {
  color: #64748b;
}

.progress-bar {
  margin-top: 0.5rem;
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
  transition: width 0.3s ease;
}

.upload-status {
  margin-top: 0.3rem;
  font-size: 0.8rem;
  color: #f59e0b;
}

.upload-btn {
  width: 100%;
  margin-top: 1rem;
  padding: 0.9rem;
  background: linear-gradient(105deg, #f59e0b, #d97706);
  border: none;
  border-radius: 1rem;
  color: white;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.25s;
}

.upload-btn:hover:not(:disabled) {
  transform: scale(0.98);
  box-shadow: 0 5px 12px -4px rgba(245, 158, 11, 0.5);
}

.upload-btn:disabled {
  background: #94a3b8;
  cursor: not-allowed;
}

.result-area {
  margin-top: 1.5rem;
  padding: 1rem;
  background: #f0fdf4;
  border-radius: 0.8rem;
  border: 1px solid #bbf7d0;
}

.result-label {
  font-size: 0.85rem;
  color: #166534;
  margin: 0 0 0.5rem 0;
}

.url-box {
  display: flex;
  gap: 0.5rem;
}

.url-input {
  flex: 1;
  padding: 0.5rem 0.8rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.8rem;
  color: #374151;
  background: white;
}

.copy-btn {
  padding: 0.5rem 1rem;
  background: #16a34a;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.copy-btn:hover {
  background: #15803d;
}

.history-section {
  margin-top: 1.5rem;
}

.history-section h3 {
  font-size: 0.9rem;
  color: #64748b;
  margin: 0 0 0.8rem 0;
}

.history-list {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
}

.history-item {
  flex-shrink: 0;
  width: 80px;
  height: 60px;
  border-radius: 0.5rem;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.history-item:hover {
  border-color: #f59e0b;
  transform: scale(1.05);
}

.history-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

@media (max-width: 500px) {
  .upload-card {
    padding: 1.5rem;
  }

  .header h1 {
    font-size: 1.3rem;
  }
}
</style>