import { EditorFactory } from './EditorFactory';

let registered = false;

export function registerEditors() {
  if (registered) return;
  
  // Register editors lazily when needed
  import('@/components/code-editor').then(m => EditorFactory.register('code', m.CodeEditor as any));
  import('@/components/sheet-editor').then(m => EditorFactory.register('sheet', m.SpreadsheetEditor as any));
  import('@/components/image-editor').then(m => EditorFactory.register('image', m.ImageEditor as any));
  import('@/components/text-editor').then(m => EditorFactory.register('text', m.default as any));
  
  EditorFactory.register('webpage', ({ content }: any) => {
    const React = require('react');
    return React.createElement('iframe', {
      sandbox: 'allow-scripts',
      srcDoc: content,
      className: 'w-full h-full border-0'
    });
  });
  
  registered = true;
}
