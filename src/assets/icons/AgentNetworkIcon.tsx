import { iconProperties, IconProps } from "@/assets/icons/IconProperties";

export default function AgentNetworkIcon(props: IconProps) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...iconProperties(props)}
    >
      <path
        d="M12 2L13.5 7L18.5 8.5L13.5 10L12 15L10.5 10L5.5 8.5L10.5 7L12 2Z"
        fill="currentColor"
      />
      <path
        d="M18 14L18.75 16.25L21 17L18.75 17.75L18 20L17.25 17.75L15 17L17.25 16.25L18 14Z"
        fill="currentColor"
      />
      <path
        d="M6 14L6.6 15.8L8.4 16.4L6.6 17L6 18.8L5.4 17L3.6 16.4L5.4 15.8L6 14Z"
        fill="currentColor"
      />
    </svg>
  );
}