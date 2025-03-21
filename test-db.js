const { pool } = require('./db');

const testConnection = async () => {
    try {
        // Test connection
        console.log('Testing database connection...');
        const client = await pool.connect();
        console.log('Successfully connected to the database');

        // Check if users table exists
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public'
                AND table_name = 'users'
            );
        `);
        
        if (tableCheck.rows[0].exists) {
            console.log('Users table exists');
            
            // Get table structure
            const tableStructure = await client.query(`
                SELECT column_name, data_type, character_maximum_length
                FROM information_schema.columns
                WHERE table_name = 'users';
            `);
            
            console.log('Table structure:');
            console.log(tableStructure.rows);
        } else {
            console.log('Users table does not exist');
        }

        client.release();
        process.exit(0);
    } catch (error) {
        console.error('Database test error:', error);
        process.exit(1);
    }
};

testConnection(); 