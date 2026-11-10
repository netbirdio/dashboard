import { iconProperties, IconProps } from "@/assets/icons/IconProperties";

export default function SlidersIcon(props: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      {...iconProperties(props)}
    >
      <rect x="0" y="2.25" width="16" height="1.5" rx="0.75" />
      <rect x="0" y="7.25" width="16" height="1.5" rx="0.75" />
      <rect x="0" y="12.25" width="16" height="1.5" rx="0.75" />
      <circle cx="5" cy="3" r="2.5" />
      <circle cx="11" cy="8" r="2.5" />
      <circle cx="6" cy="13" r="2.5" />
    </svg>
  );
}
