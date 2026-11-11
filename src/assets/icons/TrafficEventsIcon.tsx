import { iconProperties, IconProps } from "@/assets/icons/IconProperties";

export default function TrafficEventsIcon(props: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      {...iconProperties(props)}
    >
      <rect x="0.5" y="3.25" width="11.5" height="1.5" rx="0.75" />
      <path d="M11 0.5 15.5 4 11 7.5Z" />
      <rect x="4" y="11.25" width="11.5" height="1.5" rx="0.75" />
      <path d="M5 8.5 0.5 12 5 15.5Z" />
    </svg>
  );
}
