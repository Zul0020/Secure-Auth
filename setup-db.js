const { pool } = require('./db');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const setupDatabase = async () => {
    let retries = 3;
    while (retries > 0) {
        try {
            console.log('Attempting to connect to database...');
            const client = await pool.connect();
            console.log('Connected successfully, creating table...');

            // Create users table
            await client.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(255) NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    is_verified BOOLEAN DEFAULT FALSE,
                    otp VARCHAR(6),
                    otp_expiry TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);
            
            console.log('Database table created or already exists');
            client.release();
            process.exit(0);
        } catch (error) {
            console.error('Attempt failed:', error.message);
            retries--;
            if (retries > 0) {
                console.log(`Retrying in 5 seconds... (${retries} attempts remaining)`);
                await wait(5000);
            } else {
                console.error('All attempts failed. Please check your database configuration.');
                process.exit(1);
            }
        }
    }
};

setupDatabase(); 