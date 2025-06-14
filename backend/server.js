require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const WebSocket = require('ws');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const path = require('path');
const multer = require('multer');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const xss = require('xss-clean');
const { body, validationResult } = require('express-validator');
const db = require('./db/init');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['set-cookie']
}));
app.use(express.json());
app.use(cookieParser());
app.use(xss());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// File upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// WebSocket server
const wss = new WebSocket.Server({ port: 5001 });

wss.on('connection', (ws) => {
    console.log('New WebSocket connection');

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        // Broadcast to all connected clients
        wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data));
            }
        });
    });
});

// Authentication middleware
const verifyToken = (req, res, next) => {
    const token = req.cookies.authToken;
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ message: 'Invalid token' });
        req.user = decoded;
        next();
    });
};

// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Auth routes
app.post('/api/auth/register', [
    body('username').trim().isLength({ min: 3 }).escape(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;
    
    try {
        // Check if user already exists
        db.get('SELECT * FROM users WHERE email = ? OR username = ?', [email, username], async (err, existingUser) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ message: 'Error checking existing user' });
            }
            
            if (existingUser) {
                return res.status(400).json({ message: 'Username or email already exists' });
            }

            // Generate avatar URL using DiceBear
            const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
            
            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);
            const verificationToken = uuidv4();
            
            // Insert new user
            db.run(
                'INSERT INTO users (username, email, password, avatar_url, verification_token) VALUES (?, ?, ?, ?, ?)',
                [username, email, hashedPassword, avatarUrl, verificationToken],
                function(err) {
                    if (err) {
                        console.error('Database error:', err);
                        return res.status(500).json({ message: 'Error creating user' });
                    }

                    // Send verification email
                    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
                    transporter.sendMail({
                        from: process.env.EMAIL_USER,
                        to: email,
                        subject: 'Verify your email',
                        html: `Click <a href="${verificationUrl}">here</a> to verify your email.`
                    }).catch(console.error);

                    res.status(201).json({ message: 'User registered successfully' });
                }
            );
        });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ message: 'Error creating user' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
        if (err) return res.status(500).json({ message: 'Error finding user' });
        if (!user) return res.status(401).json({ message: 'Invalid credentials' });
        if (user.is_banned) return res.status(403).json({ message: 'Account has been banned' });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(401).json({ message: 'Invalid credentials' });

        const token = jwt.sign(
            { id: user.id, isAdmin: user.is_admin },
            JWT_SECRET,
            { expiresIn: '14d' }  // Token expires in 14 days
        );

        res.cookie('authToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
            path: '/',
            domain: process.env.NODE_ENV === 'production' ? process.env.COOKIE_DOMAIN : undefined
        });

        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            avatarUrl: user.avatar_url,
            isAdmin: user.is_admin
        });
    });
});

app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('authToken');
    res.json({ message: 'Logged out successfully' });
});

app.get('/api/auth/check', verifyToken, (req, res) => {
    db.get('SELECT id, username, email, avatar_url, is_admin FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err) return res.status(500).json({ message: 'Error checking authentication' });
        if (!user) return res.status(401).json({ message: 'User not found' });
        
        // Ensure isAdmin is properly set in the response
        const userData = {
            ...user,
            isAdmin: Boolean(user.is_admin) // Convert to boolean to ensure consistent type
        };
        
        res.json(user);
    });
});

app.get('/api/auth/verify-email/:token', (req, res) => {
    const { token } = req.params;

    db.run(
        'UPDATE users SET email_verified = 1 WHERE verification_token = ?',
        [token],
        function(err) {
            if (err) return res.status(500).json({ message: 'Error verifying email' });
            if (this.changes === 0) return res.status(400).json({ message: 'Invalid verification token' });
            res.json({ message: 'Email verified successfully' });
        }
    );
});

// Blip routes
app.get('/api/blips', (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    db.all(`
        SELECT b.*, u.username, u.avatar_url,
        (SELECT COUNT(*) FROM reactions WHERE blip_id = b.id) as reaction_count
        FROM blips b
        JOIN users u ON b.user_id = u.id
        WHERE b.is_deleted = 0
        ORDER BY b.created_at DESC
        LIMIT ? OFFSET ?
    `, [limit, offset], (err, blips) => {
        if (err) return res.status(500).json({ message: 'Error fetching blips' });
        res.json(blips);
    });
});

app.post('/api/blips', verifyToken, [
    body('content').trim().isLength({ min: 1, max: 280 }).escape()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { content } = req.body;
    
    db.run(
        'INSERT INTO blips (user_id, content) VALUES (?, ?)',
        [req.user.id, content],
        function(err) {
            if (err) return res.status(500).json({ message: 'Error creating blip' });
            
            // Get the created blip with user info
            db.get(`
                SELECT b.*, u.username, u.avatar_url
                FROM blips b
                JOIN users u ON b.user_id = u.id
                WHERE b.id = ?
            `, [this.lastID], (err, blip) => {
                if (err) return res.status(500).json({ message: 'Error fetching created blip' });

                // Notify all clients about new blip
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            type: 'NEW_BLIP',
                            blip
                        }));
                    }
                });

                res.status(201).json(blip);
            });
        }
    );
});

// Reaction routes
app.post('/api/blips/:blipId/reactions', verifyToken, (req, res) => {
    const { blipId } = req.params;
    const { reactionType } = req.body;

    db.run(
        'INSERT OR REPLACE INTO reactions (user_id, blip_id, reaction_type) VALUES (?, ?, ?)',
        [req.user.id, blipId, reactionType],
        function(err) {
            if (err) return res.status(500).json({ message: 'Error adding reaction' });

            // Notify all clients about reaction
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: 'REACTION_UPDATE',
                        blipId,
                        userId: req.user.id,
                        reactionType
                    }));
                }
            });

            res.json({ message: 'Reaction added successfully' });
        }
    );
});

// Report routes
app.post('/api/reports', verifyToken, [
    body('reason').trim().isLength({ min: 1 }).escape()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { reportedUserId, reportedBlipId, reason } = req.body;
    
    if (!reportedUserId && !reportedBlipId) {
        return res.status(400).json({ message: 'Must report either a user or a blip' });
    }

    db.run(
        'INSERT INTO reports (reporter_id, reported_user_id, reported_blip_id, reason) VALUES (?, ?, ?, ?)',
        [req.user.id, reportedUserId, reportedBlipId, reason],
        function(err) {
            if (err) return res.status(500).json({ message: 'Error creating report' });
            res.status(201).json({ message: 'Report submitted successfully' });
        }
    );
});

// Admin routes
app.get('/api/admin/reports', verifyToken, (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ message: 'Admin access required' });

    db.all(`
        SELECT r.*, 
        u1.username as reporter_username,
        u2.username as reported_username,
        b.content as reported_blip_content
        FROM reports r
        JOIN users u1 ON r.reporter_id = u1.id
        LEFT JOIN users u2 ON r.reported_user_id = u2.id
        LEFT JOIN blips b ON r.reported_blip_id = b.id
        WHERE r.status = 'pending'
        ORDER BY r.created_at DESC
    `, (err, reports) => {
        if (err) return res.status(500).json({ message: 'Error fetching reports' });
        res.json(reports);
    });
});

app.post('/api/admin/reports/:reportId/resolve', verifyToken, (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ message: 'Admin access required' });

    const { reportId } = req.params;
    const { action, userId, blipId } = req.body;

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // Update report status
        db.run(
            'UPDATE reports SET status = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?',
            ['resolved', reportId],
            function(err) {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ message: 'Error resolving report' });
                }

                // Handle user ban
                if (action === 'ban' && userId) {
                    db.run(
                        'UPDATE users SET is_banned = 1 WHERE id = ?',
                        [userId],
                        function(err) {
                            if (err) {
                                db.run('ROLLBACK');
                                return res.status(500).json({ message: 'Error banning user' });
                            }
                        }
                    );
                }

                // Handle blip deletion
                if (action === 'delete' && blipId) {
                    db.run(
                        'UPDATE blips SET is_deleted = 1 WHERE id = ?',
                        [blipId],
                        function(err) {
                            if (err) {
                                db.run('ROLLBACK');
                                return res.status(500).json({ message: 'Error deleting blip' });
                            }
                        }
                    );
                }

                db.run('COMMIT');
                res.json({ message: 'Report resolved successfully' });
            }
        );
    });
});

app.get('/api/admin/reports', verifyToken, (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ message: 'Admin access required' });

    db.all(`
        SELECT r.*, 
        u1.username as reporter_username,
        u2.username as reported_username,
        b.content as reported_blip_content
        FROM reports r
        LEFT JOIN users u1 ON r.reporter_id = u1.id
        LEFT JOIN users u2 ON r.reported_user_id = u2.id
        LEFT JOIN blips b ON r.reported_blip_id = b.id
        ORDER BY r.created_at DESC
    `, (err, reports) => {
        if (err) return res.status(500).json({ message: 'Error fetching reports' });
        res.json(reports);
    });
});

app.post('/api/admin/reports/:reportId/resolve', verifyToken, (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ message: 'Admin access required' });

    const { reportId } = req.params;
    const { action, userId, blipId } = req.body;

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // Update report status
        db.run(
            'UPDATE reports SET status = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?',
            ['resolved', reportId],
            function(err) {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ message: 'Error resolving report' });
                }

                // Handle user ban
                if (action === 'ban' && userId) {
                    db.run(
                        'UPDATE users SET is_banned = 1 WHERE id = ?',
                        [userId],
                        function(err) {
                            if (err) {
                                db.run('ROLLBACK');
                                return res.status(500).json({ message: 'Error banning user' });
                            }
                        }
                    );
                }

                // Handle blip deletion
                if (action === 'delete' && blipId) {
                    db.run(
                        'UPDATE blips SET is_deleted = 1 WHERE id = ?',
                        [blipId],
                        function(err) {
                            if (err) {
                                db.run('ROLLBACK');
                                return res.status(500).json({ message: 'Error deleting blip' });
                            }
                        }
                    );
                }

                db.run('COMMIT');
                res.json({ message: 'Report resolved successfully' });
            }
        );
    });
});

app.get('/api/admin/users', verifyToken, (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ message: 'Admin access required' });

    db.all(`
        SELECT id, username, email, avatar_url, is_banned, created_at
        FROM users
        ORDER BY created_at DESC
    `, (err, users) => {
        if (err) return res.status(500).json({ message: 'Error fetching users' });
        res.json(users);
    });
});

app.post('/api/admin/users/:userId/ban', verifyToken, (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ message: 'Admin access required' });

    const { userId } = req.params;
    db.run(
        'UPDATE users SET is_banned = 1 WHERE id = ?',
        [userId],
        function(err) {
            if (err) return res.status(500).json({ message: 'Error banning user' });
            res.json({ message: 'User banned successfully' });
        }
    );
});

app.post('/api/admin/users/:userId/unban', verifyToken, (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ message: 'Admin access required' });

    const { userId } = req.params;
    db.run(
        'UPDATE users SET is_banned = 0 WHERE id = ?',
        [userId],
        function(err) {
            if (err) return res.status(500).json({ message: 'Error unbanning user' });
            res.json({ message: 'User unbanned successfully' });
        }
    );
});

app.post('/api/admin/users/:userId/delete', verifyToken, (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ message: 'Admin access required' });

    const { userId } = req.params;
    db.run(
        'DELETE FROM blips WHERE user_id = ?',
        [userId],
        function(err) {
            if (err) return res.status(500).json({ message: 'Error deleting user' });
            db.run(
                'DELETE FROM reactions WHERE user_id = ?',
                [userId],
                function(err) {
                    if (err) return res.status(500).json({ message: 'Error deleting user' });
                    db.run(
                        'DELETE FROM reports WHERE reporter_id = ? OR reported_user_id = ?',
                        [userId, userId],
                        function(err) {
                            if (err) return res.status(500).json({ message: 'Error deleting user' });
                            db.run(
                                'DELETE FROM users WHERE id = ?',
                                [userId],
                                function(err) {
                                    if (err) return res.status(500).json({ message: 'Error deleting user' });
                                    res.json({ message: 'User deleted successfully' });
                                }
                            );
                        }
                    );
                }
            );
        }
    );
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
}); 