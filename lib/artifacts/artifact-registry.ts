export enum ArtifactKind {
  TEXT = 'text',
  CODE = 'code',
  SHEET = 'sheet',
  WEBPAGE = 'webpage',
  DOCX = 'docx',
  PDF = 'pdf',
  XLSX = 'xlsx',
  CSV = 'csv',
}

export interface ArtifactMetadata {
  kind: ArtifactKind;
  displayName: string;
  description: string;
  fileExtension: string;
  mimeType: string;
  supportsVersioning: boolean;
  supportsEditing: boolean;
  icon?: string;
}

export const ARTIFACT_METADATA: Record<ArtifactKind, ArtifactMetadata> = {
  [ArtifactKind.TEXT]: {
    kind: ArtifactKind.TEXT,
    displayName: 'Document',
    description: 'Rich text document with markdown support',
    fileExtension: 'md',
    mimeType: 'text/markdown',
    supportsVersioning: true,
    supportsEditing: true,
    icon: 'document',
  },
  [ArtifactKind.CODE]: {
    kind: ArtifactKind.CODE,
    displayName: 'Code',
    description: 'Code editor with syntax highlighting',
    fileExtension: 'txt',
    mimeType: 'text/plain',
    supportsVersioning: true,
    supportsEditing: true,
    icon: 'code',
  },
  [ArtifactKind.SHEET]: {
    kind: ArtifactKind.SHEET,
    displayName: 'Spreadsheet',
    description: 'Spreadsheet with CSV data',
    fileExtension: 'csv',
    mimeType: 'text/csv',
    supportsVersioning: true,
    supportsEditing: true,
    icon: 'table',
  },
  [ArtifactKind.WEBPAGE]: {
    kind: ArtifactKind.WEBPAGE,
    displayName: 'Web Page',
    description: 'Interactive web page viewer',
    fileExtension: 'html',
    mimeType: 'text/html',
    supportsVersioning: false,
    supportsEditing: false,
    icon: 'globe',
  },
  [ArtifactKind.DOCX]: {
    kind: ArtifactKind.DOCX,
    displayName: 'Word Document',
    description: 'Microsoft Word document viewer',
    fileExtension: 'docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    supportsVersioning: false,
    supportsEditing: false,
    icon: 'file-text',
  },
  [ArtifactKind.PDF]: {
    kind: ArtifactKind.PDF,
    displayName: 'PDF Document',
    description: 'PDF document viewer',
    fileExtension: 'pdf',
    mimeType: 'application/pdf',
    supportsVersioning: false,
    supportsEditing: false,
    icon: 'file',
  },
  [ArtifactKind.XLSX]: {
    kind: ArtifactKind.XLSX,
    displayName: 'Excel Spreadsheet',
    description: 'Microsoft Excel spreadsheet viewer',
    fileExtension: 'xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    supportsVersioning: false,
    supportsEditing: false,
    icon: 'table',
  },
  [ArtifactKind.CSV]: {
    kind: ArtifactKind.CSV,
    displayName: 'CSV File',
    description: 'CSV data viewer',
    fileExtension: 'csv',
    mimeType: 'text/csv',
    supportsVersioning: false,
    supportsEditing: false,
    icon: 'table',
  },
};

export function getArtifactMetadata(kind: ArtifactKind): ArtifactMetadata {
  return ARTIFACT_METADATA[kind];
}

export function getArtifactFileExtension(kind: ArtifactKind): string {
  return ARTIFACT_METADATA[kind].fileExtension;
}

export function getArtifactMimeType(kind: ArtifactKind): string {
  return ARTIFACT_METADATA[kind].mimeType;
}
