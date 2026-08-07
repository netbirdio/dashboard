import { iconProperties, IconProps } from "@/assets/icons/IconProperties";

export default function LoadingIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 919 669"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...iconProperties(props)}
    >
      <style>{`
        @keyframes nb-loader-pulse {
          0%, 100% { transform: scale(0.85); opacity: 0.35; }
          50%      { transform: scale(1);    opacity: 1;    }
        }
        .nb-loader-bird {
          animation: nb-loader-pulse 1.75s ease-in-out infinite;
          transform-origin: 50% 50%;
          transform-box: fill-box;
        }
      `}</style>
      <g className={"nb-loader-bird"}>
        <path
          d="M653.25 0C542.297 10.255 487.216 74.132 466.346 106.359L456.959 122.609C456.311 123.963 455.886 124.865 455.886 124.865L455.774 124.685L142.056 668.021H533.256L918.947 0H653.25Z"
          fill="#F68330"
        />
        <path
          d="M533.256 668.02L0 102.296C0 102.296 603.149 -59.6172 661.827 445.893L533.256 668.02Z"
          fill="#F68330"
        />
        <path
          d="M454.3 127.229L290.658 410.664L533.256 668.02L661.757 445.475C641.46 271.63 556.721 176.843 454.3 127.229Z"
          fill="#F35E32"
        />
      </g>
    </svg>
  );
}