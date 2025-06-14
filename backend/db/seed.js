const bcrypt = require('bcrypt');
const db = require('./init');

function dbAllAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function seedDatabase() {
  try {
    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    await db.run(`
      INSERT INTO users (username, email, password, is_admin, email_verified)
      VALUES (?, ?, ?, ?, ?)
    `, ['admin', 'admin@example.com', adminPassword, 1, 1]);

    // Create regular users
    const userPassword = await bcrypt.hash('user123', 10);
    const users = [
      ['john_doe', 'john@example.com'],
      ['jane_smith', 'jane@example.com'],
      ['bob_wilson', 'bob@example.com']
    ];

    for (const [username, email] of users) {
      await db.run(`
        INSERT INTO users (username, email, password, email_verified)
        VALUES (?, ?, ?, ?)
      `, [username, email, userPassword, 1]);
    }

    // Get user IDs
    const userIds = await dbAllAsync('SELECT id FROM users');
    console.log('userIds:', userIds);
    const adminId = userIds[0]?.id;
    const regularUserIds = userIds.slice(1).map(u => u.id);
    console.log('adminId:', adminId);
    console.log('regularUserIds:', regularUserIds);

    // Create blips
    const blips = [
      [adminId, 'Welcome to Simple Social Wall! This is a test post.'],
      [regularUserIds[0], 'Just joined the platform. Excited to connect with everyone!'],
      [regularUserIds[1], 'Beautiful day today! 🌞'],
      [regularUserIds[2], 'Working on some exciting projects. Stay tuned!'],
      [regularUserIds[0], 'Anyone up for a coffee chat? ☕'],
      [regularUserIds[1], 'Just finished reading an amazing book. Recommendations welcome! 📚'],
      [regularUserIds[2], 'New profile picture! What do you think?'],
      [adminId, 'Platform update: Added new features for better user experience!']
    ];

    for (const [userId, content] of blips) {
      await db.run(`
        INSERT INTO blips (user_id, content)
        VALUES (?, ?)
      `, [userId, content]);
    }

    // Get blip IDs
    let blipIds = await dbAllAsync('SELECT id FROM blips');
    blipIds = blipIds.sort((a, b) => a.id - b.id);
    console.log('blipIds:', blipIds);

    // Add reactions
    const reactions = [
      [regularUserIds[0], blipIds[0]?.id, '👍'],
      [regularUserIds[1], blipIds[0]?.id, '❤️'],
      [regularUserIds[2], blipIds[0]?.id, '🎉'],
      [adminId, blipIds[1]?.id, '👋'],
      [regularUserIds[1], blipIds[2]?.id, '🌞'],
      [regularUserIds[2], blipIds[3]?.id, '💪'],
      [adminId, blipIds[4]?.id, '☕'],
      [regularUserIds[0], blipIds[5]?.id, '📚']
    ];

    for (const [userId, blipId, reactionType] of reactions) {
      if (!blipId) continue;
      await db.run(`
        INSERT INTO reactions (user_id, blip_id, reaction_type)
        VALUES (?, ?, ?)
      `, [userId, blipId, reactionType]);
    }

    // Add some reports
    const reports = [
      [regularUserIds[0], regularUserIds[1], blipIds[2]?.id, 'Inappropriate content'],
      [regularUserIds[1], regularUserIds[2], null, 'Spam behavior'],
      [regularUserIds[2], regularUserIds[0], blipIds[4]?.id, 'Offensive language']
    ];

    for (const [reporterId, reportedUserId, blipId, reason] of reports) {
      if (blipId === undefined && reason !== 'Spam behavior') continue;
      await db.run(`
        INSERT INTO reports (reporter_id, reported_user_id, reported_blip_id, reason)
        VALUES (?, ?, ?, ?)
      `, [reporterId, reportedUserId, blipId, reason]);
    }

    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    db.close();
  }
}

seedDatabase(); 