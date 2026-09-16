export interface Core1Component {
  name: string;
  profile: string | number | null;
  steel: string | null;
  source_cell: string;
  status: string;
}

export interface Core1Bolt {
  name: string;
  pattern: string;
  source_cell: string;
}

export interface Core1Result {
  scenario: import("./input").Core1Input;
  frame_step_m?: number | null;
  beam_profile?: string | null;
  beam_steel?: string | null;
  beam_utilization?: number | null;
  column_profile?: string | null;
  column_steel?: string | null;
  column_utilization?: number | null;
  purlin_profile?: string | null;
  purlin_steel?: string | null;
  purlin_assignment?: string | null;
  purlin_step_mm?: number | null;
  purlin_kg_per_m2?: number | null;
  purlin_weight_kg?: number | null;
  ties?: Core1Component | null;
  suspensions?: Core1Component | null;
  spacers?: Core1Component | null;
  horizontal_bracing?: Core1Component[] | null;
  vertical_bracing?: Core1Component[] | null;
  gable_posts?: Core1Component | null;
  portal_bracing?: Core1Component | null;
  secondary_beams?: Core1Component[] | null;
  secondary_columns?: Core1Component | null;
  plates?: Core1Component[] | null;
  bolts?: Core1Bolt[] | null;
  M16_quantity?: number | null;
  fittings_weight_kg?: number | null;
  window_girts?: Array<Record<string, unknown>> | null;
  openings_weight_kg_per_m2?: number | null;
  openings_weight_t?: number | null;
  openings_weight_kg?: number | null;
  kg_per_m2?: number | null;
  engineering_loads?: Record<string, unknown> | null;
  compatibility_diagnostics: import("./diagnostic").Core1Diagnostic[];
}
