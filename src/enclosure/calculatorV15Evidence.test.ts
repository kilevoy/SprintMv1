import { describe, expect, it } from "vitest";
import fixture from "../../docs/enclosure/evidence/calculator-v15-default-geometry.json";
import { resolveWallGeometry } from "./wallGeometryResolver";

describe("Calculator ограждайки v1.5 evidence fixture", () => {
  it("replays the explicit corner/typical zone chain", () => {
    const result = resolveWallGeometry({
      orientation: fixture.explicit_wall_geometry.orientation as "SIDE",
      wallCalculationLength_m: fixture.explicit_wall_geometry.wall_calculation_length_m.value,
      wallCalculationHeight_m: fixture.explicit_wall_geometry.wall_calculation_height_m.value,
      cornerHalfLength_m: fixture.explicit_wall_geometry.corner_half_length_m.value,
      supportStep_m: fixture.explicit_wall_geometry.support_step_m.value,
    });
    expect(result.status).toBe("RESOLVED");
    if (result.status !== "RESOLVED") return;
    expect(result.geometry.cornerZoneLength_m).toBe(fixture.derived_zone_evidence.corner_zone_length_m.cached_value);
    expect(result.geometry.typicalZoneLength_m).toBe(fixture.derived_zone_evidence.typical_zone_length_m.cached_value);
  });

  it("keeps ProjectInput auto-wiring explicitly unproven", () => {
    expect(fixture.policy.project_input_auto_wiring).toBe("NOT_PROVEN");
  });
});
