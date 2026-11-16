<template>
  <div class="upload-page">
    <div class="upload-card">
      <div class="header">
        <el-icon class="header-icon">
          <PictureFilled />
        </el-icon>
        <h1>图片上传</h1>
        <p>支持 jpg、png、gif 等常见图片格式</p>
      </div>

      <div class="upload-area" @dragover.prevent @drop.prevent="handleDrop">
        <label class="upload-label">
          <input type="file" accept="image/*" class="hidden-input" @change="handleFileChange">

          <template v-if="!previewUrl">
            <el-icon class="upload-icon">
              <UploadFilled />
            </el-icon>
            <p class="upload-text">点击或拖拽图片到此处上传</p>
            <p class="upload-hint">支持 jpg、png、gif 格式，大小不超过 10MB</p>
          </template>

          <template v-else>
            <img :src="croppedUrl || previewUrl" class="preview-image" alt="预览">
            <div class="preview-actions">
              <button class="action-btn" @click.stop="openCropDialog">
                <el-icon>
                  <Crop />
                </el-icon>
                <span>裁剪</span>
              </button>
              <button class="action-btn delete" @click.stop="removeImage">
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
      </div>

      <button class="upload-btn" @click="uploadImage" :disabled="!selectedFile || uploading">
        <span v-if="uploading">上传中...</span>
        <span v-else>确认上传</span>
        <el-icon v-if="!uploading">
          <Upload />
        </el-icon>
      </button>

      <div class="result-area" v-if="uploadedUrl">
        <p class="result-label">上传成功，图片地址：</p>
        <div class="url-box">
          <input type="text" :value="uploadedUrl" readonly class="url-input">
          <button class="copy-btn" @click="copyUrl">复制</button>
        </div>
      </div>

      <div class="history-section" v-if="uploadHistory.length > 0">
        <h3>上传历史</h3>
        <div class="history-list">
          <div class="history-item" v-for="(item, index) in uploadHistory" :key="index" @click="copyUrl(item)">
            <img :src="item" class="history-thumb" alt="历史图片">
          </div>
        </div>
      </div>
    </div>

    <el-dialog v-model="cropDialogVisible" title="裁剪图片" width="600px" :close-on-click-modal="false">
      <div class="crop-container">
        <img ref="cropperImg" :src="previewUrl" alt="裁剪图片">
      </div>
      <template #footer>
        <div class="crop-actions">
          <el-button @click="cancelCrop">取消</el-button>
          <el-button type="primary" @click="confirmCrop">确认裁剪</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { PictureFilled, UploadFilled, Delete, Upload, Crop } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import axios from "axios";
import { ref, onMounted, nextTick } from "vue";
import Cropper from "cropperjs";
import "cropperjs/dist/cropper.css";

export default {
  components: {
    PictureFilled,
    UploadFilled,
    Delete,
    Upload,
    Crop
  },
  setup() {
    const selectedFile = ref(null);
    const previewUrl = ref(null);
    const croppedUrl = ref("");
    const uploadedUrl = ref("");
    const uploading = ref(false);
    const uploadHistory = ref([]);
    const cropDialogVisible = ref(false);
    const cropperImg = ref(null);
    const cropperInstance = ref(null);

    const validateAndSetFile = (file) => {
      if (file.size > 10 * 1024 * 1024) {
        ElMessage.error("文件大小不能超过 10MB");
        return;
      }
      selectedFile.value = file;
      previewUrl.value = URL.createObjectURL(file);
      uploadedUrl.value = "";
      croppedUrl.value = "";
    };

    const handleFileChange = (event) => {
      const file = event.target.files[0];
      if (file) {
        validateAndSetFile(file);
      }
    };

    const handleDrop = (event) => {
      const file = event.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        validateAndSetFile(file);
      } else {
        ElMessage.error("请上传图片文件");
      }
    };

    onMounted(() => {
      const history = localStorage.getItem("uploadHistory");
      if (history) {
        uploadHistory.value = JSON.parse(history).slice(0, 10);
      }
    });

    const removeImage = () => {
      selectedFile.value = null;
      previewUrl.value = null;
      croppedUrl.value = "";
    };

    const openCropDialog = () => {
      if (!previewUrl.value) return;
      cropDialogVisible.value = true;
      nextTick(() => {
        if (cropperImg.value) {
          if (cropperInstance.value) {
            cropperInstance.value.destroy();
          }
          cropperInstance.value = new Cropper(cropperImg.value, {
            aspectRatio: NaN,
            viewMode: 1,
            autoCropArea: 0.8,
          });
        }
      });
    };

    const confirmCrop = () => {
      if (!cropperInstance.value) return;
      const canvas = cropperInstance.value.getCroppedCanvas({
        fillColor: '#fff',
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
      });
      if (canvas) {
        canvas.toBlob((blob) => {
          const file = new File([blob], selectedFile.value?.name || 'image.jpg', { type: 'image/jpeg' });
          selectedFile.value = file;
          croppedUrl.value = URL.createObjectURL(blob);
          cropDialogVisible.value = false;
          if (cropperInstance.value) {
            cropperInstance.value.destroy();
            cropperInstance.value = null;
          }
        }, 'image/jpeg', 0.95);
      }
    };

    const cancelCrop = () => {
      cropDialogVisible.value = false;
      if (cropperInstance.value) {
        cropperInstance.value.destroy();
        cropperInstance.value = null;
      }
    };

    const uploadImage = async () => {
      if (!selectedFile.value) {
        ElMessage.warning("请先选择文件");
        return;
      }

      uploading.value = true;
      try {
        const formData = new FormData();
        formData.append("file", selectedFile.value);

        const response = await axios.post(
          "http://localhost:8080/upload/image",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );

        if (response.data.code === 200) {
          uploadedUrl.value = response.data.data;
          ElMessage.success("上传成功");

          const history = JSON.parse(localStorage.getItem("uploadHistory") || "[]");
          history.unshift(uploadedUrl.value);
          localStorage.setItem("uploadHistory", JSON.stringify(history.slice(0, 20)));
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
      return (bytes / (1024 * 1024)).toFixed(2) + " MB";
    };

    return {
      selectedFile,
      previewUrl,
      croppedUrl,
      uploadedUrl,
      uploading,
      uploadHistory,
      cropDialogVisible,
      cropperImg,
      handleFileChange,
      handleDrop,
      removeImage,
      openCropDialog,
      confirmCrop,
      cancelCrop,
      uploadImage,
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
  max-width: 520px;
  padding: 2rem;
}

.header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.header-icon {
  font-size: 40px;
  color: #6366f1;
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
  min-height: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.upload-area:hover {
  border-color: #6366f1;
  background: #f8f9ff;
}

.upload-label {
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 180px;
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

.preview-image {
  max-width: 100%;
  max-height: 200px;
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

.upload-btn {
  width: 100%;
  margin-top: 1rem;
  padding: 0.9rem;
  background: linear-gradient(105deg, #4f46e5, #7c3aed);
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
  box-shadow: 0 5px 12px -4px rgba(79, 70, 229, 0.5);
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
  width: 60px;
  height: 60px;
  border-radius: 0.5rem;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.history-item:hover {
  border-color: #6366f1;
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

.crop-container {
  width: 100%;
  height: 400px;
  overflow: hidden;
}

.crop-container img {
  max-width: 100%;
}

.crop-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>