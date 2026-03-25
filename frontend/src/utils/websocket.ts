import { useMetricsStore } from '@/stores/metrics';
import { useAlertStore } from '@/stores/alert';

class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private url: string = '';
  private token: string = '';
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 5000;

  connect(token: string) {
    this.token = token;
    this.url = import.meta.env.VITE_WS_URL || 'ws://localhost:50001/ws/metrics';
    
    // 添加 token �?URL
    const wsUrl = `${this.url}?token=${token}`;
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('�?WebSocket connected');
        const metricsStore = useMetricsStore();
        metricsStore.setWsConnected(true);
        metricsStore.setWsError('');
        this.reconnectAttempts = 0;
        this.startHeartbeat();
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('�?WebSocket error:', error);
        const metricsStore = useMetricsStore();
        metricsStore.setWsError('WebSocket connection error');
      };
      
      this.ws.onclose = () => {
        console.warn('⚠️ WebSocket closed');
        const metricsStore = useMetricsStore();
        metricsStore.setWsConnected(false);
        this.stopHeartbeat();
        this.scheduleReconnect();
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }

  handleMessage(data: any) {
    const metricsStore = useMetricsStore();
    const alertStore = useAlertStore();
    
    switch (data.type) {
      case 'connected':
        console.log('WebSocket connected:', data.message);
        // 订阅所有节�?
        this.subscribeAll();
        break;
        
      case 'metrics':
        // 更新节点数据
        if (data.node_id && data.data) {
          metricsStore.updateMetrics(data.node_id, {
            ...data.data,
            timestamp: data.timestamp
          });
        }
        break;
        
      case 'alert':
        // 处理告警消息
        console.log('Alert message received:', data);
        alertStore.handleAlertMessage(data);
        break;
        
      case 'subscribed':
        console.log('Subscribed to:', data.node_id);
        break;
        
      case 'pong':
        // 心跳响应
        break;
        
      default:
        console.log('Unknown message type:', data.type);
    }
  }

  subscribe(nodeId: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        node_id: nodeId
      }));
    }
  }

  subscribeAll() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe_all'
      }));
    }
  }

  unsubscribe(nodeId: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'unsubscribe',
        node_id: nodeId
      }));
    }
  }

  startHeartbeat() {
    this.heartbeatTimer = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // 30�?
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      const metricsStore = useMetricsStore();
      metricsStore.setWsError('Failed to reconnect after multiple attempts');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Reconnecting in ${this.reconnectDelay / 1000}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    this.reconnectTimer = window.setTimeout(() => {
      console.log('Attempting to reconnect...');
      this.connect(this.token);
    }, this.reconnectDelay);
  }

  disconnect() {
    this.stopHeartbeat();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    const metricsStore = useMetricsStore();
    metricsStore.setWsConnected(false);
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export default new WebSocketManager();

