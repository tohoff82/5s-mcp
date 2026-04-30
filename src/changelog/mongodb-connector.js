import { promises as fs } from 'fs';

/**
 * Optional MongoDB adapter for the 5S changelog.
 *
 * The MCP server has no MongoDB dependency by default. When the `mongodb`
 * package is installed and autoSync is enabled, this adapter persists entries
 * to MongoDB; otherwise it stays disconnected and callers fall back to files.
 */
export class FiveSChangelogMongo {
  constructor(config = {}) {
    this.config = {
      uri: config.uri || process.env.MONGODB_URI || 'mongodb://localhost:27017',
      database: config.database || process.env.MONGODB_DATABASE || '5s_procedure_changelog',
      collections: {
        main: 'fiveS_changelog',
        archive: 'fiveS_changelog_archive'
      }
    };
    this.client = null;
    this.db = null;
    this.isConnected = false;
  }

  async connect() {
    let MongoClient;
    try {
      ({ MongoClient } = await import('mongodb'));
    } catch {
      this.isConnected = false;
      return false;
    }

    this.client = new MongoClient(this.config.uri);
    await this.client.connect();
    this.db = this.client.db(this.config.database);
    this.isConnected = true;
    return true;
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
    }
    this.client = null;
    this.db = null;
    this.isConnected = false;
  }

  collection(name = 'main') {
    if (!this.isConnected || !this.db) {
      throw new Error('MongoDB is not connected');
    }
    return this.db.collection(this.config.collections[name] || name);
  }

  async saveEntry(entry) {
    await this.collection().updateOne({ id: entry.id }, { $set: entry }, { upsert: true });
    return entry;
  }

  async updateEntry(id, entry) {
    await this.collection().updateOne({ id }, { $set: entry }, { upsert: true });
    return entry;
  }

  async searchEntries(filters = {}) {
    const query = {};
    if (filters.procedure_type || filters.type) query['procedure.type'] = filters.procedure_type || filters.type;
    if (filters.severity) query['impact.severity'] = filters.severity;
    if (filters.status) query['status.current'] = filters.status;
    if (filters.executor) query['human_resources.executor'] = filters.executor;
    if (filters.quarter) query.quarter = filters.quarter;
    return await this.collection().find(query).sort({ timestamp: -1 }).toArray();
  }

  async getStatistics(quarter) {
    const match = quarter ? { quarter } : {};
    const entries = await this.collection().find(match).toArray();
    return {
      total: entries.length,
      by_type: countBy(entries, entry => entry.procedure?.type || 'unknown'),
      by_severity: countBy(entries, entry => entry.impact?.severity || 'unknown'),
      by_status: countBy(entries, entry => entry.status?.current || 'unknown')
    };
  }

  async syncWithFileSystem(filePath) {
    const entry = JSON.parse(await fs.readFile(filePath, 'utf8'));
    return await this.saveEntry(entry);
  }
}

function countBy(items, selector) {
  return items.reduce((acc, item) => {
    const key = selector(item);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

export default FiveSChangelogMongo;
