import { promises as fs } from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';
import * as os from 'os';
import { Credentials } from 'google-auth-library';

export class TokenStorage {
  private storageDir: string;
  private encryptionKey?: Buffer | undefined;

  constructor(storageDir: string, _tenantId?: string, enableEncryption: boolean = true) {
    // Expand tilde to home directory and use gcal-specific directory
    this.storageDir = storageDir.startsWith('~')
      ? path.join(os.homedir(), storageDir.slice(1))
      : storageDir;

    if (enableEncryption) {
      this.encryptionKey = this.deriveTenantKey(_tenantId);
    }
  }
  
  async saveTokens(tokens: Credentials): Promise<void> {
    await this.ensureDirectory();
    
    let data = JSON.stringify(tokens, null, 2);
    if (this.encryptionKey) {
      data = this.encrypt(data);
    }
    
    // Use 'credentials.json' for Gmail-MCP compatibility
    const tokenPath = path.join(this.storageDir, 'credentials.json');
    await fs.writeFile(tokenPath, data, { mode: 0o600 });
  }
  
  async loadTokens(): Promise<Credentials | null> {
    try {
      // Try new credentials.json first (Gmail-MCP pattern)
      let tokenPath = path.join(this.storageDir, 'credentials.json');
      
      try {
        await fs.access(tokenPath);
      } catch {
        // Fall back to old tokens.json for backward compatibility
        tokenPath = path.join(this.storageDir, 'tokens.json');
      }
      
      let data = await fs.readFile(tokenPath, 'utf-8');
      
      if (this.encryptionKey) {
        data = this.decrypt(data);
      }
      
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }
  
  async clearTokens(): Promise<void> {
    try {
      // Try to clear both old and new token files
      const credentialsPath = path.join(this.storageDir, 'credentials.json');
      const tokensPath = path.join(this.storageDir, 'tokens.json');
      
      try {
        await fs.unlink(credentialsPath);
      } catch {
        // Ignore if file doesn't exist
      }
      
      try {
        await fs.unlink(tokensPath);
      } catch {
        // Ignore if file doesn't exist
      }
    } catch (error) {
      // Ignore errors
    }
  }
  
  private async ensureDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.storageDir, { recursive: true, mode: 0o700 });
    } catch (error) {
      // Directory already exists
    }
  }

  private deriveTenantKey(_tenantId?: string): Buffer {
    // Combine machine ID with tenant ID for unique encryption per tenant
    const machineId = process.env.USER || process.env.USERNAME || 'default';
    const salt = `gcal-mcp-${_tenantId || 'single'}-salt`;
    const keyMaterial = `${machineId}-${_tenantId || 'default'}`;
    return crypto.scryptSync(keyMaterial, salt, 32);
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey!, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(text: string): string {
    const parts = text.split(':');
    const ivStr = parts[0];
    const encrypted = parts[1];

    if (!ivStr || !encrypted) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(ivStr, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey!, iv);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}