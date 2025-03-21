const { pool } = require('./db');

const checkAndCreateTable = async () => {
    try {
        // First, check if the table exists
        const checkTableQuery = `
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'users'
            );
        `;

        const tableExists = await pool.query(checkTableQuery);
        console.log('Table exists?:', tableExists.rows[0].exists);

        if (!tableExists.rows[0].exists) {
            console.log('Table does not exist. Creating now...');
            
            // Create the table
            const createTableQuery = `
                CREATE TABLE users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(255) NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    is_verified BOOLEAN DEFAULT FALSE,
                    otp VARCHAR(6),
                    otp_expiry TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `;

            await pool.query(createTableQuery);
            console.log('Table created successfully!');
        } else {
            // If table exists, let's see its structure
            const tableStructure = await pool.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'users';
            `);
            console.log('Current table structure:', tableStructure.rows);
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        // Close the pool
        await pool.end();
    }
};

checkAndCreateTable(); 