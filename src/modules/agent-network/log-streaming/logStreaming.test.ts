import { describe, expect, it } from "vitest";
import {
  buildLogStreamingConfig,
  otlpEndpointError,
} from "@/modules/agent-network/log-streaming/logStreaming";

describe("buildLogStreamingConfig", () => {
  it("leaves empty fields out on create so server defaults apply", () => {
    expect(
      buildLogStreamingConfig(
        "http",
        { url: " https://logs.example.com ", batch_size: "", endpoint: "x" },
        {},
        false,
      ),
    ).toEqual({ url: "https://logs.example.com" });
  });

  it("sends empty fields as empty strings on update to remove them", () => {
    const config = buildLogStreamingConfig(
      "otlp_grpc",
      { endpoint: "otel:4317", insecure: "true" },
      undefined,
      true,
    );
    expect(config).toMatchObject({
      endpoint: "otel:4317",
      insecure: "true",
      service_name: "",
      timeout: "",
      enrich_user_info: "",
      headers: "",
    });
    // Keys owned by the other platform, or by curl only, are never sent.
    expect(config).not.toHaveProperty("url");
    expect(config).not.toHaveProperty("api_key");
  });

  it("serializes headers and passes masked secrets through unchanged", () => {
    expect(
      buildLogStreamingConfig(
        "http",
        { url: "https://x.test", signing_secret: "****" },
        { Authorization: "Bearer ****" },
        true,
      ),
    ).toMatchObject({
      signing_secret: "****",
      headers: '{"Authorization":"Bearer ****"}',
    });
  });
});

describe("otlpEndpointError", () => {
  it.each(["otel:4317", "10.0.0.1:4317", "[::1]:4317", ""])(
    "accepts %s",
    (endpoint) => expect(otlpEndpointError(endpoint)).toBe(""),
  );
  it.each(["https://otel:4317", "otel", "otel:port", "otel:4317/v1"])(
    "rejects %s",
    (endpoint) => expect(otlpEndpointError(endpoint)).not.toBe(""),
  );
});
