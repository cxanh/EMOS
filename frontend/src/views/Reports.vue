<template>
  <div class="reports">
    <div class="page-header">
      <h1>报表管理</h1>
      <div class="header-actions">
        <button class="btn-secondary" @click="loadReports">
          <span class="icon">🔄</span>
          刷新
        </button>
        <button class="btn-primary" @click="showGenerateDialog = true">
          <span class="icon">📊</span>
          生成报表
        </button>
      </div>
    </div>

    <!-- 报表列表 -->
    <div class="reports-list">
      <div v-if="loading" class="loading">加载中...</div>
      
      <div v-else-if="error" class="error">
        <p>{{ error }}</p>
        <button @click="loadReports" class="btn-secondary">重试</button>
      </div>

      <div v-else-if="reports.length === 0" class="empty">
        <p>暂无报表</p>
        <p class="hint">点击"生成报表"按钮创建第一份报表</p>
      </div>

      <div v-else class="reports-grid">
        <div v-for="report in reports" :key="report.id" class="report-card">
          <div class="report-header">
            <span class="report-type" :class="`type-${report.type}`">
              {{ getTypeLabel(report.type) }}
            </span>
            <span class="report-date">{{ formatDate(report.createdAt) }}</span>
          </div>
          
          <div class="report-body">
            <div class="report-info">
              <div class="info-item">
                <span class="label">节点数量:</span>
                <span class="value">{{ report.statistics.totalNodes }}</span>
              </div>
              <div class="info-item">
                <span class="label">时间范围:</span>
                <span class="value">{{ formatDateShort(report.startTime) }} ~ {{ formatDateShort(report.endTime) }}</span>
              </div>
            </div>
          </div>

          <div class="report-footer">
            <button @click="viewReport(report)" class="btn-icon" title="查看">
              <span>👁️</span>
            </button>
            <button @click="downloadReport(report)" class="btn-icon" title="下载">
              <span>⬇️</span>
            </button>
            <button @click="confirmDelete(report)" class="btn-icon btn-danger" title="删除">
              <span>🗑️</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 生成报表对话框 -->
    <div v-if="showGenerateDialog" class="modal-overlay" @click.self="closeGenerateDialog">
      <div class="modal">
        <div class="modal-header">
          <h2>生成报表</h2>
          <button class="btn-close" @click="closeGenerateDialog">×</button>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label>报表类型 *</label>
            <select v-model="generateForm.type">
              <option value="daily">日报（昨天）</option>
              <option value="weekly">周报（过去7天）</option>
              <option value="monthly">月报（过去30天）</option>
              <option value="custom">自定义时间范围</option>
            </select>
          </div>

          <div class="form-group">
            <label>选择节点 *</label>
            <div class="node-selector">
              <div v-for="node in availableNodes" :key="node.node_id" class="node-checkbox">
                <input 
                  type="checkbox" 
                  :id="`node-${node.node_id}`"
                  :value="node.node_id"
                  v-model="generateForm.nodeIds"
                />
                <label :for="`node-${node.node_id}`">
                  {{ node.hostname || node.node_id }}
                </label>
              </div>
            </div>
          </div>

          <div v-if="generateForm.type === 'custom'" class="custom-time-range">
            <div class="form-group">
              <label>开始时间 *</label>
              <input 
                v-model="generateForm.startTime" 
                type="datetime-local"
              />
            </div>

            <div class="form-group">
              <label>结束时间 *</label>
              <input 
                v-model="generateForm.endTime" 
                type="datetime-local"
              />
            </div>
          </div>

          <div v-if="generateError" class="form-error">
            {{ generateError }}
          </div>
        </div>

        <div class="modal-footer">
          <button @click="closeGenerateDialog" class="btn-secondary">取消</button>
          <button 
            @click="handleGenerate" 
            class="btn-primary"
            :disabled="generating"
          >
            {{ generating ? '生成中...' : '生成报表' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 查看报表对话框 -->
    <div v-if="showViewDialog && currentReport" class="modal-overlay" @click.self="showViewDialog = false">
      <div class="modal modal-large">
        <div class="modal-header">
          <h2>报表详情</h2>
          <button class="btn-close" @click="showViewDialog = false">×</button>
        </div>
        
        <div class="modal-body">
          <div class="report-details">
            <div class="detail-section">
              <h3>基本信息</h3>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="label">报表类型:</span>
                  <span class="value">{{ getTypeLabel(currentReport.type) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">生成时间:</span>
                  <span class="value">{{ formatDate(currentReport.createdAt) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">时间范围:</span>
                  <span class="value">{{ formatDate(currentReport.startTime) }} ~ {{ formatDate(currentReport.endTime) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">节点数量:</span>
                  <span class="value">{{ currentReport.statistics.totalNodes }}</span>
                </div>
              </div>
            </div>

            <div class="detail-section">
              <h3>节点统计</h3>
              <div class="node-stats">
                <div 
                  v-for="(stats, nodeId) in currentReport.statistics.nodeStatistics" 
                  :key="nodeId"
                  class="node-stat-card"
                >
                  <h4>{{ nodeId }}</h4>
                  <div v-if="stats.error" class="stat-error">
                    错误: {{ stats.error }}
                  </div>
                  <div v-else class="stat-grid">
                    <div class="stat-item">
                      <span class="stat-label">CPU平均:</span>
                      <span class="stat-value">{{ stats.cpu?.avg }}%</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">内存平均:</span>
                      <span class="stat-value">{{ stats.memory?.avg }}%</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">磁盘平均:</span>
                      <span class="stat-value">{{ stats.disk?.avg }}%</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">数据点数:</span>
                      <span class="stat-value">{{ stats.dataPoints }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="downloadReport(currentReport)" class="btn-primary">
            <span class="icon">⬇️</span>
            下载报表
          </button>
          <button @click="showViewDialog = false" class="btn-secondary">关闭</button>
        </div>
      </div>
    </div>

    <!-- 删除确认对话框 -->
    <div v-if="showDeleteDialog" class="modal-overlay" @click.self="showDeleteDialog = false">
      <div class="modal modal-small">
        <div class="modal-header">
          <h2>确认删除</h2>
          <button class="btn-close" @click="showDeleteDialog = false">×</button>
        </div>
        
        <div class="modal-body">
          <p>确定要删除这份报表吗？</p>
          <p class="warning">此操作不可恢复！</p>
        </div>

        <div class="modal-footer">
          <button @click="showDeleteDialog = false" class="btn-secondary">取消</button>
          <button 
            @click="handleDelete" 
            class="btn-danger"
            :disabled="deleting"
          >
            {{ deleting ? '删除中...' : '确定删除' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getAllReports, generateReport, generatePredefinedReport, deleteReport, getReport, type Report } from '../api/report';
import { getAgentList, type Agent } from '../api/agent';

const reports = ref<Report[]>([]);
const availableNodes = ref<Agent[]>([]);
const loading = ref(false);
const error = ref('');

const showGenerateDialog = ref(false);
const showViewDialog = ref(false);
const showDeleteDialog = ref(false);

const generateForm = ref({
  type: 'daily' as 'daily' | 'weekly' | 'monthly' | 'custom',
  nodeIds: [] as string[],
  startTime: '',
  endTime: ''
});

const generateError = ref('');
const generating = ref(false);

const currentReport = ref<Report | null>(null);
const reportToDelete = ref<Report | null>(null);
const deleting = ref(false);

// 加载报表列表
async function loadReports() {
  loading.value = true;
  error.value = '';
  
  try {
    const response = await getAllReports(50);
    reports.value = response.data;
  } catch (err: any) {
    error.value = err.response?.data?.error?.message || '加载报表列表失败';
    console.error('Failed to load reports:', err);
  } finally {
    loading.value = false;
  }
}

// 加载可用节点
async function loadNodes() {
  try {
    const response = await getAgentList();
    availableNodes.value = response.data.agents;
  } catch (err) {
    console.error('Failed to load nodes:', err);
  }
}

// 生成报表
async function handleGenerate() {
  generateError.value = '';
  
  // 验证
  if (generateForm.value.nodeIds.length === 0) {
    generateError.value = '请至少选择一个节点';
    return;
  }

  if (generateForm.value.type === 'custom') {
    if (!generateForm.value.startTime || !generateForm.value.endTime) {
      generateError.value = '请选择开始时间和结束时间';
      return;
    }

    const start = new Date(generateForm.value.startTime);
    const end = new Date(generateForm.value.endTime);
    
    if (start >= end) {
      generateError.value = '开始时间必须早于结束时间';
      return;
    }
  }

  generating.value = true;

  try {
    let response;
    
    if (generateForm.value.type === 'custom') {
      response = await generateReport({
        nodeIds: generateForm.value.nodeIds,
        startTime: new Date(generateForm.value.startTime).toISOString(),
        endTime: new Date(generateForm.value.endTime).toISOString()
      });
    } else {
      response = await generatePredefinedReport(generateForm.value.type, {
        nodeIds: generateForm.value.nodeIds
      });
    }

    closeGenerateDialog();
    await loadReports();
    
    // 自动打开查看对话框
    currentReport.value = response.data;
    showViewDialog.value = true;
  } catch (err: any) {
    generateError.value = err.response?.data?.error?.message || '生成报表失败';
    console.error('Failed to generate report:', err);
  } finally {
    generating.value = false;
  }
}

// 查看报表
async function viewReport(report: Report) {
  try {
    const response = await getReport(report.id);
    currentReport.value = response.data;
    showViewDialog.value = true;
  } catch (err: any) {
    alert(err.response?.data?.error?.message || '加载报表详情失败');
    console.error('Failed to load report:', err);
  }
}

// 下载报表
function downloadReport(report: Report) {
  // 生成JSON文件
  const dataStr = JSON.stringify(report, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `report_${report.type}_${report.id}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// 确认删除
function confirmDelete(report: Report) {
  reportToDelete.value = report;
  showDeleteDialog.value = true;
}

// 删除报表
async function handleDelete() {
  if (!reportToDelete.value) return;

  deleting.value = true;

  try {
    await deleteReport(reportToDelete.value.id);
    showDeleteDialog.value = false;
    reportToDelete.value = null;
    await loadReports();
  } catch (err: any) {
    alert(err.response?.data?.error?.message || '删除报表失败');
    console.error('Failed to delete report:', err);
  } finally {
    deleting.value = false;
  }
}

// 关闭生成对话框
function closeGenerateDialog() {
  showGenerateDialog.value = false;
  generateForm.value = {
    type: 'daily',
    nodeIds: [],
    startTime: '',
    endTime: ''
  };
  generateError.value = '';
}

// 格式化日期
function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN');
}

function formatDateShort(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN');
}

// 获取类型标签
function getTypeLabel(type: string) {
  const labels: Record<string, string> = {
    daily: '日报',
    weekly: '周报',
    monthly: '月报',
    custom: '自定义'
  };
  return labels[type] || type;
}

onMounted(() => {
  loadReports();
  loadNodes();
});
</script>

<style scoped>
.reports {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.page-header h1 {
  margin: 0;
  font-size: 28px;
  color: #333;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.reports-list {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
  min-height: 400px;
}

.loading, .error, .empty {
  padding: 60px 20px;
  text-align: center;
  color: #666;
}

.error {
  color: #f56c6c;
}

.hint {
  font-size: 14px;
  color: #999;
  margin-top: 8px;
}

.reports-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.report-card {
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s;
}

.report-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.report-type {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.type-daily {
  background: #e1f3ff;
  color: #409eff;
}

.type-weekly {
  background: #fff3e0;
  color: #e6a23c;
}

.type-monthly {
  background: #e1f5e1;
  color: #67c23a;
}

.type-custom {
  background: #f0f0f0;
  color: #666;
}

.report-date {
  font-size: 12px;
  color: #999;
}

.report-body {
  margin-bottom: 12px;
}

.report-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.info-item .label {
  color: #666;
}

.info-item .value {
  font-weight: 500;
  color: #333;
}

.report-footer {
  display: flex;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #eee;
}

.btn-icon {
  padding: 6px 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s;
  font-size: 16px;
}

.btn-icon:hover:not(:disabled) {
  background: #f0f0f0;
}

.btn-icon.btn-danger:hover:not(:disabled) {
  background: #ffe6e6;
}

.btn-primary, .btn-secondary, .btn-danger {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-primary {
  background: #409eff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #66b1ff;
}

.btn-secondary {
  background: #f0f0f0;
  color: #333;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

.btn-danger {
  background: #f56c6c;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #f78989;
}

.btn-primary:disabled,
.btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.icon {
  font-size: 16px;
}

/* 模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow: auto;
}

.modal-small {
  max-width: 400px;
}

.modal-large {
  max-width: 900px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
}

.btn-close {
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: #999;
  padding: 0;
  width: 32px;
  height: 32px;
  line-height: 1;
}

.btn-close:hover {
  color: #333;
}

.modal-body {
  padding: 20px;
  max-height: calc(90vh - 140px);
  overflow-y: auto;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid #eee;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #409eff;
}

.node-selector {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 12px;
}

.node-checkbox {
  margin-bottom: 8px;
}

.node-checkbox input {
  margin-right: 8px;
}

.custom-time-range {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.form-error {
  margin-top: 16px;
  padding: 12px;
  background: #ffe6e6;
  color: #f56c6c;
  border-radius: 4px;
  font-size: 14px;
}

.warning {
  color: #e6a23c;
  font-size: 14px;
  margin-top: 8px;
}

.report-details {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.detail-section h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  color: #333;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item .label {
  font-size: 12px;
  color: #999;
}

.detail-item .value {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.node-stats {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}

.node-stat-card {
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 16px;
}

.node-stat-card h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #333;
}

.stat-error {
  color: #f56c6c;
  font-size: 14px;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  color: #999;
}

.stat-value {
  font-size: 14px;
  font-weight: 500;
  color: #409eff;
}
</style>
