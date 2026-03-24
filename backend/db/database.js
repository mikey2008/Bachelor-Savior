'use strict';

const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

const DB_PATH     = path.join(__dirname, 'bachelor_savior.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

const db = new Database(DB_PATH);

// Enforce foreign keys and WAL mode on every connection
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Run schema once on startup (CREATE TABLE IF NOT EXISTS is idempotent)
const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
db.exec(schema);

module.exports = db;
