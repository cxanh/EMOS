import psutil

def collect_network_usage():
    """采集网络流量"""
    try:
        net_io = psutil.net_io_counters()
        return {
            'network_rx_bytes': net_io.bytes_recv,
            'network_tx_bytes': net_io.bytes_sent
        }
    except Exception as e:
        print(f"Error collecting network usage: {e}")
        return {
            'network_rx_bytes': 0,
            'network_tx_bytes': 0
        }
