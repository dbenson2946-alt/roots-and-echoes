import type { CSSProperties } from "react";
import { Icon, type IconName } from "./Icon";

/** The circular double-ring icon badge used on every content tile — see
 * .medallion in globals.css. `accent` sets --tile-accent for contexts that
 * aren't already inside a `.tile-accent-*` ancestor. */
export function Medallion({
  icon,
  size = "md",
  accent,
  className,
}: {
  icon: IconName;
  size?: "md" | "sm";
  accent?: string;
  className?: string;
}) {
  return (
    <div
      className={`medallion ${size === "sm" ? "medallion-sm" : ""} ${className || ""}`}
      style={accent ? ({ "--tile-accent": accent } as CSSProperties) : undefined}
    >
      <Icon name={icon} />
    </div>
  );
}
