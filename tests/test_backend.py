"""
NetPulse AI — Backend Unit Tests
==================================
Tests the FastAPI backend by directly testing endpoints, constants,
and helper functions. Completely synchronous and robust.
"""

import json
import os
import sys

# Ensure the project root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.main import (
    APP_NAME,
    APP_VERSION,
    APP_DESCRIPTION,
    _utc_now,
    _system_info,
    _network_environment,
    root,
    health_check,
    system_information,
    network_environment,
    module_status,
)


# ═══════════════════════════════════════════════════════════════════════════
# Constants
# ═══════════════════════════════════════════════════════════════════════════
class TestAppConstants:
    def test_app_name(self):
        assert APP_NAME == "NetPulse AI"

    def test_app_version(self):
        assert APP_VERSION == "1.0.0-day1"

    def test_app_description(self):
        assert isinstance(APP_DESCRIPTION, str)
        assert len(APP_DESCRIPTION) > 10


# ═══════════════════════════════════════════════════════════════════════════
# UTC timestamp helper
# ═══════════════════════════════════════════════════════════════════════════
class TestUtcNow:
    def test_returns_string(self):
        assert isinstance(_utc_now(), str)

    def test_contains_t_separator(self):
        ts = _utc_now()
        assert "T" in ts

    def test_is_iso_format(self):
        ts = _utc_now()
        assert len(ts) > 19


# ═══════════════════════════════════════════════════════════════════════════
# System info helper
# ═══════════════════════════════════════════════════════════════════════════
class TestSystemInfo:
    def test_returns_dict(self):
        info = _system_info()
        assert isinstance(info, dict)

    def test_contains_os(self):
        info = _system_info()
        assert "os" in info
        assert isinstance(info["os"], str)
        assert len(info["os"]) > 0

    def test_contains_python_version(self):
        info = _system_info()
        assert "python_version" in info
        assert sys.version in info["python_version"]

    def test_contains_hostname(self):
        info = _system_info()
        assert "hostname" in info

    def test_contains_architecture(self):
        info = _system_info()
        assert "architecture" in info

    def test_contains_os_version(self):
        info = _system_info()
        assert "os_version" in info

    def test_contains_os_release(self):
        info = _system_info()
        assert "os_release" in info

    def test_contains_processor(self):
        info = _system_info()
        assert "processor" in info

    def test_contains_cpu_counts(self):
        info = _system_info()
        assert "cpu_count_logical" in info
        assert info["cpu_count_logical"] >= 1
        assert "cpu_count_physical" in info


# ═══════════════════════════════════════════════════════════════════════════
# Network environment helper
# ═══════════════════════════════════════════════════════════════════════════
class TestNetworkEnvironmentHelper:
    def test_helper_returns_dict(self):
        env = _network_environment()
        assert isinstance(env, dict)

    def test_helper_contains_hostname_and_ip(self):
        env = _network_environment()
        assert "hostname" in env
        assert "primary_ip" in env
        assert len(env["hostname"]) > 0
        assert len(env["primary_ip"]) > 0

    def test_helper_contains_interfaces(self):
        env = _network_environment()
        assert "interfaces" in env
        assert isinstance(env["interfaces"], list)
        assert len(env["interfaces"]) > 0

    def test_helper_flags_no_scan_performed(self):
        env = _network_environment()
        assert env.get("scan_performed") is False
        assert env.get("method") == "passive_local_enumeration"


# ═══════════════════════════════════════════════════════════════════════════
# Route handler tests
# ═══════════════════════════════════════════════════════════════════════════
class TestRootEndpoint:
    def test_root_returns_dict(self):
        result = root()
        assert isinstance(result, dict)

    def test_root_has_application(self):
        result = root()
        assert result["application"] == APP_NAME

    def test_root_has_version(self):
        result = root()
        assert result["version"] == APP_VERSION

    def test_root_has_status_running(self):
        result = root()
        assert result["status"] == "running"

    def test_root_has_timestamp(self):
        result = root()
        assert "timestamp" in result
        assert len(result["timestamp"]) > 10

    def test_root_has_docs_path(self):
        result = root()
        assert result["docs"] == "/docs"


class TestHealthEndpoint:
    def test_health_returns_dict(self):
        result = health_check()
        assert isinstance(result, dict)

    def test_health_status_healthy(self):
        result = health_check()
        assert result["status"] == "healthy"

    def test_health_has_timestamp(self):
        result = health_check()
        assert "timestamp" in result

    def test_health_has_uptime_since(self):
        result = health_check()
        assert "uptime_since" in result

    def test_health_has_system(self):
        result = health_check()
        assert "system" in result
        assert "os" in result["system"]

    def test_health_has_services(self):
        result = health_check()
        assert "services" in result
        assert result["services"]["api"] == "operational"

    def test_health_environment_is_development(self):
        result = health_check()
        assert result["environment"] == "development"


class TestSystemEndpoint:
    def test_system_returns_dict(self):
        result = system_information()
        assert isinstance(result, dict)

    def test_system_has_application(self):
        result = system_information()
        assert "application" in result
        assert result["application"]["name"] == APP_NAME

    def test_system_has_system_info(self):
        result = system_information()
        assert "system" in result
        assert "os" in result["system"]


class TestNetworkEnvironmentEndpoint:
    def test_net_env_returns_dict(self):
        result = network_environment()
        assert isinstance(result, dict)
        assert result["status"] == "ok"

    def test_net_env_contains_environment_payload(self):
        result = network_environment()
        assert "network_environment" in result
        payload = result["network_environment"]
        assert "hostname" in payload
        assert "primary_ip" in payload
        assert "interfaces" in payload
        assert payload["scan_performed"] is False


class TestModulesEndpoint:
    def test_modules_returns_dict(self):
        result = module_status()
        assert isinstance(result, dict)

    def test_modules_returns_six(self):
        result = module_status()
        assert len(result["modules"]) == 6

    def test_modules_have_required_fields(self):
        result = module_status()
        for mod in result["modules"]:
            assert "name" in mod
            assert "description" in mod
            assert "status" in mod
            assert "icon" in mod

    def test_no_module_is_operational(self):
        """Day 1: no module should claim to be operational."""
        result = module_status()
        for mod in result["modules"]:
            assert mod["status"] != "operational", (
                f"{mod['name']} should not be operational in Day 1"
            )


class TestConsistency:
    def test_root_and_health_agree_on_version(self):
        r = root()
        h = health_check()
        assert r["version"] == h["version"]

    def test_all_responses_are_json_serializable(self):
        for fn in [root, health_check, system_information, network_environment, module_status]:
            result = fn()
            serialized = json.dumps(result)
            assert len(serialized) > 0
