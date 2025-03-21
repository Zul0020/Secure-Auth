const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        require: true,
        rejectUnauthorized: false
    },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000, // Increased timeout for initial connection
    keepAlive: true // Enable keepalive
});

// Initial connection test
const testConnection = async () => {
    try {
        const client = await pool.connect();
        console.log('Successfully connected to Neon database');
        client.release();
        return true;
    } catch (err) {
        console.error('Error connecting to the database:', err.message);
        return false;
    }
};

// Test the connection immediately
testConnection();

// Export the pool and query function
module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
}; 