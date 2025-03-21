const { pool } = require('./db');

const updateDatabase = async () => {
    try {
        console.log('Connecting to database...');
        const client = await pool.connect();
        
        // Drop the existing users table
        await client.query('DROP TABLE IF EXISTS users');
        console.log('Dropped existing users table');

        // Create new users table with optional username
        await client.query(`
            CREATE TABLE users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255),
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                is_verified BOOLEAN DEFAULT FALSE,
                otp VARCHAR(6),
                otp_expiry TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        console.log('Created new users table with optional username');
        client.release();
        process.exit(0);
    } catch (error) {
        console.error('Database update error:', error);
        process.exit(1);
    }
};

updateDatabase(); 