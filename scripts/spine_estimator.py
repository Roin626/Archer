#!/usr/bin/env python3
"""Two independent generic arrow-spine starting-point calculators."""

from __future__ import annotations

import argparse
import json

try:
    from .arrow_spine import BOW_TYPES, BOW_TYPE_ALIASES, estimate_finished_arrow_weight, estimate_static_spine
except ImportError:
    from arrow_spine import BOW_TYPES, BOW_TYPE_ALIASES, estimate_finished_arrow_weight, estimate_static_spine


def add_common_arguments(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--bow-type", choices=sorted(BOW_TYPES | set(BOW_TYPE_ALIASES)), required=True)
    parser.add_argument("--draw-weight", type=float, required=True, help="Actual full-draw weight, lb.")
    parser.add_argument("--shaft-length", type=float, required=True, help="Nock throat to shaft end, in.")
    parser.add_argument("--arrow-pass-offset-mm", type=float, help="Arrow-pass distance from bow centerline, mm.")
    parser.add_argument("--format", choices=["table", "json"], default="table")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Estimate generic initial ATA spine or finished-arrow mass.")
    commands = parser.add_subparsers(dest="command", required=True)

    from_weight = commands.add_parser("from-weight", help="Finished-arrow mass -> ATA static spine range.")
    add_common_arguments(from_weight)
    from_weight.add_argument("--finished-arrow-weight", type=float, required=True, help="Complete arrow mass, grains.")

    from_spine = commands.add_parser("from-spine", help="ATA static spine -> dynamic-equivalent finished-arrow mass.")
    add_common_arguments(from_spine)
    from_spine.add_argument("--ata-spine", type=int, required=True, help="ATA/ASTM static spine, for example 700.")
    return parser


def run(args: argparse.Namespace) -> int:
    if args.command == "from-weight":
        result = estimate_static_spine(
            args.bow_type, args.draw_weight, args.shaft_length, args.finished_arrow_weight, args.arrow_pass_offset_mm
        )
        payload = {
            "center_deflection_in": result[0], "ata_spine": result[1], "lower_ata_spine": result[2],
            "upper_ata_spine": result[3], "effective_draw_weight_lb": result[4],
            "arrow_weight_adjustment_lb": result[5], "offset_adjustment_lb": result[6],
        }
        if args.format == "json":
            print(json.dumps(payload, ensure_ascii=False, indent=2))
        else:
            print(f"ATA static spine: {result[2]}-{result[3]} (center {result[1]}, {result[0]:.3f} in)")
            print(f"Dynamic-equivalent draw weight: {result[4]:.2f} lb")
        return 0

    finished_weight, gpp, effective_weight = estimate_finished_arrow_weight(
        args.bow_type, args.draw_weight, args.shaft_length, args.ata_spine, args.arrow_pass_offset_mm
    )
    payload = {"finished_arrow_weight_gr": finished_weight, "gpp": gpp, "required_effective_draw_weight_lb": effective_weight}
    if args.format == "json":
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        print(f"Dynamic-equivalent finished arrow weight: {finished_weight:.1f} gr ({gpp:.2f} GPP)")
        print(f"Required effective draw weight: {effective_weight:.2f} lb")
    return 0


if __name__ == "__main__":
    raise SystemExit(run(build_parser().parse_args()))
