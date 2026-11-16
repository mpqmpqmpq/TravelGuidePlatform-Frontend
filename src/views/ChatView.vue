<template>
  <div class="chat-app">
    <!-- 使用导航组件 -->
    <NavComponent search-placeholder="搜索攻略..." />

    <!-- 聊天内容区域 -->
    <div class="chat-content-wrapper">
      <!-- 聊天列表在左侧 -->
      <div class="chat-list-panel">
        <div class="chat-list-header">
          <!-- 新对话按钮 -->
          <el-button class="new-chat-button" @click="startNewChat">
            <i class="el-icon-plus"></i> 新对话
          </el-button>
        </div>
        <!-- 聊天列表 -->
        <ul class="chat-list">
          <li v-for="item in getSortedChatList()" :key="item.id" @click="loadChat(item.id)" class="chat-list-item"
            :class="{ active: currentChatId == item.id }">
            <span class="chat-title">{{ getChatTitle(item.chat) }}</span>
            <el-icon class="delete-chat-icon" @click.stop="deleteChat(item.id)" title="删除对话">
              <Delete />
            </el-icon>
          </li>
        </ul>
      </div>

      <div class="chat-container">
        <!-- 聊天历史记录显示 -->
        <div class="chat-history-panel" ref="chatHistoryPanel">
          <!-- AI 助手头部 -->
          <div class="ai-header-section">
            <div class="ai-avatar-large">
              <el-icon size="32px" color="white">
                <ChatDotRound />
              </el-icon>
            </div>
            <div class="ai-header-info">
              <h3 class="ai-name">AI 攻略助手</h3>
              <p class="ai-status">在线 · 帮你规划旅行</p>
            </div>
          </div>

          <!-- 欢迎信息 -->
          <div v-if="chatHistory.length === 0" class="welcome-container">
            <div class="welcome-card">
              <div class="welcome-icon">
                <el-icon size="48px" color="#409eff">
                  <ChatDotRound />
                </el-icon>
              </div>
              <h2>欢迎使用智能助手</h2>
              <p>开始一次新的对话，我会尽力为您提供帮助</p>
              <div class="welcome-tips">
                <div class="tip-card">
                  <el-icon>
                    <MagicStick />
                  </el-icon>
                  <span>智能回答</span>
                </div>
                <div class="tip-card">
                  <el-icon>
                    <ChatLineRound />
                  </el-icon>
                  <span>自然对话</span>
                </div>
                <div class="tip-card">
                  <el-icon>
                    <Lightning />
                  </el-icon>
                  <span>快速响应</span>
                </div>
              </div>
            </div>
          </div>

          <div v-for="(message, index) in chatHistory" :key="index" class="message-container">
            <div v-if="message.isUser" class="user-message">
              <div class="chat-message user-bubble">
                <div class="message-content">{{ message.text }}</div>
                <div class="message-time">{{ getMessageTime(index) }}</div>
              </div>
              <div class="avatar user-avatar">
                <el-icon size="20px">
                  <UserFilled />
                </el-icon>
              </div>
            </div>
            <div v-else class="system-message">
              <div class="avatar system-avatar">
                <el-icon size="20px" color="white">
                  <ChatDotRound />
                </el-icon>
              </div>
              <div class="chat-message system-bubble">
                <div class="message-content">
                  <template v-if="message.type === 'image'">
                    <img :src="message.text" class="generated-image" />
                  </template>
                  <template v-else>
                    <div v-html="formatMessage(message.text)"></div>
                  </template>
                </div>
                <div class="message-time">{{ getMessageTime(index) }}</div>
                <el-tooltip content="复制" placement="bottom">
                  <el-icon class="copy-icon" @click="copyToClipboard(message.text)">
                    <DocumentCopy />
                  </el-icon>
                </el-tooltip>
              </div>
            </div>
          </div>
        </div>

        <!-- 发送消息区域 -->
        <div class="send-messages">
          <el-input v-model="inputMessage" type="textarea" :autosize="{ minRows: 3, maxRows: 6 }"
            placeholder="输入你的问题..." resize="none" class="message-input" @keyup.enter="sendMessage" />
          <div class="button-group">
            <el-button v-if="isStreaming" class="stop-button" 
            circle @click="stopStreaming">
             <el-icon><VideoPause /></el-icon>
            </el-button>
            <el-button v-else type="primary" class="send-button" 
            circle @click="sendMessage">
              <el-icon>
                <Promotion />
              </el-icon>
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, nextTick } from 'vue';
import { ElInput, ElButton, ElIcon, ElTooltip, ElMessage } from 'element-plus';
import { Delete, UserFilled, ChatDotRound, MagicStick, ChatLineRound, Lightning, DocumentCopy, Promotion } from '@element-plus/icons-vue';
import NavComponent from '@/components/NavComponent.vue';
import axios from 'axios';
export default {
  name: 'ChatView',
  components: {
    NavComponent,
    ElInput,
    ElButton,
    ElIcon,
    Delete,
    UserFilled,
    ChatDotRound,
    MagicStick,
    ChatLineRound,
    Lightning,
    ElTooltip,
    DocumentCopy,
    Promotion
  },
  setup() {
    const chatList = ref({});
    const chatHistory = ref([]);
    const inputMessage = ref('');
    const currentChatId = ref(null);
    const chatHistoryPanel = ref(null);
    const isStreaming = ref(false);
    const reader = ref(null);
    const isGeneratingImage = ref(false)
    const toggleTheme = () => {
      // 主题切换功能保留
    };
    onMounted(() => {
    });

    const scrollToBottom = () => {
      nextTick(() => {
        if (chatHistoryPanel.value) {
          chatHistoryPanel.value.scrollTop = chatHistoryPanel.value.scrollHeight;
        }
      });
    };

    const startNewChat = () => {
      saveCurrentChat();
      const newChatId = Date.now();
      chatList.value[newChatId] = { messages: [] };
      currentChatId.value = newChatId;
      chatHistory.value = [];
    };

    const stopStreaming = () => {
      if (reader.value) {
        reader.value.cancel();
        reader.value = null;
      }
      isStreaming.value = false;
    };

    const sendMessage = async () => {
      const trimmedMessage = inputMessage.value.trim();
      inputMessage.value = '';
      if (!trimmedMessage) {
        console.warn('消息不能为空或仅包含空格');
        return;
      }
      
      if (!currentChatId.value) {
        startNewChat();
      }
        let charBuffer = '';
        let streamEnded = false;
        let OutputTime = null;
      try {
       
        isStreaming.value = true;
        chatHistory.value.push({
          text: trimmedMessage,
          isUser: true
        });
        scrollToBottom();

        const messageIndex = chatHistory.value.length;
        chatHistory.value.push({
          text: '',
          isUser: false
        });

        const formData = new FormData();
        formData.append('prompt', trimmedMessage);
        formData.append('chatId', String(currentChatId.value));

        const apiEndpoint = 'http://localhost:8080/mcp/chat';

        const response = await fetch(apiEndpoint, {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          console.error('服务器返回错误:', response.status, response.statusText);
          chatHistory.value[messageIndex].text = '出错了，请稍后再试。';
          return;
        }

        reader.value = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
       
         OutputTime = setInterval(() => {
          if (charBuffer.length > 0) {
            chatHistory.value[messageIndex].text += charBuffer[0];
            charBuffer = charBuffer.substring(1);
            
            scrollToBottom();
          }else if (streamEnded) {
            clearInterval(OutputTime);
            isStreaming.value = false; 
             saveCurrentChat();
          }
        },30);
        while (isStreaming.value) {
          const { done, value } = await reader.value.read();
          if (done) {
            streamEnded = true;
            break;
          }
          const chunk = decoder.decode(value, { stream: true });
          charBuffer += chunk;
          scrollToBottom();
        }

      } catch (error) {
        clearInterval(OutputTime);
        if (error.name === 'AbortError') {
          console.log('Stream reading was aborted');
        } else {
          console.error('发送消息时出错:', error);
          const lastMessage = chatHistory.value[chatHistory.value.length - 1];
          if (lastMessage && !lastMessage.isUser) {
            lastMessage.text = '出错了，请稍后再试。';
          }
        }
      } finally {
       
        reader.value = null;
       saveCurrentChat();
      }
    };

    const getChatTitle = (chat) => {
      if (chat.messages.length > 0) {
        const firstMessage = chat.messages[0].text || chat.messages[0];
        return firstMessage.length > 20 ? firstMessage.substring(0, 20) + '...' : firstMessage;
      }
      return '新对话';
    };

    const saveCurrentChat = () => {
      if (currentChatId.value && chatHistory.value.length > 0) {
        chatList.value[currentChatId.value].messages = [...chatHistory.value];
        localStorage.setItem('chatList', JSON.stringify(chatList.value));
      }
    };

    const loadChat = (id) => {
      saveCurrentChat();
      currentChatId.value = id;
      chatHistory.value = chatList.value[id]?.messages || [];
      nextTick(() => {
        scrollToBottom();
      });
    };

    const deleteChat = async (id) => {
      const response = await axios.delete(`http://localhost:8080/ai/deleteChatHistory/${id}`);
      if (response.status == 200) {

        if (currentChatId.value === id) {
          currentChatId.value = null;
          chatHistory.value = [];
        }
        delete chatList.value[id];
        localStorage.setItem('chatList', JSON.stringify(chatList.value));
        ElMessage.success('删除成功');
      } else {
        ElMessage.error('删除失败');
        console.log('删除失败');
      }
    };

    onMounted(() => {
      const savedChatList = localStorage.getItem('chatList');
      if (savedChatList) {
        chatList.value = JSON.parse(savedChatList);
      } else {
        startNewChat();
      }

    });
    // 获取排序后的聊天列表
    const getSortedChatList = () => {
      return Object.entries(chatList.value)
        .map(([id, chat]) => ({ id: parseInt(id), chat }))
        .sort((a, b) => b.id - a.id);
    };
    const copyToClipboard = (text) => {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = text;
      document.body.appendChild(tempDiv);
      const pureText = tempDiv.textContent || tempDiv.innerText || '';
      document.body.removeChild(tempDiv);

      navigator.clipboard.writeText(pureText).then(() => {
        console.log('内容已复制到剪贴板');
      }).catch(err => {
        console.error('复制失败:', err);
      });
    };
    const formatMessage = (text) => {
      let html = text
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/### (.+)/g, '<h3>$1</h3>')
        .replace(/## (.+)/g, '<h2>$1</h2>')
        .replace(/# (.+)/g, '<h2>$1</h2>')
        .replace(/---+/g, '<hr>');
      const lines = html.split('\n');
      const result = [];
      let inList = false;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const liMatch = line.match(/^\* (.+)/);
        const numMatch = line.match(/^\d+[、.] (.+)/);
        if (liMatch || numMatch) {
          if (!inList) { result.push('<ul>'); inList = 'ul'; }
          result.push('<li>' + (liMatch ? liMatch[1] : numMatch[1]) + '</li>');
        } else {
          if (inList) { result.push('</ul>'); inList = false; }
          result.push(line);
        }
      }
      if (inList) result.push('</ul>');
      return result.join('<br>').replace(/<br>\s*<br>/g, '<br>');
    };

    const getMessageTime = () => {
      const now = new Date();
      const minutes = now.getMinutes();
      const hours = now.getHours();
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    };

    const generateImage = async () => {
      if (isGeneratingImage.value) {
        stopGenerating();
        return;
      }

      const trimmedMessage = inputMessage.value.trim();
      inputMessage.value = '';
      if (!trimmedMessage) {
        console.warn('消息不能为空或仅包含空格');
        return;
      }

      try {
        isGeneratingImage.value = true;
        chatHistory.value.push({
          text: trimmedMessage,
          isUser: true
        });


        const response = await fetch(`http://localhost:8080/chatImage/chat?input=${encodeURIComponent(trimmedMessage)}`);

        if (!response.ok) {
          throw new Error('生成图片失败');
        }

        const result = await response.text();
        const imageUrl = result.replace('图片链接：', '').trim();

        chatHistory.value.push({
          text: imageUrl,
          isUser: false,
          type: 'image'
        });

        inputMessage.value = '';
        scrollToBottom();
      } catch (error) {
        console.error('生成图片时出错:', error);
        chatHistory.value.push({
          text: '生成图片失败，请稍后重试',
          isUser: false
        });
      } finally {
        isGeneratingImage.value = false;
      }
    };
    const stopGenerating = () => {
      if (reader.value) {
        reader.value.cancel();
        reader.value = null;
      }
      isStreaming.value = false;

    };

    return {
      chatList,
      chatHistory,
      inputMessage,
      currentChatId,
      chatHistoryPanel,
      isStreaming,
      startNewChat,
      stopStreaming,
      sendMessage,
      getChatTitle,
      saveCurrentChat,
      loadChat,
      deleteChat,
      scrollToBottom,
      getSortedChatList,
      copyToClipboard,
      formatMessage,
      toggleTheme,
      isGeneratingImage,
      generateImage,
      stopGenerating,
      getMessageTime
    };
  }
};
</script>

<style scoped>
.chat-app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f1f5f9;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  overflow: hidden;
}

.chat-content-wrapper {
  flex: 1;
  display: flex;
  overflow: hidden;
  max-width: 1400px;
  width: calc(100% - 32px);
  margin: 16px auto;
  /* background: white; */
  border-radius: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  min-height: 0;
}

.chat-list-panel {
  width: 280px;
  background: #fafafa;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  border-radius: 24px 0 0 24px;
  flex-shrink: 0;
}

.chat-list-header {
  padding: 20px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f0f2f5;
  background: linear-gradient(to bottom, #ffffff, #fafafa);
}

.chat-list {
  list-style: none;
  padding: 8px 0;
  margin: 0;
  overflow-y: auto;
  flex: 1;
}

.chat-list::-webkit-scrollbar {
  width: 4px;
}

.chat-list::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 2px;
}

.chat-list-item {
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.3s;
  color: #374151;
  font-size: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0 12px 4px;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  border: 1px solid transparent;
}

.chat-list-item:hover {
  background: #f3f4f6;
  border-color: #e5e7eb;
}

.chat-list-item.active {
  background: linear-gradient(135deg, #3b6e9c 0%, #2d5a7f 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(59, 110, 156, 0.3);
  border-color: transparent;
}

.chat-list-panel {
  width: 280px;
  background: #fafafa;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  border-radius: 24px 0 0 24px;
  flex-shrink: 0;
}

.chat-list-header {
  padding: 20px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f0f2f5;
  background: linear-gradient(to bottom, #ffffff, #fafafa);
}

.new-chat-button {
  width: 100%;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 18px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #3b6e9c 0%, #2d5a7f 100%);
  color: white;
  font-weight: 600;
  transition: all 0.3s;
  box-shadow: 0 4px 15px rgba(59, 110, 156, 0.3);
}

.new-chat-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(59, 110, 156, 0.4);
}

.header-icons {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chat-list {
  list-style: none;
  padding: 12px 0;
  margin: 0;
  overflow-y: auto;
  flex: 1;
}

.chat-list-item {
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.3s;
  color: #374151;
  font-size: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0 12px 6px;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.chat-list-item:hover {
  background: #f3f4f6;
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.chat-list-item.active {
  background: linear-gradient(135deg, #3b6e9c 0%, #2d5a7f 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(59, 110, 156, 0.3);
}

.chat-title {
  flex-grow: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
}

.delete-chat-icon {
  display: none;
  color: #909399;
  padding: 6px;
  border-radius: 6px;
  transition: all 0.3s;
  flex-shrink: 0;
}

.delete-chat-icon:hover {
  color: #ff4d4f;
  background: #fff2f0;
  transform: scale(1.1);
}

.chat-list-item:hover .delete-chat-icon {
  display: inline-flex;
}

.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  overflow: hidden;
  min-width: 0;
}

.chat-history-panel {
  flex: 1;
  overflow-y: auto;
  font-size: 15px;
  line-height: 1.6;
  color: #1e2c3a;
  padding: 0 24px 20px 24px;
  scroll-behavior: smooth;
}

.chat-history-panel::-webkit-scrollbar {
  width: 6px;
}

.chat-history-panel::-webkit-scrollbar-track {
  background: #f5f7fa;
}

.chat-history-panel::-webkit-scrollbar-thumb {
  background: #c0c4cc;
  border-radius: 3px;
}

.chat-history-panel::-webkit-scrollbar-thumb:hover {
  background: #909399;
}

.ai-header-section {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px 24px 16px 24px;
  margin-bottom: 16px;
  border-bottom: 1px solid #f0f2f5;
}

.ai-avatar-large {
  width: 56px;
  height: 56px;
  background: linear-gradient(145deg, #3b6e9c, #1d4c73);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(59, 110, 156, 0.3);
}

.ai-header-info {
  flex: 1;
}

.ai-name {
  font-size: 1.3rem;
  font-weight: 600;
  color: #1e2c3a;
  margin: 0 0 4px 0;
}

.ai-status {
  font-size: 0.85rem;
  color: #68839e;
  margin: 0;
}

.welcome-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  padding: 20px;
}

.welcome-card {
  text-align: center;
  max-width: 500px;
  padding: 40px 30px;
  background: linear-gradient(135deg, #f8fbff 0%, #eef4fa 100%);
  border-radius: 20px;
  box-shadow: 0 8px 20px rgba(59, 110, 156, 0.1);
  border: 1px solid #e2e8f0;
}

.welcome-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 20px;
  background: linear-gradient(135deg, #3b6e9c 0%, #2d5a7f 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.welcome-card h2 {
  font-size: 26px;
  color: #3b6e9c;
  margin: 0 0 10px 0;
  font-weight: 600;
}

.welcome-card p {
  font-size: 15px;
  color: #606266;
  margin: 0 0 28px 0;
  line-height: 1.6;
}

.welcome-tips {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

.tip-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
  min-width: 90px;
  transition: all 0.3s ease;
}

.tip-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 6px 15px rgba(59, 110, 156, 0.2);
}

.tip-card .el-icon {
  font-size: 24px;
  margin-bottom: 8px;
  color: #3b6e9c;
}

.send-messages {
  display: flex;
  flex-direction: column;
  padding: 16px 24px 20px;
  background: #ffffff;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.04);
  width: 100%;
  box-sizing: border-box;
  gap: 10px;
  border-top: 1px solid #eef2f6;
}

.message-input {
  width: 100%;
  border: 1px solid #d5e1ec;
  border-radius: 16px;
  background-color: #f1f4f8;
  transition: all 0.3s;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
  font-size: 15px;
}

.message-input:focus-within {
  box-shadow: 0 0 0 3px rgba(59, 110, 156, 0.15);
  border-color: #3b6e9c;
  background-color: #ffffff;
}

.button-group {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: flex-end;
}

.send-button {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b6e9c 0%, #2d5a7f 100%);
  border: none;
  color: white;
  transition: all 0.3s;
  box-shadow: 0 4px 15px rgba(59, 110, 156, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}


.send-button:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 20px rgba(59, 110, 156, 0.5);
}

.stop-button {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
  border: none;
  color: white;
  transition: all 0.3s;
  box-shadow: 0 4px 15px rgba(231, 76, 60, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.stop-button:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 20px rgba(231, 76, 60, 0.5);
}

.message-container {
  display: flex;
  align-items: flex-start;
  margin-bottom: 20px;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.user-avatar {
  background: linear-gradient(135deg, #3b6e9c 0%, #2d5a7f 100%);
  margin-left: 12px;
  color: white;
}

.system-avatar {
  background: linear-gradient(135deg, #3b6e9c 0%, #2d5a7f 100%);
  margin-right: 12px;
}

.chat-message {
  position: relative;
  max-width: 75%;
  word-wrap: break-word;
  overflow-wrap: break-word;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: box-shadow 0.3s ease;
}

.chat-message:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.user-message {
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
  width: 100%;
}

.system-message {
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  width: 100%;
}

.user-bubble {
  background: linear-gradient(135deg, #3b6e9c 0%, #2d5a7f 100%);
  color: white;
  border-radius: 20px 20px 4px 20px;
  padding: 14px 18px;
}

.system-bubble {
  background: #ffffff;
  color: #1e364a;
  border-radius: 4px 20px 20px 20px;
  padding: 14px 18px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.message-content {
  line-height: 1.6;
  word-break: break-word;
  text-align: left;
}

.generated-image {
  max-width: 100%;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.message-time {
  font-size: 0.7rem;
  color: #8fa5bc;
  margin-top: 6px;
  text-align: left;
}

.copy-icon {
  position: absolute;
  bottom: 8px;
  right: 8px;
  color: #909399;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.3s ease;
  font-size: 16px;
  background-color: rgba(255, 255, 255, 0.7);
  border-radius: 4px;
  padding: 4px;
}

.system-bubble:hover .copy-icon {
  opacity: 1;
}

.copy-icon:hover {
  color: #3b6e9c;
}

@media (max-width: 768px) {
  .chat-content-wrapper {
    flex-direction: column;
    width: calc(100% - 16px);
    margin: 8px auto;
    border-radius: 16px;
  }

  .chat-list-panel {
    width: 100%;
    max-height: 200px;
    border-radius: 16px 16px 0 0;
    border-right: none;
    border-bottom: 1px solid #e4e7ed;
  }

  .chat-container {
    border-radius: 0;
  }

  .chat-history-panel {
    padding: 0 16px 16px;
  }

  .chat-message {
    max-width: 85%;
  }

  .ai-header-section {
    padding: 16px 0 14px;
  }

  .ai-avatar-large {
    width: 44px;
    height: 44px;
  }

  .ai-name {
    font-size: 1.1rem;
  }

  .welcome-container {
    min-height: 300px;
    padding: 16px;
  }

  .welcome-card {
    padding: 28px 20px;
  }

  .welcome-card h2 {
    font-size: 22px;
  }

  .welcome-tips {
    flex-direction: column;
    align-items: center;
  }

  .send-messages {
    padding: 12px 16px 16px;
  }
}

@media (max-width: 480px) {
  .chat-list-panel {
    max-height: 160px;
  }

  .chat-list-item {
    padding: 10px 14px;
    margin: 0 8px 4px;
  }
}
</style>
