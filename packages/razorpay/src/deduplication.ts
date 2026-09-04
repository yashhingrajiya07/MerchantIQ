export interface WebhookEventRecord {
  eventId: string;
  eventType: string;
  receivedAt: string;
  processedAt?: string;
  status: 'RECEIVED' | 'PROCESSED' | 'DUPLICATE' | 'FAILED_SAFE';
  payloadSummary?: string;
}

export class WebhookDeduplicator {
  private processedEvents = new Map<string, WebhookEventRecord>();
  private readonly maxCacheSize: number;

  constructor(maxCacheSize = 5000) {
    this.maxCacheSize = maxCacheSize;
  }

  /**
   * Checks if an event ID has already been received or processed.
   */
  public isDuplicate(eventId: string): boolean {
    return this.processedEvents.has(eventId);
  }

  /**
   * Records a received event. If already present, marks as DUPLICATE.
   */
  public recordEvent(eventId: string, eventType: string, payloadSummary?: string): { isDuplicate: boolean; record: WebhookEventRecord } {
    if (this.processedEvents.has(eventId)) {
      const existing = this.processedEvents.get(eventId)!;
      return {
        isDuplicate: true,
        record: {
          ...existing,
          status: 'DUPLICATE'
        }
      };
    }

    // Evict oldest entries if cache limit is reached
    if (this.processedEvents.size >= this.maxCacheSize) {
      const firstKey = this.processedEvents.keys().next().value;
      if (firstKey) this.processedEvents.delete(firstKey);
    }

    const record: WebhookEventRecord = {
      eventId,
      eventType,
      receivedAt: new Date().toISOString(),
      status: 'RECEIVED',
      payloadSummary
    };

    this.processedEvents.set(eventId, record);
    return { isDuplicate: false, record };
  }

  /**
   * Marks an event as successfully processed.
   */
  public markProcessed(eventId: string): void {
    const record = this.processedEvents.get(eventId);
    if (record) {
      record.status = 'PROCESSED';
      record.processedAt = new Date().toISOString();
    }
  }

  /**
   * Returns recent events for live dashboard monitoring.
   */
  public getRecentEvents(limit = 20): WebhookEventRecord[] {
    return Array.from(this.processedEvents.values()).slice(-limit).reverse();
  }
}
