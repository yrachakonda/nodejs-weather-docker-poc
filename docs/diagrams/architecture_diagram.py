#!/usr/bin/env python3
"""Render the detailed AWS architecture diagram for weather-sim."""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Iterable


def _make_node(label: str, candidates: Iterable[tuple[str, str]]):
    """Create a diagrams node when possible, otherwise fall back to a blank box."""
    from diagrams.generic.blank import Blank

    # Try preferred icon classes in order so the script can stay portable
    # across diagrams package versions without failing hard.
    for module_name, class_name in candidates:
        try:
            module = __import__(module_name, fromlist=[class_name])
            node_type = getattr(module, class_name)
            return node_type(label)
        except Exception:
            continue

    return Blank(label)


def _aws_node(label: str, candidates: Iterable[tuple[str, str]]):
    return _make_node(label, candidates)


def _custom_node(label: str, icon_dir: Path, icon_name: str):
    """Create a node backed by a local icon file inside docs/diagrams/icon."""
    from diagrams.custom import Custom

    # Keep custom assets in one local directory so the script remains
    # self-contained and easy to move with the docs folder.
    return Custom(label, str(icon_dir / icon_name))


def _flow_edge(**kwargs):
    """Create a standard solid edge for primary request/data flow."""
    from diagrams import Edge

    return Edge(penwidth="1.4", **kwargs)


def _meta_edge(**kwargs):
    """Create a lighter dashed edge for supporting relationships."""
    from diagrams import Edge

    return Edge(style="dashed", color="dimgray", **kwargs)


def build_diagram(output_dir: Path, filename: str, outformat: str) -> Path:
    try:
        from diagrams import Cluster, Diagram
        from diagrams.aws.management import Cloudwatch
        from diagrams.aws.network import APIGateway, ELB, NATGateway, Route53, VPC
        from diagrams.aws.security import ACM, WAF
        from diagrams.aws.compute import ECR, EKS
        from diagrams.elastic.elasticsearch import Elasticsearch, Kibana, Logstash
        from diagrams.elastic.orchestration import ECK
        from diagrams.onprem.client import Client, Users
        from diagrams.onprem.queue import Kafka
        from diagrams.k8s.compute import Pod
        from diagrams.k8s.network import Ingress
    except ImportError as exc:
        raise SystemExit(
            "The 'diagrams' package is required. Install it with 'pip install diagrams graphviz' "
            "and ensure the Graphviz 'dot' executable is on PATH."
        ) from exc

    output_dir.mkdir(parents=True, exist_ok=True)
    output_base = output_dir / filename
    # Local custom icons are only used where the diagrams package does not have
    # a suitable native icon or where a more product-specific image is needed.
    icon_dir = Path(__file__).resolve().parent / "icon"

    # Keep the graph compact. The earlier version used deeper nesting plus
    # orthogonal routing, which left large empty lanes in the rendered PNG.
    graph_attr = {
        "pad": "0.2",
        "splines": "spline",
        "nodesep": "0.35",
        "ranksep": "0.45",
        "concentrate": "true",
        "newrank": "true",
    }
    cluster_attr = {
        "margin": "18",
        "pad": "12",
    }

    with Diagram(
        "Weather Sim AWS Architecture",
        show=False,
        direction="TB",
        filename=str(output_base),
        outformat=outformat,
        graph_attr=graph_attr,
    ):
        # Use explicit client icons so the internet entry point reads as people
        # using browsers rather than an unlabeled abstract box.
        users = Users("Users")
        browser = Client("Browser")
        route53 = Route53("Route 53")

        with Cluster("Public edge", graph_attr=cluster_attr):
            # Keep the two public entry paths side by side so the split between
            # browser traffic and API traffic is obvious at a glance.
            acm = ACM("ACM certificates")
            web_waf = WAF("Web WAF")
            api_waf = WAF("API WAF")
            alb = ELB("Public ALB")
            api_gateway = APIGateway("API Gateway")
            vpc_link = ELB("VPC Link")

        with Cluster("VPC", graph_attr=cluster_attr):
            # A dedicated VPC icon makes the network boundary explicit even
            # though the enclosing cluster is also labeled VPC.
            vpc = VPC("Application VPC")
            nat_gateway = NATGateway("NAT Gateway")
            vpc_endpoints = ELB("VPC endpoints")
            internal_nlb = ELB("Internal NLB")

            with Cluster("EKS workloads", graph_attr=cluster_attr):
                # Model services and pods separately so the rendered diagram can
                # show both routing targets and the workloads behind them.
                ingress = Ingress("weather-sim Ingress")
                eks = EKS("EKS cluster")
                web_service = ELB("weather-sim-web\nService")
                api_service = ELB("weather-sim-api\nService")
                web_pods = Pod("web pods")
                api_pods = Pod("api pods")

            with Cluster("Observability", graph_attr=cluster_attr):
                # Prefer native icons where possible because they are more
                # reliable under Graphviz than arbitrary downloaded SVGs.
                fluent_bit = _custom_node("Fluent Bit", icon_dir, "fluent-bit.png")
                strimzi = Kafka("Strimzi")
                kafka = Kafka("Kafka")
                kafbat_ui = Client("Kafbat UI")
                eck_operator = ECK("ECK operator")
                logstash = Logstash("Logstash")
                elasticsearch = Elasticsearch("Elasticsearch")
                kibana = Kibana("Kibana")

        ecr = ECR("ECR repositories")
        cloudwatch = Cloudwatch("CloudWatch Logs")

        # Top-level request entry.
        users >> _flow_edge(label="uses") >> browser >> _flow_edge() >> route53

        # Separate public web and API edges to match the deployed split.
        route53 >> _flow_edge(label="web DNS") >> web_waf >> alb
        route53 >> _flow_edge(label="api DNS") >> api_waf >> api_gateway

        # TLS material is shared but terminates at different edge services.
        acm >> _meta_edge(label="TLS") >> alb
        acm >> _meta_edge(label="TLS / custom domain") >> api_gateway

        # Web requests stay on the ALB ingress path.
        alb >> _flow_edge(label="targets") >> ingress >> _flow_edge(label="routes /") >> web_service >> _flow_edge(label="serves") >> web_pods

        # API requests stay on the private integration path after API Gateway.
        api_gateway >> _meta_edge(label="private integration") >> vpc_link >> _flow_edge(label="ENIs / target") >> internal_nlb
        internal_nlb >> _flow_edge(label="forwards") >> api_service >> _flow_edge(label="serves") >> api_pods

        # Supporting AWS platform dependencies for the cluster.
        vpc >> _meta_edge(label="contains") >> nat_gateway
        vpc >> _meta_edge(label="contains") >> vpc_endpoints
        vpc >> _meta_edge(label="contains") >> eks
        vpc >> _meta_edge(label="contains") >> internal_nlb
        nat_gateway >> _meta_edge(label="egress") >> eks
        vpc_endpoints >> _meta_edge(label="AWS APIs") >> eks
        ecr >> _flow_edge(label="image pull") >> eks
        eks >> _meta_edge(label="hosts") >> web_pods
        eks >> _meta_edge(label="hosts") >> api_pods
        ingress >> _meta_edge(label="runs on") >> eks
        api_service >> _meta_edge(label="runs on") >> eks
        web_service >> _meta_edge(label="runs on") >> eks

        # Logging path stays shared across web and API workloads.
        web_pods >> _meta_edge(label="stdout") >> fluent_bit
        api_pods >> _meta_edge(label="stdout") >> fluent_bit
        fluent_bit >> _flow_edge(label="ship logs") >> cloudwatch
        fluent_bit >> _flow_edge(label="publish logs") >> kafka
        kafka >> _flow_edge(label="consumed by") >> logstash
        logstash >> _flow_edge(label="index") >> elasticsearch
        elasticsearch >> _flow_edge(label="read by") >> kibana
        kafbat_ui >> _meta_edge(label="inspect") >> kafka
        strimzi >> _meta_edge(label="manages") >> kafka
        eck_operator >> _meta_edge(label="manages") >> elasticsearch
        eck_operator >> _meta_edge(label="manages") >> kibana
        eck_operator >> _meta_edge(label="manages") >> logstash

    return output_base.with_suffix(f".{outformat}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Render the weather-sim AWS architecture diagram."
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).resolve().parent,
        help="Directory for rendered diagram artifacts.",
    )
    parser.add_argument(
        "--filename",
        default="weather-sim-aws-architecture",
        help="Base filename for the rendered diagram.",
    )
    parser.add_argument(
        "--format",
        default="png",
        help="Diagram output format understood by diagrams/Graphviz.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    rendered = build_diagram(args.output_dir, args.filename, args.format)
    print(rendered)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
