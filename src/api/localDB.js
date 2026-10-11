import {openDB} from 'idb';

const DB_NAME = 'ControleOnline';

export default class localDB {
  constructor(state) {
    this.state = state;
    this.db = null;
    this.opening = null;
  }

  async initDB() {
    const endpoint = this.state.resourceEndpoint;
    const upgrade = db => {
      if (db.objectStoreNames.contains(endpoint)) return;
      const store = db.createObjectStore(endpoint, {keyPath: 'id'});
      (this.state.columns || []).forEach(column => {
        if (column.name && (column.sortable || column.externalFilter === false)) {
          store.createIndex(column.name, column.name, {unique: false});
        }
      });
    };
    const blocking = () => { this.db?.close(); this.db = null; };
    let db = await openDB(DB_NAME, undefined, {upgrade, blocking});
    if (!db.objectStoreNames.contains(endpoint)) {
      const version = db.version + 1;
      db.close();
      db = await openDB(DB_NAME, version, {upgrade, blocking});
    }
    this.db = db;
    return db;
  }

  async getCurrentVersion() {
    return (await this.checkAndGetDB()).version;
  }

  checkAndGetDB() {
    if (this.db) return Promise.resolve(this.db);
    if (!this.opening) {
      this.opening = this.initDB().finally(() => { this.opening = null; });
    }
    return this.opening;
  }

  async storeExists() {
    return (await this.checkAndGetDB()).objectStoreNames.contains(this.state.resourceEndpoint);
  }

  async getAll() {
    return (await this.checkAndGetDB()).getAll(this.state.resourceEndpoint);
  }

  async getItemsByColumn(columnName, value) {
    const db = await this.checkAndGetDB();
    const tx = db.transaction(this.state.resourceEndpoint, 'readonly');
    if (!tx.store.indexNames.contains(columnName)) return [];
    const items = await tx.store.index(columnName).getAll(value);
    await tx.done;
    return items;
  }

  async get(id) {
    return (await this.checkAndGetDB()).get(this.state.resourceEndpoint, id);
  }

  async saveItems(items) {
    const db = await this.checkAndGetDB();
    const tx = db.transaction(this.state.resourceEndpoint, 'readwrite');
    await Promise.all(items.map(item => tx.store.put(item)));
    await tx.done;
  }

  async saveItem(item) {
    return (await this.checkAndGetDB()).put(this.state.resourceEndpoint, item);
  }

  async getItemsByFilters() {
    const filters = Object.entries(this.state.filters || {});
    if (!filters.length) return this.getAll();
    const matches = await Promise.all(filters.map(([key, value]) =>
      this.getItemsByColumn(key, value)));
    return matches.reduce((items, next) => items.filter(item =>
      next.some(result => result.id === item.id)));
  }
}
