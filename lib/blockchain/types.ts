export interface BlockchainMessage {
  id: string;
  from: string;
  to: string;
  content: EncryptedContent;
  timestamp: Date;
  blockNumber?: number;
  transactionHash?: string;
  signature: string;
  publicKey: string;
  previousHash?: string;
}

export interface EncryptedContent {
  ciphertext: string;
  iv: string;
  authTag?: string;
  algorithm: 'AES-GCM' | 'AES-CBC' | 'ChaCha20-Poly1305';
  keyDerivation?: {
    method: 'PBKDF2' | 'scrypt' | 'argon2';
    salt: string;
    iterations?: number;
  };
}

export interface KeyPair {
  publicKey: CryptoKey | string;
  privateKey: CryptoKey | string;
  type: 'RSA' | 'ECDSA' | 'Ed25519';
  created: Date;
  fingerprint: string;
}

export interface SecureChannel {
  id: string;
  participants: string[];
  sharedKey?: CryptoKey;
  ephemeralKeys?: {
    [participantId: string]: {
      publicKey: string;
      timestamp: Date;
    };
  };
  established: Date;
  lastActivity: Date;
  encryptionProtocol: 'Signal' | 'OTR' | 'Custom';
}

export interface Block {
  index: number;
  timestamp: Date;
  data: BlockchainMessage[];
  previousHash: string;
  hash: string;
  nonce: number;
  difficulty: number;
  miner?: string;
}

export interface Blockchain {
  chain: Block[];
  difficulty: number;
  pendingTransactions: BlockchainMessage[];
  miningReward: number;
}

export interface CryptoWallet {
  address: string;
  publicKey: string;
  privateKey?: string; // Encrypted
  balance?: number;
  transactions: Transaction[];
}

export interface Transaction {
  id: string;
  from: string;
  to: string;
  amount?: number;
  type: 'message' | 'payment' | 'contract';
  data?: any;
  timestamp: Date;
  signature: string;
  status: 'pending' | 'confirmed' | 'failed';
  confirmations?: number;
}

export interface SecurityAudit {
  id: string;
  timestamp: Date;
  event: SecurityEvent;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: string;
  remediation?: string;
}

export interface SecurityEvent {
  type: 'key_rotation' | 'unauthorized_access' | 'signature_failure' | 'replay_attack' | 'mitm_attempt';
  source: string;
  target?: string;
  metadata?: Record<string, any>;
}

export interface EncryptionMetrics {
  messagesEncrypted: number;
  messagesDecrypted: number;
  keyRotations: number;
  failedDecryptions: number;
  averageEncryptionTime: number;
  averageDecryptionTime: number;
}

export interface VerificationProof {
  messageId: string;
  blockHash: string;
  merkleProof: string[];
  timestamp: Date;
  verified: boolean;
}