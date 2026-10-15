import { cookies } from "next/headers";
import type { Theme } from "@/components/theme-toggle";

export async function getTheme(): Promise<Theme> {
  const value = (await cookies()).get("theme")?.value;
  return value === "dark" || value === "system" ? value : "light";
}
