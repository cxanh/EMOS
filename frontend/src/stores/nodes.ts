import { defineStore } from 'pinia';
import { ref } from 'vue';
import { getAgentList, type Agent } from '@/api/agent';

export const useNodesStore = defineStore('nodes', () => {
  // 状态
  const nodes = ref<Agent[]>([]);
  const currentNodeId = ref<string>('');
  const loading = ref<boolean>(false);
  const error = ref<string>('');

  // 获取节点列表
  const fetchNodes = async () => {
    loading.value = true;
    error.value = '';

    try {
      const response = await getAgentList();
      if (response.success) {
        nodes.value = response.data.agents;
        
        // 如果没有选中节点且有节点列表，选中第一个
        const firstNode = nodes.value[0];
        if (!currentNodeId.value && firstNode) {
          currentNodeId.value = firstNode.node_id;
        }
      }
    } catch (err: any) {
      error.value = err.message || '获取节点列表失败';
      console.error('Failed to fetch nodes:', err);
    } finally {
      loading.value = false;
    }
  };

  // 设置当前节点
  const setCurrentNode = (nodeId: string) => {
    currentNodeId.value = nodeId;
  };

  // 获取当前节点信息
  const getCurrentNode = () => {
    return nodes.value.find(node => node.node_id === currentNodeId.value);
  };

  // 刷新节点列表
  const refreshNodes = () => {
    return fetchNodes();
  };

  return {
    nodes,
    currentNodeId,
    loading,
    error,
    fetchNodes,
    setCurrentNode,
    getCurrentNode,
    refreshNodes
  };
});
