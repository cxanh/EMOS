import psutil

def collect_memory_usage():
    """采集内存使用率"""
    try:
        memory = psutil.virtual_memory()
        return round(memory.percent, 2)
    except Exception as e:
        print(f"Error collecting memory usage: {e}")
        return 0.0
