#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
import shutil
import subprocess
import sys
from pathlib import Path


EXPECTED_COUNTS = (
    (r"kind:\s*ConfigMap", 1, "ConfigMap"),
    (r"kind:\s*Deployment", 2, "Deployment"),
    (r"kind:\s*Service", 2, "Service"),
    (r"kind:\s*Ingress", 1, "Ingress"),
    (r"kind:\s*HorizontalPodAutoscaler", 1, "HorizontalPodAutoscaler"),
    (r"kind:\s*PodDisruptionBudget", 1, "PodDisruptionBudget"),
)


def parse_args() -> argparse.Namespace:
    script_dir = Path(__file__).resolve().parent
    default_repo_root = script_dir.parents[5]
    parser = argparse.ArgumentParser(description="Lint and render the weather-sim Helm chart.")
    parser.add_argument("--repo-root", type=Path, default=default_repo_root)
    parser.add_argument("--chart-path", type=Path)
    parser.add_argument("--values-file", action="append", dest="values_files", default=[])
    parser.add_argument("--release-name", default="weather-sim")
    parser.add_argument("--namespace", default="weather-sim")
    parser.add_argument("--output-directory", type=Path)
    return parser.parse_args()


def assert_command(name: str) -> None:
    if shutil.which(name) is None:
        raise RuntimeError(f"Required command '{name}' was not found on PATH.")


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


def resolve_path(path_value: Path) -> Path:
    return path_value.resolve(strict=True)


def main() -> int:
    args = parse_args()
    repo_root = resolve_path(args.repo_root)
    chart_path = resolve_path(args.chart_path) if args.chart_path else repo_root / "app" / "deployment" / "weather-sim" / "charts"
    chart_path = resolve_path(chart_path)

    values_files = [resolve_path(Path(value)) for value in args.values_files]
    if not values_files:
        values_files = [
            resolve_path(chart_path / "values.yaml"),
            resolve_path(chart_path / "values-local.yaml"),
        ]

    output_directory = args.output_directory.resolve() if args.output_directory else Path(__file__).resolve().parent / "out"
    output_directory.mkdir(parents=True, exist_ok=True)

    assert_command("helm")

    print(f"Chart path: {chart_path}")
    print(f"Values files: {', '.join(str(path) for path in values_files)}")

    lint_args = ["helm", "lint", str(chart_path), "--namespace", args.namespace]
    for values_file in values_files:
        lint_args.extend(["-f", str(values_file)])

    lint_result = run_command(lint_args)
    lint_log = output_directory / "helm-lint.log"
    lint_output = lint_result.stdout + lint_result.stderr
    lint_log.write_text(lint_output, encoding="utf-8")
    if lint_output:
        print(lint_output, end="" if lint_output.endswith("\n") else "\n")

    template_args = ["helm", "template", args.release_name, str(chart_path), "--namespace", args.namespace]
    for values_file in values_files:
        template_args.extend(["-f", str(values_file)])

    rendered_manifest = output_directory / "weather-sim.rendered.yaml"
    rendered = run_command(template_args).stdout.replace("\r\n", "\n")
    rendered_manifest.write_text(rendered, encoding="utf-8")

    for pattern, minimum, label in EXPECTED_COUNTS:
        count = len(re.findall(pattern, rendered))
        if count < minimum:
            raise RuntimeError(f"Expected at least {minimum} {label} resource(s) in the rendered manifest, found {count}.")

    for probe_path in ("/api/v1/system/live", "/api/v1/system/ready"):
        if probe_path not in rendered:
            raise RuntimeError(f"Expected probe path '{probe_path}' in the rendered manifest.")

    for resource_name in ("name: weather-sim-api", "name: weather-sim-web", "name: weather-sim-config"):
        if resource_name not in rendered:
            raise RuntimeError(f"Expected '{resource_name}' in the rendered manifest.")

    print()
    print("Helm chart checks completed successfully.")
    print(f"Lint log: {lint_log}")
    print(f"Rendered manifest: {rendered_manifest}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # pragma: no cover
        print(str(exc), file=sys.stderr)
        raise SystemExit(1)
