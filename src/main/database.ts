import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'

export interface ApiKey {
  id: number
  name: string
  value: string
  created_at: string
}

export class DatabaseService {
  private db: Database.Database
  private static instance: DatabaseService

  private constructor() {
    // Store database in userData directory
    const userDataPath = app.getPath('userData')
    const dbPath = join(userDataPath, 'api-keys.db')

    this.db = new Database(dbPath)
    this.initializeDatabase()
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService()
    }
    return DatabaseService.instance
  }

  private initializeDatabase(): void {
    // Create api_keys table if it doesn't exist
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS api_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        value TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `

    this.db.exec(createTableQuery)
  }

  public getAllApiKeys(): ApiKey[] {
    const query = 'SELECT * FROM api_keys ORDER BY created_at DESC'
    return this.db.prepare(query).all() as ApiKey[]
  }

  public createApiKey(name: string, value: string): ApiKey {
    const query = 'INSERT INTO api_keys (name, value) VALUES (?, ?)'
    const result = this.db.prepare(query).run(name, value)

    // Get the newly created record
    const getQuery = 'SELECT * FROM api_keys WHERE id = ?'
    return this.db.prepare(getQuery).get(result.lastInsertRowid) as ApiKey
  }

  public getApiKeyById(id: number): ApiKey | undefined {
    const query = 'SELECT * FROM api_keys WHERE id = ?'
    return this.db.prepare(query).get(id) as ApiKey | undefined
  }

  public updateApiKey(id: number, name: string, value: string): ApiKey | undefined {
    const query = 'UPDATE api_keys SET name = ?, value = ? WHERE id = ?'
    const result = this.db.prepare(query).run(name, value, id)

    if (result.changes === 0) {
      return undefined
    }

    return this.getApiKeyById(id)
  }

  public deleteApiKey(id: number): boolean {
    const query = 'DELETE FROM api_keys WHERE id = ?'
    const result = this.db.prepare(query).run(id)
    return result.changes > 0
  }

  public close(): void {
    if (this.db) {
      this.db.close()
    }
  }
}
