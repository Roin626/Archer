import unittest

from scripts.arrow_spine import (
    ArrowBuild,
    ata_spine_from_deflection,
    calculate_arrow_build,
    compound_chart_effective_weight,
    flexural_rigidity_lb_in2,
    normalize_bow_type,
    minimum_point_system_weight_for_gpp,
    static_spine_screening_band,
    static_deflection_from_flexural_rigidity,
)


class ArrowBuildTests(unittest.TestCase):
    def test_ata_static_spine_is_deflection_in_thousandths(self):
        self.assertEqual(ata_spine_from_deflection(0.5), 500)

    def test_flexural_rigidity_is_inverse_of_ata_deflection(self):
        rigidity = flexural_rigidity_lb_in2(0.5)
        self.assertAlmostEqual(rigidity, 1774.4533333333331)
        self.assertAlmostEqual(static_deflection_from_flexural_rigidity(rigidity), 0.5)

    def test_finished_arrow_weight_and_gpp_include_all_components(self):
        result = calculate_arrow_build(
            ArrowBuild(
                bow_type="olympic_recurve",
                draw_weight_lb=40,
                shaft_length_in=29,
                shaft_gpi=8,
                point_system_weight_gr=120,
                rear_components_weight_gr=28,
                static_deflection_in=0.5,
                manufacturer_min_gpp=9,
            )
        )

        self.assertEqual(result.shaft_weight_gr, 232)
        self.assertEqual(result.finished_arrow_weight_gr, 380)
        self.assertEqual(result.gpp, 9.5)
        self.assertTrue(result.minimum_weight_passes)
        self.assertEqual(result.ata_spine, 500)
        self.assertEqual(result.minimum_point_system_weight_gr, 100)

    def test_gpp_point_system_minimum_is_a_mass_safety_calculation(self):
        self.assertEqual(minimum_point_system_weight_for_gpp(40, 29, 8, 28, 9), 100)

    def test_calibrated_static_spine_screening_scales_force_and_length(self):
        self.assertEqual(static_spine_screening_band(0.5, 30, 30, 30, 30), (438, 500, 563))

    def test_compound_chart_adjustment_is_limited_to_easton_chart_rule(self):
        self.assertEqual(compound_chart_effective_weight(60, 150), 66)

    def test_legacy_bow_names_normalize(self):
        self.assertEqual(normalize_bow_type("traditional"), "american_hunting")
        self.assertEqual(normalize_bow_type("tranditional"), "american_hunting")
        self.assertEqual(normalize_bow_type("mongolian_traditional"), "shelfless_traditional")


if __name__ == "__main__":
    unittest.main()
