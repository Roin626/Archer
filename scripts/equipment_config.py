#!/usr/bin/env python3
"""Produce measurement and tuning checklists for initial arrow setup.

The matrix intentionally does not emit a universal spine or GPP target. Those
values are not standards and change with the chosen shaft and bow maker.
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from dataclasses import asdict, dataclass
from typing import Iterable, Sequence

try:
    from .arrow_spine import BOW_TYPES, BOW_TYPE_ALIASES, normalize_bow_type, parse_number_list
except ImportError:
    from arrow_spine import BOW_TYPES, BOW_TYPE_ALIASES, normalize_bow_type, parse_number_list


TEST_ARROW_CLEARANCE_IN = 1.0

BASELINE_TUNING = {
    "american_hunting": {
        "rest": "Shelf or leather rest; verify feather/fletching clearance.",
        "nocking_point": "Start around +1/4 to +1/2 in, then tune by shooting.",
        "center_shot": "Record actual window center-cut; use the selected maker's traditional chart.",
    },
    "barebow": {
        "rest": "Magnetic rest and plunger if rule set permits.",
        "nocking_point": "Start around +1/8 to +1/4 in, then bare-shaft tune.",
        "center_shot": "Record plunger center-shot and pressure; validate with bare shafts.",
    },
    "compound": {
        "rest": "Set rest to the bow maker's center-shot specification and verify clearance.",
        "nocking_point": "Level to +1/8 in is a setup starting point, not a final setting.",
        "center_shot": "Use the shaft maker's compound chart with cam, brace height, release and total point-system weight.",
    },
    "olympic_recurve": {
        "rest": "Magnetic rest and plunger; confirm fletching clearance.",
        "nocking_point": "Start around +1/8 to +1/4 in, then bare-shaft and walk-back tune.",
        "center_shot": "Record plunger position and pressure; select from the chosen maker's recurve chart.",
    },
    "shelfless_traditional": {
        "rest": "Shoot from hand; use feather clearance and hand protection.",
        "nocking_point": "Start around +3/8 to +3/4 in, then tune by shooting.",
        "center_shot": "Measure arrow-pass offset from centerline in mm; test adjacent chart spines and bare-shaft tune.",
    },
}


@dataclass(frozen=True)
class EquipmentRecommendation:
    bow_type: str
    draw_weight_lb: float
    draw_length_amo_in: float
    test_shaft_length_in: float
    arrow_pass_offset_mm: float | None
    chart_inputs: str
    rest: str
    nocking_point: str
    center_shot: str
    validation: str


def test_shaft_length(draw_length_amo_in: float, clearance_in: float = TEST_ARROW_CLEARANCE_IN) -> float:
    """Return a conservative *test shaft* length, never a final cut instruction.

    Easton's target guide determines final arrow length by marking a long shaft
    at full draw with 1 in clearance in front of the rest. AMO draw length alone
    cannot establish the final cut length, so this is only a starting shaft.
    """

    if draw_length_amo_in <= 0 or clearance_in < 0:
        raise ValueError("draw length must be positive and clearance cannot be negative")
    return round(draw_length_amo_in + clearance_in, 2)


def chart_inputs(bow_type: str) -> str:
    if bow_type == "compound":
        return "Actual peak draw weight, measured arrow length, point+insert system weight, cam type, brace height, release type, chosen shaft model."
    if bow_type == "shelfless_traditional":
        return "Actual draw weight at full draw, measured arrow length, point+insert system weight, arrow-pass offset (mm), chosen shaft model."
    return "Actual draw weight at your draw length, measured arrow length, point+insert system weight, chosen shaft model."


def recommend_equipment(
    bow_type: str,
    draw_weight_lb: float,
    draw_length_amo_in: float,
    arrow_pass_offset_mm: float | None = None,
    clearance_in: float = TEST_ARROW_CLEARANCE_IN,
) -> EquipmentRecommendation:
    bow_type = normalize_bow_type(bow_type)
    if draw_weight_lb <= 0:
        raise ValueError("draw weight must be greater than zero")
    if arrow_pass_offset_mm is not None and arrow_pass_offset_mm < 0:
        raise ValueError("arrow-pass offset is a non-negative distance in millimeters")
    tuning = BASELINE_TUNING[bow_type]
    return EquipmentRecommendation(
        bow_type=bow_type,
        draw_weight_lb=draw_weight_lb,
        draw_length_amo_in=draw_length_amo_in,
        test_shaft_length_in=test_shaft_length(draw_length_amo_in, clearance_in),
        arrow_pass_offset_mm=arrow_pass_offset_mm,
        chart_inputs=chart_inputs(bow_type),
        rest=tuning["rest"],
        nocking_point=tuning["nocking_point"],
        center_shot=tuning["center_shot"],
        validation="Measure final nock-throat-to-shaft-end length at full draw; choose the manufacturer chart group; shoot bare-shaft/paper tests before cutting or buying a full set.",
    )


def build_matrix(
    bow_type: str,
    draw_weights: Sequence[float],
    draw_lengths: Sequence[float],
    arrow_pass_offset_mm: float | None = None,
    clearance_in: float = TEST_ARROW_CLEARANCE_IN,
) -> list[EquipmentRecommendation]:
    return [
        recommend_equipment(bow_type, weight, length, arrow_pass_offset_mm, clearance_in)
        for weight in draw_weights
        for length in draw_lengths
    ]


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Generate a traceable initial setup checklist.")
    parser.add_argument("--bow-type", choices=sorted(BOW_TYPES | set(BOW_TYPE_ALIASES)), required=True)
    parser.add_argument("--draw-weights", type=parse_number_list, required=True)
    parser.add_argument("--draw-lengths", type=parse_number_list, required=True)
    parser.add_argument("--arrow-pass-offset-mm", type=float, help="Non-negative distance from bow centerline to arrow pass, in mm.")
    parser.add_argument("--clearance", type=float, default=TEST_ARROW_CLEARANCE_IN, help="Extra length for a test shaft only, inches.")
    parser.add_argument("--format", choices=["table", "json", "csv"], default="table")
    return parser


def run(args: argparse.Namespace) -> int:
    rows = build_matrix(args.bow_type, args.draw_weights, args.draw_lengths, args.arrow_pass_offset_mm, args.clearance)
    if args.format == "json":
        print(json.dumps([asdict(row) for row in rows], ensure_ascii=False, indent=2))
    elif args.format == "csv":
        writer = csv.DictWriter(sys.stdout, fieldnames=list(asdict(rows[0]).keys()))
        writer.writeheader()
        writer.writerows(asdict(row) for row in rows)
    else:
        print_table(rows)
    return 0


def print_table(rows: Sequence[EquipmentRecommendation]) -> None:
    headers = ["bow", "draw#", "AMO draw", "test shaft", "offset mm", "nocking"]
    body = [[row.bow_type, row.draw_weight_lb, row.draw_length_amo_in, row.test_shaft_length_in, row.arrow_pass_offset_mm or "-", row.nocking_point] for row in rows]
    widths = [max(len(str(header)), *(len(str(row[index])) for row in body)) for index, header in enumerate(headers)]
    print("  ".join(str(header).ljust(widths[index]) for index, header in enumerate(headers)))
    print("  ".join("-" * width for width in widths))
    for row in body:
        print("  ".join(str(cell).ljust(widths[index]) for index, cell in enumerate(row)))


if __name__ == "__main__":
    raise SystemExit(run(build_parser().parse_args()))

