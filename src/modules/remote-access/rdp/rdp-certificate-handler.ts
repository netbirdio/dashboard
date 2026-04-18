/**
 * RDP Certificate Handler
 * Handles X.509 certificate validation and user acceptance for RDP connections
 */
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

export interface CertificateHandler {
  validateCertificate(certInfo: CertificateInfo, hostname?: string): Promise<boolean>;
  handleRDCleanPathResponse(response: RDCleanPathResponse): Promise<boolean>;
}

export class RDPCertificateHandler implements CertificateHandler {
  private readonly STORAGE_KEY = 'netbird-rdp-trusted-certs';
  private modalElement: HTMLElement | null = null;
  private readonly labels = {
    parseUnavailable: '无法解析',
    verificationTitle: 'RDP 证书验证',
    serverPresentsCertificate: '服务器',
    serverPresentsCertificateSuffix: '正在提供以下证书：',
    subject: '主题',
    issuer: '签发者',
    serial: '序列号',
    sha256: 'SHA-256',
    trustQuestion: '你信任此证书吗？',
    rememberCertificate: '记住此证书，以便后续连接时自动信任',
    reject: '拒绝',
    accept: '接受',
    changedTitle: '证书已发生变化！',
    previousFingerprint: '此前的指纹：',
  };
  /**
   * Handle RDCleanPath response containing server certificates
   */
  async handleRDCleanPathResponse(response: RDCleanPathResponse): Promise<boolean> {
    if (!response.ServerCertChain || response.ServerCertChain.length === 0) {
      console.error('No certificate chain provided - rejecting connection for security');
      return false;
    }
    const serverAddr = response.ServerAddr || 'unknown';
    const hostname = serverAddr.split(':')[0];
    const certBytes = response.ServerCertChain[0];
    try {
      // Check if response already has parsed certificate info from Go proxy
      if (response.CertificateInfo) {
        return await this.validateCertificate(response.CertificateInfo, hostname);
      }
      // Fallback to parsing the raw certificate
      const certInfo = await this.parseCertificate(certBytes, hostname);
      return await this.validateCertificate(certInfo, hostname);
    } catch (error) {
      console.error('Certificate validation error:', error);
      return await this.promptRawCertificateAcceptance(certBytes, hostname);
    }
  }
  /**
   * Parse X.509 certificate bytes to extract relevant information
   * Note: For proper X.509 parsing, the Go proxy should provide parsed certificate info
   */
  async parseCertificate(certBytes: Uint8Array, hostname: string): Promise<CertificateInfo> {
    const fingerprint = await this.calculateFingerprint(certBytes);
    // Basic certificate info - actual parsing should be done by Go proxy
    const certInfo: CertificateInfo = {
      raw: certBytes,
      fingerprint: fingerprint,
      hostname: hostname
    };
    // Try to extract basic info from certificate if not provided by proxy
    // This is a fallback - proper X.509 parsing should be done server-side
    const certString = new TextDecoder('latin1').decode(certBytes);
    const cnMatch = certString.match(/CN=([^,\0]+)/);
    if (cnMatch) {
      certInfo.subject = cnMatch[0];
    }
    return certInfo;
  }
  /**
   * Extract serial number from certificate bytes
   * Note: This is a placeholder - actual serial number extraction requires proper ASN.1 parsing
   */
  private extractSerialNumber(certBytes: Uint8Array): string | undefined {
    // Serial number extraction should be done by the Go proxy
    // This is just a fallback that won't work reliably
    return undefined;
  }
  /**
   * Calculate SHA-256 fingerprint of certificate
   */
  async calculateFingerprint(certBytes: Uint8Array): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', certBytes as Uint8Array<ArrayBuffer>);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray
      .map(b => b.toString(16).padStart(2, '0'))
      .join(':')
      .toUpperCase();
  }
  /**
   * Validate certificate against stored trust database
   */
  async validateCertificate(certInfo: CertificateInfo, hostname?: string): Promise<boolean> {
    const host = hostname || certInfo.hostname;
    const trustedCerts = this.loadTrustedCerts();
    if (trustedCerts[host]) {
      const stored = trustedCerts[host];
      if (stored.fingerprint === certInfo.fingerprint) {
        return true;
      } else {
        console.warn(`Certificate for ${host} has changed!`);
        return await this.promptCertificateChange(host, certInfo, stored);
      }
    }
    console.log(`New certificate for ${host} - requesting user acceptance`);
    return await this.promptUserAcceptance(host, certInfo);
  }
  /**
   * Load trusted certificates from storage
   */
  private loadTrustedCerts(): Record<string, TrustedCertificate> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Failed to load trusted certificates:', error);
      return {};
    }
  }
  /**
   * Save trusted certificate to storage
   */
  private saveTrustedCert(hostname: string, certInfo: CertificateInfo): void {
    try {
      const trustedCerts = this.loadTrustedCerts();
      trustedCerts[hostname] = {
        fingerprint: certInfo.fingerprint,
        hostname: hostname,
        addedAt: new Date().toISOString(),
        subject: certInfo.subject
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trustedCerts));
    } catch (error) {
      console.error('Failed to save trusted certificate:', error);
    }
  }
  /**
   * Prompt user to accept a new certificate
   */
  private async promptUserAcceptance(hostname: string, certInfo: CertificateInfo): Promise<boolean> {
    return new Promise((resolve) => {
      const modal = this.createCertificateModal(hostname, certInfo, false);
      const acceptBtn = modal.querySelector('#cert-accept') as HTMLButtonElement;
      const rejectBtn = modal.querySelector('#cert-reject') as HTMLButtonElement;
      const rememberCheck = modal.querySelector('#cert-remember') as HTMLInputElement;
      acceptBtn.onclick = () => {
        const remember = rememberCheck.checked;
        if (remember) {
          this.saveTrustedCert(hostname, certInfo);
        }
        this.closeModal();
        resolve(true);
      };
      rejectBtn.onclick = () => {
        this.closeModal();
        resolve(false);
      };
    });
  }
  /**
   * Prompt user when certificate has changed
   */
  private async promptCertificateChange(
    hostname: string,
    newCert: CertificateInfo,
    oldCert: TrustedCertificate
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const modal = this.createCertificateModal(hostname, newCert, true);
      // Add warning about certificate change
      const warningDiv = modal.querySelector('.cert-warning') as HTMLElement;
      warningDiv.innerHTML = `
        <strong>${this.labels.changedTitle}</strong><br>
        <small>${this.labels.previousFingerprint} ${oldCert.fingerprint.substring(0, 32)}...</small>
      `;
      const acceptBtn = modal.querySelector('#cert-accept') as HTMLButtonElement;
      const rejectBtn = modal.querySelector('#cert-reject') as HTMLButtonElement;
      const rememberCheck = modal.querySelector('#cert-remember') as HTMLInputElement;
      acceptBtn.onclick = () => {
        const remember = rememberCheck.checked;
        if (remember) {
          this.saveTrustedCert(hostname, newCert);
        }
        this.closeModal();
        resolve(true);
      };
      rejectBtn.onclick = () => {
        this.closeModal();
        resolve(false);
      };
    });
  }
  /**
   * Prompt for raw certificate acceptance when parsing fails
   */
  private async promptRawCertificateAcceptance(certBytes: Uint8Array, hostname: string): Promise<boolean> {
    const fingerprint = await this.calculateFingerprint(certBytes);
    const certInfo: CertificateInfo = {
      raw: certBytes,
      fingerprint: fingerprint,
      hostname: hostname,
      subject: this.labels.parseUnavailable,
      issuer: this.labels.parseUnavailable
    };
    return this.promptUserAcceptance(hostname, certInfo);
  }
  /**
   * Create certificate acceptance modal
   */
  private createCertificateModal(hostname: string, certInfo: CertificateInfo, _isChange: boolean): HTMLElement {
    // Remove any existing modal
    this.closeModal();
    const modal = document.createElement('div');
    modal.className = 'rdp-cert-modal';
    modal.innerHTML = `
      <div class="rdp-cert-overlay"></div>
      <div class="rdp-cert-dialog">
        <h2>${this.labels.verificationTitle}</h2>
        <div class="cert-warning" style="color: #ff9800; margin-bottom: 15px;"></div>
        <p>${this.labels.serverPresentsCertificate} <strong>${hostname}</strong> ${this.labels.serverPresentsCertificateSuffix}</p>
        <div class="cert-details">
          <table>
            <tr><td><strong>${this.labels.subject}:</strong></td><td>${certInfo.subject || this.labels.parseUnavailable}</td></tr>
            <tr><td><strong>${this.labels.issuer}:</strong></td><td>${certInfo.issuer || this.labels.parseUnavailable}</td></tr>
            ${certInfo.serialNumber ? `<tr><td><strong>${this.labels.serial}:</strong></td><td style="font-family: monospace; font-size: 0.9em;">${certInfo.serialNumber}</td></tr>` : ''}
            <tr><td><strong>${this.labels.sha256}:</strong></td><td style="font-family: monospace; font-size: 0.9em;">
              ${certInfo.fingerprint}</td></tr>
          </table>
        </div>
        <div class="cert-question">
          <p>${this.labels.trustQuestion}</p>
          <label>
            <input type="checkbox" id="cert-remember" checked>
            ${this.labels.rememberCertificate}
          </label>
        </div>
        <div class="cert-buttons">
          <button id="cert-reject" class="cert-btn cert-btn-reject">${this.labels.reject}</button>
          <button id="cert-accept" class="cert-btn cert-btn-accept">${this.labels.accept}</button>
        </div>
      </div>
    `;
    // Add styles if not already present
    if (!document.querySelector('#rdp-cert-styles')) {
      const styles = document.createElement('style');
      styles.id = 'rdp-cert-styles';
      styles.textContent = this.getModalStyles();
      document.head.appendChild(styles);
    }
    document.body.appendChild(modal);
    this.modalElement = modal;
    return modal;
  }
  /**
   * Close the certificate modal
   */
  private closeModal(): void {
    if (this.modalElement) {
      document.body.removeChild(this.modalElement);
      this.modalElement = null;
    }
  }
  /**
   * Get modal CSS styles
   */
  private getModalStyles(): string {
    return `
      .rdp-cert-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10000;
      }
      .rdp-cert-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
      }
      .rdp-cert-dialog {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border-radius: 8px;
        padding: 25px;
        max-width: 600px;
        width: 90%;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      }
      .rdp-cert-dialog h2 {
        margin-top: 0;
        color: #333;
        border-bottom: 2px solid #0078d4;
        padding-bottom: 10px;
      }
      .cert-details {
        background: #f5f5f5;
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 15px;
        margin: 15px 0;
      }
      .cert-details table {
        width: 100%;
        border-collapse: collapse;
      }
      .cert-details td {
        padding: 5px 10px;
        vertical-align: top;
      }
      .cert-details td:first-child {
        width: 100px;
        text-align: right;
        padding-right: 10px;
      }
      .cert-question {
        margin: 20px 0;
      }
      .cert-question label {
        display: flex;
        align-items: center;
        cursor: pointer;
      }
      .cert-question input {
        margin-right: 8px;
      }
      .cert-buttons {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 20px;
      }
      .cert-btn {
        padding: 10px 20px;
        border: none;
        border-radius: 4px;
        font-size: 14px;
        cursor: pointer;
        transition: background-color 0.2s;
      }
      .cert-btn-accept {
        background: #0078d4;
        color: white;
      }
      .cert-btn-accept:hover {
        background: #106ebe;
      }
      .cert-btn-reject {
        background: #e0e0e0;
        color: #333;
      }
      .cert-btn-reject:hover {
        background: #d0d0d0;
      }
    `;
  }
  /**
   * Clear all trusted certificates
   */
  clearTrustedCerts(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    console.log('Cleared all trusted RDP certificates');
  }
  /**
   * Get list of trusted certificates
   */
  getTrustedCerts(): TrustedCertificate[] {
    const trustedCerts = this.loadTrustedCerts();
    return Object.values(trustedCerts);
  }
}
// Export as global for compatibility
declare global {
  interface Window {
    RDPCertificateHandler: typeof RDPCertificateHandler;
  }
}
if (typeof window !== 'undefined') {
  window.RDPCertificateHandler = RDPCertificateHandler;
}
