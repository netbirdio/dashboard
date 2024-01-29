import { iconProperties, IconProps } from "@/assets/icons/IconProperties";

export default function AccessControlIcon(props: IconProps) {
  return (
    <svg
      {...iconProperties(props)}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 18"
    >
      <path d="M8 18A18.55 18.55 0 0 1 0 3l8-3 8 3a18.549 18.549 0 0 1-8 15Z" />
    </svg>
  );
}
