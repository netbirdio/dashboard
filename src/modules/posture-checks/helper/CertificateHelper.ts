import { useEffect, useState } from "react";

const pemCertificateBlock =
  /-----BEGIN CERTIFICATE-----([\s\S]*?)-----END CERTIFICATE-----/g;
const base64 = /^[A-Za-z0-9+/]+={0,2}$/;

// Returns the base64 bodies of all CERTIFICATE blocks, or undefined when the input is
// not exclusively made of well-formed blocks.
export const pemCertificateBodies = (pem: string): string[] | undefined => {
  const bodies: string[] = [];
  const rest = pem.replace(pemCertificateBlock, (_, body: string) => {
    bodies.push(body.replace(/\s+/g, ""));
    return "";
  });
  if (bodies.length === 0 || rest.trim() !== "") return undefined;
  const wellFormed = bodies.every(
    (b) => b.length > 0 && b.length % 4 === 0 && base64.test(b),
  );
  return wellFormed ? bodies : undefined;
};

export const isValidPEMCertificate = (pem: string) =>
  pemCertificateBodies(pem) !== undefined;

// SHA-256 fingerprint of the first certificate in the PEM, as colon separated hex.
export const certificateFingerprint = async (
  pem: string,
): Promise<string | undefined> => {
  const bodies = pemCertificateBodies(pem);
  if (!bodies || typeof crypto === "undefined" || !crypto.subtle) return;
  const der = Uint8Array.from(atob(bodies[0]), (c) => c.charCodeAt(0));
  const digest = await crypto.subtle.digest("SHA-256", der);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
    .join(":");
};

export const useCertificateFingerprints = (pems: string[]) => {
  const [fingerprints, setFingerprints] = useState<(string | undefined)[]>([]);
  const key = JSON.stringify(pems);

  useEffect(() => {
    let cancelled = false;
    const list: string[] = JSON.parse(key);
    Promise.all(list.map(certificateFingerprint)).then((result) => {
      if (!cancelled) setFingerprints(result);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return fingerprints;
};
