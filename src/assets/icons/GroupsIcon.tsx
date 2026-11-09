import { iconProperties, IconProps } from "@/assets/icons/IconProperties";

export default function GroupsIcon(props: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      {...iconProperties(props)}
    >
      <path d="M1.5 1.5h4.1c.4 0 .8.17 1.06.47L7.9 3.25h6.6c.83 0 1.5.67 1.5 1.5v8.25c0 .83-.67 1.5-1.5 1.5h-13C.67 14.5 0 13.83 0 13V3c0-.83.67-1.5 1.5-1.5Z" />
    </svg>
  );
}
