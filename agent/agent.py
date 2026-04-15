#!/usr/bin/env python3
"""
EOMS Agent - system metrics collection agent
"""

import time
import yaml
import requests
import logging
import socket
from datetime import datetime
from collectors.cpu import collect_cpu_usage
from collectors.memory import collect_memory_usage
from collectors.disk import collect_disk_usage
from collectors.network import collect_network_usage


class SystemAgent:
    def __init__(self, config_file='config.yaml'):
        with open(config_file, 'r', encoding='utf-8') as f:
            self.config = yaml.safe_load(f)

        self.node_id = self.config['node']['id']
        self.hostname = self.config['node'].get('hostname') or socket.gethostname()
        self.display_name = self.config['node'].get('display_name') or self.hostname

        self.server_url = self.config['server']['url']
        self.register_endpoint = self.config['server']['register_endpoint']
        self.metrics_endpoint = self.config['server']['metrics_endpoint']
        self.agent_token = self.config['server'].get('agent_token') or ''

        self.interval = self.config['collection']['interval']
        self.retry = self.config['collection']['retry']
        self.timeout = self.config['collection']['timeout']

        log_level = getattr(logging, self.config['logging']['level'])
        log_file = self.config['logging']['file']

        logging.basicConfig(
            level=log_level,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger('EOMS-Agent')
        self.registered = False

    def get_auth_headers(self):
        if not self.agent_token:
            return {}
        return {'X-Agent-Token': self.agent_token}

    def register(self):
        url = f"{self.server_url}{self.register_endpoint}"
        data = {
            'node_id': self.node_id,
            'hostname': self.hostname,
            'display_name': self.display_name,
            'ip': self.get_local_ip()
        }

        try:
            response = requests.post(url, json=data, timeout=self.timeout, headers=self.get_auth_headers())
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    self.logger.info(f"Agent registered successfully: {self.node_id} ({self.display_name})")
                    self.registered = True
                    return True
                self.logger.error(f"Registration failed: {result.get('error')}")
            else:
                self.logger.error(f"Registration failed with status code: {response.status_code}")
        except Exception as e:
            self.logger.error(f"Error during registration: {e}")

        return False

    def get_local_ip(self):
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except Exception:
            return '127.0.0.1'

    def collect_metrics(self):
        try:
            cpu_usage = collect_cpu_usage()
            memory_usage = collect_memory_usage()
            disk_usage = collect_disk_usage()
            network = collect_network_usage()

            metrics = {
                'cpu_usage': cpu_usage,
                'memory_usage': memory_usage,
                'disk_usage': disk_usage,
                **network
            }

            self.logger.debug(
                f"Metrics collected: CPU={cpu_usage}%, MEM={memory_usage}%, DISK={disk_usage}%"
            )
            return metrics
        except Exception as e:
            self.logger.error(f"Error collecting metrics: {e}")
            return None

    def send_metrics(self, metrics):
        url = f"{self.server_url}{self.metrics_endpoint}"
        data = {
            'node_id': self.node_id,
            'hostname': self.hostname,
            'display_name': self.display_name,
            'metrics': metrics,
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }

        for attempt in range(self.retry):
            try:
                response = requests.post(url, json=data, timeout=self.timeout, headers=self.get_auth_headers())
                if response.status_code == 200:
                    result = response.json()
                    if result.get('success'):
                        self.logger.debug("Metrics sent successfully")
                        return True
                    self.logger.warning(f"Server returned error: {result.get('error')}")
                else:
                    self.logger.warning(f"Failed to send metrics, status code: {response.status_code}")
            except requests.exceptions.Timeout:
                self.logger.warning(f"Request timeout (attempt {attempt + 1}/{self.retry})")
            except requests.exceptions.ConnectionError:
                self.logger.warning(f"Connection error (attempt {attempt + 1}/{self.retry})")
            except Exception as e:
                self.logger.error(f"Error sending metrics: {e}")

            if attempt < self.retry - 1:
                time.sleep(1)

        return False

    def run(self):
        self.logger.info("EOMS Agent starting...")
        self.logger.info(f"Node ID: {self.node_id}")
        self.logger.info(f"Hostname: {self.hostname}")
        self.logger.info(f"Display Name: {self.display_name}")
        self.logger.info(f"Server: {self.server_url}")
        self.logger.info(f"Collection interval: {self.interval}s")
        if not self.agent_token:
            self.logger.warning("Agent token is empty; requests may be rejected by server")

        if not self.register():
            self.logger.warning("Failed to register, will try again later")

        try:
            while True:
                if not self.registered:
                    self.register()

                metrics = self.collect_metrics()

                if metrics:
                    success = self.send_metrics(metrics)
                    if success:
                        self.logger.info(
                            f"[OK] {self.display_name} CPU: {metrics['cpu_usage']}% | "
                            f"MEM: {metrics['memory_usage']}% | DISK: {metrics['disk_usage']}%"
                        )
                    else:
                        self.logger.error("[FAIL] Failed to send metrics")

                time.sleep(self.interval)

        except KeyboardInterrupt:
            self.logger.info("Agent stopped by user")
        except Exception as e:
            self.logger.error(f"Fatal error: {e}")
        finally:
            self.logger.info("Agent shutdown")


def main():
    agent = SystemAgent()
    agent.run()


if __name__ == '__main__':
    main()
