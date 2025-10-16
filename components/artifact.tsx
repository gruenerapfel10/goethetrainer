// Export artifact definitions for use in other components
const textArtifact = {
  kind: 'text' as const,
  actions: [],
  toolbar: []
};

const codeArtifact = {
  kind: 'code' as const,
  actions: [],
  toolbar: []
};

const imageArtifact = {
  kind: 'image' as const,
  actions: [],
  toolbar: []
};

const sheetArtifact = {
  kind: 'sheet' as const,
  actions: [],
  toolbar: []
};

const webpageArtifact = {
  kind: 'webpage' as const,
  actions: [],
  toolbar: []
};

const pdfArtifact = {
  kind: 'pdf' as const,
  actions: [],
  toolbar: []
};

const docxArtifact = {
  kind: 'docx' as const,
  actions: [],
  toolbar: []
};

const xlsxArtifact = {
  kind: 'xlsx' as const,
  actions: [],
  toolbar: []
};

const csvArtifact = {
  kind: 'csv' as const,
  actions: [],
  toolbar: []
};

export const artifactDefinitions = [
  textArtifact,
  codeArtifact,
  imageArtifact,
  sheetArtifact,
  webpageArtifact,
  pdfArtifact,
  docxArtifact,
  xlsxArtifact,
  csvArtifact,
];

export type ArtifactKind = (typeof artifactDefinitions)[number]['kind'];

export interface UIArtifact {
  title: string;
  documentId: string;
  kind: ArtifactKind;
  content: string;
  isVisible: boolean;
  status: 'streaming' | 'idle';
  boundingBox: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
}