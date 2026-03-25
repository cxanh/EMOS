import api from './index';

export interface Agent {
  node_id: string;
  hostname: string;
  display_name?: string;
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

export const getAgentList = () => {
  return api.get<any, AgentListResponse>('/agent/list');
};

export const getAgentInfo = (nodeId: string) => {
  return api.get<any, AgentInfoResponse>(`/agent/${nodeId}`);
};

export const deleteAgent = (nodeId: string) => {
  return api.delete(`/agent/${nodeId}`);
};
