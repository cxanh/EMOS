import psutil

def collect_cpu_usage():
    """采集 CPU 使用率"""
    try:
        cpu_percent = psutil.cpu_percent(interval=0.5)
        return round(cpu_percent, 2)
    except Exception as e:
        print(f"Error collecting CPU usage: {e}")
        return 0.0
