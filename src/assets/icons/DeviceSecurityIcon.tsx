import { iconProperties, IconProps } from "@/assets/icons/IconProperties";

export default function DeviceSecurityIcon(props: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      {...iconProperties(props)}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 1L2 5.5V11c0 6.08 4.26 11.74 10 13.16C17.74 22.74 22 17.08 22 11V5.5L12 1zm0 2.28l8 3.74V11c0 5.07-3.44 9.79-8 11.12C7.44 20.79 4 16.07 4 11V7.02l8-3.74zM16.5 9.5l-5.17 5.17-2.83-2.84-1.41 1.41 4.24 4.25 6.58-6.58L16.5 9.5z"
      />
    </svg>
  );
}
