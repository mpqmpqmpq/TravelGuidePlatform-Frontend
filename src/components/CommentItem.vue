<template>
  <div class="comment-item-wrapper">
    <div class="comment-item">
      <img :src="comment.userAvatar || '/default-avatar.png'" class="comment-avatar" @click="$emit('goUser', comment.userId)">
      <div class="comment-body">
        <div class="comment-header">
          <span class="comment-author" @click="$emit('goUser', comment.userId)">{{ comment.userName }}</span>
          <span class="comment-date">{{ formatDate(comment.createdAt) }}</span>
        </div>
        <div class="comment-content">
          <span v-if="comment.replyToUsername" class="reply-to">回复 {{ comment.replyToUsername }}：</span>
          {{ comment.content }}
        </div>
        <div class="comment-actions">
          <span @click="$emit('like', comment)">
            <i :class="comment.liked ? 'el-icon-star-on liked' : 'el-icon-star-off'"></i>
            {{ comment.likeCount > 0 ? comment.likeCount : '点赞' }}
          </span>
          <span @click="$emit('reply', comment)">
            <i class="el-icon-chat-dot-round"></i> 回复
          </span>
          <span v-if="comment.userId === currentUserId || articleUserId === currentUserId"
                @click="$emit('delete', comment.commentId)">
            <i class="el-icon-delete"></i> 删除
          </span>
<span v-if="comment.children && comment.children.length > 0" 
              @click="toggleExpand">
            <i :class="comment.isExpanded ? 'el-icon-arrow-up' : 'el-icon-arrow-down'"></i>
            {{ comment.isExpanded ? '收起' : '展开' }} ({{ comment.children.length }})
          </span>
        </div>
        <!-- 回复框 -->
        <div class="reply-form" v-if="activeReplyId === comment.commentId && isLoggedIn">
          <el-input
              :model-value="localReplyContent"
              @update:model-value="updateReplyContent"
              type="textarea"
              :rows="2"
              :placeholder="replyToUsername ? `回复 ${replyToUsername}...` : '写下你的回复...'"
              maxlength="300"
              show-word-limit
          ></el-input>
          <div class="reply-form-footer">
            <el-button size="small" @click="$emit('cancelReply')">取消</el-button>
            <el-button type="primary" size="small" @click="$emit('submitReply', comment.commentId)"
                       :disabled="!replyContent.trim()">回复</el-button>
          </div>
        </div>
      </div>
    </div>
    <!-- 递归渲染子评论 -->
    <div class="children-comments" v-if="comment.children && comment.children.length > 0 && comment.isExpanded">
      <comment-item
          v-for="child in comment.children"
          :key="child.commentId"
          :comment="child"
          :current-user-id="currentUserId"
          :article-user-id="articleUserId"
          :is-logged-in="isLoggedIn"
          :active-reply-id="activeReplyId"
          :reply-content="replyContent"
          :reply-to-username="replyToUsername"
          @go-user="$emit('goUser', $event)"
          @like="$emit('like', $event)"
          @reply="$emit('reply', $event)"
          @delete="$emit('delete', $event)"
          @cancel-reply="$emit('cancelReply')"
          @submit-reply="$emit('submitReply', $event)"
          @update:reply-content="$emit('update:replyContent', $event)"
      />
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';

export default {
  name: 'CommentItem',
  props: {
    comment: Object,
    currentUserId: [String, Number],
    articleUserId: [String, Number],
    isLoggedIn: Boolean,
    activeReplyId: [String, Number],
    replyContent: String,
    replyToUsername: String
  },
  emits: ['goUser', 'like', 'reply', 'delete', 'cancelReply', 'submitReply', 'update:replyContent', 'toggleExpand'],
  setup(props, { emit }) {
    const localExpanded = ref(props.comment.isExpanded || false);
    const localReplyContent = ref(props.replyContent || '');

    const isExpanded = computed({
      get: () => localExpanded.value,
      set: (val) => { localExpanded.value = val; }
    });

    function toggleExpand() {
      localExpanded.value = !localExpanded.value;
      emit('toggleExpand', { commentId: props.comment.commentId, isExpanded: localExpanded.value });
    }

    function updateReplyContent(val) {
      localReplyContent.value = val;
      emit('update:replyContent', val);
    }

    return { localExpanded, isExpanded, toggleExpand, localReplyContent, updateReplyContent };
  },
  methods: {
    formatDate(date) {
      if (!date) return '';
      const d = new Date(date);
      const now = new Date();
      const diff = Math.floor((now - d) / 1000);
      if (diff < 60) return '刚刚';
      if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
      if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
      if (diff < 2592000) return Math.floor(diff / 86400) + '天前';
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
  }
}
</script>

<style scoped>
.comment-item-wrapper {
  margin-bottom: 16px;
}
.comment-item {
  display: flex;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f1f5f9;
}
.comment-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  cursor: pointer;
}
.comment-body {
  flex: 1;
}
.comment-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.comment-author {
  font-weight: 600;
  color: #4a4235;
  cursor: pointer;
}
.comment-author:hover {
  color: #409eff;
}
.comment-date {
  font-size: 12px;
  color: #8b7d6b;
}
.comment-content {
  color: #5d5347;
  line-height: 1.6;
  margin-bottom: 8px;
}
.reply-to {
  color: #409eff;
}
.comment-actions {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #8b7d6b;
}
.comment-actions span {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
}
.comment-actions span:hover {
  color: #409eff;
}
.reply-form {
  margin-top: 12px;
  background: #f8fafc;
  padding: 12px;
  border-radius: 8px;
}
.reply-form-footer {
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.children-comments {
  margin-left: 48px;
  border-left: 2px solid #f1f5f9;
  padding-left: 12px;
}
</style>
