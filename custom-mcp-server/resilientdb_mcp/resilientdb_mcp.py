#!/usr/bin/env python3
"""
ResilientDB Ansible MCP Server

This MCP server provides tools for managing and interacting with ResilientDB
deployments via Ansible. It automatically clones the required repository and
manages the deployment lifecycle.
"""

import asyncio
import subprocess
import json
import os
import yaml
import shutil
from pathlib import Path
from typing import Any, Dict, List, Optional
from types import SimpleNamespace
import aiohttp

from mcp.server import Server
from mcp.server.models import InitializationOptions
from mcp.types import (
    Tool,
    TextContent,
)
from mcp.server.stdio import stdio_server

# Configuration
REPO_URL = "https://github.com/apache/incubator-resilientdb-ansible.git"
WORK_DIR = Path.home() / ".resilientdb-mcp"  # Working directory for MCP
ANSIBLE_DIR = WORK_DIR / "incubator-resilientdb-ansible"
INVENTORY_FILE = ANSIBLE_DIR / "inventories/production/hosts"
PLAYBOOK_FILE = ANSIBLE_DIR / "site.yml"

# API endpoints for the deployed services
CROW_BASE_URL = "http://localhost:18000"
GRAPHQL_URL = "http://localhost:8000/graphql"
NGINX_URL = "http://localhost"

class ResilientDBMCP:
    """MCP server for ResilientDB Ansible management"""
    
    def __init__(self):
        self.server = Server("resilientdb-ansible")
        self.initialized = False
        self.setup_handlers()
        
    def setup_handlers(self):
        """Register all tool handlers"""
        
        @self.server.list_tools()
        async def list_tools() -> List[Tool]:
            tools = []
            
            # Always provide initialization tool
            tools.append(Tool(
                name="initialize_environment",
                description="Initialize the ResilientDB environment by cloning the repository and checking dependencies",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "force": {
                            "type": "boolean",
                            "description": "Force re-initialization even if already set up",
                            "default": False
                        }
                    }
                }
            ))
            
            # Core deployment tools
            tools.extend([
                Tool(
                    name="check_dependencies",
                    description="Check if all required dependencies (ansible, git, python, etc.) are installed",
                    inputSchema={
                        "type": "object",
                        "properties": {}
                    }
                ),
                Tool(
                    name="install_dependencies",
                    description="Attempt to install missing dependencies (requires appropriate permissions)",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "use_sudo": {
                                "type": "boolean",
                                "description": "Use sudo for installation",
                                "default": True
                            }
                        }
                    }
                ),
                Tool(
                    name="run_playbook",
                    description="Run the Ansible playbook to deploy ResilientDB",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "tags": {
                                "type": "string",
                                "description": "Comma-separated tags (e.g., 'resilientdb,nginx'). Options: all, common, resilientdb, crow, graphql, nginx",
                                "default": "all"
                            },
                            "limit": {
                                "type": "string",
                                "description": "Limit to specific hosts",
                                "default": "all"
                            },
                            "check": {
                                "type": "boolean",
                                "description": "Run in check mode (dry run)",
                                "default": False
                            }
                        }
                    }
                ),
                Tool(
                    name="quick_deploy",
                    description="Quick deployment using the complete-startup.sh script for all services",
                    inputSchema={
                        "type": "object",
                        "properties": {}
                    }
                ),
                Tool(
                    name="docker_build",
                    description="Build the Docker image for containerized deployment",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "tag": {
                                "type": "string",
                                "description": "Docker image tag",
                                "default": "resilientdb-ansible:latest"
                            }
                        }
                    }
                ),
                Tool(
                    name="docker_run",
                    description="Run the ResilientDB container",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "tag": {
                                "type": "string",
                                "description": "Docker image tag to run",
                                "default": "resilientdb-ansible:latest"
                            },
                            "detach": {
                                "type": "boolean",
                                "description": "Run container in background",
                                "default": True
                            }
                        }
                    }
                ),
            ])
            
            # Service management tools
            tools.extend([
                Tool(
                    name="check_services",
                    description="Check the status of all ResilientDB services",
                    inputSchema={
                        "type": "object",
                        "properties": {}
                    }
                ),
                Tool(
                    name="restart_service",
                    description="Restart a specific service",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "service": {
                                "type": "string",
                                "enum": ["resilientdb-kv@1", "resilientdb-kv@2", 
                                        "resilientdb-kv@3", "resilientdb-kv@4",
                                        "resilientdb-client", "crow-http", 
                                        "graphql", "nginx", "all"],
                                "description": "Service to restart (or 'all' for all services)"
                            }
                        },
                        "required": ["service"]
                    }
                ),
                Tool(
                    name="view_logs",
                    description="View logs for a specific service",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "service": {
                                "type": "string",
                                "enum": ["resilientdb-kv@1", "resilientdb-kv@2",
                                        "resilientdb-kv@3", "resilientdb-kv@4",
                                        "resilientdb-client", "crow-http", 
                                        "graphql", "nginx"],
                                "description": "Service name to view logs for"
                            },
                            "lines": {
                                "type": "integer",
                                "description": "Number of log lines to retrieve",
                                "default": 50
                            }
                        },
                        "required": ["service"]
                    }
                ),
            ])
            
            # API interaction tools
            tools.extend([
                Tool(
                    name="commit_transaction",
                    description="Commit a transaction via the Crow HTTP API",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "transaction_id": {
                                "type": "string",
                                "description": "Transaction ID"
                            },
                            "value": {
                                "type": "string",
                                "description": "Transaction value/data"
                            }
                        },
                        "required": ["transaction_id", "value"]
                    }
                ),
                Tool(
                    name="get_transaction",
                    description="Get a transaction by ID",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "transaction_id": {
                                "type": "string",
                                "description": "Transaction ID to retrieve"
                            }
                        },
                        "required": ["transaction_id"]
                    }
                ),
                Tool(
                    name="graphql_query",
                    description="Execute a GraphQL query",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "GraphQL query string"
                            },
                            "variables": {
                                "type": "object",
                                "description": "Optional GraphQL variables",
                                "default": {}
                            }
                        },
                        "required": ["query"]
                    }
                ),
            ])
            
            # Diagnostic tools
            tools.extend([
                Tool(
                    name="check_ports",
                    description="Check which ports are listening",
                    inputSchema={
                        "type": "object",
                        "properties": {}
                    }
                ),
                Tool(
                    name="view_config",
                    description="View configuration for a specific component",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "component": {
                                "type": "string",
                                "enum": ["resilientdb", "crow", "graphql", "nginx", "all"],
                                "description": "Component configuration to view"
                            }
                        },
                        "required": ["component"]
                    }
                ),
                Tool(
                    name="update_config",
                    description="Update configuration values in the Ansible inventory",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "key": {
                                "type": "string",
                                "description": "Configuration key to update (e.g., 'crow_port', 'bazel_jobs')"
                            },
                            "value": {
                                "type": "string",
                                "description": "New value for the configuration key"
                            }
                        },
                        "required": ["key", "value"]
                    }
                ),
            ])
            
            return tools
        
        @self.server.call_tool()
        async def call_tool(name: str, arguments: Any) -> List[TextContent]:
            """Handle tool execution"""
            
            # Handle initialization first
            if name == "initialize_environment":
                result = await self._initialize_environment(
                    arguments.get("force", False)
                )
            elif name == "check_dependencies":
                result = await self._check_dependencies()
            elif name == "install_dependencies":
                result = await self._install_dependencies(
                    arguments.get("use_sudo", True)
                )
            # Deployment tools
            elif name == "run_playbook":
                result = await self._run_playbook(
                    arguments.get("tags", "all"),
                    arguments.get("limit", "all"),
                    arguments.get("check", False)
                )
            elif name == "quick_deploy":
                result = await self._quick_deploy()
            elif name == "docker_build":
                result = await self._docker_build(
                    arguments.get("tag", "resilientdb-ansible:latest")
                )
            elif name == "docker_run":
                result = await self._docker_run(
                    arguments.get("tag", "resilientdb-ansible:latest"),
                    arguments.get("detach", True)
                )
            # Service management
            elif name == "check_services":
                result = await self._check_services()
            elif name == "restart_service":
                result = await self._restart_service(arguments["service"])
            elif name == "view_logs":
                result = await self._view_logs(
                    arguments["service"],
                    arguments.get("lines", 50)
                )
            # API interactions
            elif name == "commit_transaction":
                result = await self._commit_transaction(
                    arguments["transaction_id"],
                    arguments["value"]
                )
            elif name == "get_transaction":
                result = await self._get_transaction(arguments["transaction_id"])
            elif name == "graphql_query":
                result = await self._graphql_query(
                    arguments["query"],
                    arguments.get("variables", {})
                )
            # Diagnostics
            elif name == "check_ports":
                result = await self._check_ports()
            elif name == "view_config":
                result = await self._view_config(arguments["component"])
            elif name == "update_config":
                result = await self._update_config(
                    arguments["key"],
                    arguments["value"]
                )
            else:
                result = f"Unknown tool: {name}"
            
            return [TextContent(type="text", text=result)]
    
    async def _initialize_environment(self, force: bool = False) -> str:
        """Initialize the environment by cloning the repository"""
        results = []
        
        # Create work directory
        WORK_DIR.mkdir(parents=True, exist_ok=True)
        
        # Check if repo already exists
        if ANSIBLE_DIR.exists() and not force:
            results.append(f"Repository already exists at {ANSIBLE_DIR}")
            self.initialized = True
        else:
            # Remove existing if force
            if ANSIBLE_DIR.exists() and force:
                shutil.rmtree(ANSIBLE_DIR)
                results.append(f"Removed existing repository")
            
            # Clone repository
            try:
                cmd = ["git", "clone", REPO_URL, str(ANSIBLE_DIR)]
                result = subprocess.run(cmd, capture_output=True, text=True)
                
                if result.returncode == 0:
                    results.append(f"Successfully cloned repository to {ANSIBLE_DIR}")
                    self.initialized = True
                else:
                    results.append(f"Failed to clone repository: {result.stderr}")
                    return "\n".join(results)
            except FileNotFoundError:
                results.append("Error: git is not installed. Please run 'install_dependencies' first")
                return "\n".join(results)
        
        # Check for key files
        key_files = {
            "Playbook": PLAYBOOK_FILE,
            "Inventory": INVENTORY_FILE,
            "Dockerfile": ANSIBLE_DIR / "dockerfile",
            "Complete startup script": ANSIBLE_DIR / "complete-startup.sh"
        }
        
        for name, path in key_files.items():
            if path.exists():
                results.append(f"{name} found: {path}")
            else:
                results.append(f"{name} missing: {path}")
        
        return "\n".join(results)
    
    async def _check_dependencies(self) -> str:
        """Check for required dependencies"""
        deps = {
            "git": "Version control for cloning repositories",
            "ansible": "Configuration management tool",
            "ansible-playbook": "Ansible playbook executor",
            "python3": "Python interpreter",
            "pip": "Python package manager",
            "docker": "Container runtime (optional)",
            "netstat": "Network diagnostics (optional)",
        }
        
        results = []
        missing = []
        
        for cmd, description in deps.items():
            if shutil.which(cmd):
                try:
                    # Try to get version
                    version_cmd = [cmd, "--version"] if cmd != "netstat" else ["echo", "installed"]
                    version_result = subprocess.run(
                        version_cmd, 
                        capture_output=True, 
                        text=True,
                        timeout=5
                    )
                    version = version_result.stdout.split('\n')[0].strip()
                    results.append(f"{cmd}: {version}")
                except:
                    results.append(f"{cmd}: installed")
            else:
                results.append(f"{cmd}: NOT FOUND - {description}")
                if cmd in ["git", "ansible", "ansible-playbook", "python3"]:
                    missing.append(cmd)
        
        if missing:
            results.append(f"\nMissing critical dependencies: {', '.join(missing)}")
            results.append("Run 'install_dependencies' to attempt automatic installation")
        else:
            results.append("\nAll critical dependencies are installed!")
        
        return "\n".join(results)
    
    async def _install_dependencies(self, use_sudo: bool = True) -> str:
        """Attempt to install missing dependencies"""
        # TODO
        return ""
    
    async def _run_playbook(self, tags: str, limit: str, check: bool) -> str:
        """Run the Ansible playbook"""
        if not self.initialized:
            return "Environment not initialized. Please run 'initialize_environment' first"
        
        if not PLAYBOOK_FILE.exists():
            return f"Playbook not found at {PLAYBOOK_FILE}"
        
        cmd = [
            "ansible-playbook",
            str(PLAYBOOK_FILE),
            "-i", str(INVENTORY_FILE),
            "--tags", tags
        ]
        
        if limit != "all":
            cmd.extend(["--limit", limit])
        
        if check:
            cmd.append("--check")
        
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                cwd=str(ANSIBLE_DIR)
            )
            
            # Parse output for key information
            output_lines = result.stdout.split('\n')
            summary = []
            
            # Look for PLAY RECAP
            recap_started = False
            for line in output_lines:
                if "PLAY RECAP" in line:
                    recap_started = True
                    summary.append("\n=== DEPLOYMENT SUMMARY ===")
                elif recap_started and line.strip():
                    summary.append(line)
            
            if result.returncode == 0:
                return f"Playbook executed successfully!\n" + "\n".join(summary[-10:])
            else:
                error_info = result.stderr[-500:] if result.stderr else result.stdout[-500:]
                return f"Playbook failed:\n{error_info}\n" + "\n".join(summary)
        except FileNotFoundError:
            return "Error: ansible-playbook not found. Please run 'install_dependencies' first"
        except Exception as e:
            return f"Error running playbook: {e}"
    
    async def _quick_deploy(self) -> str:
        """Run the complete startup script for quick deployment"""
        if not self.initialized:
            return "Environment not initialized. Please run 'initialize_environment' first"
        
        startup_script = ANSIBLE_DIR / "complete-startup.sh"
        
        if not startup_script.exists():
            return f"Startup script not found at {startup_script}"
        
        try:
            # Make script executable
            os.chmod(startup_script, 0o755)
            
            # Run the script
            result = subprocess.run(
                ["bash", str(startup_script)],
                capture_output=True,
                text=True,
                cwd=str(ANSIBLE_DIR),
                timeout=300  # 5 minute timeout
            )
            
            output = result.stdout[-2000:]  # Last 2000 chars
            
            if "All services started" in output:
                return f"Quick deployment completed successfully!\n{output}"
            else:
                return f"Quick deployment output:\n{output}"
        except subprocess.TimeoutExpired:
            return "Deployment timed out after 5 minutes. Services may still be starting."
        except Exception as e:
            return f"Error during quick deployment: {e}"
    
    async def _docker_build(self, tag: str) -> str:
        if not self.initialized:
            return "Environment not initialized. Please run 'initialize_environment' first"
        
        dockerfile = ANSIBLE_DIR / "dockerfile"
        if not dockerfile.exists():
            return f"Dockerfile not found at {dockerfile}"
        
        try:
            cmd = ["docker", "build", "-t", tag, str(ANSIBLE_DIR)]
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                return f"Docker image built successfully: {tag}"
            else:
                return f"Docker build failed:\n{result.stderr[-1000:]}"
        except FileNotFoundError:
            return "Docker is not installed. Please install Docker first."
        except Exception as e:
            return f"Error building Docker image: {e}"
    
    async def _docker_run(self, tag: str, detach: bool) -> str:
        """Run Docker container"""
        try:
            cmd = [
                "docker", "run",
                "--privileged",
                "-v", "/sys/fs/cgroup:/sys/fs/cgroup:ro",
                "-v", "/tmp:/tmp",
                "-v", "/run:/run",
                "-p", "80:80",
                "-p", "18000:18000",
                "-p", "8000:8000",
                "--name", "resilientdb-container"
            ]
            
            if detach:
                cmd.append("-d")
            
            cmd.append(tag)
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                container_id = result.stdout.strip()[:12]
                return f"Container started successfully: {container_id}\n" \
                       f"Access services at:\n" \
                       f"- Nginx: http://localhost\n" \
                       f"- GraphQL: http://localhost:8000/graphql\n" \
                       f"- Crow API: http://localhost:18000"
            else:
                if "already in use" in result.stderr:
                    return "Container name already in use. Stop existing container first:\n" \
                           "docker stop resilientdb-container && docker rm resilientdb-container"
                return f"Failed to start container:\n{result.stderr[-500:]}"
        except FileNotFoundError:
            return "Docker is not installed. Please install Docker first."
        except Exception as e:
            return f"Error running container: {e}"
    
    # ... (rest of the methods remain the same as in the original)
    async def _check_services(self) -> str:
        """Check status of all services"""
        services = [
            "nginx", "crow-http", "graphql", "resilientdb-client",
            "resilientdb-kv@1", "resilientdb-kv@2", 
            "resilientdb-kv@3", "resilientdb-kv@4"
        ]
        
        status_info = []
        for service in services:
            try:
                result = subprocess.run(
                    ["systemctl", "is-active", service],
                    capture_output=True,
                    text=True
                )
                status = result.stdout.strip()
                emoji = "✓" if status == "active" else "✗"
                status_info.append(f"{emoji} {service}: {status}")
            except Exception as e:
                status_info.append(f"? {service}: error checking")
        
        return "Service Status:\n" + "\n".join(status_info)
    
    async def _restart_service(self, service: str) -> str:
        """Restart a service or all services"""
        if service == "all":
            services = [
                "nginx", "crow-http", "graphql", "resilientdb-client",
                "resilientdb-kv@1", "resilientdb-kv@2",
                "resilientdb-kv@3", "resilientdb-kv@4"
            ]
            results = []
            for svc in services:
                try:
                    subprocess.run(["systemctl", "restart", svc], capture_output=True)
                    results.append(f"Restarted {svc}")
                except:
                    results.append(f"Failed to restart {svc}")
            return "\n".join(results)
        else:
            try:
                result = subprocess.run(
                    ["systemctl", "restart", service],
                    capture_output=True,
                    text=True
                )
                
                if result.returncode == 0:
                    return f"Service {service} restarted successfully"
                else:
                    return f"Error restarting {service}: {result.stderr}"
            except Exception as e:
                return f"Error restarting service: {e}"
    
    async def _view_logs(self, service: str, lines: int) -> str:
        """View service logs"""
        try:
            result = subprocess.run(
                ["journalctl", "-u", service, "-n", str(lines), "--no-pager"],
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                return f"=== Last {lines} lines of {service} logs ===\n{result.stdout}"
            else:
                return f"Error fetching logs: {result.stderr}"
        except Exception as e:
            return f"Error viewing logs: {e}"
    
    async def _commit_transaction(self, transaction_id: str, value: str) -> str:
        """Commit a transaction via Crow API"""
        url = f"{CROW_BASE_URL}/v1/transactions/commit"
        payload = {
            "id": transaction_id,
            "value": value
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload) as response:
                    result = await response.text()
                    return f"Transaction committed (status {response.status}):\n{result}"
        except Exception as e:
            return f"Error committing transaction: {e}"
    
    async def _get_transaction(self, transaction_id: str) -> str:
        """Get transaction by ID"""
        url = f"{CROW_BASE_URL}/v1/transactions/{transaction_id}"
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as response:
                    result = await response.text()
                    return f"Transaction data (status {response.status}):\n{result}"
        except Exception as e:
            return f"Error fetching transaction: {e}"
    
    async def _graphql_query(self, query: str, variables: Dict) -> str:
        """Execute GraphQL query"""
        payload = {
            "query": query,
            "variables": variables
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(GRAPHQL_URL, json=payload) as response:
                    result = await response.json()
                    return f"GraphQL Response:\n{json.dumps(result, indent=2)}"
        except Exception as e:
            return f"Error executing GraphQL query: {e}"
    
    async def _check_ports(self) -> str:
        """Check listening ports"""
        try:
            result = subprocess.run(
                ["netstat", "-tlnp"],
                capture_output=True,
                text=True
            )
            
            # Filter for relevant ports
            relevant_ports = ["80", "8000", "18000", "10001", "10002", 
                             "10003", "10004", "10005"]
            lines = result.stdout.split('\n')
            filtered = [line for line in lines 
                       if any(f":{port}" in line for port in relevant_ports)]
            
            if filtered:
                return "Listening ports:\n" + "\n".join(filtered)
            else:
                return "No ResilientDB-related ports found listening"
        except FileNotFoundError:
            # Try ss as alternative
            try:
                result = subprocess.run(
                    ["ss", "-tlnp"],
                    capture_output=True,
                    text=True
                )
                return f"Listening sockets:\n{result.stdout}"
            except:
                return "Neither netstat nor ss available for port checking"
        except Exception as e:
            return f"Error checking ports: {e}"
    
    async def _view_config(self, component: str) -> str:
        """View component configuration"""
        if not self.initialized:
            return "Environment not initialized. Please run 'initialize_environment' first"
        
        config_file = ANSIBLE_DIR / "inventories/production/group_vars/all.yml"
        
        if not config_file.exists():
            return f"Configuration file not found at {config_file}"
        
        try:
            with open(config_file, 'r') as f:
                config = yaml.safe_load(f)
            
            if component == "all":
                return f"Full configuration:\n{yaml.dump(config, default_flow_style=False)}"
            else:
                relevant_keys = []
                for key in config.keys():
                    if component.lower() in key.lower() or key in ["components", "bazel_version", "java_home_map"]:
                        relevant_keys.append(key)
                
                filtered_config = {k: config[k] for k in relevant_keys if k in config}
                
                if filtered_config:
                    return f"Configuration for {component}:\n{yaml.dump(filtered_config, default_flow_style=False)}"
                else:
                    return f"No configuration found for component: {component}"
        except Exception as e:
            return f"Error reading configuration: {e}"
    
    async def _update_config(self, key: str, value: str) -> str:
        """Update configuration value"""
        if not self.initialized:
            return "Environment not initialized. Please run 'initialize_environment' first"
        
        config_file = ANSIBLE_DIR / "inventories/production/group_vars/all.yml"
        
        try:
            with open(config_file, 'r') as f:
                config = yaml.safe_load(f)
            
            # Convert value to appropriate type
            if value.isdigit():
                value = int(value)
            elif value.lower() in ["true", "false"]:
                value = value.lower() == "true"
            
            config[key] = value
            
            # Write back
            with open(config_file, 'w') as f:
                yaml.dump(config, f, default_flow_style=False)
            
            return f"Updated {key} = {value} in configuration"
        except Exception as e:
            return f"Error updating configuration: {e}"
    
    async def run(self):
        """Run the MCP server"""
        async with stdio_server() as (read_stream, write_stream):

            notification_opts = SimpleNamespace(
            tools_changed=None,
            resources_changed=None,
            prompts_changed=None
        )
            capabilities = self.server.get_capabilities(
            notification_options=notification_opts,
            experimental_capabilities={}
        )
            
            await self.server.run(read_stream, write_stream, InitializationOptions(
                server_name="resilientdb-ansible",
                server_version="0.1.0",
                capabilities=capabilities
            ))

async def main():
    """Main entry point"""
    server = ResilientDBMCP()
    await server.run()

if __name__ == "__main__":
    asyncio.run(main())