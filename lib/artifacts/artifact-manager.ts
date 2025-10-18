import 'server-only';

import type { ArtifactKind } from '@/components/artifact';
import { getDocumentsById, saveDocument, getWorkingVersion } from '@/lib/db/queries';
import type { Document } from '@/lib/db/queries';

export interface WebSource {
  url: string;
  title: string;
  favicon?: string;
}

export interface ArtifactVersion {
  version: number;
  content: string;
  timestamp: number;
  description: string;
  author: 'user' | 'ai';
  isWorkingVersion: boolean;
  forkedFromVersion?: number;
}

export interface ArtifactData {
  documentId: string;
  kind: ArtifactKind;
  title: string;
  content: string;
  status: 'idle' | 'streaming';
  versions: ArtifactVersion[];
  currentVersion: number;
  workingVersion: number;
  boundingBox: { top: number; left: number; width: number; height: number };
  sources?: WebSource[];
  currentSourceIndex?: number;
}

/**
 * Centralized Artifact Manager
 * 
 * Versioning Logic:
 * - AI creates artifact (v1)
 * - User edits → creates v2 fork (or updates existing user fork)
 * - User edits again → updates same v2 fork (no new version)
 * - AI updates → creates v3 based on working version (v2 fork)
 * - User edits → creates v4 fork
 * 
 * Working Version:
 * - Always the latest AI version by default
 * - User can manually set any version as working
 * - AI always bases updates on the working version
 */
export class ArtifactManager {
  private artifacts: Map<string, ArtifactData> = new Map();
  private activeDocumentId: string | null = null;
  private userId: string;
  private chatId?: string;

  constructor(userId: string, chatId?: string) {
    this.userId = userId;
    this.chatId = chatId;
  }

  /**
   * Create a new artifact (v1)
   */
  create(params: {
    documentId: string;
    kind: ArtifactKind;
    title: string;
    content?: string;
    boundingBox?: ArtifactData['boundingBox'];
    sources?: WebSource[];
    currentSourceIndex?: number;
  }): ArtifactData {
    const artifact: ArtifactData = {
      documentId: params.documentId,
      kind: params.kind,
      title: params.title,
      content: params.content || '',
      status: 'idle',
      versions: params.content ? [{
        version: 1,
        content: params.content,
        timestamp: Date.now(),
        description: 'Initial version',
        author: 'ai',
        isWorkingVersion: true,
      }] : [],
      currentVersion: 1,
      workingVersion: 1,
      boundingBox: params.boundingBox || { top: 0, left: 0, width: 0, height: 0 },
      sources: params.sources,
      currentSourceIndex: params.currentSourceIndex ?? 0,
    };

    this.artifacts.set(params.documentId, artifact);
    this.activeDocumentId = params.documentId;
    
    return artifact;
  }

  /**
   * Update content (streaming or immediate)
   * Does NOT create a version - just updates current content
   */
  updateContent(documentId: string, content: string, isStreaming = false): boolean {
    const artifact = this.artifacts.get(documentId);
    if (!artifact) return false;

    artifact.content = content;
    artifact.status = isStreaming ? 'streaming' : 'idle';
    
    return true;
  }

  /**
   * Save a new version
   * 
   * Logic:
   * - If author is 'user' and latest version is also 'user', update that version (fork behavior)
   * - If author is 'user' and latest is 'ai', create new user fork
   * - If author is 'ai', always create new version and mark as working
   */
  async saveVersion(
    documentId: string, 
    content: string, 
    title: string,
    author: 'user' | 'ai'
  ): Promise<void> {
    const artifact = this.artifacts.get(documentId);
    if (!artifact) {
      throw new Error('Artifact not found');
    }

    await saveDocument({
      id: documentId,
      title,
      content,
      kind: artifact.kind,
      userId: this.userId,
      chatId: this.chatId,
      author,
    });

    await this.reload(documentId);
  }

  /**
   * Navigate to a specific version
   */
  goToVersion(documentId: string, version: number): boolean {
    const artifact = this.artifacts.get(documentId);
    if (!artifact) return false;

    const versionData = artifact.versions.find(v => v.version === version);
    if (!versionData) return false;

    artifact.content = versionData.content;
    artifact.currentVersion = version;

    return true;
  }

  /**
   * Set a specific version as the working version
   * AI will base its next update on this version
   */
  async setWorkingVersion(documentId: string, version: number): Promise<{ success: boolean; contextMessage?: string }> {
    const artifact = this.artifacts.get(documentId);
    if (!artifact) {
      return { success: false };
    }

    const versionData = artifact.versions.find(v => v.version === version);
    if (!versionData) {
      return { success: false };
    }

    artifact.versions = artifact.versions.map(v => ({
      ...v,
      isWorkingVersion: v.version === version,
    }));

    artifact.workingVersion = version;
    artifact.content = versionData.content;
    artifact.currentVersion = version;

    const contextMessage = `CURRENT CONTEXT: The user has set version ${version} as the working version for document "${artifact.title}" (Document ID: ${documentId}). This version contains: ${versionData.content.substring(0, 500)}${versionData.content.length > 500 ? '...' : ''}`;

    return { success: true, contextMessage };
  }

  /**
   * Load artifact from database
   */
  async load(documentId: string, targetVersion?: number): Promise<ArtifactData> {
    const documents = await getDocumentsById({ id: documentId });
    if (!documents || documents.length === 0) {
      throw new Error('Document not found');
    }

    const sortedDocs = documents.sort((a, b) => a.version - b.version);
    
    const versions: ArtifactVersion[] = sortedDocs.map((doc) => ({
      version: doc.version,
      content: doc.content,
      timestamp: new Date(doc.createdAt).getTime(),
      description: doc.version === 1 ? 'Initial version' : `Version ${doc.version}`,
      author: (doc.author as 'user' | 'ai') || 'ai',
      isWorkingVersion: doc.isWorkingVersion,
      forkedFromVersion: doc.forkedFromVersion || undefined,
    }));

    const workingVersionData = versions.find(v => v.isWorkingVersion);
    const workingVersion = workingVersionData?.version || versions[versions.length - 1].version;
    
    const currentVersion = targetVersion || workingVersion;
    const currentVersionData = versions.find(v => v.version === currentVersion) || versions[versions.length - 1];
    
    const latestDoc = sortedDocs[sortedDocs.length - 1];
    const artifact: ArtifactData = {
      documentId,
      kind: latestDoc.kind,
      title: latestDoc.title,
      content: currentVersionData.content,
      status: 'idle',
      versions,
      currentVersion: currentVersionData.version,
      workingVersion,
      boundingBox: { top: 0, left: 0, width: 0, height: 0 },
    };

    this.artifacts.set(documentId, artifact);
    this.activeDocumentId = documentId;

    return artifact;
  }

  /**
   * Reload artifact from database (refresh after save)
   */
  private async reload(documentId: string): Promise<void> {
    await this.load(documentId);
  }

  /**
   * Get artifact by ID
   */
  get(documentId: string): ArtifactData | null {
    return this.artifacts.get(documentId) || null;
  }

  /**
   * Get active artifact
   */
  getActive(): ArtifactData | null {
    return this.activeDocumentId ? this.get(this.activeDocumentId) : null;
  }

  /**
   * Get all artifacts
   */
  getAll(): Record<string, ArtifactData> {
    const result: Record<string, ArtifactData> = {};
    this.artifacts.forEach((artifact, id) => {
      result[id] = artifact;
    });
    return result;
  }

  /**
   * Activate an artifact
   */
  activate(documentId: string): boolean {
    if (!this.artifacts.has(documentId)) {
      return false;
    }
    this.activeDocumentId = documentId;
    return true;
  }

  /**
   * Add web sources (for webpage artifacts)
   */
  addSources(documentId: string, sources: WebSource[], currentIndex = 0): boolean {
    const artifact = this.artifacts.get(documentId);
    if (!artifact) return false;

    artifact.sources = sources;
    artifact.currentSourceIndex = currentIndex;

    return true;
  }

  /**
   * Navigate between web sources
   */
  navigateSource(documentId: string, index: number): boolean {
    const artifact = this.artifacts.get(documentId);
    if (!artifact || !artifact.sources || index < 0 || index >= artifact.sources.length) {
      return false;
    }

    const source = artifact.sources[index];
    artifact.content = source.url;
    artifact.title = source.title;
    artifact.currentSourceIndex = index;

    return true;
  }

  /**
   * Get active document ID
   */
  getActiveDocumentId(): string | null {
    return this.activeDocumentId;
  }

  /**
   * Clear all artifacts
   */
  clear(): void {
    this.artifacts.clear();
    this.activeDocumentId = null;
  }

  /**
   * Delete an artifact
   */
  delete(documentId: string): boolean {
    if (this.activeDocumentId === documentId) {
      this.activeDocumentId = null;
    }
    return this.artifacts.delete(documentId);
  }

  /**
   * Edit content with proper forking logic
   */
  async editContent(documentId: string, content: string, title: string): Promise<void> {
    const artifact = this.artifacts.get(documentId);
    if (!artifact) {
      throw new Error('Artifact not found');
    }

    artifact.content = content;
    artifact.title = title;

    await saveDocument({
      id: documentId,
      title,
      content,
      kind: artifact.kind,
      userId: this.userId,
      chatId: this.chatId,
      author: 'user',
    });

    await this.reload(documentId);
  }
}

export async function getArtifactManager(userId: string, chatId?: string): Promise<ArtifactManager> {
  return new ArtifactManager(userId, chatId);
}
