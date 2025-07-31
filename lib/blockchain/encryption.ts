import { EncryptedContent, KeyPair } from './types';

export class EncryptionService {
  private static instance: EncryptionService;
  
  private constructor() {}
  
  static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  // Generate key pair for asymmetric encryption
  async generateKeyPair(type: 'RSA' | 'ECDSA' = 'RSA'): Promise<KeyPair> {
    let keyPair: CryptoKeyPair;
    
    if (type === 'RSA') {
      keyPair = await crypto.subtle.generateKey(
        {
          name: 'RSA-OAEP',
          modulusLength: 4096,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256',
        },
        true,
        ['encrypt', 'decrypt']
      );
    } else {
      keyPair = await crypto.subtle.generateKey(
        {
          name: 'ECDSA',
          namedCurve: 'P-384',
        },
        true,
        ['sign', 'verify']
      );
    }
    
    const publicKeyData = await crypto.subtle.exportKey('spki', keyPair.publicKey);
    const fingerprint = await this.generateFingerprint(publicKeyData);
    
    return {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      type,
      created: new Date(),
      fingerprint,
    };
  }

  // Generate symmetric key for AES encryption
  async generateSymmetricKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  // Encrypt message with AES-GCM
  async encryptMessage(
    message: string,
    key: CryptoKey
  ): Promise<EncryptedContent> {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      data
    );
    
    return {
      ciphertext: this.arrayBufferToBase64(encryptedData),
      iv: this.arrayBufferToBase64(iv),
      algorithm: 'AES-GCM',
    };
  }

  // Decrypt message with AES-GCM
  async decryptMessage(
    encryptedContent: EncryptedContent,
    key: CryptoKey
  ): Promise<string> {
    const ciphertext = this.base64ToArrayBuffer(encryptedContent.ciphertext);
    const iv = this.base64ToArrayBuffer(encryptedContent.iv);
    
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(iv),
      },
      key,
      ciphertext
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  }

  // Hybrid encryption: encrypt with symmetric key, then encrypt key with recipient's public key
  async hybridEncrypt(
    message: string,
    recipientPublicKey: CryptoKey
  ): Promise<{
    encryptedMessage: EncryptedContent;
    encryptedKey: string;
  }> {
    // Generate ephemeral symmetric key
    const symmetricKey = await this.generateSymmetricKey();
    
    // Encrypt message with symmetric key
    const encryptedMessage = await this.encryptMessage(message, symmetricKey);
    
    // Export symmetric key
    const exportedKey = await crypto.subtle.exportKey('raw', symmetricKey);
    
    // Encrypt symmetric key with recipient's public key
    const encryptedKeyData = await crypto.subtle.encrypt(
      {
        name: 'RSA-OAEP',
      },
      recipientPublicKey,
      exportedKey
    );
    
    return {
      encryptedMessage,
      encryptedKey: this.arrayBufferToBase64(encryptedKeyData),
    };
  }

  // Hybrid decryption
  async hybridDecrypt(
    encryptedMessage: EncryptedContent,
    encryptedKey: string,
    privateKey: CryptoKey
  ): Promise<string> {
    // Decrypt symmetric key
    const encryptedKeyData = this.base64ToArrayBuffer(encryptedKey);
    const decryptedKeyData = await crypto.subtle.decrypt(
      {
        name: 'RSA-OAEP',
      },
      privateKey,
      encryptedKeyData
    );
    
    // Import symmetric key
    const symmetricKey = await crypto.subtle.importKey(
      'raw',
      decryptedKeyData,
      {
        name: 'AES-GCM',
      },
      false,
      ['decrypt']
    );
    
    // Decrypt message
    return await this.decryptMessage(encryptedMessage, symmetricKey);
  }

  // Sign message
  async signMessage(message: string, privateKey: CryptoKey): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    
    const signature = await crypto.subtle.sign(
      {
        name: 'ECDSA',
        hash: 'SHA-384',
      },
      privateKey,
      data
    );
    
    return this.arrayBufferToBase64(signature);
  }

  // Verify signature
  async verifySignature(
    message: string,
    signature: string,
    publicKey: CryptoKey
  ): Promise<boolean> {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const signatureData = this.base64ToArrayBuffer(signature);
    
    return await crypto.subtle.verify(
      {
        name: 'ECDSA',
        hash: 'SHA-384',
      },
      publicKey,
      signatureData,
      data
    );
  }

  // Derive key from password (for key encryption)
  async deriveKeyFromPassword(
    password: string,
    salt: Uint8Array
  ): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordData = encoder.encode(password);
    
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordData,
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );
    
    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      {
        name: 'AES-GCM',
        length: 256,
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  // Generate fingerprint for public key
  private async generateFingerprint(keyData: ArrayBuffer): Promise<string> {
    const hash = await crypto.subtle.digest('SHA-256', keyData);
    const fingerprint = Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join(':')
      .toUpperCase();
    return fingerprint;
  }

  // Utility functions
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // Export key to storable format
  async exportKey(key: CryptoKey, type: 'public' | 'private'): Promise<string> {
    const format = type === 'public' ? 'spki' : 'pkcs8';
    const exported = await crypto.subtle.exportKey(format, key);
    return this.arrayBufferToBase64(exported);
  }

  // Import key from stored format
  async importKey(
    keyData: string,
    type: 'public' | 'private',
    algorithm: 'RSA' | 'ECDSA' = 'RSA'
  ): Promise<CryptoKey> {
    const format = type === 'public' ? 'spki' : 'pkcs8';
    const keyBuffer = this.base64ToArrayBuffer(keyData);
    
    if (algorithm === 'RSA') {
      return await crypto.subtle.importKey(
        format,
        keyBuffer,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256',
        },
        true,
        type === 'public' ? ['encrypt'] : ['decrypt']
      );
    } else {
      return await crypto.subtle.importKey(
        format,
        keyBuffer,
        {
          name: 'ECDSA',
          namedCurve: 'P-384',
        },
        true,
        type === 'public' ? ['verify'] : ['sign']
      );
    }
  }
}