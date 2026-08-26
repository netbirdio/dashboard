import { faker } from "@faker-js/faker/locale/de";
import { cn } from "@utils/helpers";
import {
  CategoryScale,
  Chart as ChartJS,
  ChartData,
  ChartOptions,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import * as React from "react";
import { useState } from "react";
import { Line } from "react-chartjs-2";

type Props = {};

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
);

export const options: ChartOptions<"line"> = {
  responsive: true,
  elements: {
    line: {
      tension: 0.4,
    },
  },
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      enabled: false,
    },
  },
  scales: {
    y: {
      grid: {
        color: "rgba(255,255,255,0.05)",
      },
      ticks: {
        display: false,
        color: "rgba(255,255,255,1)",
        count: 3,
      },
    },
    x: {
      grid: {
        color: "rgba(255,255,255,0.05)",
      },
      ticks: {
        display: false,
        color: "rgba(255,255,255,0.5)",
      },
    },
  },
};

const labels = [
  "0:00",
  "0:05",
  "0:10",
  "0:15",
  "0:20",
  "0:25",
  "0:30",
  "0:35",
  "0:40",
  "0:45",
  "0:50",
  "0:55",
  "1:00",
];

export const TrafficEventChart = ({}: Props) => {
  const chartRef = React.useRef<ChartJS<"line">>(null);
  const [gradientColor, setGradientColor] = useState<CanvasGradient>();

  React.useEffect(() => {
    const chart = chartRef.current;

    if (!chart) {
      return;
    }

    const ctx = chart.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, 150);
    gradient.addColorStop(0, "rgba(246,131,48,0.5)"); // Orange at the top
    gradient.addColorStop(1, "rgba(246,131,48,0)"); // Transparent at the bottom

    setGradientColor(gradient);
  }, []);

  const data: ChartData<"line"> = {
    labels,
    datasets: [
      {
        fill: true,
        data: labels.map(() =>
          faker.number.int({
            min: 40,
            max: 100,
          }),
        ),
        borderColor: "rgba(246,131,48,0.8)",
        pointBackgroundColor: "rgba(246,131,48,1)",
        backgroundColor: gradientColor, // This will be replaced by the gradient
      },
    ],
  };

  return (
    <div className={""}>
      <div
        className={cn(
          "border cursor-pointer border-nb-gray-900/80 bg-nb-gray-900/30 hover:bg-nb-gray-900/50 py-3 pl-3 pr-5 rounded-lg transition-all min-w-[310px] max-w-[400px]",
        )}
      >
        <Line
          options={options}
          data={data}
          ref={chartRef}
          height={700}
          width={1600}
        />
      </div>
    </div>
  );
};
