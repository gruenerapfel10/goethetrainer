import { type NextRequest, NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

export async function POST(request: NextRequest) {
  try {
    const { content, title } = await request.json();

    if (!content) {
      return NextResponse.json({ error: 'content required' }, { status: 400 });
    }

    // Parse markdown-like content to docx paragraphs
    const paragraphs = parseContentToParagraphs(content, title);

    const doc = new Document({
      sections: [{
        properties: {},
        children: paragraphs,
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    const uint8Array = new Uint8Array(buffer);
    const blob = new Blob([uint8Array], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    return new NextResponse(blob, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${title || 'document'}.docx"`,
      },
    });
  } catch (error) {
    console.error('docx export error:', error);
    return NextResponse.json({ error: 'export failed' }, { status: 500 });
  }
}

function parseContentToParagraphs(content: string, title?: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // Add title if provided
  if (title) {
    paragraphs.push(
      new Paragraph({
        text: title,
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 },
      })
    );
  }

  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      paragraphs.push(new Paragraph({ text: '' }));
      continue;
    }

    // Heading 1
    if (trimmed.startsWith('# ')) {
      paragraphs.push(
        new Paragraph({
          text: trimmed.substring(2),
          heading: HeadingLevel.HEADING_1,
        })
      );
      continue;
    }

    // Heading 2
    if (trimmed.startsWith('## ')) {
      paragraphs.push(
        new Paragraph({
          text: trimmed.substring(3),
          heading: HeadingLevel.HEADING_2,
        })
      );
      continue;
    }

    // Heading 3
    if (trimmed.startsWith('### ')) {
      paragraphs.push(
        new Paragraph({
          text: trimmed.substring(4),
          heading: HeadingLevel.HEADING_3,
        })
      );
      continue;
    }

    // Bullet point
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      paragraphs.push(
        new Paragraph({
          text: trimmed.substring(2),
          bullet: { level: 0 },
        })
      );
      continue;
    }

    // Bold text
    const children: TextRun[] = [];
    const boldRegex = /\*\*(.*?)\*\*/g;
    let lastIndex = 0;
    let match;

    while ((match = boldRegex.exec(trimmed)) !== null) {
      if (match.index > lastIndex) {
        children.push(new TextRun(trimmed.substring(lastIndex, match.index)));
      }
      children.push(new TextRun({ text: match[1], bold: true }));
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < trimmed.length) {
      children.push(new TextRun(trimmed.substring(lastIndex)));
    }

    paragraphs.push(
      new Paragraph({
        children: children.length > 0 ? children : [new TextRun(trimmed)],
      })
    );
  }

  return paragraphs;
}
