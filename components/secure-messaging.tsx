'use client';

import { useState, useEffect } from 'react';
import { Shield, Lock, Unlock, Key, RefreshCw, AlertTriangle, CheckCircle2, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { EncryptionService } from '@/lib/blockchain/encryption';
import { BlockchainService } from '@/lib/blockchain/blockchain';
import type { BlockchainMessage, KeyPair, EncryptedContent } from '@/lib/blockchain/types';
import { generateUUID } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SecureMessagingProps {
  userId: string;
  recipientId?: string;
}

export function SecureMessaging({ userId, recipientId }: SecureMessagingProps) {
  const [keyPair, setKeyPair] = useState<KeyPair | null>(null);
  const [recipientPublicKey, setRecipientPublicKey] = useState<string>('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<BlockchainMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [miningProgress, setMiningProgress] = useState(0);
  const [blockchainStats, setBlockchainStats] = useState<any>(null);
  
  const encryptionService = EncryptionService.getInstance();
  const blockchainService = BlockchainService.getInstance();

  useEffect(() => {
    loadKeyPair();
    loadMessages();
    loadBlockchainStats();
  }, [userId]);

  const loadKeyPair = async () => {
    // Check if key pair exists in localStorage
    const storedKeyPair = localStorage.getItem(`keyPair-${userId}`);
    if (storedKeyPair) {
      const parsed = JSON.parse(storedKeyPair);
      // Re-import keys
      const publicKey = await encryptionService.importKey(parsed.publicKey, 'public');
      const privateKey = await encryptionService.importKey(parsed.privateKey, 'private');
      
      setKeyPair({
        publicKey,
        privateKey,
        type: parsed.type,
        created: new Date(parsed.created),
        fingerprint: parsed.fingerprint,
      });
    }
  };

  const loadMessages = () => {
    const userMessages = blockchainService.getMessagesForUser(userId);
    setMessages(userMessages);
  };

  const loadBlockchainStats = () => {
    const stats = blockchainService.getStatistics();
    setBlockchainStats(stats);
  };

  const generateNewKeyPair = async () => {
    setLoading(true);
    try {
      const newKeyPair = await encryptionService.generateKeyPair('RSA');
      
      // Export keys for storage
      const publicKeyStr = await encryptionService.exportKey(newKeyPair.publicKey as CryptoKey, 'public');
      const privateKeyStr = await encryptionService.exportKey(newKeyPair.privateKey as CryptoKey, 'private');
      
      // Store in localStorage
      localStorage.setItem(`keyPair-${userId}`, JSON.stringify({
        publicKey: publicKeyStr,
        privateKey: privateKeyStr,
        type: newKeyPair.type,
        created: newKeyPair.created,
        fingerprint: newKeyPair.fingerprint,
      }));
      
      setKeyPair(newKeyPair);
      toast.success('New key pair generated successfully!');
    } catch (error) {
      toast.error('Failed to generate key pair');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const sendSecureMessage = async () => {
    if (!message.trim() || !recipientPublicKey.trim() || !keyPair) {
      toast.error('Please fill in all fields and generate keys');
      return;
    }

    setLoading(true);
    try {
      // Import recipient's public key
      const recipientKey = await encryptionService.importKey(recipientPublicKey, 'public');
      
      // Encrypt message
      const { encryptedMessage, encryptedKey } = await encryptionService.hybridEncrypt(
        message,
        recipientKey
      );
      
      // Sign the message
      const messageHash = JSON.stringify(encryptedMessage);
      const signature = await encryptionService.signMessage(
        messageHash,
        keyPair.privateKey as CryptoKey
      );
      
      // Export sender's public key
      const senderPublicKey = await encryptionService.exportKey(
        keyPair.publicKey as CryptoKey,
        'public'
      );
      
      // Create blockchain message
      const blockchainMessage: BlockchainMessage = {
        id: generateUUID(),
        from: userId,
        to: recipientId || 'unknown',
        content: {
          ...encryptedMessage,
          ciphertext: encryptedKey + '::' + encryptedMessage.ciphertext, // Combine for storage
        },
        timestamp: new Date(),
        signature,
        publicKey: senderPublicKey,
      };
      
      // Add to blockchain
      blockchainService.addMessage(blockchainMessage);
      
      // Mine block
      setMiningProgress(0);
      const interval = setInterval(() => {
        setMiningProgress(prev => Math.min(prev + 10, 90));
      }, 100);
      
      await blockchainService.mineBlock(userId);
      
      clearInterval(interval);
      setMiningProgress(100);
      
      toast.success('Secure message sent and added to blockchain!');
      setMessage('');
      loadMessages();
      loadBlockchainStats();
    } catch (error) {
      toast.error('Failed to send secure message');
      console.error(error);
    } finally {
      setLoading(false);
      setMiningProgress(0);
    }
  };

  const decryptMessage = async (msg: BlockchainMessage) => {
    if (!keyPair) {
      toast.error('Please generate keys first');
      return;
    }

    try {
      // Extract encrypted key and message
      const [encryptedKey, ciphertext] = msg.content.ciphertext.split('::');
      
      const encryptedContent: EncryptedContent = {
        ...msg.content,
        ciphertext,
      };
      
      // Decrypt message
      const decryptedMessage = await encryptionService.hybridDecrypt(
        encryptedContent,
        encryptedKey,
        keyPair.privateKey as CryptoKey
      );
      
      toast.success('Message decrypted!');
      alert(decryptedMessage);
    } catch (error) {
      toast.error('Failed to decrypt message - you may not be the recipient');
      console.error(error);
    }
  };

  const exportPublicKey = async () => {
    if (!keyPair) {
      toast.error('Please generate keys first');
      return;
    }

    const publicKeyStr = await encryptionService.exportKey(
      keyPair.publicKey as CryptoKey,
      'public'
    );
    
    navigator.clipboard.writeText(publicKeyStr);
    toast.success('Public key copied to clipboard!');
  };

  const verifyBlockchain = () => {
    const isValid = blockchainService.isChainValid();
    if (isValid) {
      toast.success('Blockchain integrity verified!');
    } else {
      toast.error('Blockchain integrity compromised!');
    }
  };

  return (
    <div className="w-full space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Blockchain Secure Messaging
          </CardTitle>
          <CardDescription>
            End-to-end encrypted messaging with blockchain verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="send" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="send">Send</TabsTrigger>
              <TabsTrigger value="messages">Messages</TabsTrigger>
              <TabsTrigger value="keys">Keys</TabsTrigger>
              <TabsTrigger value="blockchain">Blockchain</TabsTrigger>
            </TabsList>

            {/* Send Tab */}
            <TabsContent value="send" className="space-y-4">
              {!keyPair ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>No Keys Found</AlertTitle>
                  <AlertDescription>
                    Generate a key pair to start sending secure messages
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Keys Active</AlertTitle>
                  <AlertDescription>
                    Your keys are ready. You can send encrypted messages.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Recipient Public Key</label>
                  <Textarea
                    placeholder="Paste recipient's public key here..."
                    value={recipientPublicKey}
                    onChange={(e) => setRecipientPublicKey(e.target.value)}
                    rows={3}
                    className="font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Message</label>
                  <Textarea
                    placeholder="Enter your secure message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                  />
                </div>

                <Button
                  onClick={sendSecureMessage}
                  disabled={loading || !keyPair || !message || !recipientPublicKey}
                  className="w-full"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Send Encrypted Message
                </Button>

                {miningProgress > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Mining block...</p>
                    <Progress value={miningProgress} />
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Messages Tab */}
            <TabsContent value="messages" className="space-y-4">
              <ScrollArea className="h-[400px] pr-4">
                {messages.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No messages yet
                  </p>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <Card key={msg.id}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <p className="text-sm font-medium">
                                From: {msg.from === userId ? 'You' : msg.from}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                To: {msg.to === userId ? 'You' : msg.to}
                              </p>
                            </div>
                            <Badge variant="outline">
                              {msg.blockNumber ? `Block #${msg.blockNumber}` : 'Pending'}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">
                              {new Date(msg.timestamp).toLocaleString()}
                            </p>
                            <div className="flex items-center gap-2">
                              <Hash className="h-3 w-3" />
                              <p className="text-xs font-mono">
                                {msg.signature.substring(0, 20)}...
                              </p>
                            </div>
                            {msg.to === userId && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => decryptMessage(msg)}
                              >
                                <Unlock className="h-3 w-3 mr-2" />
                                Decrypt
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Keys Tab */}
            <TabsContent value="keys" className="space-y-4">
              {keyPair ? (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Your Key Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <p className="text-xs font-medium">Type</p>
                        <p className="text-sm text-muted-foreground">{keyPair.type}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium">Created</p>
                        <p className="text-sm text-muted-foreground">
                          {keyPair.created.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium">Fingerprint</p>
                        <p className="text-xs font-mono text-muted-foreground">
                          {keyPair.fingerprint}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={exportPublicKey}
                      className="flex-1"
                    >
                      <Key className="h-4 w-4 mr-2" />
                      Copy Public Key
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={generateNewKeyPair}
                      className="flex-1"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Regenerate Keys
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 space-y-4">
                  <p className="text-muted-foreground">No keys generated yet</p>
                  <Button onClick={generateNewKeyPair} disabled={loading}>
                    <Key className="h-4 w-4 mr-2" />
                    Generate Key Pair
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Blockchain Tab */}
            <TabsContent value="blockchain" className="space-y-4">
              {blockchainStats && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Total Blocks</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">{blockchainStats.totalBlocks}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Total Messages</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">{blockchainStats.totalMessages}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Pending Messages</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">{blockchainStats.pendingMessages}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Difficulty</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">{blockchainStats.difficulty}</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">Blockchain Status</p>
                      <Badge variant={blockchainStats.isValid ? 'default' : 'destructive'}>
                        {blockchainStats.isValid ? 'Valid' : 'Invalid'}
                      </Badge>
                    </div>
                    <p className="text-xs font-mono text-muted-foreground">
                      Latest Block: {blockchainStats.latestBlockHash.substring(0, 20)}...
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    onClick={verifyBlockchain}
                    className="w-full"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Verify Blockchain Integrity
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}