<template>
  <div class="dest-selector">
    <div class="selector-header">
      <span class="selector-title">已选目的地</span>
      <span class="dest-count">{{ selectedList.length }}/10</span>
    </div>
    
    <div class="selected-dests" v-if="selectedList.length > 0">
      <div 
          v-for="(dest, index) in selectedList" 
          :key="dest.id" 
          class="dest-tag"
      >
        <img v-if="dest.coverImage" :src="dest.coverImage" class="tag-img" />
        <span class="tag-name">{{ dest.name }}</span>
        <el-icon class="tag-close" @click="removeDest(index)"><Close /></el-icon>
      </div>
    </div>
    
    <div class="empty-dests" v-else>
      <span>暂无选择目的地</span>
    </div>

    <el-button type="primary" plain size="small" @click="showAddDialog = true" class="add-btn">
      <el-icon><Plus /></el-icon>
      添加目的地
    </el-button>

    <el-dialog v-model="showAddDialog" title="选择目的地" width="500px">
      <DestSearch @select="handleAddDest" />
      <div class="hot-dests">
        <div class="hot-title">热门目的地</div>
        <div class="hot-list">
          <span 
              v-for="dest in hotDests" 
              :key="dest.id"
              class="hot-item"
              @click="handleAddDest(dest)"
          >
            {{ dest.name }}
          </span>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { ref } from 'vue';
import DestSearch from './DestSearch.vue';
import { Close, Plus } from '@element-plus/icons-vue';

export default {
  name: 'DestSelector',
  components: { DestSearch, Close, Plus },
  emits: ['update'],
  setup(props, { emit }) {
    const selectedList = ref([]);
    const showAddDialog = ref(false);
    const hotDests = ref([
      { id: 1, name: '北京', coverImage: '', location: '华北' },
      { id: 2, name: '上海', coverImage: '', location: '华东' },
      { id: 3, name: '成都', coverImage: '', location: '西南' },
      { id: 4, name: '杭州', coverImage: '', location: '华东' },
      { id: 5, name: '西安', coverImage: '', location: '西北' },
      { id: 6, name: '重庆', coverImage: '', location: '西南' },
    ]);

    const handleAddDest = (dest) => {
      if (!dest) return;
      if (selectedList.value.find(item => item.id === dest.id)) {
        return;
      }
      if (selectedList.value.length >= 10) {
        return;
      }
      selectedList.value.push(dest);
      showAddDialog.value = false;
      emit('update', selectedList.value);
    };

    const removeDest = (index) => {
      selectedList.value.splice(index, 1);
      emit('update', selectedList.value);
    };

    return {
      selectedList,
      showAddDialog,
      hotDests,
      handleAddDest,
      removeDest
    };
  }
};
</script>

<style scoped>
.dest-selector {
  background: #f6fafd;
  border-radius: 12px;
  padding: 16px;
}

.selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.selector-title {
  font-weight: 600;
  color: #1f2b38;
}

.dest-count {
  font-size: 12px;
  color: #8b9aab;
}

.selected-dests {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.dest-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  background: white;
  border: 1px solid #e0e7ed;
  border-radius: 20px;
  padding: 4px 12px 4px 6px;
}

.tag-img {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}

.tag-name {
  font-size: 14px;
  color: #1f2b38;
}

.tag-close {
  cursor: pointer;
  color: #8b9aab;
  margin-left: 4px;
}

.tag-close:hover {
  color: #f56c6c;
}

.empty-dests {
  padding: 20px;
  text-align: center;
  color: #8b9aab;
  font-size: 14px;
  background: white;
  border-radius: 8px;
  border: 1px dashed #d2e0ec;
  margin-bottom: 12px;
}

.add-btn {
  width: 100%;
}

.hot-dests {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #e6edf4;
}

.hot-title {
  font-weight: 600;
  color: #1f2b38;
  margin-bottom: 12px;
}

.hot-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.hot-item {
  background: #e6f0f8;
  color: #2b4a6b;
  padding: 6px 14px;
  border-radius: 16px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s;
}

.hot-item:hover {
  background: #3b6e9c;
  color: white;
}
</style>
