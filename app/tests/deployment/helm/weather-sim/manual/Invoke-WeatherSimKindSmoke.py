#!/usr/bin/env python3
from __future__ import annotations

import argparse
import http.cookiejar
import json
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


def parse_args() -> argparse.Namespace:
    script_dir = Path(__file__).resolve().parent
    default_repo_root = script_dir.parents[5]
    parser = argparse.ArgumentParser(description="Run a manual KinD smoke flow for the weather-sim Helm chart.")
    parser.add_argument("--repo-root", type=Path, default=default_repo_root)
    parser.add_argument("--chart-path", type=Path)
    parser.add_argument("--cluster-name", default="weather-sim")
    parser.add_argument("--namespace", default="weather-sim")
    parser.add_argument("--api-image-tag", default="weather-sim-api:local")
    parser.add_argument("--web-image-tag", default="weather-sim-web:local")
    parser.add_argument("--skip-image-build", action="store_true")
    parser.add_argument("--skip-cleanup", action="store_true")
    return parser.parse_args()


def assert_command(name: str) -> None:
    if shutil.which(name) is None:
        raise RuntimeError(f"Required command '{name}' was not found on PATH.")


def resolve_path(path_value: Path) -> Path:
    return path_value.resolve(strict=True)


def run_command(
    args: list[str],
    *,
    cwd: Path | None = None,
    input_text: str | None = None,
    check: bool = True,
) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        args,
        cwd=str(cwd) if cwd else None,
        input=input_text,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    if check and result.returncode != 0:
        raise RuntimeError(
            "\n".join(
                part
                for part in (
                    f"Command failed: {' '.join(args)}",
                    f"stdout:\n{result.stdout}" if result.stdout else "",
                    f"stderr:\n{result.stderr}" if result.stderr else "",
                )
                if part
            )
        )
    return result


def get_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def wait_for_http_json(url: str, validator, attempts: int = 30, delay_seconds: int = 2) -> dict:
    last_error: Exception | None = None
    for _ in range(attempts):
        try:
            with urllib.request.urlopen(url, timeout=5) as response:
                payload = json.loads(response.read().decode("utf-8"))
            if validator(payload):
                return payload
        except Exception as exc:  # pragma: no cover
            last_error = exc
        time.sleep(delay_seconds)
    raise RuntimeError(f"Timed out waiting for '{url}'. Last error: {last_error}")


def wait_for_http_status(url: str, attempts: int = 30, delay_seconds: int = 2) -> int:
    last_error: Exception | None = None
    for _ in range(attempts):
        try:
            with urllib.request.urlopen(url, timeout=5) as response:
                if 200 <= response.status < 300:
                    return int(response.status)
        except Exception as exc:  # pragma: no cover
            last_error = exc
        time.sleep(delay_seconds)
    raise RuntimeError(f"Timed out waiting for '{url}'. Last error: {last_error}")


def start_port_forward(namespace: str, resource: str, local_port: int, remote_port: int) -> subprocess.Popen[str]:
    process = subprocess.Popen(
        [
            "kubectl",
            "-n",
            namespace,
            "port-forward",
            resource,
            f"{local_port}:{remote_port}",
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
    )

    deadline = time.time() + 20
    output = []
    while time.time() < deadline:
        if process.poll() is not None:
            joined = "".join(output)
            raise RuntimeError(f"kubectl port-forward exited early for {resource}.\n{joined}")

        line = process.stdout.readline() if process.stdout else ""
        if line:
            output.append(line)
            if "Forwarding from 127.0.0.1" in line or "Handling connection for" in line:
                return process
        else:
            try:
                with socket.create_connection(("127.0.0.1", local_port), timeout=0.25):
                    return process
            except OSError:
                time.sleep(0.25)

    process.terminate()
    joined = "".join(output)
    raise RuntimeError(f"Timed out waiting for kubectl port-forward on {resource}.\n{joined}")


def stop_process(process: subprocess.Popen[str] | None) -> None:
    if process is None:
        return
    if process.poll() is None:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:  # pragma: no cover
            process.kill()


def kubectl_apply(namespace_yaml: str) -> None:
    run_command(["kubectl", "apply", "-f", "-"], input_text=namespace_yaml)


def request_json(opener: urllib.request.OpenerDirector, url: str, *, method: str = "GET", body: dict | None = None) -> dict:
    data = None
    headers = {}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"

    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    with opener.open(request, timeout=10) as response:
        return json.loads(response.read().decode("utf-8"))


def main() -> int:
    args = parse_args()
    repo_root = resolve_path(args.repo_root)
    chart_path = resolve_path(args.chart_path) if args.chart_path else repo_root / "app" / "deployment" / "weather-sim" / "charts"
    chart_path = resolve_path(chart_path)
    app_root = repo_root / "app"
    output_directory = Path(__file__).resolve().parent / "out"
    output_directory.mkdir(parents=True, exist_ok=True)

    for command in ("docker", "helm", "kubectl", "kind", sys.executable):
        if command == sys.executable:
            continue
        assert_command(command)

    cluster_created = False
    api_forward = None
    web_forward = None
    temp_redis_manifest: Path | None = None

    try:
        helm_checks = Path(__file__).with_name("Invoke-WeatherSimHelmChecks.py")
        run_command([sys.executable, str(helm_checks), "--repo-root", str(repo_root), "--chart-path", str(chart_path)])

        existing_clusters = run_command(["kind", "get", "clusters"], check=False).stdout.splitlines()
        if args.cluster_name not in existing_clusters:
            print(f"Creating KinD cluster '{args.cluster_name}'...")
            run_command(["kind", "create", "cluster", "--name", args.cluster_name])
            cluster_created = True

        run_command(["kubectl", "config", "use-context", f"kind-{args.cluster_name}"])
        run_command(["kubectl", "wait", "--for=condition=Ready", "node", "--all", "--timeout=180s"])

        if not args.skip_image_build:
            print("Building local images...")
            run_command(["docker", "build", "-t", args.api_image_tag, "./backend"], cwd=app_root)
            run_command(["docker", "build", "-t", args.web_image_tag, "./frontend"], cwd=app_root)

        print(f"Loading images into KinD cluster '{args.cluster_name}'...")
        run_command(["kind", "load", "docker-image", args.api_image_tag, "--name", args.cluster_name])
        run_command(["kind", "load", "docker-image", args.web_image_tag, "--name", args.cluster_name])

        namespace_yaml = f"""apiVersion: v1
kind: Namespace
metadata:
  name: {args.namespace}
"""
        kubectl_apply(namespace_yaml)

        run_command(["kubectl", "-n", args.namespace, "delete", "secret", "weather-sim-session-secret", "--ignore-not-found=true"], check=False)
        session_secret = f"manual-kind-session-{int(time.time())}"
        run_command(
            [
                "kubectl",
                "-n",
                args.namespace,
                "create",
                "secret",
                "generic",
                "weather-sim-session-secret",
                f"--from-literal=SESSION_SECRET={session_secret}",
            ]
        )

        redis_manifest = f"""apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis-master
  namespace: {args.namespace}
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis-master
  template:
    metadata:
      labels:
        app: redis-master
    spec:
      containers:
        - name: redis
          image: redis:8.6.1
          ports:
            - containerPort: 6379
---
apiVersion: v1
kind: Service
metadata:
  name: redis-master
  namespace: {args.namespace}
spec:
  selector:
    app: redis-master
  ports:
    - port: 6379
      targetPort: 6379
"""
        with tempfile.NamedTemporaryFile("w", suffix=".yaml", delete=False, encoding="utf-8", dir=output_directory) as handle:
            handle.write(redis_manifest)
            temp_redis_manifest = Path(handle.name)

        run_command(["kubectl", "apply", "-f", str(temp_redis_manifest)])
        run_command(["kubectl", "rollout", "status", "deployment/redis-master", "-n", args.namespace, "--timeout=180s"])

        helm_args = [
            "helm",
            "upgrade",
            "--install",
            "weather-sim",
            str(chart_path),
            "--namespace",
            args.namespace,
            "--create-namespace",
            "-f",
            str(chart_path / "values-local.yaml"),
            "--set",
            f"image.api={args.api_image_tag}",
            "--set",
            f"image.web={args.web_image_tag}",
            "--set",
            "service.apiType=ClusterIP",
            "--set",
            "service.webType=ClusterIP",
            "--set",
            "ingress.enabled=false",
            "--set",
            "env.CORS_ORIGIN=http://localhost:18081",
        ]

        run_command(helm_args)
        run_command(["kubectl", "rollout", "status", "deployment/weather-sim-api", "-n", args.namespace, "--timeout=240s"])
        run_command(["kubectl", "rollout", "status", "deployment/weather-sim-web", "-n", args.namespace, "--timeout=240s"])

        api_port = 18080
        web_port = 18081
        api_forward = start_port_forward(args.namespace, "svc/weather-sim-api", api_port, 8080)
        web_forward = start_port_forward(args.namespace, "svc/weather-sim-web", web_port, 80)

        api_health = wait_for_http_json(
            f"http://127.0.0.1:{api_port}/api/v1/system/health",
            lambda value: value.get("status") == "healthy",
        )
        web_status = wait_for_http_status(f"http://127.0.0.1:{web_port}/")

        cookie_jar = http.cookiejar.CookieJar()
        opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookie_jar))
        login = request_json(
            opener,
            f"http://127.0.0.1:{api_port}/api/v1/auth/login",
            method="POST",
            body={"username": "premiumuser", "password": "premium-pass"},
        )
        if login.get("user", {}).get("username") != "premiumuser":
            raise RuntimeError(f"Login response did not return the expected premium user: {json.dumps(login, indent=2)}")

        me = request_json(opener, f"http://127.0.0.1:{api_port}/api/v1/auth/me")
        if me.get("user", {}).get("username") != "premiumuser":
            raise RuntimeError(f"Session lookup returned the wrong user: {json.dumps(me, indent=2)}")

        forecast = request_json(
            opener,
            f"http://127.0.0.1:{api_port}/api/v1/weather/premium-forecast?{urllib.parse.urlencode({'location': 'seattle'})}",
        )
        forecast_data = forecast.get("data")
        if not isinstance(forecast_data, list) or len(forecast_data) < 1:
            raise RuntimeError(f"Premium forecast response was empty: {json.dumps(forecast, indent=2)}")

        print()
        print("KinD smoke flow completed successfully.")
        print(f"API health payload: {json.dumps(api_health, indent=2)}")
        print(f"Web response code: {web_status}")
        print(f"Forecast sample count: {len(forecast_data)}")
        return 0
    finally:
        stop_process(api_forward)
        stop_process(web_forward)

        if not args.skip_cleanup:
            run_command(["kubectl", "delete", "deployment", "redis-master", "-n", args.namespace, "--ignore-not-found"], check=False)
            run_command(["kubectl", "delete", "service", "redis-master", "-n", args.namespace, "--ignore-not-found"], check=False)
            run_command(["helm", "uninstall", "weather-sim", "-n", args.namespace], check=False)
            run_command(["kubectl", "delete", "namespace", args.namespace, "--ignore-not-found", "--wait=false"], check=False)
            if cluster_created:
                run_command(["kind", "delete", "cluster", "--name", args.cluster_name], check=False)

        if temp_redis_manifest and temp_redis_manifest.exists():
            temp_redis_manifest.unlink(missing_ok=True)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # pragma: no cover
        print(str(exc), file=sys.stderr)
        raise SystemExit(1)
