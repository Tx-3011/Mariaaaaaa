const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
// Remove: const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
// Replace bodyParser.json() with express.json()
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database initialization
const db = new sqlite3.Database('./latavola.db', (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    initializeDatabase();
  }
});

// Initialize database tables
function initializeDatabase() {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Categories table
  db.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    image TEXT
  )`);

  // Menu items table
  db.run(`CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    description TEXT,
    image TEXT,
    is_veg BOOLEAN NOT NULL,
    category_id INTEGER,
    FOREIGN KEY (category_id) REFERENCES categories (id)
  )`);

  // Orders table
  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    total_amount REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // Order items table
  db.run(`CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    item_id INTEGER,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders (id),
    FOREIGN KEY (item_id) REFERENCES menu_items (id)
  )`);

  // Feedback table
  db.run(`CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    rating INTEGER NOT NULL,
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // Insert sample categories if none exist
  db.get('SELECT COUNT(*) as count FROM categories', [], (err, row) => {
    if (err) {
      console.error(err.message);
    } else if (row.count === 0) {
      // Insert sample categories
      const categories = [
        { name: 'Appetizers', image: 'appetizers.jpg' },
        { name: 'Pasta', image: 'pasta.jpg' },
        { name: 'Pizza', image: 'pizza.jpg' },
        { name: 'Desserts', image: 'desserts.jpg' },
        { name: 'Beverages', image: 'beverages.jpg' }
      ];

      categories.forEach(category => {
        db.run('INSERT INTO categories (name, image) VALUES (?, ?)',
          [category.name, category.image]);
      });

      console.log('Sample categories added.');
    }
  });

  // Insert sample menu items if none exist
  db.get('SELECT COUNT(*) as count FROM menu_items', [], (err, row) => {
    if (err) {
      console.error(err.message);
    } else if (row.count === 0) {
      // Get category IDs first
      db.all('SELECT id, name FROM categories', [], (err, categories) => {
        if (err) {
          console.error(err.message);
          return;
        }

        const categoryMap = {};
        categories.forEach(cat => {
          categoryMap[cat.name] = cat.id;
        });

        // Sample menu items
        const menuItems = [
          {
            name: 'Bruschetta 🌱',
            price: 8.99,
            description: 'Toasted bread with fresh tomatoes, garlic, and basil',
            image: 'bruschetta.jpg',
            is_veg: 1,
            category: 'Appetizers'
          },
          {
            name: 'Calamari Fritti 🍗',
            price: 12.99,
            description: 'Crispy fried squid with marinara sauce',
            image: 'calamari.jpg',
            is_veg: 0,
            category: 'Appetizers'
          },
          {
            name: 'Spaghetti Aglio e Olio 🌱',
            price: 14.99,
            description: 'Spaghetti with garlic, olive oil, and chili flakes',
            image: 'aglio.jpg',
            is_veg: 1,
            category: 'Pasta'
          },
          {
            name: 'Fettuccine Alfredo 🌱',
            price: 15.99,
            description: 'Fettuccine with creamy parmesan sauce',
            image: 'alfredo.jpg',
            is_veg: 1,
            category: 'Pasta'
          },
          {
            name: 'Spaghetti Carbonara 🍗',
            price: 16.99,
            description: 'Spaghetti with egg, cheese, pancetta, and black pepper',
            image: 'carbonara.jpg',
            is_veg: 0,
            category: 'Pasta'
          },
          {
            name: 'Margherita Pizza 🌱',
            price: 13.99,
            description: 'Tomato sauce, mozzarella, and basil',
            image: 'margherita.jpg',
            is_veg: 1,
            category: 'Pizza'
          },
          {
            name: 'Pepperoni Pizza 🍗',
            price: 15.99,
            description: 'Tomato sauce, mozzarella, and pepperoni',
            image: 'pepperoni.jpg',
            is_veg: 0,
            category: 'Pizza'
          },
          {
            name: 'Tiramisu 🌱',
            price: 7.99,
            description: 'Coffee-flavored Italian dessert',
            image: 'tiramisu.jpg',
            is_veg: 1,
            category: 'Desserts'
          },
          {
            name: 'Panna Cotta 🌱',
            price: 6.99,
            description: 'Italian cream dessert with berries',
            image: 'pannacotta.jpg',
            is_veg: 1,
            category: 'Desserts'
          },
          {
            name: 'Espresso ☕',
            price: 3.99,
            description: 'Strong Italian coffee',
            image: 'espresso.jpg',
            is_veg: 1,
            category: 'Beverages'
          },
          {
            name: 'Italian Wine 🍷',
            price: 9.99,
            description: 'Glass of house red or white wine',
            image: 'wine.jpg',
            is_veg: 1,
            category: 'Beverages'
          }
        ];

        menuItems.forEach(item => {
          const categoryId = categoryMap[item.category];
          if (categoryId) {
            db.run(
              'INSERT INTO menu_items (name, price, description, image, is_veg, category_id) VALUES (?, ?, ?, ?, ?, ?)',
              [item.name, item.price, item.description, item.image, item.is_veg, categoryId]
            );
          }
        });

        console.log('Sample menu items added.');
      });
    }
  });
}

// API Routes

// User login/registration route
app.post('/api/login', (req, res) => {
  const { name, phone } = req.body;

  // Basic validation
  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and phone number are required' });
  }
   // Add more specific validation if needed (e.g., phone number format)

  // Check if user exists
  db.get('SELECT * FROM users WHERE phone = ?', [phone], (err, user) => {
    if (err) {
      console.error("Login DB error:", err.message);
      return res.status(500).json({ error: 'Database error during login' });
    }

    if (user) {
      // User exists, return user data
      return res.json({
        success: true,
        message: 'Login successful',
        user
      });
    } else {
      // Create new user
      db.run('INSERT INTO users (name, phone) VALUES (?, ?)', [name, phone], function(err) {
        if (err) {
          // Handle potential unique constraint error for phone
          if (err.message.includes('UNIQUE constraint failed')) {
             return res.status(400).json({ error: 'Phone number already registered.' });
          }
          console.error("Registration DB error:", err.message);
          return res.status(500).json({ error: 'Database error during registration' });
        }

        // Return new user data
        db.get('SELECT * FROM users WHERE id = ?', [this.lastID], (err, newUser) => {
          if (err) {
            console.error("Fetch New User DB error:", err.message);
            return res.status(500).json({ error: 'Database error fetching new user' });
          }

          res.json({
            success: true,
            message: 'Registration successful',
            user: newUser
          });
        });
      });
    }
  });
});

// Get all categories
app.get('/api/categories', (req, res) => {
  db.all('SELECT * FROM categories', [], (err, rows) => {
    if (err) {
      console.error("Get Categories DB error:", err.message);
      return res.status(500).json({ error: 'Failed to retrieve categories' });
    }
    res.json(rows);
  });
});

// Get menu items by category
app.get('/api/menu/:categoryId', (req, res) => {
  const { categoryId } = req.params;

  // Validate categoryId is a number
   if (isNaN(categoryId)) {
     return res.status(400).json({ error: 'Invalid category ID format' });
   }

  db.all('SELECT * FROM menu_items WHERE category_id = ?', [categoryId], (err, rows) => {
    if (err) {
      console.error("Get Menu by Category DB error:", err.message);
      return res.status(500).json({ error: 'Failed to retrieve menu items for category' });
    }
    res.json(rows);
  });
});

// Get all menu items
app.get('/api/menu', (req, res) => {
  db.all('SELECT m.*, c.name as category_name FROM menu_items m JOIN categories c ON m.category_id = c.id', [], (err, rows) => {
    if (err) {
      console.error("Get All Menu DB error:", err.message);
      return res.status(500).json({ error: 'Failed to retrieve all menu items' });
    }
    res.json(rows);
  });
});

// Create new order
app.post('/api/orders', (req, res) => {
  const { userId, items, totalAmount } = req.body;

  if (!userId || !items || !Array.isArray(items) || items.length === 0 || totalAmount === undefined || typeof totalAmount !== 'number') {
    return res.status(400).json({ error: 'Invalid order data: User ID, non-empty items array, and total amount are required.' });
  }
   // Add validation for item structure within the array if needed

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    const orderStmt = db.prepare('INSERT INTO orders (user_id, total_amount) VALUES (?, ?)');
    orderStmt.run(userId, totalAmount, function(err) {
      if (err) {
        db.run('ROLLBACK');
        console.error("Create Order DB error:", err.message);
        return res.status(500).json({ error: 'Failed to create order record' });
      }

      const orderId = this.lastID;
      const itemStmt = db.prepare('INSERT INTO order_items (order_id, item_id, quantity, price) VALUES (?, ?, ?, ?)');
      let itemsProcessed = 0;
      let transactionError = null;

      items.forEach(item => {
         // Basic validation for each item
        if (!item || typeof item.id !== 'number' || typeof item.quantity !== 'number' || item.quantity <= 0 || typeof item.price !== 'number') {
             if (!transactionError) transactionError = new Error(`Invalid item data in order: ${JSON.stringify(item)}`);
             return; // Skip this invalid item
        }
        itemStmt.run(orderId, item.id, item.quantity, item.price, function(itemErr) {
          itemsProcessed++;
          if (itemErr && !transactionError) {
            transactionError = itemErr; // Capture the first error
          }

          // Check if all items are processed (or an error occurred)
          if (itemsProcessed === items.length) {
             itemStmt.finalize(finalizeErr => { // Finalize statement inside the callback
                if (finalizeErr && !transactionError) transactionError = finalizeErr;

                if (transactionError) {
                    db.run('ROLLBACK');
                    console.error("Create Order Items DB error:", transactionError.message);
                    return res.status(500).json({ error: 'Failed to add items to order. Order rolled back.' });
                } else {
                    db.run('COMMIT');
                    res.json({
                        success: true,
                        message: 'Order placed successfully',
                        orderId
                    });
                }
             });
          }
        });
      });
      // Handle case where the loop finishes but itemStmt wasn't run (e.g., empty items array after filtering)
       if (items.length === 0 || itemsProcessed === 0 && !transactionError) {
          itemStmt.finalize(err => { // Still need to finalize if never run
             db.run('ROLLBACK'); // Rollback if no valid items were processed
             return res.status(400).json({ error: 'Order contained no valid items.' });
          });
       }
    });
    orderStmt.finalize(); // Finalize the order statement
  });
});

// Submit feedback
app.post('/api/feedback', (req, res) => {
  const { userId, rating, comment } = req.body;

  if (!userId || typeof userId !== 'number' || !rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'User ID and a valid rating (1-5) are required' });
  }

  db.run(
    'INSERT INTO feedback (user_id, rating, comment) VALUES (?, ?, ?)',
    [userId, rating, comment || ''], // Ensure comment is at least an empty string
    function(err) {
      if (err) {
        console.error("Submit Feedback DB error:", err.message);
        // Check for foreign key constraint error if user doesn't exist
         if (err.message.includes('FOREIGN KEY constraint failed')) {
             return res.status(400).json({ error: 'Invalid User ID provided for feedback.' });
         }
        return res.status(500).json({ error: 'Failed to submit feedback' });
      }

      res.json({
        success: true,
        message: 'Feedback submitted successfully',
        feedbackId: this.lastID
      });
    }
  );
});

// Get user orders with items
app.get('/api/orders/:userId', (req, res) => {
  const { userId } = req.params;
   if (isNaN(userId)) {
     return res.status(400).json({ error: 'Invalid user ID format' });
   }

  db.all(
    `SELECT o.id, o.total_amount, o.status, o.created_at,
      ( SELECT
          json_group_array(
            json_object(
              'id', oi.id,
              'name', mi.name,
              'price', oi.price,
              'quantity', oi.quantity
            )
          )
        FROM order_items oi
        JOIN menu_items mi ON oi.item_id = mi.id
        WHERE oi.order_id = o.id
      ) as items
    FROM orders o
    WHERE o.user_id = ?
    ORDER BY o.created_at DESC`,
    [userId],
    (err, rows) => {
      if (err) {
        console.error("Get User Orders DB error:", err.message);
        return res.status(500).json({ error: 'Failed to retrieve user orders' });
      }

      // Parse the JSON string into actual JSON arrays
      rows.forEach(row => {
        try {
          // Items might be null if an order has no items (shouldn't happen with current logic, but safer)
          row.items = row.items ? JSON.parse(row.items) : [];
        } catch (e) {
          console.error('Error parsing order items JSON:', e, ' Raw data:', row.items);
          row.items = []; // Default to empty array on parsing error
        }
      });

      res.json(rows);
    }
  );
});

// Get order by ID (Added for completeness, similar to original)
app.get('/api/order/:orderId', (req, res) => {
    const { orderId } = req.params;
     if (isNaN(orderId)) {
         return res.status(400).json({ error: 'Invalid order ID format' });
     }

    db.get('SELECT * FROM orders WHERE id = ?', [orderId], (err, order) => {
        if (err) {
            console.error("Get Order by ID DB error:", err.message);
            return res.status(500).json({ error: 'Failed to retrieve order' });
        }

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Get order items
        db.all(
            `SELECT oi.*, mi.name, mi.description
             FROM order_items oi
             JOIN menu_items mi ON oi.item_id = mi.id
             WHERE oi.order_id = ?`,
            [orderId],
            (err, items) => {
                if (err) {
                     console.error("Get Order Items DB error:", err.message);
                    return res.status(500).json({ error: 'Failed to retrieve order items' });
                }
                order.items = items;
                res.json(order);
            }
        );
    });
});

 // Update order status (Added for completeness, similar to original)
app.put('/api/orders/:orderId/status', (req, res) => {
    const { orderId } = req.params;
    const { status } = req.body;

     if (isNaN(orderId)) {
         return res.status(400).json({ error: 'Invalid order ID format' });
     }
    if (!status || typeof status !== 'string') {
        return res.status(400).json({ error: 'Status is required and must be a string' });
    }
     // Optional: Add validation for allowed status values
     // const allowedStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
     // if (!allowedStatuses.includes(status)) {
     //    return res.status(400).json({ error: 'Invalid status value provided' });
     // }

    db.run(
        'UPDATE orders SET status = ? WHERE id = ?',
        [status, orderId],
        function(err) {
            if (err) {
                console.error("Update Order Status DB error:", err.message);
                return res.status(500).json({ error: 'Failed to update order status' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ error: 'Order not found' });
            }

            res.json({
                success: true,
                message: 'Order status updated successfully'
            });
        }
    );
});

 // Get popular items (Added for completeness, similar to original)
app.get('/api/popular-items', (req, res) => {
    db.all(
        `SELECT mi.id, mi.name, mi.price, mi.image, mi.is_veg,
                COUNT(oi.id) as order_count
         FROM menu_items mi
         JOIN order_items oi ON mi.id = oi.item_id
         GROUP BY mi.id
         ORDER BY order_count DESC
         LIMIT 5`,
        [],
        (err, rows) => {
            if (err) {
                console.error("Get Popular Items DB error:", err.message);
                return res.status(500).json({ error: 'Failed to retrieve popular items' });
            }
            res.json(rows);
        }
    );
});

 // Get all feedback (Added for completeness, similar to original)
app.get('/api/feedback', (req, res) => {
    db.all(
        `SELECT f.*, u.name as user_name
         FROM feedback f
         JOIN users u ON f.user_id = u.id
         ORDER BY f.created_at DESC`,
        [],
        (err, rows) => {
            if (err) {
                console.error("Get All Feedback DB error:", err.message);
                return res.status(500).json({ error: 'Failed to retrieve feedback' });
            }
            res.json(rows);
        }
    );
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

 // Utility endpoint for database statistics (Added for completeness, similar to original)
app.get('/api/stats', async (req, res) => {
    const stats = {};
    try {
        const userCount = await new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) as count FROM users', [], (err, row) => err ? reject(err) : resolve(row.count));
        });
        stats.users = userCount;

        const orderCount = await new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) as count FROM orders', [], (err, row) => err ? reject(err) : resolve(row.count));
        });
        stats.orders = orderCount;

         const menuItemCount = await new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) as count FROM menu_items', [], (err, row) => err ? reject(err) : resolve(row.count));
        });
        stats.menuItems = menuItemCount;

        const totalRevenue = await new Promise((resolve, reject) => {
             db.get('SELECT SUM(total_amount) as revenue FROM orders WHERE status != ?', ['cancelled'], (err, row) => err ? reject(err) : resolve(row.revenue)); // Example: Exclude cancelled orders from revenue
        });
        stats.totalRevenue = totalRevenue || 0;

        res.json(stats);
    } catch (err) {
         console.error("Get Stats DB error:", err.message);
        res.status(500).json({ error: 'Failed to retrieve database statistics' });
    }
});

// Generic Error handling middleware (Keep at the end)
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err.stack);
  res.status(500).json({
    error: 'Something went wrong on the server!',
    // Provide more detail only in development
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});


// Catch-all route to serve the frontend's index.html
// This should come after all API routes
app.get('*', (req, res) => {
  // Check if the request looks like an API call based on path or headers
  if (req.path.startsWith('/api/') || req.headers.accept && req.headers.accept.includes('application/json')) {
      // If it looks like an API call that wasn't caught, return 404
      return res.status(404).json({ error: 'API endpoint not found' });
  }
  // Otherwise, serve the frontend
  res.sendFile(path.join(__dirname, 'public', 'index.html'), (err) => {
     if (err) {
         console.error("Error sending index.html:", err);
         res.status(err.status || 500).end();
     }
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Graceful shutdown: Close database connection on process exit
process.on('SIGINT', () => {
  console.log('\nCaught interrupt signal. Shutting down gracefully...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Closed the database connection.');
    }
    process.exit(err ? 1 : 0);
  });
});

process.on('SIGTERM', () => {
    console.log('\nCaught termination signal. Shutting down gracefully...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Closed the database connection.');
        }
        process.exit(err ? 1 : 0);
    });
});