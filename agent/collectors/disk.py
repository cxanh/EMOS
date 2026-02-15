import psutil
import platform

def collect_disk_usage():
    """采集磁盘使用率"""
    try:
        # Windows 使用 C:/, Linux/Mac 使用 /
        path = 'C:\\' if platform.system() == 'Windows' else '/'
        disk = psutil.disk_usage(path)
        return round(disk.percent, 2)
    except Exception as e:
        print(f"Error collecting disk usage: {e}")
        return 0.0
