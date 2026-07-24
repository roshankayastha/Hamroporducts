const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'hamro_super_secret_key_123';
const DB_FILE = path.join(__dirname, 'database.sqlite');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Initialize SQLite Database
const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to local SQLite database.');
    createTablesAndSeed();
  }
});

function createTablesAndSeed() {
  db.serialize(() => {
    // Create Products Table
    db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        price REAL NOT NULL,
        rating REAL DEFAULT 5.0,
        reviews INTEGER DEFAULT 0,
        image TEXT,
        description TEXT,
        tag TEXT,
        specs TEXT
      )
    `);

    // Create Orders Table
    db.run(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT NOT NULL,
        customer_email TEXT NOT NULL,
        address TEXT NOT NULL,
        city TEXT NOT NULL,
        zip TEXT NOT NULL,
        total REAL NOT NULL,
        items TEXT NOT NULL,
        status TEXT DEFAULT 'Pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create Users Table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'customer'
      )
    `);

    // Seed default admin user
    db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
      if (err) return;
      if (row.count === 0) {
        bcrypt.hash('password123', 10, (err, hash) => {
          if (!err) {
            db.run("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)", ['Admin', 'admin@hamro.com', hash, 'admin']);
            console.log('Default admin created: admin@hamro.com / password123');
          }
        });
      }
    });

    // Check if seeding is needed
    db.get("SELECT COUNT(*) as count FROM products", (err, row) => {
      if (err) {
        console.error('Error checking products count:', err.message);
        return;
      }
      
      if (row.count === 0) {
        console.log('Seeding initial products data...');
        const initialProducts = [
          {
            id: 1,
            name: "Himalayan Golden Needle Tea",
            category: "Tea & Coffee",
            price: 18.99,
            rating: 4.9,
            reviews: 124,
            image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=800&q=80",
            description: "Hand-plucked from the high-altitude gardens of Ilam, Nepal. This rare golden-tipped black tea offers a smooth, sweet flavor profile with subtle notes of honey and roasted malt.",
            tag: "Best Seller",
            specs: JSON.stringify({
              origin: "Ilam, Nepal (Altitude: 6,000 ft)",
              weight: "100g (Approx. 40 cups)",
              ingredients: "100% Organic Black Tea",
              caffeine: "Medium"
            })
          },
          {
            id: 2,
            name: "Everest Highland Organic Coffee",
            category: "Tea & Coffee",
            price: 24.50,
            rating: 4.8,
            reviews: 98,
            image: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=800&q=80",
            description: "Grown in the foothills of the Himalayas, this single-origin Arabica coffee is shade-grown and wet-processed. It features a full body with notes of dark chocolate and orange zest peel.",
            tag: "Organic",
            specs: JSON.stringify({
              origin: "Nuwakot, Nepal (Altitude: 4,500 ft)",
              weight: "250g (Whole Beans)",
              roast: "Medium-Dark",
              profile: "Low acidity, chocolaty finish"
            })
          },
          {
            id: 3,
            name: "Wild Himalayan Cliff Honey",
            category: "Gourmet",
            price: 34.99,
            rating: 5.0,
            reviews: 215,
            image: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=800&q=80",
            description: "Sourced from the cliffs of Central Nepal, harvested by traditional Gurung honey hunters. This wild multi-floral honey has a rich amber color and contains unique botanical compounds.",
            tag: "Rare Find",
            specs: JSON.stringify({
              origin: "Kaski Cliffs, Nepal",
              weight: "200g",
              type: "Raw, Unpasteurized",
              harvest: "Spring Season"
            })
          },
          {
            id: 4,
            name: "Coarse Himalayan Pink Salt Rocks",
            category: "Gourmet",
            price: 8.99,
            rating: 4.7,
            reviews: 84,
            image: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80",
            description: "Pure rock salt containing 84 essential minerals. Sourced directly from Himalayan foothills, perfect for grinders, gourmet cooking, and salt blocks.",
            tag: "Essential",
            specs: JSON.stringify({
              origin: "Himalayan Region",
              weight: "500g",
              processing: "Hand-mined, washed",
              additives: "None (100% natural)"
            })
          },
          {
            id: 5,
            name: "Handwoven Pashmina Cashmere Shawl",
            category: "Artisanal",
            price: 110.00,
            rating: 4.9,
            reviews: 62,
            image: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=800&q=80",
            description: "Spun from the soft undercoat of Himalayan Chyangra mountain goats, hand-loomed in Kathmandu. Incredibly soft, featherlight, yet warm enough for cold climates.",
            tag: "Premium",
            specs: JSON.stringify({
              origin: "Kathmandu Valley",
              material: "70% Pashmina, 30% Silk blend",
              dimensions: "200cm x 70cm",
              care: "Dry clean only"
            })
          },
          {
            id: 6,
            name: "Tibetan Brass Meditation Singing Bowl",
            category: "Artisanal",
            price: 49.99,
            rating: 4.8,
            reviews: 147,
            image: "https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=800&q=80",
            description: "Hand-hammered brass singing bowl designed for meditation, yoga, and sound healing therapy. Includes a wooden striker mallet and hand-sewn ring cushion.",
            tag: "Best Seller",
            specs: JSON.stringify({
              origin: "Patan Craft Colony",
              diameter: "12cm",
              weight: "450g",
              frequency: "Heart Chakra (F Note)"
            })
          },
          {
            id: 7,
            name: "Organic Himalayan Cardamom Pods",
            category: "Gourmet",
            price: 12.99,
            rating: 4.6,
            reviews: 53,
            image: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=800&q=80",
            description: "High-grade large black cardamom, smoky and intensely aromatic. A staple spice grown in eastern hills of Nepal, dried over traditional wood-fired ovens.",
            tag: "Spices",
            specs: JSON.stringify({
              origin: "Taplejung, Nepal",
              weight: "80g",
              packaging: "Resealable eco-bag",
              drying: "Wood fire smoked"
            })
          },
          {
            id: 8,
            name: "Artisanal Wool Felt Coaster Set",
            category: "Artisanal",
            price: 15.99,
            rating: 4.7,
            reviews: 79,
            image: "https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=800&q=80",
            description: "A colorful set of 4 round coasters made from 100% pure New Zealand wool, hand-felted by women artisans in Nepal. Naturally water-resistant and heat insulating.",
            tag: "Artisan Co-Op",
            specs: JSON.stringify({
              origin: "Lalitpur Women Group",
              material: "100% Organic Wool",
              quantity: "Set of 4 pieces",
              diameter: "10cm"
            })
          }
        ];

        const stmt = db.prepare(`
          INSERT INTO products (id, name, category, price, rating, reviews, image, description, tag, specs)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        initialProducts.forEach(prod => {
          stmt.run(prod.id, prod.name, prod.category, prod.price, prod.rating, prod.reviews, prod.image, prod.description, prod.tag, prod.specs);
        });
        stmt.finalize();
        console.log('Database seeded successfully.');
      }
    });
  });
}

// REST API Endpoints

// Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

function isAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.sendStatus(403);
  }
}

// --- Auth Routes ---
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });

  bcrypt.hash(password, 10, (err, hash) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    
    db.run("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", [name, email, hash], function(err) {
      if (err) return res.status(400).json({ error: 'Email already exists' });
      
      const token = jwt.sign({ id: this.lastID, name, email, role: 'customer' }, JWT_SECRET);
      res.json({ message: 'User registered', token, user: { name, email, role: 'customer' } });
    });
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  db.get("SELECT * FROM users WHERE email = ?", [email], (err, user) => {
    if (err || !user) return res.status(401).json({ error: 'Invalid credentials' });
    
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err || !isMatch) return res.status(401).json({ error: 'Invalid credentials' });
      
      const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, JWT_SECRET);
      res.json({ message: 'Logged in', token, user: { name: user.name, email: user.email, role: user.role } });
    });
  });
});

// 1. Get all products
app.get('/api/products', (req, res) => {
  db.all("SELECT * FROM products", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    // Parse specs string back to JSON object
    const formatted = rows.map(row => ({
      ...row,
      specs: row.specs ? JSON.parse(row.specs) : {}
    }));
    res.json(formatted);
  });
});

// 2. Add a new product (Bulk / Single additions supported)
app.post('/api/products', authenticateToken, isAdmin, (req, res) => {
  const { id, name, category, price, rating, reviews, image, description, tag, specs } = req.body;
  if (!name || !category || !price) {
    return res.status(400).json({ error: 'Name, Category, and Price are required fields.' });
  }

  // Generate ID if not provided
  const queryId = id || Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);
  const specsStr = specs ? (typeof specs === 'string' ? specs : JSON.stringify(specs)) : '{}';

  const stmt = db.prepare(`
    INSERT INTO products (id, name, category, price, rating, reviews, image, description, tag, specs)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(queryId, name, category, parseFloat(price), parseFloat(rating || 5.0), parseInt(reviews || 0), image, description, tag, specsStr, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ message: 'Product added successfully.', productId: queryId });
  });
  stmt.finalize();
});

// 3. Edit a product
app.put('/api/products/:id', authenticateToken, isAdmin, (req, res) => {
  const productId = parseInt(req.params.id);
  const { name, category, price, rating, reviews, image, description, tag, specs } = req.body;

  db.get("SELECT * FROM products WHERE id = ?", [productId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const updatedName = name || row.name;
    const updatedCategory = category || row.category;
    const updatedPrice = price !== undefined ? parseFloat(price) : row.price;
    const updatedRating = rating !== undefined ? parseFloat(rating) : row.rating;
    const updatedReviews = reviews !== undefined ? parseInt(reviews) : row.reviews;
    const updatedImage = image !== undefined ? image : row.image;
    const updatedDescription = description !== undefined ? description : row.description;
    const updatedTag = tag !== undefined ? tag : row.tag;
    const updatedSpecs = specs ? (typeof specs === 'string' ? specs : JSON.stringify(specs)) : row.specs;

    db.run(`
      UPDATE products
      SET name = ?, category = ?, price = ?, rating = ?, reviews = ?, image = ?, description = ?, tag = ?, specs = ?
      WHERE id = ?
    `, [updatedName, updatedCategory, updatedPrice, updatedRating, updatedReviews, updatedImage, updatedDescription, updatedTag, updatedSpecs, productId], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Product updated successfully.' });
    });
  });
});

// 4. Delete a product (Add/remove bulk helper)
app.delete('/api/products/:id', authenticateToken, isAdmin, (req, res) => {
  const productId = parseInt(req.params.id);
  db.run("DELETE FROM products WHERE id = ?", [productId], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    res.json({ message: 'Product deleted successfully.' });
  });
});

// 5. Submit a new order
app.post('/api/orders', (req, res) => {
  const { customer_name, customer_email, address, city, zip, total, items } = req.body;
  if (!customer_name || !customer_email || !address || !items || !total) {
    return res.status(400).json({ error: 'Required order information is missing.' });
  }

  const itemsStr = typeof items === 'string' ? items : JSON.stringify(items);

  const stmt = db.prepare(`
    INSERT INTO orders (customer_name, customer_email, address, city, zip, total, items)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(customer_name, customer_email, address, city, zip, parseFloat(total), itemsStr, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ message: 'Order submitted successfully.', orderId: this.lastID });
  });
  stmt.finalize();
});

// 6. Get all orders
app.get('/api/orders', authenticateToken, isAdmin, (req, res) => {
  db.all("SELECT * FROM orders ORDER BY created_at DESC", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    const formatted = rows.map(row => ({
      ...row,
      items: JSON.parse(row.items)
    }));
    res.json(formatted);
  });
});

// Fallback to index.html for frontend routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
