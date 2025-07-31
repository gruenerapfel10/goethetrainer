import { Block, Blockchain, BlockchainMessage, Transaction } from './types';

export class BlockchainService {
  private static instance: BlockchainService;
  private blockchain: Blockchain;
  
  private constructor() {
    this.blockchain = {
      chain: [this.createGenesisBlock()],
      difficulty: 4,
      pendingTransactions: [],
      miningReward: 100,
    };
  }
  
  static getInstance(): BlockchainService {
    if (!BlockchainService.instance) {
      BlockchainService.instance = new BlockchainService();
    }
    return BlockchainService.instance;
  }

  // Create the first block
  private createGenesisBlock(): Block {
    return {
      index: 0,
      timestamp: new Date('2025-01-01'),
      data: [],
      previousHash: '0',
      hash: this.calculateHash(0, new Date('2025-01-01'), [], '0', 0),
      nonce: 0,
      difficulty: this.blockchain?.difficulty || 4,
    };
  }

  // Calculate hash for a block
  private calculateHash(
    index: number,
    timestamp: Date,
    data: BlockchainMessage[],
    previousHash: string,
    nonce: number
  ): string {
    const dataString = JSON.stringify({ index, timestamp, data, previousHash, nonce });
    
    // For browser compatibility, use Web Crypto API
    if (typeof window !== 'undefined') {
      // This is a simplified version - in production, use async hashing
      let hash = 0;
      for (let i = 0; i < dataString.length; i++) {
        const char = dataString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return Math.abs(hash).toString(16).padStart(64, '0');
    } else {
      // Server-side - simplified for browser
      return Math.abs(hash).toString(16).padStart(64, '0');
    }
  }

  // Get the latest block
  getLatestBlock(): Block {
    return this.blockchain.chain[this.blockchain.chain.length - 1];
  }

  // Mine a new block
  async mineBlock(minerAddress?: string): Promise<Block> {
    const block: Block = {
      index: this.blockchain.chain.length,
      timestamp: new Date(),
      data: [...this.blockchain.pendingTransactions],
      previousHash: this.getLatestBlock().hash,
      hash: '',
      nonce: 0,
      difficulty: this.blockchain.difficulty,
      miner: minerAddress,
    };

    // Proof of Work
    while (!this.isValidHash(block.hash, this.blockchain.difficulty)) {
      block.nonce++;
      block.hash = this.calculateHash(
        block.index,
        block.timestamp,
        block.data,
        block.previousHash,
        block.nonce
      );
    }

    this.blockchain.chain.push(block);
    this.blockchain.pendingTransactions = [];
    
    return block;
  }

  // Check if hash meets difficulty requirement
  private isValidHash(hash: string, difficulty: number): boolean {
    return hash.startsWith('0'.repeat(difficulty));
  }

  // Add a message to pending transactions
  addMessage(message: BlockchainMessage) {
    // Add previous hash reference
    const latestBlock = this.getLatestBlock();
    message.previousHash = latestBlock.hash;
    
    this.blockchain.pendingTransactions.push(message);
  }

  // Validate the blockchain
  isChainValid(): boolean {
    for (let i = 1; i < this.blockchain.chain.length; i++) {
      const currentBlock = this.blockchain.chain[i];
      const previousBlock = this.blockchain.chain[i - 1];

      // Verify hash
      const calculatedHash = this.calculateHash(
        currentBlock.index,
        currentBlock.timestamp,
        currentBlock.data,
        currentBlock.previousHash,
        currentBlock.nonce
      );

      if (currentBlock.hash !== calculatedHash) {
        return false;
      }

      // Verify link to previous block
      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }

      // Verify proof of work
      if (!this.isValidHash(currentBlock.hash, currentBlock.difficulty)) {
        return false;
      }
    }
    return true;
  }

  // Get message by ID
  getMessageById(messageId: string): BlockchainMessage | null {
    for (const block of this.blockchain.chain) {
      const message = block.data.find(msg => msg.id === messageId);
      if (message) {
        return message;
      }
    }
    return null;
  }

  // Get messages for a user
  getMessagesForUser(userId: string): BlockchainMessage[] {
    const messages: BlockchainMessage[] = [];
    
    for (const block of this.blockchain.chain) {
      const userMessages = block.data.filter(
        msg => msg.from === userId || msg.to === userId
      );
      messages.push(...userMessages);
    }
    
    return messages.sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  // Generate Merkle tree root for messages
  generateMerkleRoot(messages: BlockchainMessage[]): string {
    if (messages.length === 0) return '';
    
    let hashes = messages.map(msg => 
      this.calculateHash(0, msg.timestamp, [msg], '', 0)
    );
    
    while (hashes.length > 1) {
      const newHashes: string[] = [];
      
      for (let i = 0; i < hashes.length; i += 2) {
        const left = hashes[i];
        const right = hashes[i + 1] || left;
        const combined = left + right;
        
        // Simple hash combination
        let hash = 0;
        for (let j = 0; j < combined.length; j++) {
          const char = combined.charCodeAt(j);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash;
        }
        newHashes.push(Math.abs(hash).toString(16).padStart(64, '0'));
      }
      
      hashes = newHashes;
    }
    
    return hashes[0];
  }

  // Get blockchain statistics
  getStatistics() {
    const totalMessages = this.blockchain.chain.reduce(
      (sum, block) => sum + block.data.length,
      0
    );
    
    const totalBlocks = this.blockchain.chain.length;
    const pendingMessages = this.blockchain.pendingTransactions.length;
    
    return {
      totalBlocks,
      totalMessages,
      pendingMessages,
      difficulty: this.blockchain.difficulty,
      isValid: this.isChainValid(),
      latestBlockHash: this.getLatestBlock().hash,
    };
  }

  // Export blockchain for backup
  exportBlockchain(): string {
    return JSON.stringify(this.blockchain, null, 2);
  }

  // Import blockchain from backup
  importBlockchain(data: string): boolean {
    try {
      const imported = JSON.parse(data);
      
      // Validate imported blockchain
      const tempBlockchain = this.blockchain;
      this.blockchain = imported;
      
      if (this.isChainValid()) {
        return true;
      } else {
        this.blockchain = tempBlockchain;
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  // Get blockchain for visualization
  getBlockchainData() {
    return {
      blocks: this.blockchain.chain.map(block => ({
        index: block.index,
        timestamp: block.timestamp,
        messageCount: block.data.length,
        hash: block.hash.substring(0, 10) + '...',
        previousHash: block.previousHash.substring(0, 10) + '...',
        nonce: block.nonce,
        miner: block.miner,
      })),
      pending: this.blockchain.pendingTransactions.length,
    };
  }
}