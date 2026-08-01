#!/usr/bin/env python3
"""Arrow measurements with traceable physics and manufacturer-chart handoff.

This module deliberately does not infer a universal dynamic-spine number from
draw weight.  A shaft recommendation is manufacturer/model specific: its chart
also accounts for shaft construction and, for compound bows, cam/release setup.
The calculations here are the parts that have defined units and formulae.
"""

from __future__ import annotations

import argparse
import csv
import json
from dataclasses import asdict, dataclass
from typing import Iterable, Sequence


ATA_TEST_LOAD_LB = 1.94
ATA_SUPPORT_SPAN_IN = 28.0
MM_PER_INCH = 25.4
GRAINS_PER_POUND = 7000.0

BOW_TYPES = {
    "american_hunting",
    "barebow",
    "compound",
    "olympic_recurve",
    "shelfless_traditional",
}

BOW_TYPE_ALIASES = {
    "american": "american_hunting",
    "american_hunter": "american_hunting",
    "american_hunting_bow": "american_hunting",
    "chinese": "shelfless_traditional",
    "chinese_bow": "shelfless_traditional",
    "chinese_traditional": "shelfless_traditional",
    "mongol": "shelfless_traditional",
    "mongolian": "shelfless_traditional",
    "mongolian_traditional": "shelfless_traditional",
    "shelfless": "shelfless_traditional",
    "shelfless_trad": "shelfless_traditional",
    "traditional": "american_hunting",
    "trad": "american_hunting",
    "tranditional": "american_hunting",
    "turkish": "shelfless_traditional",
    "turkish_bow": "shelfless_traditional",
    "turkish_traditional": "shelfless_traditional",
}

GENERIC_SPINE_BASELINES = {
    "olympic_recurve": (0.700, 15.0, 9.0, 0.0),
    "barebow": (0.700, 15.0, 9.0, 0.0),
    "compound": (0.600, 12.5, 7.0, 0.0),
    "american_hunting": (0.750, 17.5, 9.5, 12.0),
    "shelfless_traditional": (0.800, 20.0, 10.0, 25.0),
}
GENERIC_BASE_DRAW_WEIGHT_LB = 30.0
GENERIC_BASE_SHAFT_LENGTH_IN = 30.0
GENERIC_DRAW_WEIGHT_EXPONENT = 0.6
ARROW_WEIGHT_STEP_GR = 25.0
EFFECTIVE_DRAW_PER_ARROW_WEIGHT_STEP_LB = 3.0
EFFECTIVE_DRAW_PER_OFFSET_MM_LB = 0.25


@dataclass(frozen=True)
class ArrowBuild:
    bow_type: str
    draw_weight_lb: float
    shaft_length_in: float
    shaft_gpi: float
    point_system_weight_gr: float
    rear_components_weight_gr: float
    static_deflection_in: float | None = None
    manufacturer_min_gpp: float | None = None


@dataclass(frozen=True)
class ArrowBuildResult:
    bow_type: str
    draw_weight_lb: float
    shaft_length_in: float
    shaft_weight_gr: float
    point_system_weight_gr: float
    rear_components_weight_gr: float
    finished_arrow_weight_gr: float
    gpp: float
    manufacturer_min_gpp: float | None
    minimum_weight_passes: bool | None
    minimum_point_system_weight_gr: float | None
    static_deflection_in: float | None
    ata_spine: int | None
    flexural_rigidity_lb_in2: float | None
    estimated_deflection_in: float
    estimated_ata_spine: int
    estimated_lower_ata_spine: int
    estimated_upper_ata_spine: int
    estimated_effective_draw_weight_lb: float
    estimated_point_weight_adjustment_lb: float
    chart_effective_draw_weight_lb: float
    chart_next_step: str


def normalize_bow_type(bow_type: str) -> str:
    normalized = bow_type.strip().lower()
    resolved = BOW_TYPE_ALIASES.get(normalized, normalized)
    if resolved not in BOW_TYPES:
        raise ValueError(f"unsupported bow type: {bow_type}")
    return resolved


def ata_spine_from_deflection(deflection_in: float) -> int:
    """Return ATA/ASTM static-spine designation, e.g. 0.500 in -> 500."""

    if deflection_in <= 0:
        raise ValueError("static deflection must be greater than zero")
    return int(deflection_in * 1000 + 0.5)


def flexural_rigidity_lb_in2(deflection_in: float) -> float:
    """Calculate EI for a simply supported shaft with a center load.

    delta = P * L^3 / (48 * E * I), using the ATA/ASTM test conditions.
    """

    if deflection_in <= 0:
        raise ValueError("static deflection must be greater than zero")
    return ATA_TEST_LOAD_LB * ATA_SUPPORT_SPAN_IN**3 / (48 * deflection_in)


def static_deflection_from_flexural_rigidity(flexural_rigidity: float) -> float:
    if flexural_rigidity <= 0:
        raise ValueError("flexural rigidity must be greater than zero")
    return ATA_TEST_LOAD_LB * ATA_SUPPORT_SPAN_IN**3 / (48 * flexural_rigidity)


def estimate_static_spine(
    bow_type: str,
    draw_weight_lb: float,
    shaft_length_in: float,
    finished_arrow_weight_gr: float | None = None,
    arrow_pass_offset_mm: float | None = None,
) -> tuple[float, int, int, int, float, float, float]:
    """Return a generic ATA static-spine starting range.

    The baseline is a practical carbon-shaft start point at 30 lb, 30 in and
    a bow-type-specific reference finished-arrow GPP and centerline offset.
    A 25 gr change in finished-arrow mass contributes a 3 lb dynamic-equivalent
    adjustment. This is an initial test range, not a universal dynamic-spine law.
    """

    normalized_bow_type = normalize_bow_type(bow_type)
    if draw_weight_lb <= 0 or shaft_length_in <= 0:
        raise ValueError("draw weight and shaft length must be positive")
    baseline_deflection, band_percent, reference_gpp, reference_offset = GENERIC_SPINE_BASELINES[normalized_bow_type]
    reference_finished_weight = reference_gpp * draw_weight_lb
    finished_weight = reference_finished_weight if finished_arrow_weight_gr is None else finished_arrow_weight_gr
    offset = reference_offset if arrow_pass_offset_mm is None else arrow_pass_offset_mm
    if finished_weight <= 0 or offset < 0:
        raise ValueError("finished-arrow weight must be positive and arrow-pass offset cannot be negative")
    arrow_weight_adjustment = (finished_weight - reference_finished_weight) / ARROW_WEIGHT_STEP_GR * EFFECTIVE_DRAW_PER_ARROW_WEIGHT_STEP_LB
    offset_adjustment = (reference_offset - offset) * EFFECTIVE_DRAW_PER_OFFSET_MM_LB
    effective_weight = max(5.0, draw_weight_lb + arrow_weight_adjustment + offset_adjustment)
    center_deflection = (
        baseline_deflection
        * (GENERIC_BASE_DRAW_WEIGHT_LB / effective_weight) ** GENERIC_DRAW_WEIGHT_EXPONENT
        * (shaft_length_in / GENERIC_BASE_SHAFT_LENGTH_IN) ** 3
    )
    lower_spine = ata_spine_from_deflection(center_deflection * (1 - band_percent / 100))
    upper_spine = ata_spine_from_deflection(center_deflection * (1 + band_percent / 100))
    return (
        round(center_deflection, 3),
        ata_spine_from_deflection(center_deflection),
        lower_spine,
        upper_spine,
        round(effective_weight, 2),
        round(arrow_weight_adjustment, 2),
        round(offset_adjustment, 2),
    )


def estimate_finished_arrow_weight(
    bow_type: str,
    draw_weight_lb: float,
    shaft_length_in: float,
    ata_spine: int,
    arrow_pass_offset_mm: float | None = None,
) -> tuple[float, float, float]:
    """Invert the generic estimate to calculate dynamic-equivalent arrow mass."""

    normalized_bow_type = normalize_bow_type(bow_type)
    if draw_weight_lb <= 0 or shaft_length_in <= 0 or ata_spine <= 0:
        raise ValueError("draw weight, shaft length and ATA spine must be positive")
    baseline_deflection, _, reference_gpp, reference_offset = GENERIC_SPINE_BASELINES[normalized_bow_type]
    offset = reference_offset if arrow_pass_offset_mm is None else arrow_pass_offset_mm
    if offset < 0:
        raise ValueError("arrow-pass offset cannot be negative")
    deflection = ata_spine / 1000.0
    required_effective_weight = GENERIC_BASE_DRAW_WEIGHT_LB * (
        baseline_deflection * (shaft_length_in / GENERIC_BASE_SHAFT_LENGTH_IN) ** 3 / deflection
    ) ** (1 / GENERIC_DRAW_WEIGHT_EXPONENT)
    reference_finished_weight = reference_gpp * draw_weight_lb
    offset_adjustment = (reference_offset - offset) * EFFECTIVE_DRAW_PER_OFFSET_MM_LB
    finished_weight = reference_finished_weight + (
        required_effective_weight - draw_weight_lb - offset_adjustment
    ) / EFFECTIVE_DRAW_PER_ARROW_WEIGHT_STEP_LB * ARROW_WEIGHT_STEP_GR
    if finished_weight <= 0:
        raise ValueError("the inputs cannot produce a positive finished-arrow weight")
    return round(finished_weight, 1), round(finished_weight / draw_weight_lb, 2), round(required_effective_weight, 2)


def finished_arrow_weight(
    shaft_length_in: float,
    shaft_gpi: float,
    point_system_weight_gr: float,
    rear_components_weight_gr: float,
) -> float:
    values = [shaft_length_in, shaft_gpi, point_system_weight_gr, rear_components_weight_gr]
    if any(value < 0 for value in values) or shaft_length_in == 0 or shaft_gpi == 0:
        raise ValueError("shaft length and GPI must be greater than zero; component weights cannot be negative")
    return shaft_length_in * shaft_gpi + point_system_weight_gr + rear_components_weight_gr


def grains_per_pound(finished_arrow_weight_gr: float, draw_weight_lb: float) -> float:
    if finished_arrow_weight_gr <= 0 or draw_weight_lb <= 0:
        raise ValueError("finished arrow weight and draw weight must be greater than zero")
    return finished_arrow_weight_gr / draw_weight_lb


def minimum_point_system_weight_for_gpp(
    draw_weight_lb: float,
    shaft_length_in: float,
    shaft_gpi: float,
    rear_components_weight_gr: float,
    manufacturer_min_gpp: float,
) -> float:
    """Return the point-system mass needed to meet a bow maker's GPP minimum.

    This is a finished-arrow safety mass calculation, not a dynamic-tuning
    point-weight prediction.
    """

    if manufacturer_min_gpp <= 0:
        raise ValueError("manufacturer minimum GPP must be greater than zero")
    shaft_and_rear_weight = finished_arrow_weight(
        shaft_length_in,
        shaft_gpi,
        0.0,
        rear_components_weight_gr,
    )
    return max(0.0, manufacturer_min_gpp * draw_weight_lb - shaft_and_rear_weight)


def static_spine_screening_band(
    reference_deflection_in: float,
    reference_shaft_length_in: float,
    reference_draw_weight_lb: float,
    target_shaft_length_in: float,
    target_draw_weight_lb: float,
    band_percent: float = 12.5,
) -> tuple[int, int, int]:
    """Return a calibrated ATA-spine screening band using first-order beam scaling.

    The calculation assumes the reference arrow was tuned under materially
    comparable point-system, release, rest and bow conditions. It narrows a
    manufacturer chart search; it is not a universal dynamic-spine equation.
    """

    values = [
        reference_deflection_in,
        reference_shaft_length_in,
        reference_draw_weight_lb,
        target_shaft_length_in,
        target_draw_weight_lb,
        band_percent,
    ]
    if any(value <= 0 for value in values) or band_percent >= 100 or reference_deflection_in > 2:
        raise ValueError("screening inputs must be positive, deflection must be at most 2 in, and the band must be below 100%")
    center_deflection = (
        reference_deflection_in
        * reference_draw_weight_lb
        / target_draw_weight_lb
        * (target_shaft_length_in / reference_shaft_length_in) ** 3
    )
    lower = ata_spine_from_deflection(center_deflection * (1 - band_percent / 100))
    upper = ata_spine_from_deflection(center_deflection * (1 + band_percent / 100))
    return lower, ata_spine_from_deflection(center_deflection), upper


def compound_chart_effective_weight(draw_weight_lb: float, point_system_weight_gr: float) -> float:
    """Apply Easton's published point-weight chart adjustment only.

    Easton's target guide specifies +3 lb per 25 gr over 100 gr for its
    compound selection chart. This is not a transferable dynamic-spine law.
    """

    if draw_weight_lb <= 0:
        raise ValueError("draw weight must be greater than zero")
    extra_point_weight = max(0.0, point_system_weight_gr - 100.0)
    return draw_weight_lb + (extra_point_weight / 25.0) * 3.0


def chart_next_step(bow_type: str) -> str:
    if bow_type == "compound":
        return "Use the selected shaft maker's compound chart with actual peak weight, arrow length, point-system weight, cam/brace-height and release type."
    if bow_type == "shelfless_traditional":
        return "Measure actual draw weight at full draw and arrow-pass offset; select an adjacent test-spine set from the chosen maker's traditional chart, then bare-shaft tune."
    return "Use the selected shaft maker's chart with actual draw weight at your draw length, its defined arrow length and total point-system weight; confirm by bare-shaft or paper tuning."


def calculate_arrow_build(build: ArrowBuild) -> ArrowBuildResult:
    bow_type = normalize_bow_type(build.bow_type)
    if build.draw_weight_lb <= 0:
        raise ValueError("draw weight must be greater than zero")
    weight = finished_arrow_weight(
        build.shaft_length_in,
        build.shaft_gpi,
        build.point_system_weight_gr,
        build.rear_components_weight_gr,
    )
    gpp = grains_per_pound(weight, build.draw_weight_lb)
    static_deflection = build.static_deflection_in
    if static_deflection is not None and static_deflection <= 0:
        raise ValueError("static deflection must be greater than zero")
    minimum = build.manufacturer_min_gpp
    if minimum is not None and minimum <= 0:
        raise ValueError("manufacturer minimum GPP must be greater than zero")
    effective_weight = (
        compound_chart_effective_weight(build.draw_weight_lb, build.point_system_weight_gr)
        if bow_type == "compound"
        else build.draw_weight_lb
    )
    (
        estimated_deflection,
        estimated_ata_spine,
        estimated_lower_ata_spine,
        estimated_upper_ata_spine,
        estimated_effective_weight,
        estimated_weight_adjustment,
        _,
    ) = estimate_static_spine(
        bow_type,
        build.draw_weight_lb,
        build.shaft_length_in,
        weight,
    )
    return ArrowBuildResult(
        bow_type=bow_type,
        draw_weight_lb=round(build.draw_weight_lb, 2),
        shaft_length_in=round(build.shaft_length_in, 3),
        shaft_weight_gr=round(build.shaft_length_in * build.shaft_gpi, 1),
        point_system_weight_gr=round(build.point_system_weight_gr, 1),
        rear_components_weight_gr=round(build.rear_components_weight_gr, 1),
        finished_arrow_weight_gr=round(weight, 1),
        gpp=round(gpp, 2),
        manufacturer_min_gpp=minimum,
        minimum_weight_passes=None if minimum is None else gpp >= minimum,
        minimum_point_system_weight_gr=None if minimum is None else round(
            minimum_point_system_weight_for_gpp(
                build.draw_weight_lb,
                build.shaft_length_in,
                build.shaft_gpi,
                build.rear_components_weight_gr,
                minimum,
            ),
            1,
        ),
        static_deflection_in=None if static_deflection is None else round(static_deflection, 3),
        ata_spine=None if static_deflection is None else ata_spine_from_deflection(static_deflection),
        flexural_rigidity_lb_in2=None if static_deflection is None else round(flexural_rigidity_lb_in2(static_deflection), 2),
        estimated_deflection_in=estimated_deflection,
        estimated_ata_spine=estimated_ata_spine,
        estimated_lower_ata_spine=estimated_lower_ata_spine,
        estimated_upper_ata_spine=estimated_upper_ata_spine,
        estimated_effective_draw_weight_lb=estimated_effective_weight,
        estimated_point_weight_adjustment_lb=estimated_weight_adjustment,
        chart_effective_draw_weight_lb=round(effective_weight, 2),
        chart_next_step=chart_next_step(bow_type),
    )


def parse_number_list(raw: str) -> list[float]:
    if ":" in raw:
        parts = [float(part) for part in raw.split(":" )]
        if len(parts) != 3:
            raise argparse.ArgumentTypeError("range format must be start:stop:step")
        start, stop, step = parts
        if step <= 0 or stop < start:
            raise argparse.ArgumentTypeError("range must be increasing with a positive step")
        values: list[float] = []
        current = start
        while current <= stop + 1e-9:
            values.append(round(current, 6))
            current += step
        return values
    values = [float(part.strip()) for part in raw.split(",") if part.strip()]
    if not values:
        raise argparse.ArgumentTypeError("at least one number is required")
    return values


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Calculate measured arrow-build values.")
    parser.add_argument("--bow-type", choices=sorted(BOW_TYPES | set(BOW_TYPE_ALIASES)), required=True)
    parser.add_argument("--draw-weight", type=parse_number_list, required=True)
    parser.add_argument("--shaft-length", type=float, required=True, help="Nock throat to shaft end, inches.")
    parser.add_argument("--shaft-gpi", type=float, required=True)
    parser.add_argument("--point-system-weight", type=float, required=True, help="Point + insert/outsert/collar/forward weights, grains.")
    parser.add_argument("--rear-components-weight", type=float, default=0.0, help="Nock + fletching + wraps + adhesive, grains.")
    parser.add_argument("--static-deflection", type=float, help="ATA/ASTM deflection in inches.")
    parser.add_argument("--manufacturer-min-gpp", type=float, help="Minimum finished-arrow GPP from the bow maker manual.")
    parser.add_argument("--format", choices=["table", "json", "csv"], default="table")
    return parser


def run(args: argparse.Namespace) -> int:
    rows = [
        calculate_arrow_build(
            ArrowBuild(
                bow_type=args.bow_type,
                draw_weight_lb=draw_weight,
                shaft_length_in=args.shaft_length,
                shaft_gpi=args.shaft_gpi,
                point_system_weight_gr=args.point_system_weight,
                rear_components_weight_gr=args.rear_components_weight,
                static_deflection_in=args.static_deflection,
                manufacturer_min_gpp=args.manufacturer_min_gpp,
            )
        )
        for draw_weight in args.draw_weight
    ]
    if args.format == "json":
        print(json.dumps([asdict(row) for row in rows], ensure_ascii=False, indent=2))
    elif args.format == "csv":
        writer = csv.DictWriter(__import__("sys").stdout, fieldnames=list(asdict(rows[0]).keys()))
        writer.writeheader()
        writer.writerows(asdict(row) for row in rows)
    else:
        print_table(rows)
    return 0


def print_table(rows: Sequence[ArrowBuildResult]) -> None:
    headers = ["bow", "draw#", "shaft in", "finished gr", "GPP", "estimated spine", "ATA spine", "chart weight#"]
    body = [
        [row.bow_type, row.draw_weight_lb, row.shaft_length_in, row.finished_arrow_weight_gr, row.gpp, f"{row.estimated_lower_ata_spine}-{row.estimated_upper_ata_spine} ({row.estimated_ata_spine})", row.ata_spine or "-", row.chart_effective_draw_weight_lb]
        for row in rows
    ]
    widths = [max(len(str(header)), *(len(str(row[index])) for row in body)) for index, header in enumerate(headers)]
    print("  ".join(str(header).ljust(widths[index]) for index, header in enumerate(headers)))
    print("  ".join("-" * width for width in widths))
    for row in body:
        print("  ".join(str(cell).ljust(widths[index]) for index, cell in enumerate(row)))


if __name__ == "__main__":
    raise SystemExit(run(build_parser().parse_args()))
