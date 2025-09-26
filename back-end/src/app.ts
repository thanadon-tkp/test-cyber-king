import express, { Request, Response } from "express";
import morgan from "morgan";
import { Pool } from "../node_modules/@types/pg";

const app = express();

app.use(morgan("dev"));
app.use(express.json());

const pool = new Pool({
  user: "user",
  host: "localhost",
  database: "test_db",
  password: "password",
  port: 5432,
});

// test connect
pool.connect((err: any) => {
  if (err) throw err;
  console.log("Connected to PostgreSQL!");
});

app.post("/products", async (req: Request, res: Response) => {
  const { body } = req;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { sku, name, stock } = body;
    const result = await client.query(
      `INSERT INTO orders(sku, name, stock)
       VALUES ($1, $2, $3) RETURNING *`,
      [sku, name, stock]
    );

    await client.query("COMMIT");

    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
  } finally {
    client.release();
  }

  res.status(400);
});

app.post("/orders", async (req: Request, res: Response): Promise<void> => {
  const { body } = req;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { id, qty } = body;

    const { rows } = await client.query(
      `select stock from orders where order_id = $1`,
      [id]
    );
    const items = rows[0]?.stock;
    if (!items) {
      res.status(409).json({ message: "Out of stock." });
      return;
    }

    if (qty > items) {
      res.status(409).json({ message: "items not enough.", in_stock: items });
      return;
    }

    const result = await client.query(
      `UPDATE orders SET stock = $2, WHERE order_id = $1 RETURNING *`,
      [id, items - qty]
    );

    console.log("result:", result)

    await client.query("COMMIT");

    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
  } finally {
    client.release();
  }

  res.status(400);
});

// app.delete("/orders:id", (req: Request, res: Response) => {
//   const { id } = req.params;

//   res.json({ id });
// });

export default app;
