export function getColorFromCode(code: string) {
  if (code.includes("add")) {
    return "green";
  } else if (code.includes("join")) {
    return "green";
  } else if (code.includes("invite")) {
    return "green";
  } else if (code.includes("create")) {
    return "green";
  } else if (code.includes("delete")) {
    return "red";
  } else if (code.includes("update")) {
    return "blue-darker";
  } else if (code.includes("revoke")) {
    return "red";
  } else if (code.includes("overuse")) {
    return "netbird";
  } else if (code.includes("overuse")) {
    return "netbird";
  } else if (code.includes("enable")) {
    return "blue-darker";
  } else if (code.includes("disable")) {
    return "blue-darker";
  } else if (code.includes("rename")) {
    return "blue-darker";
  } else if (code.includes("block")) {
    return "red";
  } else if (code.includes("unblock")) {
    return "blue-darker";
  } else if (code.includes("login")) {
    return "blue-darker";
  } else if (code.includes("expire")) {
    return "netbird";
  }
  return "blue-darker";
}
