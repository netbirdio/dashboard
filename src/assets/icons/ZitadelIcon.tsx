import { iconProperties, IconProps } from "@/assets/icons/IconProperties";

export default function ZitadelIcon(props: Readonly<IconProps>) {
  return (
    <svg
      viewBox="0 0 80 79"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...iconProperties(props)}
    >
      <defs>
        <linearGradient
          id="zitadel-grad"
          x1="3.86"
          x2="76.88"
          y1="47.89"
          y2="47.89"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FF8F00" />
          <stop offset="1" stopColor="#FE00FF" />
        </linearGradient>
      </defs>
      <path
        fill="url(#zitadel-grad)"
        fillRule="evenodd"
        d="M17.12 39.17l1.42 5.32-6.68 6.68 9.12 2.44 1.43 5.32-19.77-5.3L17.12 39.17zM58.82 22.41l-5.32-1.43-2.44-9.12-6.68 6.68-5.32-1.43 14.47-14.47 5.3 19.77zM52.65 67.11l3.89-3.89 9.12 2.44-2.44-9.12 3.9-3.9 5.29 19.77-19.76-5.3zM36.43 69.54l-1.18-12.07 8.23 2.21-7.05 9.86zM23 23.84l5.02 11.04 6.02-6.02L23 23.84zM69.32 36.2l-12.07-1.18 2.2 8.23 9.87-7.05z"
        clipRule="evenodd"
      />
    </svg>
  );
}