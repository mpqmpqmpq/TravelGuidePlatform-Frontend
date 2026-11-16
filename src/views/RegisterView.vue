<template>
  <div class="register-container">
    <div class="register-box">

      <div class="register-header">
        <h2>注册</h2>
        <p class="register-subtitle">欢迎加入我们！</p>
      </div>

      <form @submit.prevent="handleRegister">
        <!-- 头像上传区域 -->
        <div class="form-group avatar-upload">
          <div class="upload-section">
            <div class="upload-button-container">
              <label for="avatar" class="upload-button">
                <el-icon>
                  <Upload />
                </el-icon>
                <span>选择头像</span>
              </label>
              <input type="file" id="avatar" @change="handleFileChange" accept="image/*" class="hidden-input">
            </div>

            <!-- 图片裁剪区域 -->
            <div v-if="showCropper" class="avatar-cropper-container">
              <div class="cropper-wrapper">
                <img ref="cropperImage" :src="originalImage" class="cropper-image" @load="initCropper">
              </div>
              <div class="cropper-controls">
                <button type="button" class="crop-button" @click="cropImage">确认裁剪</button>
                <button type="button" class="cancel-button" @click="cancelCrop">取消</button>
              </div>
            </div>

            <!-- 裁剪后的预览 -->
            <div class="preview" v-if="imagePreview && !showCropper">
              <img :src="imagePreview" alt="头像预览" @click="showFullImage = true" class="clickable-preview">
              <div class="preview-hint">点击查看大图</div>
            </div>
            <div class="preview-hint" v-if="!imagePreview && !showCropper">（可选）未上传头像将使用系统默认头像</div>
          </div>
        </div>

        <!-- 其他表单项 -->
        <div class="form-group">
          <div class="input-with-icon">
            <el-icon class="input-icon">
              <User />
            </el-icon>
            <input type="text" v-model="userName" placeholder="用户名" autocomplete="off" required>
          </div>
        </div>

        <div class="form-group">
          <div class="input-with-icon">
            <el-icon class="input-icon">
              <Message />
            </el-icon>
            <input type="email" v-model="email" placeholder="电子邮箱" autocomplete="off" required>
          </div>
        </div>

        <!-- 验证码输入框 -->
        <div class="form-group">
          <div class="input-with-icon code-input-wrapper">
            <el-icon class="input-icon">
              <Key />
            </el-icon>
            <input type="text" v-model="verifyCode" placeholder="验证码" required>
            <button type="button" class="send-code-btn" @click="sendVerifyCode" :disabled="countdown > 0">
              {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
            </button>
          </div>
        </div>

        <div class="form-group">
          <div class="input-with-icon">
            <el-icon class="input-icon">
              <Lock />
            </el-icon>
            <input type="password" v-model="password" placeholder="密码" autocomplete="new-password" required>
          </div>
        </div>

        <div class="form-group">
          <div class="input-with-icon">
            <el-icon class="input-icon">
              <Lock />
            </el-icon>
            <input type="password" v-model="confirmPassword" placeholder="确认密码" autocomplete="new-password" required>
          </div>
        </div>

        <button type="submit" class="register-submit" :disabled="isSubmitting">
          <span>{{ isSubmitting ? '注册中...' : '注册' }}</span>
          <i class="el-icon-right" v-if="!isSubmitting"></i>
          <i class="el-icon-loading" v-else></i>
        </button>
      </form>

      <div class="register-footer">
        <router-link to="/login" class="login-link">已有账号？立即登录</router-link>
      </div>
    </div>
  </div>

  <!-- 全屏预览模态框 -->
  <div class="fullscreen-preview" v-if="showFullImage" @click="showFullImage = false">
    <div class="fullscreen-content" @click.stop>
      <img :src="imagePreview" alt="头像大图预览">
      <button class="close-preview" @click="showFullImage = false">
        <el-icon>
          <Close />
        </el-icon>
      </button>
    </div>
  </div>
</template>

<script>
import { ref, nextTick, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import { ElMessage } from 'element-plus';
import { Upload, Close, User, Message, Lock, Key } from '@element-plus/icons-vue';
import 'cropperjs/dist/cropper.css';
import Cropper from 'cropperjs';

export default {
  name: 'RegisterView',
  components: {
    Upload,
    Close,
    User,
    Message,
    Lock,
    Key
  },
  setup() {
    const router = useRouter();
    const userName = ref('');
    const email = ref('');
    const password = ref('');
    const confirmPassword = ref('');
    const verifyCode = ref('');
    const countdown = ref(0);

    const avatarFile = ref(null);
    const imagePreview = ref('');
    const isSubmitting = ref(false);

    // 裁剪相关变量
    const showCropper = ref(false);
    const originalImage = ref('');
    const cropperImage = ref(null);
    const cropperInstance = ref(null);

    const showFullImage = ref(false);

    // 组件挂载时清空表单，防止浏览器自动填充
    onMounted(() => {
      userName.value = '';
      email.value = '';
      password.value = '';
      confirmPassword.value = '';
      verifyCode.value = '';
      // 清空文件输入
      const fileInput = document.getElementById('avatar');
      if (fileInput) fileInput.value = '';
    });

    // 处理文件选择
    const handleFileChange = (event) => {
      const file = event.target.files[0];
      if (file) {
        // 读取原始图片用于裁剪
        const reader = new FileReader();
        reader.onload = (e) => {
          originalImage.value = e.target.result;
          showCropper.value = true; // 显示裁剪界面
        };
        reader.readAsDataURL(file);
      }
    };

    // 初始化裁剪器
    const initCropper = () => {
      nextTick(() => {
        if (cropperInstance.value) {
          cropperInstance.value.destroy();
        }

        cropperInstance.value = new Cropper(cropperImage.value, {
          aspectRatio: 1, // 1:1 比例的圆形头像
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
          // 设置圆形裁剪
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

      // 获取裁剪后的图片
      const canvas = cropperInstance.value.getCroppedCanvas({
        width: 200,
        height: 200,
        fillColor: '#fff',
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
      });

      // 转换为base64用于预览
      imagePreview.value = canvas.toDataURL('image/jpeg');

      // 转换为Blob用于上传
      canvas.toBlob((blob) => {
        avatarFile.value = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
      }, 'image/jpeg', 0.9);

      // 隐藏裁剪界面
      showCropper.value = false;
    };

    // 取消裁剪
    const cancelCrop = () => {
      showCropper.value = false;
      if (cropperInstance.value) {
        cropperInstance.value.destroy();
        cropperInstance.value = null;
      }
    };

    // 发送验证码
    const sendVerifyCode = async () => {
      if (!email.value) {
        ElMessage.warning('请先输入邮箱');
        return;
      }
      if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.value)) {
        ElMessage.error('请输入正确的邮箱格式');
        return;
      }

      try {
        const response = await axios.post('http://localhost:8080/registers/sendCode', null, {
          params: { email: email.value }
        });

        if (response.data.code === 200) {
          ElMessage.success('验证码已发送');
          countdown.value = 60;
          const timer = setInterval(() => {
            countdown.value--;
            if (countdown.value <= 0) {
              clearInterval(timer);
            }
          }, 1000);
        } else if (response.data.code === 400 && response.data.message === '邮箱已存在') {
          ElMessage.error('该邮箱已被注册');
        } else {
          ElMessage.error(response.data.message || '发送失败');
        }
      } catch (error) {
        console.error('发送验证码失败:', error);
        ElMessage.error('发送验证码失败');
      }
    };

    const handleRegister = async () => {
      if (password.value !== confirmPassword.value) {
        ElMessage.error('两次输入的密码不一致');
        return;
      }

      isSubmitting.value = true;

      try {
        const formData = new FormData();
        formData.append('userName', userName.value);
        formData.append('email', email.value);
        formData.append('password', password.value);
        formData.append('verifyCode', verifyCode.value);

        // 只有当用户上传了头像时才添加文件
        if (avatarFile.value) {
          formData.append('file', avatarFile.value);
        }
        // 如果没有上传头像，后端将使用默认头像

        const response = await axios.post('http://localhost:8080/registers/register', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        if (response.data.code === 200) {
          ElMessage.success('注册成功');
          router.push('/login');
        } else {
          ElMessage.error(response.data.message || '注册失败');
        }
      } catch (error) {
        console.error('注册失败:', error);
        ElMessage.error('注册失败，请稍后重试');
      } finally {
        isSubmitting.value = false;
      }
    };

    return {
      userName,
      email,
      password,
      confirmPassword,
      verifyCode,
      countdown,
      imagePreview,
      isSubmitting,
      handleFileChange,
      handleRegister,
      sendVerifyCode,
      // 裁剪相关
      showCropper,
      originalImage,
      cropperImage,
      initCropper,
      cropImage,
      cancelCrop,
      // 全屏预览
      showFullImage
    };
  }
};
</script>

<style scoped>
/* 主容器 */
.register-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #eef2f6;
  padding: 20px;
  position: relative;
}

.register-container::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(64, 158, 255, 0.08) 0%, transparent 60%);
}

/* 注册框 */
.register-box {
  background: #ffffff;
  border-radius: 24px;
  box-shadow: 0 20px 40px -10px rgba(0, 20, 40, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.5);
  padding: 40px;
  width: 100%;
  max-width: 480px;
  position: relative;
  z-index: 1;
  animation: slideUp 0.6s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 头部样式 */
.register-header {
  text-align: center;
  margin-bottom: 32px;
}

.register-header h2 {
  color: #1e2c3a;
  font-size: 36px;
  font-weight: 700;
  margin: 0 0 8px 0;
}

.register-subtitle {
  color: #4f6f8f;
  font-size: 16px;
  margin: 0;
}

/* 表单组样式 */
.form-group {
  margin-bottom: 20px;
}

.input-with-icon {
  position: relative;
  display: flex;
  align-items: center;
  background: #f8fafc;
  border: 2px solid #dce4ed;
  border-radius: 14px;
  transition: all 0.3s ease;
}

.input-with-icon:focus-within {
  border-color: #409eff;
  box-shadow: 0 0 0 4px rgba(64, 158, 255, 0.1);
  background: white;
}

.input-icon {
  padding: 0 16px;
  color: #7f9ab5;
  font-size: 20px;
  display: flex;
  justify-content: center;
  transition: color 0.3s ease;
}

.input-with-icon:focus-within .input-icon {
  color: #409eff;
}

.form-group input {
  width: 100%;
  padding: 16px 16px 16px 0;
  border: none;
  background: transparent;
  font-size: 16px;
  color: #1f2937;
  outline: none;
  font-weight: 500;
}

.form-group input::placeholder {
  color: #9ca3af;
}

/* 验证码输入框样式 */
.code-input-wrapper {
  display: flex;
  align-items: center;
}

.code-input-wrapper input {
  flex: 1;
  padding-right: 10px;
}

.send-code-btn {
  background: #409eff;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
  margin-right: 8px;
}

.send-code-btn:hover:not(:disabled) {
  background: #3a8ee6;
}

.send-code-btn:disabled {
  background: #a0aec0;
  cursor: not-allowed;
}

/* 头像上传样式 */
.avatar-upload {
  text-align: center;
  margin-bottom: 24px;
}

.upload-section {
  background: #f8fafc;
  border: 2px dashed #dce4ed;
  border-radius: 16px;
  padding: 24px;
  transition: all 0.3s ease;
}

.upload-section:hover {
  border-color: #409eff;
  background: white;
}

.upload-button-container {
  display: flex;
  justify-content: center;
}

.upload-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #409eff;
  color: white;
  border: none;
  border-radius: 12px;
  padding: 12px 24px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 600;
  box-shadow: 0 4px 15px rgba(64, 158, 255, 0.3);
}

.upload-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(64, 158, 255, 0.4);
}

/* 注册按钮 */
.register-submit {
  width: 100%;
  padding: 16px;
  background: #409eff;
  color: white;
  border: none;
  border-radius: 14px;
  font-size: 17px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(64, 158, 255, 0.4);
}

.register-submit:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(64, 158, 255, 0.5);
}

.register-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* 底部链接 */
.register-footer {
  text-align: center;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
}

.login-link {
  color: #409eff;
  text-decoration: none;
  font-weight: 600;
  font-size: 15px;
  transition: all 0.3s ease;
}

.login-link:hover {
  color: #3a8ee6;
}

/* 响应式 */
@media (max-width: 768px) {
  .register-container {
    padding: 16px;
  }

  .register-box {
    padding: 32px 24px;
  }

  .register-header h2 {
    font-size: 28px;
  }
}

@media (max-width: 480px) {
  .register-box {
    padding: 24px 20px;
  }

  .upload-section {
    padding: 20px;
  }
}



.upload-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(64, 158, 255, 0.4);
}

.hidden-input {
  display: none;
}

/* 裁剪区域样式 */
.avatar-cropper-container {
  margin: 20px 0;
}

.cropper-wrapper {
  width: 100%;
  height: 300px;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid rgba(64, 158, 255, 0.2);
}

.crop-button,
.cancel-button {
  padding: 10px 20px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
  border: none;
}

.crop-button {
  background: #409eff;
  color: white;
  box-shadow: 0 4px 15px rgba(64, 158, 255, 0.3);
}

.crop-button:hover {
  background: #3a8ee6;
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(64, 158, 255, 0.4);
}

.cancel-button {
  background: white;
  color: #4f6e8c;
  border: 2px solid rgba(64, 158, 255, 0.2);
}

.cancel-button:hover {
  border-color: #409eff;
  color: #1e2c3a;
}

.cropper-image {
  display: block;
  max-width: 100%;
  max-height: 100%;
}

.cropper-controls {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-top: 20px;
}

.crop-button,
.cancel-button {
  padding: 10px 20px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
  border: none;
}

.crop-button {
  background: #409eff;
  color: white;
  box-shadow: 0 4px 15px rgba(64, 158, 255, 0.3);
}

.crop-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(64, 158, 255, 0.4);
}

.cancel-button {
  background: rgba(255, 255, 255, 0.8);
  color: #4f6e8c;
  border: 2px solid rgba(64, 158, 255, 0.2);
}

.cancel-button:hover {
  border-color: #409eff;
  color: #1e2c3a;
}

/* 预览区域样式 */
.preview {
  margin-top: 15px;
}

.preview img {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid #409eff;
  box-shadow: 0 4px 15px rgba(64, 158, 255, 0.3);
  cursor: pointer;
  transition: all 0.3s ease;
}

.preview img:hover {
  transform: scale(1.05);
  box-shadow: 0 8px 25px rgba(64, 158, 255, 0.4);
}

.preview-hint {
  font-size: 14px;
  color: #4f6e8c;
  margin-top: 10px;
  font-weight: 500;
}

/* 注册按钮样式 */
.register-submit {
  width: 100%;
  padding: 16px;
  background: #409eff;
  color: white;
  border: none;
  border-radius: 15px;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  box-shadow: 0 4px 15px rgba(64, 158, 255, 0.3);
  position: relative;
  overflow: hidden;
}

.register-submit::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s ease;
}

.register-submit:hover:not(:disabled) {
  background: #3a8ee6;
}

.register-submit:hover:not(:disabled)::before {
  left: 100%;
}

.register-submit:disabled {
  background: #6b7e93;
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 底部链接样式 */
.register-footer {
  text-align: center;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid rgba(64, 158, 255, 0.1);
}

.login-link {
  color: #409eff;
  text-decoration: none;
  font-weight: 600;
  font-size: 16px;
  transition: all 0.3s ease;
  padding: 8px 16px;
  border-radius: 20px;
  display: inline-block;
}

.login-link:hover {
  background: rgba(64, 158, 255, 0.1);
  color: #3a8ee6;
}

/* 全屏预览模态框 */
.fullscreen-preview {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.fullscreen-content {
  position: relative;
  max-width: 90%;
  max-height: 90%;
  background: white;
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  border: 1px solid #eef3f8;
}

.fullscreen-content img {
  max-width: 100%;
  max-height: 70vh;
  display: block;
  border-radius: 50%;
  border: 4px solid #409eff;
}

.close-preview {
  position: absolute;
  top: 15px;
  right: 15px;
  background: white;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #409eff;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.close-preview:hover {
  background: #409eff;
  color: white;
  transform: scale(1.1);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .register-container {
    padding: 15px;
  }

  .register-box {
    padding: 30px 25px;
    max-width: 100%;
    border-radius: 20px;
  }

  .register-header {
    margin: 30px 0 30px 0;
  }

  .register-header h2 {
    font-size: 28px;
  }
}

@media (max-width: 480px) {
  .register-box {
    padding: 25px 20px;
  }

  .upload-section {
    padding: 20px;
  }

  .cropper-wrapper {
    height: 250px;
  }

  .cropper-controls {
    flex-direction: column;
    gap: 10px;
  }

  .crop-button,
  .cancel-button {
    width: 100%;
  }
}
</style>