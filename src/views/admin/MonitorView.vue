2<template>
  <div class="monitor">
    <div class="monitor-header">
      <h1>系统监控</h1>
      <el-button @click="refreshData" :loading="loading">
        <el-icon>
          <Refresh />
        </el-icon>
        刷新
      </el-button>
    </div>

    <!-- 应用性能 -->
    <div class="section">
      <h2>应用性能</h2>
      <div class="stats-grid">
        <el-card class="stat-card">
          <div class="stat-header">QPS (每秒请求数)</div>
          <div class="stat-value large">{{ app.qps }}</div>
          <div class="stat-detail">当前每秒处理请求数</div>
        </el-card>

        <el-card class="stat-card">
          <div class="stat-header">平均响应时间</div>
          <div class="stat-value large">{{ app.responseTime }} ms</div>
          <div class="stat-detail">API 平均响应时间</div>
        </el-card>

        <el-card class="stat-card">
          <div class="stat-header">错误率</div>
          <div class="stat-value large" :class="{ 'error-rate': app.errorRate > 1 }">
            {{ app.errorRate }}%
          </div>
          <div class="stat-detail">请求错误百分比</div>
        </el-card>

        <el-card class="stat-card">
          <div class="stat-header">在线用户</div>
          <div class="stat-value large">{{ app.activeUsers }}</div>
          <div class="stat-detail">当前活跃用户数</div>
        </el-card>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="section">
      <h2>请求趋势</h2>
      <el-card>
        <div ref="chartRef" style="height: 500px;"></div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, shallowRef } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import * as echarts from 'echarts'

const loading = ref(false)
const chartRef = ref(null)
const chartInstance = shallowRef(null)

const app = ref({ qps: 0, responseTime: 0, errorRate: 0, activeUsers: 0 })
const db = ref({ connections: 0, maxConnections: 100, queryTime: 0, slowQueries: 0, tps: 0 })
const trendData = ref({ requests: [], responseTimes: [] })

const fetchData = async () => {
  try {
    const token = localStorage.getItem('token')
    const [metricsRes, onlineRes] = await Promise.all([
      fetch('http://localhost:8080/monitor/metrics', {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch('http://localhost:8080/user/getOnline', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
    ])
    if (metricsRes.ok) {
      const data = await metricsRes.json()
      if (data.code === 200) {
        app.value = data.data.app || { qps: 0, responseTime: 0, errorRate: 0, activeUsers: 0 }
        db.value = data.data.db || { connections: 0, maxConnections: 100, queryTime: 0, slowQueries: 0, tps: 0 }
      }
    }
    if (onlineRes.ok) {
      const data = await onlineRes.json()
      if (data.code === 200) {
        app.value.activeUsers = data.data
      }
    }
  } catch (error) {
    console.error('获取监控数据失败:', error)
  }
}

const fetchTrend = async () => {
  try {
    const token = localStorage.getItem('token')
    const response = await fetch('http://localhost:8080/monitor/trend', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    if (response.ok) {
      const data = await response.json()
      if (data.code === 200) {
        trendData.value.requests = data.data.requests || []
        trendData.value.responseTimes = data.data.responseTime || []
      }
    }
  } catch (error) {
    console.error('获取趋势数据失败:', error)
  }
}

const refreshData = async () => {
  loading.value = true
  await fetchData()
  await fetchTrend()
  loading.value = false
  updateChart()
}

const initChart = () => {
  if (!chartRef.value) return
  chartInstance.value = echarts.init(chartRef.value)
  updateChart()
}

const updateChart = () => {
  if (!chartInstance.value) return

  const times = []
  const requests = []
  const responseTimes = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 300000)
    times.push(time.getHours() + ':' + String(time.getMinutes()).padStart(2, '0'))
  }

  if (trendData.value.requests.length > 0) {
    requests.push(...trendData.value.requests)
  } else {
    for (let i = 0; i < 12; i++) {
      requests.push(0)
    }
  }

  if (trendData.value.responseTimes.length > 0) {
    responseTimes.push(...trendData.value.responseTimes)
  } else {
    for (let i = 0; i < 12; i++) {
      responseTimes.push(0)
    }
  }

  chartInstance.value.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['请求数', '响应时间(ms)'] },
    xAxis: { type: 'category', data: times },
    yAxis: [
      { type: 'value', name: '请求数' },
      { type: 'value', name: '响应时间' }
    ],
    series: [
      {
        name: '请求数',
        type: 'line',
        data: requests,
        smooth: true,
        areaStyle: { opacity: 0.3 }
      },
      {
        name: '响应时间(ms)',
        type: 'line',
        yAxisIndex: 1,
        data: responseTimes,
        smooth: true
      }
    ]
  })
}

let refreshTimer = null

onMounted(() => {
  fetchData().then(async () => {
    await fetchTrend()
    initChart()
    updateChart()
  })
  refreshTimer = setInterval(refreshData, 30000)
})

onUnmounted(() => {
  if (chartInstance.value) {
    chartInstance.value.dispose()
  }
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})
</script>

<style scoped>
.monitor {
  padding: 20px;
}

.monitor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.monitor-header h1 {
  margin: 0;
}

.section {
  margin-bottom: 30px;
}

.section h2 {
  margin: 0 0 15px 0;
  color: #303133;
  font-size: 18px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
}

.stat-card {
  padding: 15px;
}

.stat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  color: #606266;
  font-size: 14px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  margin: 10px 0;
}

.stat-value.large {
  font-size: 32px;
}

.stat-value.error-rate {
  color: #f56c6c;
}

.stat-detail {
  color: #909399;
  font-size: 12px;
}

.network {
  display: flex;
  gap: 20px;
}

.network-item {
  display: flex;
  flex-direction: column;
}

.network-item .label {
  color: #909399;
  font-size: 12px;
}

.network-item .value {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}
</style>