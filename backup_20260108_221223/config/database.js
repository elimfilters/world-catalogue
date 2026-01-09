const fs = require("fs");
const path = require("path");

const DB_FILE = path.join(__dirname, "products.json");

class JSONDatabase {
  constructor() {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify({ products: [], nextId: 1 }));
    }
  }

  read() {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  }

  write(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  }

  async query(sql, params) {
    const data = this.read();
    
    if (sql.includes("SELECT")) {
      return [data.products];
    }
    
    if (sql.includes("INSERT")) {
      const [title, description, price, category_id, user_id, brand, color, material, size, condition, model] = params;
      const product = {
        id: data.nextId++,
        title, description, price, category_id, user_id,
        brand, color, material, size, condition, model,
        created_at: new Date().toISOString()
      };
      data.products.push(product);
      this.write(data);
      return [{ insertId: product.id }];
    }
    
    if (sql.includes("UPDATE")) {
      const id = params[params.length - 1];
      const productIndex = data.products.findIndex(p => p.id == id);
      if (productIndex !== -1) {
        const [title, description, price, category_id, brand, color, material, size, condition, model] = params;
        data.products[productIndex] = { ...data.products[productIndex], title, description, price, category_id, brand, color, material, size, condition, model };
        this.write(data);
      }
      return [{ affectedRows: 1 }];
    }
    
    if (sql.includes("DELETE")) {
      const id = params[0];
      data.products = data.products.filter(p => p.id != id);
      this.write(data);
      return [{ affectedRows: 1 }];
    }
  }
}

module.exports = new JSONDatabase();
