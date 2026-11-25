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
    run_ping_diagnostic,
    diagnostic_history,
    dynamic_topology,
    PingRequest,
    BenchmarkRequest,
    TcpProbeRequest,
    run_tcp_probe,
    run_benchmark,
    list_automation_jobs,
    list_alerts,
    analytics_summary,
    ai_anomaly_scan,
    list_inventory,
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
        for fn in [root, health_check, system_information, network_environment, module_status, diagnostic_history, dynamic_topology]:
            result = fn()
            serialized = json.dumps(result)
            assert len(serialized) > 0


class TestDiagnosticsAndTopologyEndpoints:
    def test_topology_returns_nodes_and_edges(self):
        result = dynamic_topology()
        assert result["status"] == "ok"
        assert "nodes" in result
        assert "edges" in result
        assert len(result["nodes"]) >= 3
        assert len(result["edges"]) >= 2

    def test_diagnostic_history_returns_records(self):
        result = diagnostic_history(limit=10)
        assert result["status"] == "ok"
        assert "records" in result
        assert isinstance(result["records"], list)

    def test_ping_endpoint_returns_metrics(self):
        req = PingRequest(target="127.0.0.1", count=1, timeout_ms=1000)
        result = run_ping_diagnostic(req)
        assert result["status"] == "ok"
        assert "data" in result
        assert result["data"]["target"] == "127.0.0.1"
        assert result["data"]["packets_sent"] == 1


class TestEnterpriseEngines:
    def test_local_tcp_throughput_benchmark(self):
        req = BenchmarkRequest(mode="throughput_tcp", target="127.0.0.1", duration=1, streams=2)
        result = run_benchmark(req)
        assert result["status"] == "ok"
        assert result["data"]["throughput_mbps"] > 0

    def test_automation_jobs_list(self):
        result = list_automation_jobs()
        assert result["status"] == "ok"
        assert isinstance(result["jobs"], list)
        assert len(result["jobs"]) >= 1

    def test_alerts_list(self):
        result = list_alerts(limit=10)
        assert result["status"] == "ok"
        assert isinstance(result["events"], list)

    def test_analytics_summary(self):
        result = analytics_summary(limit=20)
        assert result["status"] == "ok"
        assert "analytics" in result
        assert "total_tests" in result["analytics"]

    def test_ai_anomaly_scan(self):
        result = ai_anomaly_scan()
        assert result["status"] == "ok"
        assert "analysis" in result
        assert "model" in result["analysis"]

    def test_inventory_list(self):
        result = list_inventory()
        assert result["status"] == "ok"
        assert len(result["nodes"]) >= 2

    def test_tcp_probe_closed_port(self):
        req = TcpProbeRequest(target="127.0.0.1", port=65432, count=1, timeout_ms=300)
        result = run_tcp_probe(req)
        assert result["status"] == "ok"
        assert result["data"]["packets_sent"] == 1
        assert result["data"]["avg_rtt_ms"] is None
        assert result["data"]["jitter_ms"] is None


class TestPhase2DataIntegrity:
    """Tests for Phase 2 data integrity, health derivation, and anomaly explainability."""

    def test_database_info_truthful_sqlite(self):
        from core.diagnostics import get_database_info

        info = get_database_info()
        assert info["engine"] == "SQLite"
        assert info["path"] == "data/netpulse.db"
        assert info["status"] in ("connected", "initializing")

    def test_empty_dataset_returns_none_not_fake_zero_or_hundred(self, tmp_path, monkeypatch):
        import core.diagnostics as diag
        import core.engines as eng

        temp_db = tmp_path / "empty_netpulse.db"
        monkeypatch.setattr(diag, "DB_PATH", temp_db)
        monkeypatch.setattr(eng, "DB_PATH", temp_db)
        diag._init_db()

        summary = eng.get_analytics_summary(window="1h", limit=500)
        assert summary["window"] == "1h"
        assert summary["window_label"] == "Last 1h"
        assert summary["total_tests"] == 0
        assert summary["pass_rate_pct"] is None
        assert summary["success_rate_pct"] is None
        assert summary["p50_ms"] is None
        assert summary["p95_ms"] is None
        assert summary["p99_ms"] is None
        assert summary["series"]["timestamps"] == []
        assert summary["series"]["latency"] == []

        health = eng.compute_global_health()
        assert health["status"] == "healthy"
        assert health["recent_total"] == 0

    def test_outage_null_latency_health_alert_and_anomaly_agreement(self, tmp_path, monkeypatch):
        import sqlite3
        from datetime import datetime, timezone
        import core.diagnostics as diag
        import core.engines as eng

        temp_db = tmp_path / "outage_netpulse.db"
        monkeypatch.setattr(diag, "DB_PATH", temp_db)
        monkeypatch.setattr(eng, "DB_PATH", temp_db)
        diag._init_db()

        # Insert deterministic healthy baseline runs, a high-jitter anomaly, and a failed outage run
        now_iso = datetime.now(timezone.utc).isoformat()
        with sqlite3.connect(temp_db) as conn:
            for idx in range(5):
                conn.execute(
                    """INSERT INTO test_history
                    (id, timestamp, test_type, target, status, duration_ms, packets_sent, packets_received, avg_rtt_ms, min_rtt_ms, max_rtt_ms, jitter_ms, packet_loss_pct, summary)
                    VALUES (?, ?, 'ping', '1.1.1.1', 'passed', 25.0, 4, 4, 12.0, 11.0, 13.0, 0.8, 0.0, 'ok')""",
                    (f"ok-{idx}", now_iso),
                )
            conn.execute(
                """INSERT INTO test_history
                (id, timestamp, test_type, target, status, duration_ms, packets_sent, packets_received, avg_rtt_ms, min_rtt_ms, max_rtt_ms, jitter_ms, packet_loss_pct, summary)
                VALUES (?, ?, 'ping', '8.8.8.8', 'passed', 48.0, 4, 4, 14.0, 10.0, 40.0, 24.5, 0.0, 'high jitter')""",
                ("anom-jitter", now_iso),
            )
            conn.commit()
        diag.execute_tcp_probe("127.0.0.1", port=65432, count=1, timeout_ms=200)

        # Verify windowed analytics returns None (not 0.0) for failed outage latency/jitter
        summary = eng.get_analytics_summary(window="1h", limit=500)
        assert summary["total_tests"] >= 7
        assert summary["outage_count"] >= 1
        failed_indices = [
            i for i, st in enumerate(summary["series"]["statuses"]) if st != "passed"
        ]
        assert len(failed_indices) >= 1
        for idx in failed_indices:
            assert summary["series"]["latency"][idx] is None
            assert summary["series"]["jitter"][idx] is None
        assert summary["pass_rate_pct"] == summary["success_rate_pct"]

        # Verify health endpoint derives non-healthy status when recent probes fail or latency spikes
        health = eng.compute_global_health()
        assert health["status"] in ("degraded", "critical")
        assert health["recent_failed"] >= 1

        # Verify Health Monitor alert was created cleanly
        events = eng.get_events(limit=20)
        assert any(ev["source"] == "Health Monitor" for ev in events)

        # Verify high gateway latency triggers degraded health
        lat_health = eng.compute_global_health(gateway_latency_ms=180.0)
        assert lat_health["status"] in ("degraded", "critical")

        # Verify anomaly labels and reasons agree, and false-positive toggle persists
        analysis = eng.run_ai_anomaly_analysis()
        assert analysis["status"] == "completed"
        assert len(analysis["results"]) >= 6
        jitter_row = [r for r in analysis["results"] if r["id"] == "anom-jitter"][0]
        assert jitter_row["classification"] == "anomaly"
        assert "jitter" in jitter_row["reason"].lower()

        for rec in analysis["results"]:
            assert "confidence_pct" in rec
            assert "threshold" in rec
            assert "reason" in rec
            if rec["classification"] == "anomaly":
                assert "within baseline" not in rec["reason"].lower()
            elif rec["classification"] == "normal":
                assert "within baseline" in rec["reason"].lower()

        assert eng.set_anomaly_false_positive("anom-jitter", True, "Expected wireless jitter spike") is True
        after_fp = eng.run_ai_anomaly_analysis()
        updated = [r for r in after_fp["results"] if r["id"] == "anom-jitter"][0]
        assert updated["classification"] == "false_positive"
        assert updated["false_positive"] is True
        assert after_fp["false_positives_count"] >= 1
        assert eng.set_anomaly_false_positive("anom-jitter", False) is True

    def test_api_routes_window_and_false_positive(self, tmp_path, monkeypatch):
        import core.diagnostics as diag
        import core.engines as eng
        from backend.main import (
            FalsePositiveRequest,
            ai_toggle_false_positive,
            analytics_summary,
            health_check,
        )

        temp_db = tmp_path / "route_netpulse.db"
        monkeypatch.setattr(diag, "DB_PATH", temp_db)
        monkeypatch.setattr(eng, "DB_PATH", temp_db)
        diag._init_db()
        diag.execute_tcp_probe("127.0.0.1", port=65432, count=1, timeout_ms=200)

        h = health_check()
        assert h["status"] == "healthy"
        assert h["database_info"]["engine"] == "SQLite"
        assert h["probe_health"]["status"] in ("degraded", "critical")

        a1 = analytics_summary(window="15m")
        a2 = analytics_summary(window="1h")
        assert a1["analytics"]["window"] == "15m"
        assert a1["analytics"]["pass_rate_pct"] == a2["analytics"]["pass_rate_pct"]

        history = diag.get_test_history(limit=1)
        tid = history[0]["id"]
        res = ai_toggle_false_positive(tid, FalsePositiveRequest(false_positive=True, note="Unit test"))
        assert res["status"] == "ok"
        assert res["false_positive"] is True


class TestPhase4ListScalabilityAndAlerts:
    """Tests for Phase 4 alert lifecycle states, snooze, bulk updates, and 500+ row pagination queries."""

    def test_alert_lifecycle_open_ack_resolve_snooze_and_bulk(self, tmp_path, monkeypatch):
        import core.diagnostics as diag
        import core.engines as eng
        from backend.main import (
            AlertStateRequest,
            BulkAlertStateRequest,
            bulk_set_alert_state,
            list_alerts,
            set_alert_state,
        )

        temp_db = tmp_path / "phase4_alerts.db"
        monkeypatch.setattr(diag, "DB_PATH", temp_db)
        monkeypatch.setattr(eng, "DB_PATH", temp_db)
        diag._init_db()

        id1 = diag.log_event("critical", "Probe", "First failure")["id"]
        id2 = diag.log_event("warning", "Probe", "Second failure")["id"]
        id3 = diag.log_event("info", "Probe", "Third notice")["id"]

        res = list_alerts(limit=500)
        by_id = {e["id"]: e for e in res["events"]}
        assert by_id[id1]["state"] == "open"
        assert by_id[id1]["acknowledged"] is False

        # Acknowledge + snooze single alert
        r_ack = set_alert_state(id1, AlertStateRequest(state="acknowledged", snooze_minutes=60))
        assert r_ack["status"] == "ok"

        # Bulk resolve id2 and id3
        r_bulk = bulk_set_alert_state(BulkAlertStateRequest(event_ids=[id2, id3], state="resolved"))
        assert r_bulk["status"] == "ok"
        assert r_bulk["updated"] == 2

        after = {e["id"]: e for e in list_alerts(limit=500)["events"]}
        assert after[id1]["state"] == "acknowledged"
        assert after[id1]["snoozed"] is True
        assert after[id2]["state"] == "resolved"
        assert after[id3]["state"] == "resolved"

    def test_500_plus_rows_alerts_history_and_anomaly(self, tmp_path, monkeypatch):
        import sqlite3
        from datetime import datetime, timedelta, timezone
        import core.diagnostics as diag
        import core.engines as eng

        temp_db = tmp_path / "phase4_scale.db"
        monkeypatch.setattr(diag, "DB_PATH", temp_db)
        monkeypatch.setattr(eng, "DB_PATH", temp_db)
        diag._init_db()

        now = datetime.now(timezone.utc)
        with sqlite3.connect(temp_db) as conn:
            hist_rows = []
            evt_rows = []
            for idx in range(520):
                ts = (now - timedelta(seconds=idx)).isoformat()
                failed = idx % 10 == 0
                hist_rows.append((
                    f"scale-{idx}",
                    ts,
                    "ping",
                    "1.1.1.1" if not failed else "127.0.0.1:65432",
                    "1.1.1.1" if not failed else "127.0.0.1",
                    "failed" if failed else "passed",
                    22.0,
                    4,
                    0 if failed else 4,
                    100.0 if failed else 0.0,
                    None if failed else 20.0,
                    None if failed else 22.0 + (idx % 5),
                    None if failed else 25.0,
                    None if failed else 1.2,
                    "Scale test row",
                ))
                evt_rows.append((
                    f"evt-scale-{idx}",
                    ts,
                    "critical" if failed else "info",
                    "ScaleTest",
                    f"Repeated event #{idx % 4}",
                    0,
                    "open",
                    None,
                ))
            conn.executemany(
                """INSERT INTO test_history
                (id, timestamp, test_type, target, resolved_ip, status, duration_ms, packets_sent, packets_received, packet_loss_pct, min_rtt_ms, avg_rtt_ms, max_rtt_ms, jitter_ms, summary)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                hist_rows,
            )
            conn.executemany(
                "INSERT INTO events (id, timestamp, level, source, message, acknowledged, status, snoozed_until) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                evt_rows,
            )
            conn.commit()

        assert len(diag.get_test_history(limit=600)) == 520
        assert len(eng.get_events(limit=600)) == 520
        analysis = eng.run_ai_anomaly_analysis(limit=600)
        assert analysis["status"] == "completed"
        assert analysis["samples_analyzed"] >= 450
        inv = eng.get_inventory_nodes()
        assert len(inv) >= 2
        assert any("latency_ms" in n and "last_seen" in n for n in inv)
