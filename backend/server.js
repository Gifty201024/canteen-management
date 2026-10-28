
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "canteen_db"
});

db.connect((err) => {
    if (err) {
        console.log("Database connection failed:", err.message);
    } else {
        console.log("MySQL connected successfully");
    }
});

// Display all menu items
app.get("/menu", (req, res) => {
    db.query(
        "SELECT * FROM menu_items ORDER BY category, name",
        (err, results) => {
            if (err) {
                return res.status(500).json({
                    message: "Unable to load menu"
                });
            }

            res.json(results);
        }
    );
});

// Place an order and save payment details
app.post("/orders", (req, res) => {
    const { customer_name, items, payment_method } = req.body;

    if (!customer_name?.trim()) {
        return res.status(400).json({
            message: "Please enter your name"
        });
    }

    if (
        !["Pay Now", "Cash on Delivery"].includes(payment_method)
    ) {
        return res.status(400).json({
            message: "Please select a valid payment method"
        });
    }

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
            message: "Please select at least one item"
        });
    }

    const quantities = new Map();

    for (const item of items) {
        if (
            !Number.isInteger(item.id) ||
            !Number.isInteger(item.quantity) ||
            item.quantity < 1
        ) {
            return res.status(400).json({
                message: "Invalid item or quantity"
            });
        }

        quantities.set(
            item.id,
            (quantities.get(item.id) || 0) + item.quantity
        );
    }

    const ids = [...quantities.keys()];
    const placeholders = ids.map(() => "?").join(",");

    db.query(
        `SELECT id, name, price FROM menu_items
         WHERE id IN (${placeholders})`,
        ids,
        (err, menuItems) => {
            if (err) {
                return res.status(500).json({
                    message: "Unable to check menu prices"
                });
            }

            if (menuItems.length !== ids.length) {
                return res.status(400).json({
                    message: "Invalid menu item"
                });
            }

            const orderItems = menuItems.map((item) => ({
                ...item,
                quantity: quantities.get(item.id)
            }));

            const total = orderItems.reduce(
                (sum, item) =>
                    sum + Number(item.price) * item.quantity,
                0
            );

            // This is a classroom demo, not a real payment.
            const payment_status =
                payment_method === "Pay Now"
                    ? "Demo Payment"
                    : "Pending";

            db.beginTransaction((err) => {
                if (err) {
                    return res.status(500).json({
                        message: "Unable to start order"
                    });
                }

                db.query(
                    `INSERT INTO orders
                    (customer_name, total_amount, payment_method, payment_status)
                    VALUES (?, ?, ?, ?)`,
                    [
                        customer_name.trim(),
                        total,
                        payment_method,
                        payment_status
                    ],
                    (err, result) => {
                        if (err) {
                            return db.rollback(() => {
                                res.status(500).json({
                                    message: "Unable to save order"
                                });
                            });
                        }

                        const orderId = result.insertId;

                        const values = orderItems.map((item) => [
                            orderId,
                            item.id,
                            item.quantity,
                            item.price
                        ]);

                        db.query(
                            `INSERT INTO order_items
                            (order_id, item_id, quantity, price)
                            VALUES ?`,
                            [values],
                            (err) => {
                                if (err) {
                                    return db.rollback(() => {
                                        res.status(500).json({
                                            message: "Unable to save order items"
                                        });
                                    });
                                }

                                db.commit((err) => {
                                    if (err) {
                                        return db.rollback(() => {
                                            res.status(500).json({
                                                message: "Unable to complete order"
                                            });
                                        });
                                    }

                                    res.json({
                                        message: "Order placed successfully!",
                                        order_id: orderId,
                                        customer_name: customer_name.trim(),
                                        items: orderItems,
                                        total_amount: total,
                                        payment_method,
                                        payment_status
                                    });
                                });
                            }
                        );
                    }
                );
            });
        }
    );
});

app.listen(5000, () => {
    console.log("Server running on port 5000");
});
