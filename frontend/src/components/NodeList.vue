<template>
  <div class="node-list">
    <div class="list-header">
      <h3>鑺傜偣鍒楄〃</h3>
      <button @click="refreshNodes" class="refresh-btn" :disabled="loading">
        {{ loading ? '鍒锋柊涓?..' : '馃攧 鍒锋柊' }}
      </button>
    </div>
    
    <div v-if="loading && nodes.length === 0" class="loading">
      鍔犺浇涓?..
    </div>
    
    <div v-else-if="nodes.length === 0" class="empty">
      <p>鏆傛棤鍦ㄧ嚎鑺傜偣</p>
      <p class="hint">璇风‘淇?Agent 姝ｅ湪杩愯</p>
    </div>
    
    <div v-else class="nodes-grid">
      <div
        v-for="node in nodes"
        :key="node.node_id"
        class="node-card"
        :class="{ active: node.node_id === currentNodeId }"
        @click="selectNode(node.node_id)"
      >
        <div class="node-header">
          <div class="node-status" :class="{ online: node.status === 'online' }"></div>
          <div class="node-info">
            <div class="node-name">{{ node.display_name || node.hostname }}</div>
            <div class="node-id">{{ node.node_id }}</div>
          </div>
        </div>
        
        <div v-if="node.latest_metrics" class="node-metrics">
          <div class="metric-item">
            <span class="metric-label">CPU:</span>
            <span class="metric-value">{{ parseFloat(node.latest_metrics.cpu_usage || 0).toFixed(1) }}%</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">鍐呭瓨:</span>
            <span class="metric-value">{{ parseFloat(node.latest_metrics.memory_usage || 0).toFixed(1) }}%</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">纾佺洏:</span>
            <span class="metric-value">{{ parseFloat(node.latest_metrics.disk_usage || 0).toFixed(1) }}%</span>
          </div>
        </div>
        
        <div class="node-footer">
          <span class="last-update">{{ formatTime(node.last_heartbeat) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useNodesStore } from '@/stores/nodes';

const nodesStore = useNodesStore();

const nodes = computed(() => nodesStore.nodes);
const currentNodeId = computed(() => nodesStore.currentNodeId);
const loading = computed(() => nodesStore.loading);

const refreshNodes = () => {
  nodesStore.refreshNodes();
};

const selectNode = (nodeId: string) => {
  nodesStore.setCurrentNode(nodeId);
};

const formatTime = (timestamp: string) => {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleString();
};
</script>

<style scoped>
.node-list {
  background: white;
  border-radius: 15px;
  padding: 25px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.08);
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.list-header h3 {
  margin: 0;
  color: #333;
  font-size: 18px;
}

.refresh-btn {
  padding: 8px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.3s;
}

.refresh-btn:hover:not(:disabled) {
  background: #5568d3;
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading,
.empty {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.empty .hint {
  font-size: 14px;
  margin-top: 10px;
}

.nodes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.node-card {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.node-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
}

.node-card.active {
  border-color: #667eea;
  background: linear-gradient(135deg, #f8f9fa 0%, #e8eaf6 100%);
}

.node-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 15px;
}

.node-status {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ccc;
  flex-shrink: 0;
}

.node-status.online {
  background: #52c41a;
  box-shadow: 0 0 8px rgba(82, 196, 26, 0.5);
}

.node-info {
  flex: 1;
  min-width: 0;
}

.node-name {
  font-weight: 600;
  color: #333;
  font-size: 16px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.node-id {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}

.node-metrics {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 15px;
}

.metric-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.metric-label {
  color: #666;
}

.metric-value {
  font-weight: 600;
  color: #667eea;
}

.node-footer {
  padding-top: 12px;
  border-top: 1px solid #e0e0e0;
}

.last-update {
  font-size: 12px;
  color: #999;
}

@media (max-width: 768px) {
  .nodes-grid {
    grid-template-columns: 1fr;
  }
}
</style>
