import api from './index';

export interface Agent {
  node_id: string;
  hostname: string;
  ip: string;
  status: string;
  last_heartbeat: string;
  registered_at?: string;
  latest_metrics?: any;
}

export interface AgentListResponse {
  success: boolean;
  data: {
    agents: Agent[];
    count: number;
  };
}

export interface AgentInfoResponse {
  success: boolean;
  data: Agent;
}

// 获取 Agent 列表
export const getAgentList = () => {
  return api.get<any, AgentListResponse>('/agent/list');
};

// 获取单个 Agent 信息
export const getAgentInfo = (nodeId: string) => {
  return api.get<any, AgentInfoResponse>(`/agent/${nodeId}`);
};

// 删除 Agent
export const deleteAgent = (nodeId: string) => {
  return api.delete(`/agent/${nodeId}`);
};
