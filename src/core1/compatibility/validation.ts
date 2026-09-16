import Ajv2020, { type ErrorObject, type ValidateFunction } from "ajv/dist/2020";
import diagnosticSchema from "../../../core1/schemas/Core1Diagnostic.schema.json";
import inputSchema from "../../../core1/schemas/Core1Input.schema.json";
import resultSchema from "../../../core1/schemas/Core1Result.schema.json";
import type { Core1Diagnostic, Core1Input, Core1Result } from "../types";

export interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  errors: ErrorObject[];
}

const ajv = new Ajv2020({ allErrors: true, strict: false });
ajv.addSchema(diagnosticSchema, "Core1Diagnostic.schema.json");
ajv.addSchema(inputSchema, "Core1Input.schema.json");
ajv.addSchema(resultSchema, "Core1Result.schema.json");

const inputValidator = ajv.getSchema<Core1Input>("Core1Input.schema.json") as ValidateFunction<Core1Input>;
const resultValidator = ajv.getSchema<Core1Result>("Core1Result.schema.json") as ValidateFunction<Core1Result>;
const diagnosticValidator = ajv.getSchema<Core1Diagnostic>("Core1Diagnostic.schema.json") as ValidateFunction<Core1Diagnostic>;

function validate<T>(validator: ValidateFunction<T>, value: unknown): ValidationResult<T> {
  const valid = validator(value);
  return valid
    ? { valid: true, data: value as T, errors: [] }
    : { valid: false, errors: validator.errors ?? [] };
}

export function validateCore1Input(value: unknown): ValidationResult<Core1Input> {
  return validate(inputValidator, value);
}

export function validateCore1Result(value: unknown): ValidationResult<Core1Result> {
  return validate(resultValidator, value);
}

export function validateCore1Diagnostic(value: unknown): ValidationResult<Core1Diagnostic> {
  return validate(diagnosticValidator, value);
}
