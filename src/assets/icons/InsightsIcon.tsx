import { iconProperties, IconProps } from "@/assets/icons/IconProperties";

export default function InsightsIcon(props: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      {...iconProperties(props)}
    >
      <rect x="0.5" y="8.5" width="4" height="7" rx="1.2" />
      <rect x="6" y="4.5" width="4" height="11" rx="1.2" />
      <rect x="11.5" y="0.5" width="4" height="15" rx="1.2" />
    </svg>
  );
}
