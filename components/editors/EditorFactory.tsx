import React from 'react';

export interface EditorProps {
  content: string;
  onContentChange: (content: string) => void;
  status: 'idle' | 'streaming';
  isReadOnly?: boolean;
}

export class EditorFactory {
  private static editorMap = new Map<string, React.ComponentType<EditorProps>>();
  
  static register(kind: string, component: React.ComponentType<EditorProps>) {
    EditorFactory.editorMap.set(kind, component);
  }
  
  static getEditor(kind: string): React.ComponentType<EditorProps> | undefined {
    return EditorFactory.editorMap.get(kind);
  }
  
  static renderEditor(kind: string, props: EditorProps): JSX.Element | null {
    const Editor = EditorFactory.editorMap.get(kind);
    if (!Editor) {
      return <div>Unsupported artifact: {kind}</div>;
    }
    
    return <Editor {...props} />;
  }
}

export interface UnifiedArtifactRendererProps extends EditorProps {
  kind: string;
}

export function UnifiedArtifactRenderer({ kind, ...props }: UnifiedArtifactRendererProps) {
  return EditorFactory.renderEditor(kind, props);
}
