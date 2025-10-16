'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import type { ArtifactKind } from '@/components/artifact';
import { useChat } from './chat-context';

export interface WebSource {
  url: string;
  title: string;
  favicon?: string;
}

export interface ArtifactData {
  documentId: string;
  kind: ArtifactKind;
  title: string;
  content: string;
  status: 'idle' | 'streaming';
  boundingBox: { top: number; left: number; width: number; height: number };
  sources?: WebSource[];
  currentSourceIndex?: number;
  version?: number;
  versions?: Array<{ version: number; content: string; title: string; isWorkingVersion?: boolean }>;
  currentVersionIndex?: number;
  workingVersion?: number;
  currentVersion?: number;
}

export interface ArtifactsState {
  artifacts: Record<string, ArtifactData>;
  activeDocumentId: string | null;
  isVisible: boolean;
}

interface ArtifactsContextValue {
  artifactsState: ArtifactsState;
  activeArtifact: ArtifactData | null;
  createArtifact: (params: {
    documentId: string;
    kind: ArtifactKind;
    title: string;
    content?: string;
    boundingBox?: ArtifactData['boundingBox'];
    sources?: WebSource[];
    currentSourceIndex?: number;
    version?: number;
  }) => void;
  activateArtifact: (documentId: string) => void;
  updateArtifactContent: (documentId: string, content: string, isStreaming?: boolean) => void;
  setArtifactsVisible: (visible: boolean) => void;
  loadArtifact: (documentId: string, targetVersionNumber?: number) => Promise<void>;
  addSourcesToArtifact: (documentId: string, sources: WebSource[], currentIndex?: number) => void;
  navigateArtifactSource: (documentId: string, index: number) => void;
  openArtifact: (documentId: string, versionId?: number) => Promise<void>;
  editContent: (documentId: string, content: string, title: string) => Promise<void>;
  setWorkingVersion: (documentId: string, version: number) => Promise<void>;
}

const ArtifactsContext = createContext<ArtifactsContextValue | null>(null);

export function ArtifactsProvider({
  children,
  initialArtifacts,
}: {
  children: React.ReactNode;
  initialArtifacts?: Record<string, ArtifactData>;
}) {
  const { id: chatId, addToSystemQueue } = useChat();
  const [artifactsState, setArtifactsState] = useState<ArtifactsState>({
    artifacts: initialArtifacts || {},
    activeDocumentId: null,
    isVisible: false,
  });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!chatId || isLoaded || Object.keys(initialArtifacts || {}).length > 0) return;

    const loadChatArtifacts = async () => {
      try {
        const response = await fetch(`/api/chat/${chatId}/documents`);
        if (!response.ok) return;

        const documents = await response.json();
        if (!documents || documents.length === 0) {
          setIsLoaded(true);
          return;
        }

        const artifactsByDocId: Record<string, any[]> = {};
        documents.forEach((doc: any) => {
          if (!artifactsByDocId[doc.id]) {
            artifactsByDocId[doc.id] = [];
          }
          artifactsByDocId[doc.id].push(doc);
        });

        const artifacts: Record<string, ArtifactData> = {};
        Object.entries(artifactsByDocId).forEach(([docId, docs]) => {
          const sortedDocs = docs.sort((a, b) => a.version - b.version);
          const latestDoc = sortedDocs[sortedDocs.length - 1];
          const workingDoc = sortedDocs.find(d => d.isWorkingVersion) || latestDoc;

          artifacts[docId] = {
            documentId: docId,
            kind: latestDoc.kind,
            title: latestDoc.title,
            content: workingDoc.content,
            status: 'idle',
            boundingBox: { top: 0, left: 0, width: 0, height: 0 },
            version: workingDoc.version,
            versions: sortedDocs.map((d: any) => ({
              version: d.version,
              content: d.content,
              title: d.title,
              isWorkingVersion: d.isWorkingVersion,
            })),
            workingVersion: workingDoc.version,
            currentVersionIndex: sortedDocs.findIndex(d => d.version === workingDoc.version),
          };
        });

        setArtifactsState(prev => ({
          ...prev,
          artifacts,
        }));
        setIsLoaded(true);
      } catch (error) {
        console.error('Failed to load chat artifacts:', error);
        setIsLoaded(true);
      }
    };

    loadChatArtifacts();
  }, [chatId, isLoaded]);

  const activeArtifact = artifactsState.activeDocumentId 
    ? artifactsState.artifacts[artifactsState.activeDocumentId] || null
    : null;

  const createArtifact = useCallback((params: {
    documentId: string;
    kind: ArtifactKind;
    title: string;
    content?: string;
    boundingBox?: ArtifactData['boundingBox'];
    sources?: WebSource[];
    currentSourceIndex?: number;
    version?: number;
  }) => {
    const newArtifact: ArtifactData = {
      documentId: params.documentId,
      kind: params.kind,
      title: params.title,
      content: params.content || '',
      status: 'idle',
      boundingBox: params.boundingBox || { top: 0, left: 0, width: 0, height: 0 },
      sources: params.sources,
      currentSourceIndex: params.currentSourceIndex ?? 0,
      version: params.version,
    };
    
    setArtifactsState(prev => ({
      artifacts: {
        ...prev.artifacts,
        [params.documentId]: newArtifact,
      },
      activeDocumentId: params.documentId,
      isVisible: true,
    }));
  }, []);

  const activateArtifact = useCallback((documentId: string) => {
    setArtifactsState(prev => {
      if (!prev.artifacts[documentId]) return prev;
      return {
        ...prev,
        activeDocumentId: documentId,
        isVisible: true,
      };
    });
  }, []);

  const updateArtifactContent = useCallback((documentId: string, content: string, isStreaming = false) => {
    setArtifactsState(prev => {
      const artifact = prev.artifacts[documentId];
      if (!artifact) return prev;
      
      return {
        ...prev,
        artifacts: {
          ...prev.artifacts,
          [documentId]: {
            ...artifact,
            content,
            status: isStreaming ? 'streaming' : 'idle',
          },
        },
      };
    });
  }, []);

  const setArtifactsVisible = useCallback((visible: boolean) => {
    setArtifactsState(prev => ({ ...prev, isVisible: visible }));
  }, []);

  const addSourcesToArtifact = useCallback((documentId: string, sources: WebSource[], currentIndex = 0) => {
    setArtifactsState(prev => {
      const artifact = prev.artifacts[documentId];
      if (!artifact) return prev;
      
      return {
        ...prev,
        artifacts: {
          ...prev.artifacts,
          [documentId]: {
            ...artifact,
            sources,
            currentSourceIndex: currentIndex,
          },
        },
      };
    });
  }, []);

  const navigateArtifactSource = useCallback((documentId: string, index: number) => {
    setArtifactsState(prev => {
      const artifact = prev.artifacts[documentId];
      if (!artifact || !artifact.sources || index < 0 || index >= artifact.sources.length) return prev;
      
      const source = artifact.sources[index];
      
      return {
        ...prev,
        artifacts: {
          ...prev.artifacts,
          [documentId]: {
            ...artifact,
            content: source.url,
            title: source.title,
            currentSourceIndex: index,
          },
        },
      };
    });
  }, []);

  const loadArtifact = useCallback(async (documentId: string, targetVersionNumber?: number) => {
    try {
      const response = await fetch(`/api/document?id=${documentId}`);
      if (!response.ok) throw new Error('Failed to load artifact');
      
      const documents = await response.json();
      if (!documents || documents.length === 0) {
        throw new Error('Document not found');
      }
      
      const sortedDocuments = documents.sort((a: any, b: any) => a.version - b.version);
      const targetDoc = targetVersionNumber 
        ? sortedDocuments.find((d: any) => d.version === targetVersionNumber) || sortedDocuments[sortedDocuments.length - 1]
        : sortedDocuments[sortedDocuments.length - 1];
      const targetIndex = sortedDocuments.findIndex((d: any) => d.version === targetDoc.version);
      
      const workingDoc = sortedDocuments.find((d: any) => d.isWorkingVersion) || sortedDocuments[sortedDocuments.length - 1];
      
      const artifact: ArtifactData = {
        documentId,
        kind: targetDoc.kind,
        title: targetDoc.title,
        content: targetDoc.content,
        status: 'idle',
        boundingBox: { top: 0, left: 0, width: 0, height: 0 },
        version: targetDoc.version,
        versions: sortedDocuments.map((d: any) => ({ version: d.version, content: d.content, title: d.title, isWorkingVersion: d.isWorkingVersion })),
        currentVersionIndex: targetIndex,
        workingVersion: workingDoc.version,
      };
      
      setArtifactsState(prev => ({
        artifacts: {
          ...prev.artifacts,
          [documentId]: artifact,
        },
        activeDocumentId: documentId,
        isVisible: true,
      }));
    } catch (error) {
      toast.error('Failed to load artifact');
      throw error;
    }
  }, []);

  const openArtifact = useCallback(async (documentId: string, versionId?: number) => {
    try {
      const response = await fetch(`/api/document?id=${documentId}`);
      if (!response.ok) throw new Error('Failed to load artifact');
      
      const documents = await response.json();
      if (!documents || documents.length === 0) {
        throw new Error('Document not found');
      }
      
      const sortedDocuments = documents.sort((a: any, b: any) => a.version - b.version);
      const targetDoc = versionId 
        ? sortedDocuments.find((d: any) => d.version === versionId) || sortedDocuments[sortedDocuments.length - 1]
        : sortedDocuments[sortedDocuments.length - 1];
      const targetIndex = sortedDocuments.findIndex((d: any) => d.version === targetDoc.version);
      
      const workingDoc = sortedDocuments.find((d: any) => d.isWorkingVersion) || sortedDocuments[sortedDocuments.length - 1];
      
      const artifact: ArtifactData = {
        documentId,
        kind: targetDoc.kind,
        title: targetDoc.title,
        content: targetDoc.content,
        status: 'idle',
        boundingBox: { 
          top: window.innerHeight / 2 - 200,
          left: window.innerWidth / 2 - 300,
          width: 600,
          height: 400,
        },
        version: targetDoc.version,
        versions: sortedDocuments.map((d: any) => ({ version: d.version, content: d.content, title: d.title, isWorkingVersion: d.isWorkingVersion })),
        currentVersionIndex: targetIndex,
        workingVersion: workingDoc.version,
      };
      
      setArtifactsState(prev => ({
        artifacts: {
          ...prev.artifacts,
          [documentId]: artifact,
        },
        activeDocumentId: documentId,
        isVisible: true,
      }));
    } catch (error) {
      toast.error('Failed to open artifact');
      throw error;
    }
  }, []);

  const editContent = useCallback(async (documentId: string, content: string, title: string) => {
    try {
      const artifact = artifactsState.artifacts[documentId];
      if (!artifact) {
        toast.error('Artifact not found');
        return;
      }

      updateArtifactContent(documentId, content, false);

      const response = await fetch(`/api/document?id=${documentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, title, kind: artifact.kind }),
      });

      if (!response.ok) throw new Error('Failed to save edit');

      await loadArtifact(documentId);
    } catch (error) {
      toast.error('Failed to save changes');
      throw error;
    }
  }, [artifactsState.artifacts, updateArtifactContent, loadArtifact]);

  const setWorkingVersion = useCallback(async (documentId: string, version: number) => {
    try {
      const artifact = artifactsState.artifacts[documentId];
      if (!artifact) {
        toast.error('Artifact not found');
        return;
      }

      const oldVersion = artifact.version;
      const oldContent = artifact.content;
      const newVersionData = artifact.versions?.find(v => v.version === version);
      const newContent = newVersionData?.content || '';

      const response = await fetch(`/api/document/set-working`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, version }),
      });

      if (!response.ok) throw new Error('failed to set working version');

      await loadArtifact(documentId, version);
      
      const systemMessage = `The USER JUST CHANGED THE WORKING VERSION OF THE  artifact with document id ${documentId} from v${oldVersion} to v${version} for document "${artifact.title}".\n\nOld content (v${oldVersion}):\n${oldContent}\n\nNew content (v${version}):\n${newContent}`;
      addToSystemQueue(systemMessage);
      
      toast.success(`set version ${version} as working version`);
    } catch (error) {
      toast.error('failed to set working version');
      throw error;
    }
  }, [loadArtifact, artifactsState.artifacts, addToSystemQueue]);

  const value: ArtifactsContextValue = {
    artifactsState,
    activeArtifact,
    createArtifact,
    activateArtifact,
    updateArtifactContent,
    setArtifactsVisible,
    loadArtifact,
    addSourcesToArtifact,
    navigateArtifactSource,
    openArtifact,
    editContent,
    setWorkingVersion,
  };

  return (
    <ArtifactsContext.Provider value={value}>
      {children}
    </ArtifactsContext.Provider>
  );
}

export function useArtifactsContext() {
  const context = useContext(ArtifactsContext);
  if (!context) {
    throw new Error('useArtifactsContext must be used within ArtifactsProvider');
  }
  return context;
}
