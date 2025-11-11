interface StreamBuffer {
  chatId: string;
  streamId: string;
  chunks: Uint8Array[];
  createdAt: number;
  isComplete: boolean;
  isResuming: boolean;
  reader?: ReadableStreamDefaultReader<Uint8Array>;
}

declare global {
  var __streamBuffers: Map<string, StreamBuffer> | undefined;
}

const getGlobalBuffers = () => {
  if (!globalThis.__streamBuffers) {
    globalThis.__streamBuffers = new Map<string, StreamBuffer>();
  }
  return globalThis.__streamBuffers;
};

class StreamBufferManager {
  private get buffers() {
    return getGlobalBuffers();
  }

  private readonly MAX_BUFFER_AGE_MS = 5 * 60 * 1000;

  createBuffer(chatId: string, streamId: string, reader?: ReadableStreamDefaultReader<Uint8Array>): void {
    this.buffers.set(streamId, {
      chatId,
      streamId,
      chunks: [],
      createdAt: Date.now(),
      isComplete: false,
      isResuming: false,
      reader,
    });
  }

  addChunk(streamId: string, chunk: Uint8Array): void {
    const buffer = this.buffers.get(streamId);
    if (buffer) buffer.chunks.push(chunk);
  }

  markComplete(streamId: string): void {
    const buffer = this.buffers.get(streamId);
    if (buffer) buffer.isComplete = true;
  }

  async abortByChatId(chatId: string): Promise<void> {
    const buffer = this.getStreamByChatId(chatId);
    console.log("*** ABORTING BUFFER", JSON.stringify({ chatId, streamId: buffer?.streamId, hasReader: !!buffer?.reader }));
    if (buffer) {
      if (buffer.reader) {
        try {
          await buffer.reader.cancel();
          console.log("*** READER CANCELLED");
        } catch (error) {
          console.error("*** ERROR CANCELLING READER", error);
        }
      }
      this.markComplete(buffer.streamId);
    }
  }

  getStreamByChatId(chatId: string): StreamBuffer | null {
    for (const buffer of this.buffers.values()) {
      if (buffer.chatId === chatId && !buffer.isComplete) {
        return buffer;
      }
    }
    return null;
  }

  createResumeStream(chatId: string): ReadableStream<Uint8Array> | null {
    const buffer = this.getStreamByChatId(chatId);
    if (!buffer || buffer.isResuming) return null;

    buffer.isResuming = true;
    let lastSentIndex = -1;
    let interval: NodeJS.Timeout;

    return new ReadableStream({
      start: (controller) => {
        for (let i = 0; i < buffer.chunks.length; i++) {
          controller.enqueue(buffer.chunks[i]);
          lastSentIndex = i;
        }

        interval = setInterval(() => {
          const currentBuffer = this.buffers.get(buffer.streamId);
          if (!currentBuffer) {
            clearInterval(interval);
            controller.close();
            return;
          }

          for (let i = lastSentIndex + 1; i < currentBuffer.chunks.length; i++) {
            controller.enqueue(currentBuffer.chunks[i]);
            lastSentIndex = i;
          }

          if (currentBuffer.isComplete) {
            clearInterval(interval);
            controller.close();
            this.clearBuffer(buffer.streamId);
            console.log(`[StreamBuffer] Cleared completed buffer ${buffer.streamId}`);
          }
        }, 100);
      },
      cancel: () => {
        if (interval) clearInterval(interval);
        buffer.isResuming = false;
      }
    });
  }

  clearBuffer(streamId: string): void {
    this.buffers.delete(streamId);
  }

  clearOldBuffers(): void {
    const now = Date.now();
    for (const [streamId, buffer] of this.buffers.entries()) {
      if (now - buffer.createdAt > this.MAX_BUFFER_AGE_MS) {
        this.buffers.delete(streamId);
        console.log(`[StreamBuffer] Cleared old buffer ${streamId}`);
      }
    }
  }

  clearCompletedBuffersForChat(chatId: string): void {
    for (const [streamId, buffer] of this.buffers.entries()) {
      if (buffer.chatId === chatId && buffer.isComplete && !buffer.isResuming) {
        this.buffers.delete(streamId);
        console.log(`[StreamBuffer] Cleared completed buffer ${streamId} for chat ${chatId}`);
      }
    }
  }

  cancelReaderForChat(chatId: string): void {
    const buffer = this.getStreamByChatId(chatId);
    if (buffer?.isResuming) {
      buffer.isResuming = false;
      console.log(`[StreamBuffer] Cancelled reader for chat ${chatId}, reset isResuming flag`);
    }
  }
}

export const streamBufferManager = new StreamBufferManager();

setInterval(() => streamBufferManager.clearOldBuffers(), 60000);
