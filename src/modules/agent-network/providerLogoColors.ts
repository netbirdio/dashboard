const LIGHT_INK = "#cbd2d6";
const DARK_INK = "#323232";

// relativeLuminance implements the WCAG sRGB formula. Returns 0 for anything
// that isn't a #rgb / #rrggbb string, which sends the caller to the light ink.
const relativeLuminance = (hex: string): number => {
  const value = hex.trim().replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return 0;
  const channels = [0, 2, 4].map((i) => {
    const c = parseInt(full.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};

// Light marks need at least 3:1 against the darkest light-mode tile
// (nb-gray-800, #e2e2e2). Keep the existing dark-mode ink selection.
export function providerLogoColors(brandColor: string, ink?: string) {
  const lightColor = ink ?? brandColor;
  return {
    light: relativeLuminance(lightColor) > 0.2 ? DARK_INK : lightColor,
    dark:
      ink ?? (relativeLuminance(brandColor) < 0.14 ? LIGHT_INK : brandColor),
  };
}
