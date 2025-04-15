import { MongoClient, Db } from 'mongodb';
import { log } from './vite';

// Get MongoDB connection string from environment variables
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/admin';

let db: Db;
let connectionInProgress = false;
let lastAttemptTime = 0;
const CONNECTION_RETRY_INTERVAL = 30000; // 30 seconds

export async function connectToMongoDB(): Promise<Db> {
  // If already connected, return the existing connection
  if (db) {
    return db;
  }

  // Avoid multiple concurrent connection attempts
  if (connectionInProgress) {
    throw new Error("MongoDB connection already in progress");
  }

  // Implement a simple rate limiting for connection attempts
  const now = Date.now();
  if (now - lastAttemptTime < CONNECTION_RETRY_INTERVAL) {
    throw new Error("MongoDB connection attempt rate limited");
  }

  connectionInProgress = true;
  lastAttemptTime = now;

  try {
    log("Attempting to connect to MongoDB...", "mongodb");
    
    // Check if MONGODB_URI is set
    if (!process.env.MONGODB_URI) {
      log("⚠️ MONGODB_URI environment variable not set. Using default local connection.", "mongodb");
    }
    
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    db = client.db();
    log("✅ Connected to MongoDB successfully", "mongodb");
    
    // Handle application termination
    process.on('SIGINT', async () => {
      try {
        await client.close();
        log('MongoDB connection closed', "mongodb");
      } catch (err) {
        console.error('Error closing MongoDB connection:', err);
      }
      process.exit(0);
    });
    
    connectionInProgress = false;
    return db;
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    log(`❌ MongoDB connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`, "mongodb");
    connectionInProgress = false;
    throw error;
  }
}

export async function getMongoDb(): Promise<Db> {
  if (!db) {
    return connectToMongoDB();
  }
  return db;
}