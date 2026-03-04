// For local Dev we turn off the SSL requirement, but in production (Supabase) we need it on. 

/*const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD),
  ssl: false
});

export default pool;
*/

// Updated connection with conditional SSL based on environment
const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD),
  ssl: isProduction ? { rejectUnauthorized: false } : false,
  family: 4  // Force IPv4
});

export default pool;