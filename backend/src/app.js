const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

const errorHandler = require('./middleware/errorMiddleware');
const db = require('./config/db');

const app = express();

// ==========================
// Middleware
// ==========================
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// ==========================
// Routes
// ==========================
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tenants', require('./routes/tenantRoutes'));
app.use('/api', require('./routes/userRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api', require('./routes/taskRoutes'));

// ==========================
// Health Check
// ==========================
app.get('/api/health', async (req, res) => {
    try {
        await db.query('SELECT 1');
        res.status(200).json({
            status: 'ok',
            database: 'connected'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            status: 'error',
            database: 'disconnected'
        });
    }
});

// ==========================
// Run Database Migrations
// ==========================
const runMigrations = async () => {
    try {
        const migrationDir = path.join(__dirname, '../migrations');

        if (fs.existsSync(migrationDir)) {
            const migrationFiles = fs.readdirSync(migrationDir).sort();

            for (const file of migrationFiles) {
                const sql = fs.readFileSync(
                    path.join(migrationDir, file),
                    'utf8'
                );

                await db.query(sql);
                console.log(`✅ Executed migration: ${file}`);
            }
        }

        const seedFile = path.join(__dirname, '../seeds/seed_data.sql');

        if (fs.existsSync(seedFile)) {
            const seedSql = fs.readFileSync(seedFile, 'utf8');
            await db.query(seedSql);
            console.log('✅ Seed data executed');
        }

    } catch (err) {
        console.error('❌ Migration failed:', err);
    }
};

// ==========================
// Start Server
// ==========================
const startServer = async () => {
    try {
        await runMigrations();

        const PORT = process.env.PORT || 5000;

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });

    } catch (err) {
        console.error('❌ Failed to start server:', err);
        process.exit(1);
    }
};

// ==========================
// Error Handler
// ==========================
app.use(errorHandler);

// ==========================
// Start only when executed directly
// ==========================
if (require.main === module) {
    startServer();
}

module.exports = app;