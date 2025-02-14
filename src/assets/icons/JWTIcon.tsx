import { iconProperties, IconProps } from "@/assets/icons/IconProperties";

export default function JWTIcon(props: Readonly<IconProps>) {
  return (
    <svg
      height="2500"
      viewBox=".4 .3 99.7 100"
      width="2500"
      xmlns="http://www.w3.org/2000/svg"
      {...iconProperties(props)}
    >
      <g fill="none">
        <path
          d="m57.8 27.2-.1-26.9h-15l.1 26.9 7.5 10.3zm-15 46.1v27h15v-27l-7.5-10.3z"
          fill="#fff"
        />
        <path
          d="m57.8 73.3 15.8 21.8 12.1-8.8-15.8-21.8-12.1-3.9zm-15-46.1-15.9-21.8-12.1 8.8 15.8 21.8 12.2 3.9z"
          fill="#00f2e6"
        />
        <path
          d="m30.6 36-25.6-8.3-4.6 14.2 25.6 8.4 12.1-4zm31.8 18.2 7.5 10.3 25.6 8.3 4.6-14.2-25.6-8.3z"
          fill="#00b9f1"
        />
        <path
          d="m74.5 50.3 25.6-8.4-4.6-14.2-25.6 8.3-7.5 10.3zm-48.5 0-25.6 8.3 4.6 14.2 25.6-8.3 7.5-10.3z"
          fill="#d63aff"
        />
        <path
          d="m30.6 64.5-15.8 21.8 12.1 8.8 15.9-21.8v-12.7zm39.3-28.5 15.8-21.8-12.1-8.8-15.8 21.8v12.7z"
          fill="#fb015b"
        />
      </g>
    </svg>
  );
}
