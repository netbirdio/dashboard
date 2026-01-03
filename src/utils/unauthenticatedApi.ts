import loadConfig from "@utils/config";
import {
  ApiError,
  InstanceStatus,
  SetupRequest,
  SetupResponse,
} from "@/interfaces/Instance";

const config = loadConfig();

async function unauthenticatedRequest<T>(
  method: "GET" | "POST",
  endpoint: string,
  data?: unknown,
): Promise<T> {
  const url = `${config.apiOrigin}/api${endpoint}`;

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!res.ok) {
    let error: ApiError;
    try {
      const errorBody = await res.json();
      error = {
        code: res.status,
        message: errorBody.message || res.statusText,
      };
    } catch {
      error = { code: res.status, message: res.statusText };
    }
    return Promise.reject(error);
  }

  // Handle empty response
  const text = await res.text();
  if (!text) return {} as T;

  return JSON.parse(text) as T;
}

export async function fetchInstanceStatus(): Promise<InstanceStatus> {
  return unauthenticatedRequest<InstanceStatus>("GET", "/instance");
}

export async function submitSetup(data: SetupRequest): Promise<SetupResponse> {
  return unauthenticatedRequest<SetupResponse>("POST", "/setup", data);
}
