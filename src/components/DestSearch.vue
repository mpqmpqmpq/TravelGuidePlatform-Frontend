<template>
  <div class="dest-search-container">
    <el-select
        v-model="selectedDest"
        filterable
        remote
        reserve-keyword
        placeholder="搜索目的地..."
        :remote-method="handleSearch"
        :loading="loading"
        clearable
        @change="handleSelect"
        class="dest-select"
    >
      <el-option
          v-for="item in destList"
          :key="item.id"
          :label="item.name"
          :value="item.id"
          class="dest-option"
      >
        <div class="dest-option-content">
          <img v-if="item.coverImage" :src="item.coverImage" class="dest-img" />
          <div class="dest-info">
            <span class="dest-name">{{ item.name }}</span>
            <span class="dest-location" v-if="item.location">{{ item.location }}</span>
          </div>
        </div>
      </el-option>
    </el-select>
  </div>
</template>

<script>
import { ref } from 'vue';
import axios from 'axios';

export default {
  name: 'DestSearch',
  emits: ['select'],
  setup(props, { emit }) {
    const selectedDest = ref(null);
    const destList = ref([]);
    const loading = ref(false);
    let searchTimer = null;

    const handleSearch = (keyword) => {
      if (searchTimer) clearTimeout(searchTimer);
      
      if (!keyword) {
        destList.value = [];
        return;
      }

      searchTimer = setTimeout(async () => {
        loading.value = true;
        try {
          const res = await axios.get('http://localhost:8080/destinations/search', {
            params: { keyword }
          });
          if (res.data.code === 200) {
            destList.value = res.data.data || [];
          }
        } catch (error) {
          console.error('搜索目的地失败:', error);
          destList.value = [];
        } finally {
          loading.value = false;
        }
      }, 300);
    };

    const handleSelect = (id) => {
      const dest = destList.value.find(item => item.id === id);
      emit('select', dest);
      selectedDest.value = null;
    };

    return {
      selectedDest,
      destList,
      loading,
      handleSearch,
      handleSelect
    };
  }
};
</script>

<style scoped>
.dest-search-container {
  width: 100%;
}

.dest-select {
  width: 100%;
}

:deep(.dest-option-content) {
  display: flex;
  align-items: center;
  padding: 4px 0;
}

.dest-img {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  object-fit: cover;
  margin-right: 12px;
}

.dest-info {
  display: flex;
  flex-direction: column;
}

.dest-name {
  font-weight: 600;
  color: #1f2b38;
}

.dest-location {
  font-size: 12px;
  color: #8b9aab;
}
</style>
