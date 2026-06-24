import { Button, buttonVariants, type ButtonProps } from "./button";

/**
 * Deprecated: thin alias of the base `Button` so every button shares one
 * token-correct implementation (the old version used inline styles + JS hover
 * handlers). Prefer importing `{ Button }` directly.
 */
export const ThemedButton = Button;
export const themedButtonVariants = buttonVariants;
export type ThemedButtonProps = ButtonProps;
