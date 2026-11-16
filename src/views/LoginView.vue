<template>
  <div class="login-page">
    <div class="login-card">
      <div class="brand">
        <div class="brand-icon">
          <el-icon>
            <User />
          </el-icon>
        </div>
        <h1>Welcome back</h1>
        <p>登录以继续您的旅程</p>
      </div>

      <div class="login-tabs">
        <button :class="['tab-btn', { active: loginMethod === 'account' }]" @click="loginMethod = 'account'">
          账号登录
        </button>
        <button :class="['tab-btn', { active: loginMethod === 'email' }]" @click="loginMethod = 'email'">
          邮箱登录
        </button>
      </div>

      <form @submit.prevent="loginMethod === 'account' ? handleLogin() : handleEmailLogin()">
        <template v-if="loginMethod === 'account'">
          <div class="form-group">
            <div class="input-container">
              <el-icon class="input-icon-left">
                <User />
              </el-icon>
              <input type="text" v-model="username" class="input-username" placeholder="用户名" required>
            </div>
          </div>

          <div class="form-group">
            <div class="input-container password-field">
              <el-icon class="input-icon-left">
                <Lock />
              </el-icon>
              <input :type="showPassword ? 'text' : 'password'" v-model="password" class="input-password"
                placeholder="密码" required>
              <button type="button" class="toggle-password" @click="showPassword = !showPassword">
                <el-icon>
                  <View v-if="showPassword" />
                  <Hide v-else />
                </el-icon>
              </button>
            </div>
          </div>

          <div class="form-group">
            <div class="captcha-group">
              <div class="input-container captcha-input">
                <el-icon class="input-icon-left">
                  <Key />
                </el-icon>
                <input type="text" v-model="captcha" class="input-field" placeholder="验证码" required>
              </div>
              <div class="captcha-image" @click="refreshCaptcha">
                <img :src="captchaImageSrc" alt="验证码" ref="captchaImg">
              </div>
            </div>
          </div>

          <div class="options-row">
            <label class="checkbox-label">
              <el-checkbox v-model="rememberMe" @change="handleRememberMeChange">记住密码</el-checkbox>
            </label>
            <a href="#" class="forgot-link">忘记密码？</a>
          </div>
        </template>

        <template v-else>
          <div class="form-group">
            <div class="input-container">
              <el-icon class="input-icon-left">
                <Message />
              </el-icon>
              <input type="email" v-model="email" class="input-email-address" placeholder="邮箱地址" required>
            </div>
          </div>

          <div class="form-group">
            <div class="input-container email-captcha-field">
              <el-icon class="input-icon-left">
                <Key />
              </el-icon>
              <input type="text" v-model="emailCode" class="input-email-code" placeholder="邮箱验证码" required>
              <button type="button" class="send-code-btn" @click="sendEmailCode" :disabled="countdown > 0">
                {{ countdown > 0 ? `${countdown}秒` : '发送验证码' }}
              </button>
            </div>
          </div>
        </template>

        <button type="submit" class="login-btn">
          <span>{{ loginMethod === 'account' ? '登录' : '邮箱登录' }}</span>
          <el-icon>
            <Right />
          </el-icon>
        </button>
      </form>

      <div class="divider" v-if="loginMethod === 'account'">
        <span>或通过以下方式登录</span>
      </div>

      <div class="signup-prompt">
        还没有账号？<router-link to="/register" class="signup-link">立即注册</router-link>
      </div>
    </div>
  </div>
</template>

<script>
import { User, Lock, Key, Right, View, Hide, Message } from "@element-plus/icons-vue";
import { ElIcon, ElMessage, ElCheckbox } from "element-plus";
import axios from 'axios';
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

import globalConfig from '@/config/global';
export default {
  components: {
    ElIcon,
    User,
    Lock,
    Key,
    Right,
    View,
    Hide,
    Message,
    ElCheckbox
  },
  setup() {
    const username = ref('');
    const password = ref('');
    const captcha = ref('');
    const rememberMe = ref(false);
    const captchaImg = ref(null);
    const captchaKey = ref('');
    const router = useRouter();
    const showPassword = ref(false);
    const captchaImageSrc = ref('');
    const loginMethod = ref('account');
    const email = ref('');
    const emailCode = ref('');
    const countdown = ref(0);

    const initSavedCredentials = () => {
      const savedUsername = localStorage.getItem('savedUsername');
      const savedPassword = localStorage.getItem('savedPassword');
      const savedRememberMe = localStorage.getItem('rememberMe');

      if (savedUsername && savedPassword && savedRememberMe === 'true') {
        username.value = savedUsername;
        password.value = savedPassword;
        rememberMe.value = true;
      }
    };

    const handleCredentials = (save) => {
      if (save && rememberMe.value) {
        localStorage.setItem('savedUsername', username.value);
        localStorage.setItem('savedPassword', password.value);
        localStorage.setItem('rememberMe', 'true');
      } else {
        localStorage.removeItem('savedUsername');
        localStorage.removeItem('savedPassword');
        localStorage.removeItem('rememberMe');
      }
    };

    const refreshCaptcha = async () => {
      try {
        const response = await axios.post('http://localhost:8080/auth/regenerateCaptcha');
        if (response.data.code === 200) {
          captchaKey.value = response.data.data;
          captchaImageSrc.value = `http://localhost:8080/auth/captcha?key=${captchaKey.value}`;
        } else {
          ElMessage.error('获取验证码失败');
        }
      } catch (error) {
        console.error('获取验证码错误:', error);
        ElMessage.error('获取验证码失败，请稍后重试');
      }
    };

    const handleLogin = async () => {
      try {
        if (!username.value || !password.value || !captcha.value) {
          ElMessage.error('请填写完整的登录信息');
          return;
        }

        const response = await axios.post('http://localhost:8080/auth/login', {
          userName: username.value,
          password: password.value,
          captcha: captcha.value,
          captchaKey: captchaKey.value,
          rememberMe: rememberMe.value
        });

        if (response.data.code === 200) {
          const { token, userId, username, avatarUrl: userAvatar } = response.data.data;

          sessionStorage.setItem('token', token);
          sessionStorage.setItem('userId', userId);
          sessionStorage.setItem('username', username);
          sessionStorage.setItem('userAvatar', userAvatar);

          globalConfig.userId = userId;
          globalConfig.username = username;
          globalConfig.userAvatar = userAvatar;
          globalConfig.token = token;
          localStorage.setItem('token', token);
          localStorage.setItem('username', username);
          localStorage.setItem('userId', userId);
          localStorage.setItem('userAvatar', userAvatar);
          localStorage.setItem('role', response.data.data.role);
          localStorage.setItem('lastLoginTime', response.data.data.lastLogin || '');

          handleCredentials(true);

          ElMessage.success('登录成功');

          if (response.data.data.role === 'admin') {
            router.push('/admin');
          } else {
            router.push('/');
          }
        } else {
          ElMessage.error(response.data.message || '登录失败');
          refreshCaptcha();
        }
      } catch (error) {
        console.error('登录错误:', error);
        ElMessage.error(error.response?.data?.message || '登录失败，请稍后重试');
        refreshCaptcha();
      }
    };

    const handleRememberMeChange = () => {
      if (!rememberMe.value) {
        handleCredentials(false);
      }
    };

    const sendEmailCode = async () => {
      if (!email.value) {
        ElMessage.error('请输入邮箱地址');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.value)) {
        ElMessage.error('请输入有效的邮箱地址');
        return;
      }
      try {
        const response = await axios.post('http://localhost:8080/auth/email/sendCode', null, {
          params: { email: email.value }
        });
        if (response.data.code === 200) {
          ElMessage.success('验证码已发送到您的邮箱');
          countdown.value = 60;
          const timer = setInterval(() => {
            countdown.value--;
            if (countdown.value <= 0) {
              clearInterval(timer);
            }
          }, 1000);
        } else {
          ElMessage.error(response.data.message || '发送失败');
        }
      } catch (error) {
        console.error('发送验证码错误:', error);
        ElMessage.error('发送验证码失败，请稍后重试');
      }
    };

    const handleEmailLogin = async () => {
      try {
        if (!email.value || !emailCode.value) {
          ElMessage.error('请填写完整的邮箱登录信息');
          return;
        }

        const response = await axios.post('http://localhost:8080/auth/email/login', {
          email: email.value,
          code: emailCode.value
        });

        if (response.data.code === 200) {
          const { token, userId, username, avatarUrl: userAvatar } = response.data.data;

          sessionStorage.setItem('token', token);
          sessionStorage.setItem('userId', userId);
          sessionStorage.setItem('username', username);
          sessionStorage.setItem('userAvatar', userAvatar);

          globalConfig.userId = userId;
          globalConfig.username = username;
          globalConfig.userAvatar = userAvatar;
          globalConfig.token = token;
          localStorage.setItem('token', token);
          localStorage.setItem('username', username);
          localStorage.setItem('userId', userId);
          localStorage.setItem('userAvatar', userAvatar);
          localStorage.setItem('role', response.data.data.role);

          ElMessage.success('登录成功');

          if (response.data.data.role === 'admin') {
            router.push('/admin');
          } else {
            router.push('/');
          }
        } else {
          ElMessage.error(response.data.message || '登录失败');
        }
      } catch (error) {
        console.error('邮箱登录错误:', error);
        ElMessage.error(error.response?.data?.message || '登录失败，请稍后重试');
      }
    };

    onMounted(() => {
      initSavedCredentials();
      setTimeout(() => {
        refreshCaptcha();
      }, 100);
    });

    return {
      username,
      password,
      captcha,
      rememberMe,
      captchaImg,
      captchaKey,
      showPassword,
      captchaImageSrc,
      loginMethod,
      email,
      emailCode,
      countdown,
      handleLogin,
      refreshCaptcha,
      handleRememberMeChange,
      sendEmailCode,
      handleEmailLogin,
    };
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  position: relative;
  background: linear-gradient(135deg, #f5f7fe 0%, #e9eefa 100%);
  background-image:
    linear-gradient(rgba(66, 102, 174, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(66, 102, 174, 0.03) 1px, transparent 1px);
  background-size: 40px 40px;
}

.login-page::before {
  content: '';
  position: absolute;
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(64, 158, 255, 0.15) 0%, rgba(64, 158, 255, 0) 70%);
  border-radius: 50%;
  top: -100px;
  left: -100px;
  z-index: 0;
}

.login-page::after {
  content: '';
  position: absolute;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(64, 158, 255, 0.12) 0%, rgba(64, 158, 255, 0) 70%);
  border-radius: 50%;
  bottom: -150px;
  right: -100px;
  z-index: 0;
}

.login-card {
  background: rgba(255, 255, 255, 0.96);
  border-radius: 2rem;
  box-shadow: 0 25px 45px -12px rgba(0, 0, 0, 0.2), 0 4px 12px rgba(0, 0, 0, 0.05);
  width: 100%;
  max-width: 460px;
  padding: 2.2rem 2rem 2.5rem;
  position: relative;
  z-index: 2;
  border: 1px solid rgba(255, 255, 255, 0.5);
}

.brand {
  text-align: center;
  margin-bottom: 1.8rem;
}

.brand-icon {
  background: linear-gradient(145deg, #66b1ff, #409eff);
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20px;
  margin: 0 auto 1rem;
  box-shadow: 0 10px 20px -8px rgba(64, 158, 255, 0.4);
}

.brand-icon .el-icon {
  font-size: 28px;
  color: white;
}

.brand h1 {
  font-size: 1.9rem;
  font-weight: 700;
  letter-spacing: -0.3px;
  background: linear-gradient(135deg, #1e1f2c, #2d2f3e);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
}

.brand p {
  font-size: 0.9rem;
  color: #5b6e8c;
  margin-top: 0.4rem;
  font-weight: 500;
}

.login-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.tab-btn {
  flex: 1;
  padding: 0.7rem;
  border: 1.5px solid #e2e8f0;
  border-radius: 1rem;
  background: #fafcff;
  color: #64748b;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn.active {
  background: linear-gradient(105deg, #66b1ff, #409eff);
  color: white;
  border-color: transparent;
  box-shadow: 0 4px 12px -3px rgba(64, 158, 255, 0.4);
}

.tab-btn:not(.active):hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.form-group {
  margin-bottom: 1.4rem;
  position: relative;
}

.input-container {
  position: relative;
  width: 100%;
}

.input-field {
  width: 80%;
  padding: 0.9rem 1rem 0.9rem 3rem;
  font-size: 0.95rem;
  font-weight: 500;
  border: 1.5px solid #e2e8f0;
  border-radius: 1.2rem;
  background-color: #ffffff;
  transition: all 0.2s ease;
  outline: none;
  color: #1e293b;
}

.input-email-address {
  width: 90%;
  padding: 0.9rem 1rem 0.9rem 3rem;
  font-size: 0.95rem;
  font-weight: 500;
  border: 1.5px solid #e2e8f0;
  border-radius: 1.2rem;
  background-color: #ffffff;
  transition: all 0.2s ease;
  outline: none;
  color: #1e293b;
}

.input-email-code {
  width: 90%;
  padding: 0.9rem 1rem 0.9rem 3rem;
  font-size: 0.95rem;
  font-weight: 500;
  border: 1.5px solid #e2e8f0;
  border-radius: 1.2rem;
  background-color: #ffffff;
  transition: all 0.2s ease;
  outline: none;
  color: #1e293b;
}

.input-username {
  width: 90%;
  padding: 0.9rem 1rem 0.9rem 3rem;
  font-size: 0.95rem;
  font-weight: 500;
  border: 1.5px solid #e2e8f0;
  border-radius: 1.2rem;
  background-color: #ffffff;
  transition: all 0.2s ease;
  outline: none;
  color: #1e293b;
}

.input-password {
  width: 90%;
  padding: 0.9rem 1rem 0.9rem 3rem;
  font-size: 0.95rem;
  font-weight: 500;
  border: 1.5px solid #e2e8f0;
  border-radius: 1.2rem;
  background-color: #ffffff;
  transition: all 0.2s ease;
  outline: none;
  color: #1e293b;
}

.input-container.password-field .input-field {
  padding-right: 3rem;
}

.input-container.email-captcha-field .input-field {
  padding-right: 8rem;
}

.send-code-btn {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  padding: 0.4rem 0.8rem;
  background: linear-gradient(105deg, #66b1ff, #409eff);
  color: white;
  border: none;
  border-radius: 0.8rem;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.send-code-btn:hover:not(:disabled) {
  background: linear-gradient(105deg, #4a9eff, #3a8ee6);
}

.send-code-btn:disabled {
  background: #94a3b8;
  cursor: not-allowed;
}

.input-field:focus {
  border-color: #409eff;
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.2);
}

.input-field::placeholder {
  color: #94a3b8;
  font-weight: 400;
}

.input-icon-left {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  font-size: 1.1rem;
  pointer-events: none;
  transition: color 0.2s;
}

.input-container:focus-within .input-icon-left {
  color: #409eff;
}

.toggle-password {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  font-size: 1.1rem;
  cursor: pointer;
  transition: color 0.2s;
  background: transparent;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  width: 24px;
  height: 24px;
}

.toggle-password:hover {
  color: #409eff;
}

.captcha-group {
  width: 480px;
  display: flex;
  gap: 12px;
  align-items: center;
}

.captcha-input {
  flex: 1;
}

.captcha-image {
  width: 150px;
  height: 44px;
  background: #f3f4f6;
  border: 1.5px solid #e2e8f0;
  border-radius: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  overflow: hidden;
}

.captcha-image:hover {
  border-color: #409eff;
  transform: scale(1.02);
}

.captcha-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.options-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 1rem 0 1.6rem;
  font-size: 0.85rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #334155;
  cursor: pointer;
  font-weight: 500;
}

.checkbox-label :deep(.el-checkbox__label) {
  color: #334155;
  font-weight: 500;
}

.forgot-link {
  color: #409eff;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.2s;
}

.forgot-link:hover {
  color: #409eff;
  text-decoration: underline;
}

.login-btn {
  width: 100%;
  background: linear-gradient(105deg, #66b1ff, #409eff);
  border: none;
  padding: 0.9rem;
  border-radius: 2rem;
  font-weight: 700;
  font-size: 1rem;
  color: white;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 8px 16px -6px rgba(64, 158, 255, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.login-btn .el-icon {
  font-size: 1rem;
  transition: transform 0.2s;
}

.login-btn:hover {
  background: linear-gradient(105deg, #4a9eff, #3a8ee6);
  transform: scale(0.98);
  box-shadow: 0 5px 12px -4px rgba(64, 158, 255, 0.6);
}

.login-btn:hover .el-icon {
  transform: translateX(3px);
}

.divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 1.8rem 0 1.2rem;
  color: #94a3b8;
  font-size: 0.8rem;
  font-weight: 500;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid #e2e8f0;
}

.divider span {
  margin: 0 0.8rem;
}



.social-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  background: white;
  border: 1.5px solid #e2e8f0;
  border-radius: 2rem;
  padding: 0.65rem 0;
  font-weight: 600;
  font-size: 0.85rem;
  color: #1e293b;
  cursor: pointer;
  transition: all 0.2s;
  background-color: #fafcff;
}

.social-btn .el-icon {
  font-size: 1.2rem;
}

.social-btn:hover {
  background-color: #f1f5f9;
  border-color: #cbd5e1;
  transform: translateY(-2px);
}

.signup-prompt {
  text-align: center;
  margin-top: 1.8rem;
  font-size: 0.85rem;
  color: #475569;
}

.signup-link {
  color: #409eff;
  text-decoration: none;
  font-weight: 700;
  margin-left: 0.3rem;
  transition: color 0.2s;
}

.signup-link:hover {
  text-decoration: underline;
  color: #409eff;
}

@media (max-width: 500px) {
  .login-card {
    padding: 1.8rem 1.5rem 2rem;
  }

  .brand h1 {
    font-size: 1.6rem;
  }

  .input-field {
    font-size: 0.9rem;
    padding: 0.8rem 1rem 0.8rem 2.8rem;
  }

  .input-container.password-field .input-field {
    padding-right: 2.8rem;
  }

  .social-btn {
    font-size: 0.75rem;
    gap: 0.4rem;
  }

  .captcha-group {
    flex-direction: column;
    gap: 12px;
  }

  .captcha-image {
    width: 100%;
    height: 44px;
  }
}
</style>
