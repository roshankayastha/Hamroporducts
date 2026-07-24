const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'hamro_super_secret_key_123';

// Postgres Connection Pool (Vercel may use different env var names)
const connectionString = process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hamro';
const isProduction = !!(process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL);
const pool = new Pool({
  connectionString,
  ssl: isProduction ? { rejectUnauthorized: false } : undefined
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

async function createTablesAndSeed() {
  try {
    // Create Products Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        price NUMERIC NOT NULL,
        rating NUMERIC DEFAULT 5.0,
        reviews INTEGER DEFAULT 0,
        image TEXT,
        description TEXT,
        tag TEXT,
        specs TEXT
      )
    `);

    // Create Orders Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        customer_name TEXT NOT NULL,
        customer_email TEXT NOT NULL,
        address TEXT NOT NULL,
        city TEXT NOT NULL,
        zip TEXT NOT NULL,
        total NUMERIC NOT NULL,
        items TEXT NOT NULL,
        status TEXT DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create Users Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'customer'
      )
    `);

    // Seed default admin user
    const userRes = await pool.query("SELECT COUNT(*) as count FROM users");
    if (parseInt(userRes.rows[0].count) === 0) {
      const hash = await bcrypt.hash('password123', 10);
      await pool.query("INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)", ['Admin', 'admin@hamro.com', hash, 'admin']);
      console.log('Default admin created: admin@hamro.com / password123');
    }

    // Check if seeding is needed
    const prodRes = await pool.query("SELECT COUNT(*) as count FROM products");
    if (parseInt(prodRes.rows[0].count) === 0) {
      console.log('Seeding initial products data...');
      const initialProducts = [
        {
          name: "Himalayan Golden Needle Tea",
          category: "Tea & Coffee",
          price: 18.99,
          rating: 4.9,
          reviews: 124,
          image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=800&q=80",
          description: "Hand-plucked from the high-altitude gardens of Ilam, Nepal. This rare golden-tipped black tea offers a smooth, sweet flavor profile with subtle notes of honey and roasted malt.",
          tag: "Best Seller",
          specs: JSON.stringify({ origin: "Ilam, Nepal (Altitude: 6,000 ft)", weight: "100g (Approx. 40 cups)", ingredients: "100% Organic Black Tea", caffeine: "Medium" })
        },
        {
          name: "Everest Highland Organic Coffee",
          category: "Tea & Coffee",
          price: 24.50,
          rating: 4.8,
          reviews: 98,
          image: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=800&q=80",
          description: "Grown in the foothills of the Himalayas, this single-origin Arabica coffee is shade-grown and wet-processed. It features a full body with notes of dark chocolate and orange zest peel.",
          tag: "Organic",
          specs: JSON.stringify({ origin: "Nuwakot, Nepal (Altitude: 4,500 ft)", weight: "250g (Whole Beans)", roast: "Medium-Dark", profile: "Low acidity, chocolaty finish" })
        },
        {
          name: "Wild Himalayan Cliff Honey",
          category: "Gourmet",
          price: 34.99,
          rating: 5.0,
          reviews: 215,
          image: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=800&q=80",
          description: "Sourced from the cliffs of Central Nepal, harvested by traditional Gurung honey hunters. This wild multi-floral honey has a rich amber color and contains unique botanical compounds.",
          tag: "Rare Find",
          specs: JSON.stringify({ origin: "Kaski Cliffs, Nepal", weight: "200g", type: "Raw, Unpasteurized", harvest: "Spring Season" })
        },
        {
          name: "Coarse Himalayan Pink Salt Rocks",
          category: "Gourmet",
          price: 8.99,
          rating: 4.7,
          reviews: 84,
          image: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80",
          description: "Pure rock salt containing 84 essential minerals. Sourced directly from Himalayan foothills, perfect for grinders, gourmet cooking, and salt blocks.",
          tag: "Essential",
          specs: JSON.stringify({ origin: "Himalayan Region", weight: "500g", processing: "Hand-mined, washed", additives: "None (100% natural)" })
        },
        {
          name: "Handwoven Pashmina Cashmere Shawl",
          category: "Artisanal",
          price: 110.00,
          rating: 4.9,
          reviews: 62,
          image: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=800&q=80",
          description: "Spun from the soft undercoat of Himalayan Chyangra mountain goats, hand-loomed in Kathmandu. Incredibly soft, featherlight, yet warm enough for cold climates.",
          tag: "Premium",
          specs: JSON.stringify({ origin: "Kathmandu Valley", material: "70% Pashmina, 30% Silk blend", dimensions: "200cm x 70cm", care: "Dry clean only" })
        },
        {
          name: "Tibetan Brass Meditation Singing Bowl",
          category: "Artisanal",
          price: 49.99,
          rating: 4.8,
          reviews: 147,
          image: "https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=800&q=80",
          description: "Hand-hammered brass singing bowl designed for meditation, yoga, and sound healing therapy. Includes a wooden striker mallet and hand-sewn ring cushion.",
          tag: "Best Seller",
          specs: JSON.stringify({ origin: "Patan Craft Colony", diameter: "12cm", weight: "450g", frequency: "Heart Chakra (F Note)" })
        },
        {
          name: "Organic Himalayan Cardamom Pods",
          category: "Gourmet",
          price: 12.99,
          rating: 4.6,
          reviews: 53,
          image: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=800&q=80",
          description: "High-grade large black cardamom, smoky and intensely aromatic. A staple spice grown in eastern hills of Nepal, dried over traditional wood-fired ovens.",
          tag: "Spices",
          specs: JSON.stringify({ origin: "Taplejung, Nepal", weight: "80g", packaging: "Resealable eco-bag", drying: "Wood fire smoked" })
        },
        {
          name: "Artisanal Wool Felt Coaster Set",
          category: "Artisanal",
          price: 15.99,
          rating: 4.7,
          reviews: 79,
          image: "https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=800&q=80",
          description: "A colorful set of 4 round coasters made from 100% pure New Zealand wool, hand-felted by women artisans in Nepal. Naturally water-resistant and heat insulating.",
          tag: "Artisan Co-Op",
          specs: JSON.stringify({ origin: "Lalitpur Women Group", material: "100% Organic Wool", quantity: "Set of 4 pieces", diameter: "10cm" })
        }
      ];

      const query = `
        INSERT INTO products (name, category, price, rating, reviews, image, description, tag, specs)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;
      for (const prod of initialProducts) {
        await pool.query(query, [prod.name, prod.category, prod.price, prod.rating, prod.reviews, prod.image, prod.description, prod.tag, prod.specs]);
      }
      console.log('Database seeded successfully.');
    }
  } catch (err) {
    console.error('Error initializing database:', err);
  }
}

// Ensure tables exist on boot
createTablesAndSeed();

// Auth Middleware
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

// REST APIs
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });

  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query("INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, 'customer') RETURNING id", [name, email, hash]);
    const user = { id: result.rows[0].id, name, email, role: 'customer' };
    const token = jwt.sign(user, JWT_SECRET);
    res.json({ message: 'User registered', token, user });
  } catch (err) {
    res.status(400).json({ error: 'Email already exists' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    
    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });
    
    const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role };
    const token = jwt.sign(safeUser, JWT_SECRET);
    res.json({ message: 'Logged in', token, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM products");
    const formatted = result.rows.map(row => ({
      ...row,
      specs: row.specs ? JSON.parse(row.specs) : {}
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', authenticateToken, isAdmin, async (req, res) => {
  const { name, category, price, rating, reviews, image, description, tag, specs } = req.body;
  if (!name || !category || !price) return res.status(400).json({ error: 'Required fields missing' });
  
  const specsStr = specs ? (typeof specs === 'string' ? specs : JSON.stringify(specs)) : '{}';
  
  try {
    const result = await pool.query(`
      INSERT INTO products (name, category, price, rating, reviews, image, description, tag, specs)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id
    `, [name, category, price, rating || 5.0, reviews || 0, image, description, tag, specsStr]);
    res.status(201).json({ message: 'Product added', productId: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', authenticateToken, isAdmin, async (req, res) => {
  const productId = req.params.id;
  const { name, category, price, rating, reviews, image, description, tag, specs } = req.body;

  try {
    const prodRes = await pool.query("SELECT * FROM products WHERE id = $1", [productId]);
    if (prodRes.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    
    const row = prodRes.rows[0];
    const updatedName = name || row.name;
    const updatedCategory = category || row.category;
    const updatedPrice = price !== undefined ? price : row.price;
    const updatedRating = rating !== undefined ? rating : row.rating;
    const updatedReviews = reviews !== undefined ? reviews : row.reviews;
    const updatedImage = image !== undefined ? image : row.image;
    const updatedDescription = description !== undefined ? description : row.description;
    const updatedTag = tag !== undefined ? tag : row.tag;
    const updatedSpecs = specs ? (typeof specs === 'string' ? specs : JSON.stringify(specs)) : row.specs;

    await pool.query(`
      UPDATE products
      SET name = $1, category = $2, price = $3, rating = $4, reviews = $5, image = $6, description = $7, tag = $8, specs = $9
      WHERE id = $10
    `, [updatedName, updatedCategory, updatedPrice, updatedRating, updatedReviews, updatedImage, updatedDescription, updatedTag, updatedSpecs, productId]);
    
    res.json({ message: 'Product updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM products WHERE id = $1", [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', async (req, res) => {
  const { customer_name, customer_email, address, city, zip, total, items } = req.body;
  if (!customer_name || !customer_email || !address || !items || !total) {
    return res.status(400).json({ error: 'Missing order info' });
  }
  const itemsStr = typeof items === 'string' ? items : JSON.stringify(items);
  
  try {
    const result = await pool.query(`
      INSERT INTO orders (customer_name, customer_email, address, city, zip, total, items)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
    `, [customer_name, customer_email, address, city, zip, total, itemsStr]);
    res.status(201).json({ message: 'Order submitted', orderId: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM orders ORDER BY created_at DESC");
    const formatted = result.rows.map(row => ({
      ...row,
      items: JSON.parse(row.items)
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// In production (Vercel), static files are served from public/ automatically.
// In local dev, Express serves them via express.static above.

// Vercel Serverless Export or Local Listen
module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}
