import * as React from "react";
import { Input } from "./input";

export type ThemedInputProps = React.InputHTMLAttributes<HTMLInputElement>;

/**
 * Deprecated: thin alias of the base `Input` so every field shares one
 * token-correct implementation (the old inline-style version bypassed the
 * design tokens and mis-bound --input as a background). Prefer `{ Input }`.
 */
export const ThemedInput = Input;
