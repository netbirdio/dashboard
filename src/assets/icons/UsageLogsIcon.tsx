import { iconProperties, IconProps } from "@/assets/icons/IconProperties";

export default function UsageLogsIcon(props: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      {...iconProperties(props)}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4 0h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2Zm1 3.25v1.5h6v-1.5H5Zm0 9.25h1.5V9.5H5v3Zm2.75 0h1.5V7h-1.5v5.5Zm2.75 0H12V8.5h-1.5v4Z"
      />
    </svg>
  );
}
