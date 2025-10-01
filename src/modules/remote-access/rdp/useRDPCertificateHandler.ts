import { useCallback, useState } from "react";

export interface CertificateInfo {
  raw?: Uint8Array;
  fingerprint: string;
  hostname: string;
  subject?: string;
  issuer?: string;
  validFrom?: Date;
  validTo?: Date;
  serialNumber?: string;
  keySize?: number;
}

interface TrustedCertificate {
  fingerprint: string;
  hostname: string;
  addedAt: string;
  subject?: string;
}

export interface RDCleanPathResponse {
  ServerAddr?: string;
  ServerCertChain?: Uint8Array[];
  CertificateInfo?: CertificateInfo;
}

export interface CertificatePromptInfo {
  hostname: string;
  certificate: CertificateInfo;
  isChange: boolean;
  previousCertificate?: TrustedCertificate;
}

export interface CertificateValidationResult {
  isValid: boolean;
  needsUserConfirmation: boolean;
  promptInfo?: CertificatePromptInfo;
}

const STORAGE_KEY = "netbird-rdp-trusted-certs";

export const useRDPCertificateHandler = () => {
  const [isValidating, setIsValidating] = useState(false);

  const calculateFingerprint = useCallback(
    async (certBytes: Uint8Array): Promise<string> => {
      try {
        const hashBuffer = await crypto.subtle.digest("SHA-256", certBytes);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const fingerprint = hashArray
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(":")
          .toUpperCase();
        return fingerprint;
      } catch (error) {
        return "FINGERPRINT_CALCULATION_FAILED";
      }
    },
    [],
  );

  const parseCertificate = useCallback(
    async (
      certBytes: Uint8Array,
      hostname: string,
    ): Promise<CertificateInfo> => {
      const fingerprint = await calculateFingerprint(certBytes);
      const certInfo: CertificateInfo = {
        raw: certBytes,
        fingerprint,
        hostname,
      };

      try {
        const certString = new TextDecoder("latin1").decode(certBytes);

        // Parse subject (CN)
        const cnMatch = certString.match(/CN=([^,\0\x00-\x1f]+)/);
        if (cnMatch) {
          certInfo.subject = `CN=${cnMatch[1].trim()}`;
        }

        // Parse issuer - look for issuer field
        const issuerMatch = certString.match(
          /(?:issuer|Issuer).*?CN=([^,\0\x00-\x1f]+)/i,
        );
        if (issuerMatch) {
          certInfo.issuer = `CN=${issuerMatch[1].trim()}`;
        } else {
          // Fallback: look for second CN occurrence (often issuer)
          const cnMatches = [...certString.matchAll(/CN=([^,\0\x00-\x1f]+)/g)];
          if (cnMatches.length > 1) {
            certInfo.issuer = `CN=${cnMatches[1][1].trim()}`;
          }
        }

        // Estimate key size based on certificate structure and length
        if (certBytes.length > 100) {
          // Look for RSA signature patterns or use length heuristic
          if (certBytes.length > 1400) {
            certInfo.keySize = 2048;
          } else if (certBytes.length > 1000) {
            certInfo.keySize = 1024;
          } else if (certBytes.length > 600) {
            certInfo.keySize = 1024;
          } else {
            certInfo.keySize = 512;
          }
        }

        // Try to parse serial number (look for sequence of hex bytes)
        const serialMatch = certString.match(
          /[\x02][\x01-\x10]([\x00-\xff]{1,16})/,
        );
        if (serialMatch && serialMatch[1]) {
          const serialBytes = Array.from(serialMatch[1], (char) =>
            char.charCodeAt(0),
          );
          certInfo.serialNumber = serialBytes
            .map((b) => b.toString(16).padStart(2, "0"))
            .join(":")
            .toUpperCase();
        }

        // Try to parse validity dates (basic ASN.1 time format)
        // Look for UTCTime or GeneralizedTime patterns
        const timePattern =
          /[\x17\x18][\x0d\x0f](\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z?/g;
        const timeMatches = [...certString.matchAll(timePattern)];

        if (timeMatches.length >= 2) {
          const parseTime = (match: RegExpMatchArray) => {
            let year = parseInt(match[1]);
            // Handle 2-digit years (UTCTime format)
            if (year < 50) year += 2000;
            else if (year < 100) year += 1900;

            const month = parseInt(match[2]) - 1; // JS months are 0-based
            const day = parseInt(match[3]);
            const hour = parseInt(match[4]);
            const minute = parseInt(match[5]);
            const second = parseInt(match[6]);

            return new Date(year, month, day, hour, minute, second);
          };

          certInfo.validFrom = parseTime(timeMatches[0]);
          certInfo.validTo = parseTime(timeMatches[1]);
        }
      } catch (error) {
        console.warn("Failed to parse certificate details:", error);
      }

      return certInfo;
    },
    [calculateFingerprint],
  );

  const getTrustedCerts = useCallback((): Record<
    string,
    TrustedCertificate
  > => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error("Failed to load trusted certificates:", error);
      return {};
    }
  }, []);

  const saveTrustedCert = useCallback(
    (hostname: string, certInfo: CertificateInfo): void => {
      try {
        const trustedCerts = getTrustedCerts();
        trustedCerts[hostname] = {
          fingerprint: certInfo.fingerprint,
          hostname,
          addedAt: new Date().toISOString(),
          subject: certInfo.subject,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trustedCerts));
      } catch (error) {
        console.error("Failed to save trusted certificate:", error);
      }
    },
    [getTrustedCerts],
  );

  const validateCertificate = useCallback(
    async (
      certInfo: CertificateInfo,
      hostname?: string,
    ): Promise<CertificateValidationResult> => {
      const host = hostname || certInfo.hostname;
      const trustedCerts = getTrustedCerts();
      const stored = trustedCerts[host];

      if (stored) {
        if (stored.fingerprint === certInfo.fingerprint) {
          return { isValid: true, needsUserConfirmation: false };
        }

        console.warn(`Certificate for ${host} has changed!`);
        return {
          isValid: false,
          needsUserConfirmation: true,
          promptInfo: {
            hostname: host,
            certificate: certInfo,
            isChange: true,
            previousCertificate: stored,
          },
        };
      }

      return {
        isValid: false,
        needsUserConfirmation: true,
        promptInfo: {
          hostname: host,
          certificate: certInfo,
          isChange: false,
        },
      };
    },
    [getTrustedCerts],
  );

  const handleRDCleanPathResponse = useCallback(
    async (
      response: RDCleanPathResponse,
    ): Promise<CertificateValidationResult> => {
      setIsValidating(true);

      try {
        if (!response.ServerCertChain?.length) {
          return { isValid: false, needsUserConfirmation: false };
        }

        const serverAddr = response.ServerAddr || "unknown";
        const hostname = serverAddr.split(":")[0];
        const certBytes = response.ServerCertChain[0];

        let certInfo: CertificateInfo;

        if (response.CertificateInfo) {
          certInfo = response.CertificateInfo;
          // Add missing fingerprint and keySize that the server doesn't provide
          if (!certInfo.fingerprint) {
            certInfo.fingerprint = await calculateFingerprint(certBytes);
          }
          if (!certInfo.keySize && certBytes.length > 100) {
            if (certBytes.length > 1400) {
              certInfo.keySize = 2048;
            } else if (certBytes.length > 1000) {
              certInfo.keySize = 1024;
            } else if (certBytes.length > 600) {
              certInfo.keySize = 1024;
            } else {
              certInfo.keySize = 512;
            }
          }
        } else {
          try {
            certInfo = await parseCertificate(certBytes, hostname);
          } catch (error) {
            console.error("Certificate parsing error:", error);
            const fingerprint = await calculateFingerprint(certBytes);
            certInfo = {
              raw: certBytes,
              fingerprint,
              hostname,
              subject: "Unable to parse",
              issuer: "Unable to parse",
            };
          }
        }

        return await validateCertificate(certInfo, hostname);
      } finally {
        setIsValidating(false);
      }
    },
    [parseCertificate, validateCertificate, calculateFingerprint],
  );

  const acceptCertificate = useCallback(
    (
      hostname: string,
      certInfo: CertificateInfo,
      remember: boolean = true,
    ): void => {
      if (remember) {
        saveTrustedCert(hostname, certInfo);
      }
    },
    [saveTrustedCert],
  );

  const clearTrustedCerts = useCallback((): void => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const listTrustedCerts = useCallback((): TrustedCertificate[] => {
    return Object.values(getTrustedCerts());
  }, [getTrustedCerts]);

  return {
    isValidating,
    handleRDCleanPathResponse,
    validateCertificate,
    acceptCertificate,
    clearTrustedCerts,
    getTrustedCerts: listTrustedCerts,
    calculateFingerprint,
    parseCertificate,
  };
};
