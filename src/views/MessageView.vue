<template>
  <div class="message-page">
    <nav-component search-placeholder="搜索私信..." />

    <div class="message-content-wrapper">
      <!-- 左侧聊天列表 -->
      <div class="chat-list">
        <div class="list-header">
          <h3>私信</h3>
        </div>

        <div class="chat-items">
          <div v-for="conv in loggedConversations" :key="conv.conversationId"
            :class="['chat-row', { active: selectedConversation && selectedConversation.conversationId === conv.conversationId }]"
            @click="selectConversation(conv)">
            <div class="chat-avatar">
              <img :src="getOtherUserAvatar(conv) || '/default-avatar.png'" :alt="conv.otherUserName">
            </div>
            <div class="chat-info">
              <h5>
                {{ conv.otherUserName }}
                <span class="time">{{ formatTime(conv.updatedAt) }}</span>
              </h5>
              <p>{{ conv.lastMessageContent || '暂无消息' }}</p>
            </div>
            <el-badge v-if="getUnreadCount(conv) > 0" :value="getUnreadCount(conv)" :max="99" class="badge" />
          </div>

          <div v-if="loggedConversations.length === 0" class="empty-chat-list">
            <el-empty description="暂无会话" :image-size="80" />
          </div>
        </div>
      </div>

      <!-- 右侧聊天主界面 -->
      <div class="chat-main" v-if="selectedConversation">
        <div class="main-header">
          <div class="partner-info">
            <div class="partner-avatar">
              <img :src="getOtherUserAvatar(selectedConversation) || '/default-avatar.png'"
                :alt="getOtherUser(selectedConversation)">
            </div>
            <h3>{{ getOtherUser(selectedConversation) }}</h3>
          </div>
        </div>

        <div class="message-area" ref="messageList">
          <div v-for="message in messages" :key="message.messageId"
            :class="['msg-row', message.senderId === currentUserId ? 'right' : 'left']">
            <div class="msg-bubble">
              {{ message.content }}
              <div class="msg-meta">
                <span>{{ formatTime(message.createdAt) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="input-section">
          <div class="input-wrapper">
            <el-input v-model="newMessageContent" placeholder="输入消息..." @keyup.enter="sendMessage" />
          </div>
          <el-button circle class="send-btn" @click="sendMessage" :disabled="!newMessageContent.trim()">
            <el-icon>
              <Promotion />
            </el-icon>
          </el-button>
        </div>
      </div>

      <div class="chat-main" v-else>
        <div class="no-conversation-selected">
          <el-empty description="选择一个会话开始聊天">
            <template #image>
              <el-icon :size="80" color="#ccc">
                <ChatDotRound />
              </el-icon>
            </template>
          </el-empty>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapActions, mapMutations } from 'vuex';
import { ElMessage } from 'element-plus';
import { Promotion, ChatDotRound } from '@element-plus/icons-vue';
import axios from 'axios';
import NavComponent from "@/components/NavComponent.vue";

export default {
  name: 'MessageView',
  components: {
    NavComponent,
    ChatDotRound,
    Promotion
  },
  data() {
    return {
      messages: [],
      newMessageContent: '',
      currentUsername: null,
      showEmojiPicker: false,
      isHandlingNewMessage: false,
      processedMessages: new Set(),
    };
  },
  computed: {
    ...mapState(['conversations', 'currentUserId', 'token', 'stompClient', 'selectedConversation', 'newMessageEvent', 'newMessageCounter']),
    loggedConversations() {
      return this.conversations;
    },
  },
  async created() {
    let token = localStorage.getItem('token');
    if (!token) {
      token = sessionStorage.getItem('token');
      if (token) {
        localStorage.setItem('token', token);
        localStorage.setItem('userId', sessionStorage.getItem('userId') || '');
        localStorage.setItem('username', sessionStorage.getItem('username') || '');
        localStorage.setItem('userAvatar', sessionStorage.getItem('userAvatar') || '');
      }
    }
    if (token) {
      this.$store.commit('setToken', token);
      this.$store.commit('setCurrentUserId', localStorage.getItem('userId'));
    }
    await this.getCurrentUser();
    this.fetchConversations();
    this.handleQueryParams();
  },

  watch: {
    messages: {
      handler() {
        this.$nextTick(() => {
          this.scrollToBottom();
        });
      },
      deep: true
    },
    selectedConversation: {
      handler(newConv) {
        if (newConv && newConv.conversationId) {
          this.fetchMessages(newConv.conversationId);
        }
      },
      immediate: false
    },
    newMessageCounter: {
      handler() {
        if (this.newMessageEvent && !this.isHandlingNewMessage) {
          this.$nextTick(() => {
            this.handleReceivedMessage(this.newMessageEvent);
          });
        }
      },
      immediate: false
    }
  },
  methods: {
    ...mapActions(['initWebSocket', 'fetchConversations']),
    ...mapMutations(['updateConversations', 'clearUnreadCount', 'setSelectedConversation']),

    handleQueryParams() {
      const toUserId = this.$route.query.to;
      if (toUserId) {
        this.selectConversationByUserId(toUserId);
      }
    },

    async selectConversationByUserId(targetUserId) {
      const targetId = parseInt(targetUserId);

      const existingConv = this.conversations.find(c =>
        c.user1Id === targetId || c.user2Id === targetId
      );

      if (existingConv) {
        await this.selectConversation(existingConv);
      } else {
        try {
          const response = await axios.get(`http://localhost:8080/user/selectUserById/${targetId}`, {
            headers: {
              'Authorization': `Bearer ${this.token}`
            }
          });
          const userData = response.data.data;

          const tempConv = {
            conversationId: null,
            user1Id: this.currentUserId,
            user2Id: targetId,
            otherUserName: userData.userName,
            otherUserAvatar: userData.avatarUrl,
            lastMessageContent: '',
            lastMessageTime: null,
            unreadCount: 0
          };

          this.setSelectedConversation(tempConv);
          ElMessage.info('与 ' + userData.userName + ' 的会话已创建，请发送消息开始聊天');
        } catch (error) {
          ElMessage.error('无法创建会话，请稍后重试');
        }
      }
    },

    async getCurrentUser() {
      let token = this.token;
      if (!token) {
        token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
        if (token) {
          this.$store.commit('setToken', token);
        }
      }
      if (token) {
        try {
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(window.atob(base64));
          this.$store.commit('setCurrentUserId', payload.userId);
          this.currentUsername = payload.sub;
        } catch (error) {
          ElMessage.error('解析用户信息失败，请重新登录');
          this.$router.push('/login');
        }
      } else {
        ElMessage.warning('登录凭证已失效，请重新登录');
        this.$router.push('/login');
      }
    },

    handleReceivedMessage(message) {
      if (message.senderId === this.currentUserId) {
        return;
      }

      const messageUniqueKey = this.generateMessageUniqueKey(message);
      if (this.processedMessages.has(messageUniqueKey)) {
        return;
      }

      if (!this.selectedConversation) {
        this.showNotification(message);
        this.processedMessages.add(messageUniqueKey);
        return;
      }

      const isCurrentConversation = this.selectedConversation.conversationId === message.conversationId;

      if (isCurrentConversation) {
        const exists = this.messages.some(m => {
          if (message.messageId && m.messageId) {
            return m.messageId === message.messageId;
          }
          return m.content === message.content &&
            m.senderId === message.senderId &&
            Math.abs(new Date(m.createdAt) - new Date(message.createdAt)) < 2000;
        });

        if (!exists) {
          this.isHandlingNewMessage = true;
          const newMessages = [...this.messages, message];
          this.messages = newMessages;

          this.$nextTick(() => {
            this.scrollToBottom();
            this.clearUnreadCount(message.conversationId);

            setTimeout(() => {
              this.isHandlingNewMessage = false;
              this.processedMessages.add(messageUniqueKey);
            }, 300);
          });
        }
      } else {
        this.showNotification(message);
        this.processedMessages.add(messageUniqueKey);
      }
    },

    generateMessageUniqueKey(message) {
      if (message.messageId) {
        return `msg_${message.messageId}`;
      }
      return `msg_${message.senderId}_${message.content}_${new Date(message.createdAt).getTime()}`;
    },

    showNotification(message) {
      const senderName = this.getSenderNameFromMessage(message);
      ElMessage({
        message: `${senderName}: ${message.content.substring(0, 30)}${message.content.length > 30 ? '...' : ''}`,
        type: 'info',
        duration: 5000,
        offset: 20
      });
      this.fetchConversations().catch(() => { });
    },

    getSenderNameFromMessage(message) {
      const conversation = this.conversations.find(c =>
        c.conversationId === message.conversationId &&
        (c.user1Id === message.senderId || c.user2Id === message.senderId)
      );
      if (conversation) {
        return conversation.otherUserName;
      }
      return '新消息';
    },

    async selectConversation(conversation) {
      this.setSelectedConversation(conversation);
      this.newMessageContent = '';
      this.clearUnreadCount(conversation.conversationId);
      if (conversation.conversationId) {
        await this.fetchMessages(conversation.conversationId);
      }
      this.$nextTick(() => {
        this.scrollToBottom();
      });
    },

    async fetchMessages(conversationId) {
      if (!conversationId) return;
      try {
        const response = await axios.get(`http://localhost:8080/user/chat/conversations/${conversationId}/message`, {
          headers: {
            'Authorization': `Bearer ${this.token}`
          }
        });
        if (response.data && response.data.data) {
          this.messages = response.data.data.reverse();
        }
      } catch (error) {
        ElMessage.error('获取消息列表失败');
      }
    },

    sendMessage() {
      if (!this.newMessageContent.trim() || !this.selectedConversation) {
        return;
      }

      const receiverId = this.getOtherUserId(this.selectedConversation);
      const content = this.newMessageContent.trim();

      const hasConversation = !!this.selectedConversation.conversationId;

      if (this.stompClient && this.stompClient.connected) {
        const message = {
          receiverId: receiverId,
          content: content,
          senderId: this.currentUserId,
          conversationId: this.selectedConversation.conversationId
        };

        const newMessages = [...this.messages, {
          ...message,
          messageId: null,
          createdAt: new Date().toISOString()
        }];
        this.messages = newMessages;

        this.stompClient.publish({
          destination: "/app/chat/send",
          body: JSON.stringify(message)
        });

        this.newMessageContent = '';
        this.$nextTick(() => {
          this.scrollToBottom();
        });

        if (!hasConversation) {
          setTimeout(() => {
            this.fetchConversations();
          }, 500);
        }

      } else {
        this.sendMessageViaHttp(receiverId, content);
      }
    },

    async sendMessageViaHttp(receiverId, content) {
      try {
        const response = await axios.post(`http://localhost:8080/user/chat/message`, null, {
          params: {
            receiverId: receiverId,
            content: content
          },
          headers: {
            'Authorization': `Bearer ${this.token}`
          }
        });

        if (response.data && response.data.data) {
          const newMessage = response.data.data;
          const newMessages = [...this.messages, newMessage];
          this.messages = newMessages;
          this.newMessageContent = '';
          this.$nextTick(() => {
            this.scrollToBottom();
          });

          if (!this.selectedConversation.conversationId && newMessage.conversationId) {
            this.fetchConversations();
          }
        }
      } catch (error) {
        ElMessage.error('发送消息失败，请稍后重试');
      }
    },

    getOtherUserId(conversation) {
      return conversation.user1Id === this.currentUserId ? conversation.user2Id : conversation.user1Id;
    },
    getOtherUser(conversation) {
      return conversation.otherUserName;
    },
    getOtherUserAvatar(conversation) {
      const avatarUrl = conversation.otherUserAvatar;
      return avatarUrl ? avatarUrl.replace(/`/g, '').trim() : '';
    },
    getUnreadCount(conv) {
      return conv.unreadCount;
    },
    formatTime(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    },
    scrollToBottom() {
      if (this.$refs.messageList) {
        this.$refs.messageList.scrollTop = this.$refs.messageList.scrollHeight;
      }
    },
  },
  activated() {
    this.fetchConversations();
    this.handleQueryParams();
  }
};
</script>

<style scoped>
.message-page {
  min-height: 100vh;
  background: #eef2f6;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.message-content-wrapper {
  flex: 1;
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  display: flex;
  gap: 20px;
  overflow: hidden;
  box-sizing: border-box;
}

.chat-list {
  width: 340px;
  flex-shrink: 0;
  background: white;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 120px);
}

.list-header {
  padding: 16px;
  border-bottom: 1px solid #ecf2f8;
  flex-shrink: 0;
}

.list-header h3 {
  font-size: 20px;
  font-weight: 600;
  color: #1e2c3a;
  margin: 0;
}

.chat-items {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
}

.chat-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.2s;
  height: 60px;
}

.chat-row:hover {
  background: #f8fafc;
}

.chat-row.active {
  background: #e3f2fd;
}

.chat-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}

.chat-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.chat-info {
  flex: 1;
  min-width: 0;
}

.chat-info h5 {
  font-size: 15px;
  font-weight: 600;
  color: #1c293c;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.chat-info h5 .time {
  font-size: 12px;
  color: #999;
}

.chat-info p {
  font-size: 13px;
  color: #666;
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.badge {
  flex-shrink: 0;
}

.empty-chat-list {
  padding: 40px 20px;
  text-align: center;
}

.chat-main {
  flex: 1;
  background: white;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 120px);
}

.main-header {
  padding: 16px 20px;
  border-bottom: 1px solid #ecf2f8;
  display: flex;
  align-items: center;
}

.partner-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.partner-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  overflow: hidden;
}

.partner-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.partner-info h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1e2c3a;
  margin: 0;
}

.message-area {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #f8fafc;
}

.msg-row {
  display: flex;
  margin-bottom: 12px;
}

.msg-row.left {
  justify-content: flex-start;
}

.msg-row.right {
  justify-content: flex-end;
}

.msg-bubble {
  max-width: 70%;
  padding: 10px 14px;
  border-radius: 16px;
  font-size: 14px;
  line-height: 1.5;
  word-wrap: break-word;
}

.left .msg-bubble {
  background: white;
  border: 1px solid #e0e0e0;
  border-bottom-left-radius: 4px;
}

.right .msg-bubble {
  background: #3b82f6;
  color: white;
  border-bottom-right-radius: 4px;
}

.msg-meta {
  font-size: 11px;
  margin-top: 4px;
  opacity: 0.7;
}

.right .msg-meta {
  text-align: right;
}

.input-section {
  padding: 16px 20px;
  border-top: 1px solid #ecf2f8;
  display: flex;
  align-items: center;
  gap: 12px;
}

.input-wrapper {
  flex: 1;
  background: #f5f5f5;
  border-radius: 24px;
  padding: 8px 16px;
}

.send-btn {
  background: #3b82f6;
  border: none;
  color: white;
}

.send-btn:hover {
  background: #2563eb;
}

.send-btn:disabled {
  background: #ccc;
}

.no-conversation-selected {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

@media (max-width: 768px) {
  .message-content-wrapper {
    flex-direction: column;
    padding: 10px;
  }

  .chat-list {
    width: 100%;
    max-height: 300px;
  }
}
</style>
