const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database('./restaurant.db', (err) => {
  if (err) {
    console.error('FATAL: Database connection error:', err.message);
    process.exit(1);
  } else {
    console.log('Connected to SQLite database: ./restaurant.db');
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.serialize(() => {
    console.log("Initializing database schema...");
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE
    )`, (err) => { if (err) console.error("Error creating users table:", err.message); else console.log("Table 'users' checked/created."); });

    db.run(`CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    )`, (err) => { if (err) console.error("Error creating categories table:", err.message); else console.log("Table 'categories' checked/created."); });

    db.run(`CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      description TEXT,
      is_veg BOOLEAN DEFAULT 0,
      image TEXT,
      category_id INTEGER,
      FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL
    )`, (err) => { if (err) console.error("Error creating menu_items table:", err.message); else console.log("Table 'menu_items' checked/created."); });

    db.run(`CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      total_amount REAL NOT NULL,
      order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
    )`, (err) => { if (err) console.error("Error creating orders table:", err.message); else console.log("Table 'orders' checked/created."); });

    db.run(`CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      item_id INTEGER,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
      FOREIGN KEY (item_id) REFERENCES menu_items (id) ON DELETE SET NULL
    )`, (err) => { if (err) console.error("Error creating order_items table:", err.message); else console.log("Table 'order_items' checked/created."); });

    db.run(`CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      comment TEXT,
      feedback_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
    )`, (err) => { if (err) console.error("Error creating feedback table:", err.message); else console.log("Table 'feedback' checked/created."); });

    insertSampleData();
    console.log("Database schema initialization complete.");
  });
}

function insertSampleData() {
  db.get("SELECT COUNT(*) as count FROM categories", (err, row) => {
    if (err) {
      console.error("Error checking categories for sample data:", err.message);
      return;
    }

    if (row.count === 0) {
      console.log("No categories found, inserting sample data...");
      db.serialize(() => {
        const categories = [
          "Appetizers",
          "Main Course",
          "Desserts",
          "Beverages"
        ];
        const categoryStmt = db.prepare("INSERT INTO categories (name) VALUES (?)");
        categories.forEach(category => {
          categoryStmt.run(category, (catInsertErr) => {
              if (catInsertErr) console.error(`Error inserting category ${category}:`, catInsertErr.message);
          });
        });
        categoryStmt.finalize((catErr) => {
          if (catErr) {
            console.error("Error finalizing category insertion:", catErr.message);
            return;
          }
          console.log("Sample categories insertion process completed.");

          const sampleItems = [
            {name: "Garlic Bread", price: 150, category: "Appetizers", is_veg: 1, description: "Toasted bread with garlic butter.", image: "https://placehold.co/200x140/FFF8DC/333333?text=Garlic+Bread"},
            {name: "Bruschetta", price: 200, category: "Appetizers", is_veg: 1, description: "Grilled bread rubbed with garlic and topped with tomatoes.", image: "https://placehold.co/200x140/FFF8DC/333333?text=Bruschetta"},
            {name: "Margherita Pizza", price: 450, category: "Main Course", is_veg: 1, description: "Classic pizza with tomatoes, mozzarella, and basil.", image: "https://placehold.co/200x140/FFF8DC/333333?text=Margherita"},
            {name: "Spaghetti Carbonara", price: 380, category: "Main Course", is_veg: 0, description: "Pasta with eggs, cheese, pancetta, and pepper.", image: "https://placehold.co/200x140/FFF8DC/333333?text=Carbonara"},
            {name: "Tiramisu", price: 250, category: "Desserts", is_veg: 1, description: "Coffee-flavoured Italian dessert.", image: "https://placehold.co/200x140/FFF8DC/333333?text=Tiramisu"},
            {name: "Italian Soda", price: 120, category: "Beverages", is_veg: 1, description: "Refreshing flavored soda.", image: "https://placehold.co/200x140/FFF8DC/333333?text=Soda"}
          ];

          const itemStmt = db.prepare("INSERT INTO menu_items (name, price, is_veg, category_id, description, image) VALUES (?, ?, ?, ?, ?, ?)");
          let itemsToProcess = sampleItems.length;
          let itemsProcessed = 0;

          sampleItems.forEach(item => {
            db.get("SELECT id FROM categories WHERE name = ?", [item.category], (findCatErr, catRow) => {
              itemsProcessed++;
              if (findCatErr) {
                console.error(`Error finding category ID for ${item.category}:`, findCatErr.message);
              } else if (!catRow) {
                console.error(`Category '${item.category}' not found for item '${item.name}'. Skipping insertion.`);
              } else {
                itemStmt.run([item.name, item.price, item.is_veg, catRow.id, item.description, item.image], (itemErr) => {
                  if (itemErr) {
                    console.error(`Error inserting item ${item.name}:`, itemErr.message);
                  }
                });
              }

              if (itemsProcessed === itemsToProcess) {
                itemStmt.finalize((itemFinalizeErr) => {
                  if (itemFinalizeErr) {
                    console.error("Error finalizing item insertion statement:", itemFinalizeErr.message);
                  } else {
                    console.log("Sample items insertion process completed.");
                  }
                });
              }
            });
          });
        });
      });
    } else {
        // console.log("Categories table already populated. Skipping sample data insertion.");
    }
  });
}

app.post('/api/login', (req, res) => {
  const { name, phone } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '' ||
      !phone || typeof phone !== 'string' || phone.trim() === '') {
    return res.status(400).json({ success: false, error: 'Name and phone number are required and must be non-empty strings.' });
  }

  const trimmedName = name.trim();
  const trimmedPhone = phone.trim();

  db.get("SELECT * FROM users WHERE phone = ?", [trimmedPhone], (err, user) => {
    if (err) {
      console.error("Login DB Error (get user):", err.message);
      return res.status(500).json({ success: false, error: 'Database error checking user' });
    }

    if (user) {
      console.log(`User logged in: ${user.name} (${user.phone})`);
      return res.json({ success: true, user: { id: user.id, name: user.name, phone: user.phone } });
    } else {
      db.run("INSERT INTO users (name, phone) VALUES (?, ?)", [trimmedName, trimmedPhone], function(err) {
        if (err) {
           if (err.code === 'SQLITE_CONSTRAINT') {
               console.warn("Login DB Warning (insert user - constraint):", err.message);
               db.get("SELECT * FROM users WHERE phone = ?", [trimmedPhone], (retryErr, retryUser) => {
                   if (retryErr || !retryUser) {
                        return res.status(500).json({ success: false, error: 'Failed to create or retrieve user after conflict.' });
                   }
                   console.log(`User logged in after conflict: ${retryUser.name} (${retryUser.phone})`);
                   return res.json({ success: true, user: { id: retryUser.id, name: retryUser.name, phone: retryUser.phone } });
               });
           } else {
               console.error("Login DB Error (insert user):", err.message);
               return res.status(500).json({ success: false, error: 'Failed to create user' });
           }
        } else {
            const userId = this.lastID;
            console.log(`New user created and logged in: ${trimmedName} (${trimmedPhone}), ID: ${userId}`);
            return res.json({
              success: true,
              user: { id: userId, name: trimmedName, phone: trimmedPhone }
            });
        }
      });
    }
  });
});

app.get('/api/categories', (req, res) => {
  db.all("SELECT * FROM categories ORDER BY name", (err, categories) => {
    if (err) {
      console.error("Get Categories DB Error:", err.message);
      return res.status(500).json({ success: false, error: 'Database error fetching categories' });
    }
    res.json(categories);
  });
});

app.get('/api/menu/:categoryId', (req, res) => {
  const categoryId = req.params.categoryId;

  if (isNaN(categoryId)) {
      return res.status(400).json({ success: false, error: 'Invalid category ID format' });
  }
  const categoryIdNum = parseInt(categoryId, 10);

  db.all("SELECT * FROM menu_items WHERE category_id = ? ORDER BY name", [categoryIdNum], (err, items) => {
    if (err) {
      console.error("Get Menu Items DB Error:", err.message);
      return res.status(500).json({ success: false, error: 'Database error fetching menu items' });
    }
    res.json(items);
  });
});

app.post('/api/orders', (req, res) => {
  const { userId, items, totalAmount } = req.body;

  if (!userId || typeof userId !== 'number') {
       return res.status(400).json({ success: false, error: 'Valid User ID is required.' });
  }
  if (!Array.isArray(items) || items.length === 0) {
       return res.status(400).json({ success: false, error: 'Order must contain at least one item.' });
  }
   if (typeof totalAmount !== 'number' || totalAmount <= 0) {
        return res.status(400).json({ success: false, error: 'Valid total amount is required.' });
   }
   for (const item of items) {
       if (typeof item.id !== 'number' || typeof item.quantity !== 'number' || item.quantity <= 0 || typeof item.price !== 'number' || item.price < 0) {
           console.warn("Invalid item data received in order:", item);
           return res.status(400).json({ success: false, error: 'Invalid item data found in order request.' });
       }
   }
   const calculatedTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
   if (Math.abs(calculatedTotal - totalAmount) > 0.01) {
       console.warn(`Order total mismatch. Client: ${totalAmount}, Server: ${calculatedTotal}. UserID: ${userId}`);
       return res.status(400).json({ success: false, error: 'Order total amount mismatch.' });
   }

  db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    db.run("INSERT INTO orders (user_id, total_amount) VALUES (?, ?)",
           [userId, totalAmount], function(err) {
      if (err) {
        console.error("Create Order DB Error (insert order):", err.message);
        db.run("ROLLBACK");
        return res.status(500).json({ success: false, error: 'Failed to create order header' });
      }

      const orderId = this.lastID;
      let itemsProcessed = 0;
      let transactionFailed = false;

      const itemStmt = db.prepare("INSERT INTO order_items (order_id, item_id, quantity, price) VALUES (?, ?, ?, ?)");

      items.forEach(item => {
        if (transactionFailed) return;

        itemStmt.run([orderId, item.id, item.quantity, item.price], function(itemErr) {
          if (transactionFailed) return;

          if (itemErr) {
            transactionFailed = true;
            console.error("Create Order DB Error (insert item):", itemErr.message);
            itemStmt.finalize();
            db.run("ROLLBACK");
            return res.status(500).json({ success: false, error: 'Failed to add one or more order items' });
          }

          itemsProcessed++;

          if (!transactionFailed && itemsProcessed === items.length) {
            itemStmt.finalize((finalizeErr) => {
                if (finalizeErr) {
                     transactionFailed = true;
                     console.error("Create Order DB Error (finalize item stmt):", finalizeErr.message);
                     db.run("ROLLBACK");
                     return res.status(500).json({ success: false, error: 'Failed to finalize order items processing' });
                }
                db.run("COMMIT", (commitErr) => {
                    if (commitErr) {
                        console.error("Create Order DB Error (commit):", commitErr.message);
                        db.run("ROLLBACK");
                        return res.status(500).json({ success: false, error: 'Failed to commit the order transaction' });
                    }
                    console.log(`Order ${orderId} created successfully for user ${userId}.`);
                    return res.json({ success: true, orderId: orderId });
                });
            });
          }
        });
      });
    });
  });
});

app.post('/api/feedback', (req, res) => {
  const { userId, rating, comment } = req.body;

  if (!userId || typeof userId !== 'number') {
    return res.status(400).json({ success: false, error: 'Valid User ID is required.' });
  }
  if (typeof rating !== 'number' || rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, error: 'A valid rating (1-5) is required.' });
  }

  const safeComment = (typeof comment === 'string' ? comment.trim() : '') || '';

  db.run("INSERT INTO feedback (user_id, rating, comment) VALUES (?, ?, ?)",
         [userId, rating, safeComment], function(err) {
    if (err) {
      console.error("Submit Feedback DB Error:", err.message);
      return res.status(500).json({ success: false, error: 'Failed to submit feedback' });
    }
    console.log(`Feedback submitted by user ${userId}, ID: ${this.lastID}`);
    res.json({ success: true, feedbackId: this.lastID });
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, closing database connection...');
  db.close((err) => {
    if (err) {
        console.error("Error closing database:", err.message);
        process.exit(1);
    }
    console.log('Database connection closed gracefully.');
    process.exit(0);
  });
});
