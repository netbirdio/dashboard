import { iconProperties, IconProps } from "@/assets/icons/IconProperties";

export default function ServiceUsersIcon(props: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      {...iconProperties(props)}
    >
      <rect x="7.25" y="0" width="1.5" height="3" rx="0.75" />
      <circle cx="8" cy="1" r="1.25" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.5 3.5h9a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2Zm2 3.5a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Zm5 0a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5ZM5.75 11v1.25h4.5V11h-4.5Z"
      />
      <rect x="0" y="7" width="1" height="3" rx="0.5" />
      <rect x="15" y="7" width="1" height="3" rx="0.5" />
    </svg>
  );
}
