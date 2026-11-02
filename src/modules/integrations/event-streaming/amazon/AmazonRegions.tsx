import RoundedFlag from "@/assets/countries/RoundedFlag";

export const AmazonRegions = [
  // US
  {
    name: "US East (N. Virginia)",
    code: "us-east-1",
    icon: () => <RoundedFlag country="us" />,
  },
  {
    name: "US East (Ohio)",
    code: "us-east-2",
    icon: () => <RoundedFlag country="us" />,
  },
  {
    name: "US West (N. California)",
    code: "us-west-1",
    icon: () => <RoundedFlag country="us" />,
  },
  {
    name: "US West (Oregon)",
    code: "us-west-2",
    icon: () => <RoundedFlag country="us" />,
  },
  // Europe
  {
    name: "Europe (Frankfurt)",
    code: "eu-central-1",
    icon: () => <RoundedFlag country="de" />,
  },
  {
    name: "Europe (Zurich)",
    code: "eu-central-2",
    icon: () => <RoundedFlag country="ch" />,
  },
  {
    name: "Europe (Ireland)",
    code: "eu-west-1",
    icon: () => <RoundedFlag country="ie" />,
  },
  {
    name: "Europe (London)",
    code: "eu-west-2",
    icon: () => <RoundedFlag country="gb" />,
  },
  {
    name: "Europe (Paris)",
    code: "eu-west-3",
    icon: () => <RoundedFlag country="fr" />,
  },
  {
    name: "Europe (Milan)",
    code: "eu-south-1",
    icon: () => <RoundedFlag country="it" />,
  },
  {
    name: "Europe (Spain)",
    code: "eu-south-2",
    icon: () => <RoundedFlag country="es" />,
  },
  {
    name: "Europe (Stockholm)",
    code: "eu-north-1",
    icon: () => <RoundedFlag country="se" />,
  },
  // Asia Pacific
  {
    name: "Asia Pacific (Hong Kong)",
    code: "ap-east-1",
    icon: () => <RoundedFlag country="hk" />,
  },
  {
    name: "Asia Pacific (Mumbai)",
    code: "ap-south-1",
    icon: () => <RoundedFlag country="in" />,
  },
  {
    name: "Asia Pacific (Hyderabad)",
    code: "ap-south-2",
    icon: () => <RoundedFlag country="in" />,
  },
  {
    name: "Asia Pacific (Tokyo)",
    code: "ap-northeast-1",
    icon: () => <RoundedFlag country="jp" />,
  },
  {
    name: "Asia Pacific (Seoul)",
    code: "ap-northeast-2",
    icon: () => <RoundedFlag country="kr" />,
  },
  {
    name: "Asia Pacific (Osaka)",
    code: "ap-northeast-3",
    icon: () => <RoundedFlag country="jp" />,
  },
  {
    name: "Asia Pacific (Singapore)",
    code: "ap-southeast-1",
    icon: () => <RoundedFlag country="sg" />,
  },
  {
    name: "Asia Pacific (Sydney)",
    code: "ap-southeast-2",
    icon: () => <RoundedFlag country="au" />,
  },
  {
    name: "Asia Pacific (Jakarta)",
    code: "ap-southeast-3",
    icon: () => <RoundedFlag country="id" />,
  },
  {
    name: "Asia Pacific (Melbourne)",
    code: "ap-southeast-4",
    icon: () => <RoundedFlag country="au" />,
  },
  // Canada
  {
    name: "Canada (Central)",
    code: "ca-central-1",
    icon: () => <RoundedFlag country="ca" />,
  },
  {
    name: "Canada (Calgary)",
    code: "ca-west-1",
    icon: () => <RoundedFlag country="ca" />,
  },
  // Middle East
  {
    name: "Middle East (Bahrain)",
    code: "me-south-1",
    icon: () => <RoundedFlag country="bh" />,
  },
  {
    name: "Middle East (UAE)",
    code: "me-central-1",
    icon: () => <RoundedFlag country="ae" />,
  },
  // Africa
  {
    name: "Africa (Cape Town)",
    code: "af-south-1",
    icon: () => <RoundedFlag country="za" />,
  },
  // South America
  {
    name: "South America (São Paulo)",
    code: "sa-east-1",
    icon: () => <RoundedFlag country="br" />,
  },
  // Israel
  {
    name: "Israel (Tel Aviv)",
    code: "il-central-1",
    icon: () => <RoundedFlag country="il" />,
  },
] as const;
