import { promises as fs } from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';
import * as os from 'os';
import { Credentials } from 'google-auth-library';

export class TokenStorage {
  private storageDir: string;
  private encryptionKey?: Buffer;
  private tenantId?: string;
  
  constructor(storageDir: string, tenantId?: string, enableEncryption: boolean = true) {
    // Expand tilde to home directory and use gcal-specific directory
    this.storageDir = storageDir.startsWith('~') 
      ? path.join(os.homedir(), storageDir.slice(1))
      : storageDir;
      
    this.tenantId = tenantId;
    
    if (enableEncryption) {
      this.encryptionKey = this.deriveTenantKey(tenantId);
    }
  }
  
  async saveTokens(tokens: Credentials): Promise<void> {
    await this.ensureDirectory();
    
    let data = JSON.stringify(tokens, null, 2);
    if (this.encryptionKey) {
      data = this.encrypt(data);
    }
    
    const tokenPath = path.join(this.storageDir, 'tokens.json');
    await fs.writeFile(tokenPath, data, { mode: 0o600 });
  }
  
  async loadTokens(): Promise<Credentials | null> {
    try {
      const tokenPath = path.join(this.storageDir, 'tokens.json');
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
      const tokenPath = path.join(this.storageDir, 'tokens.json');
      await fs.unlink(tokenPath);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  }
  
  private async ensureDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.storageDir, { recursive: true, mode: 0o700 });
    } catch (error) {
      // Directory already exists
    }
  }
  
  private deriveKey(): Buffer {
    // Use machine-specific information to derive encryption key (legacy single-tenant)
    const machineId = process.env.USER || process.env.USERNAME || 'default';
    const salt = 'gcal-mcp-salt';
    return crypto.scryptSync(machineId, salt, 32);
  }
  
  private deriveTenantKey(tenantId?: string): Buffer {
    // Combine machine ID with tenant ID for unique encryption per tenant
    const machineId = process.env.USER || process.env.USERNAME || 'default';
    const salt = `gcal-mcp-${tenantId || 'single'}-salt`;
    const keyMaterial = `${machineId}-${tenantId || 'default'}`;
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
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey!, iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}