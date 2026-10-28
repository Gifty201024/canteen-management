
import { useEffect, useState } from "react";

const categories = [
    "Drinks",
    "Biscuits",
    "Chocolates",
    "Tiffins",
    "Lunch",
    "Snacks"
];

function App() {
    const [menu, setMenu] = useState([]);
    const [quantities, setQuantities] = useState({});
    const [customerName, setCustomerName] = useState("");
    const [paymentMethod, setPaymentMethod] =
        useState("Cash on Delivery");
    const [showPayment, setShowPayment] = useState(false);
    const [message, setMessage] = useState("");
    const [receipt, setReceipt] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetch("http://localhost:5000/menu")
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Unable to load menu");
                }
                return response.json();
            })
            .then((data) => setMenu(data))
            .catch(() => {
                setMessage(
                    "Cannot load menu. Please check your backend."
                );
            })
            .finally(() => setLoading(false));
    }, []);

    function changeQuantity(id, value) {
        const quantity = Math.max(
            0,
            Math.floor(Number(value) || 0)
        );

        setQuantities((previous) => ({
            ...previous,
            [id]: quantity
        }));

        setMessage("");
        setReceipt(null);
    }

    const selectedItems = menu.filter(
        (item) => (quantities[item.id] || 0) > 0
    );

    const total = selectedItems.reduce(
        (sum, item) =>
            sum + Number(item.price) * quantities[item.id],
        0
    );

    async function placeOrder(event) {
        if (event) {
            event.preventDefault();
        }

        setMessage("");

        if (!customerName.trim()) {
            setMessage("Please enter your name.");
            return;
        }

        if (selectedItems.length === 0) {
            setMessage("Please select at least one item.");
            return;
        }

        // Show the demo payment screen first.
        if (paymentMethod === "Pay Now" && !showPayment) {
            setShowPayment(true);
            return;
        }

        setSubmitting(true);

        try {
            const response = await fetch(
                "http://localhost:5000/orders",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        customer_name: customerName.trim(),
                        payment_method: paymentMethod,
                        items: selectedItems.map((item) => ({
                            id: item.id,
                            quantity: quantities[item.id]
                        }))
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Unable to place order"
                );
            }

            setReceipt(data);
            setMessage(data.message);
            setShowPayment(false);
            setQuantities({});
            setCustomerName("");
        } catch (error) {
            setMessage(
                error.message || "Backend connection failed."
            );
        } finally {
            setSubmitting(false);
        }
    }

    function startNewOrder() {
        setReceipt(null);
        setMessage("");
        setShowPayment(false);
        setQuantities({});
        setCustomerName("");
        setPaymentMethod("Cash on Delivery");
    }

    return (
        <div className="app">
            <header className="header">
                <div className="header-icon">🍽️</div>
                <h1>Canteen Management System</h1>
                <p>Fresh food, tasty snacks and refreshing drinks!</p>
            </header>

            <main className="container">
                <h2>Our Menu</h2>
                <p className="subtitle">
                    Select your favourite items and place your order.
                </p>

                {loading && <p>Loading menu...</p>}

                {!loading && menu.length === 0 && (
                    <p>No menu items found in the database.</p>
                )}

                {categories.map((category) => {
                    const items = menu.filter(
                        (item) => item.category === category
                    );

                    if (items.length === 0) {
                        return null;
                    }

                    return (
                        <section className="category" key={category}>
                            <h3>{category}</h3>

                            <div className="menu-grid">
                                {items.map((item) => (
                                    <div
                                        className="menu-card"
                                        key={item.id}
                                    >
                                        <h4>{item.name}</h4>

                                        <p className="price">
                                            ₹{Number(item.price).toFixed(2)}
                                        </p>

                                        <label>
                                            Quantity
                                            <input
                                                type="number"
                                                min="0"
                                                step="1"
                                                value={
                                                    quantities[item.id] || 0
                                                }
                                                onChange={(event) =>
                                                    changeQuantity(
                                                        item.id,
                                                        event.target.value
                                                    )
                                                }
                                            />
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </section>
                    );
                })}

                <section className="bill">
                    <h2>Your Order</h2>

                    <form onSubmit={placeOrder}>
                        <label className="customer-label">
                            Student / Customer Name
                            <input
                                type="text"
                                value={customerName}
                                onChange={(event) => {
                                    setCustomerName(event.target.value);
                                    setMessage("");
                                }}
                                placeholder="Enter your name"
                                required
                            />
                        </label>

                        {/* PAYMENT OPTIONS */}
                        <div className="payment-options">
                            <h3>Choose Payment Method</h3>

                            <label className="payment-choice">
                                <input
                                    type="radio"
                                    name="payment"
                                    value="Pay Now"
                                    checked={paymentMethod === "Pay Now"}
                                    onChange={() => {
                                        setPaymentMethod("Pay Now");
                                        setShowPayment(false);
                                        setMessage("");
                                    }}
                                />
                                <span>Pay Now (Demo Payment)</span>
                            </label>

                            <label className="payment-choice">
                                <input
                                    type="radio"
                                    name="payment"
                                    value="Cash on Delivery"
                                    checked={
                                        paymentMethod === "Cash on Delivery"
                                    }
                                    onChange={() => {
                                        setPaymentMethod("Cash on Delivery");
                                        setShowPayment(false);
                                        setMessage("");
                                    }}
                                />
                                <span>Cash on Delivery</span>
                            </label>
                        </div>

                        {/* BILL */}
                        {selectedItems.length === 0 ? (
                            <p>No items selected yet.</p>
                        ) : (
                            <div className="bill-items">
                                {selectedItems.map((item) => (
                                    <div
                                        className="bill-row"
                                        key={item.id}
                                    >
                                        <span>
                                            {item.name} × {quantities[item.id]}
                                        </span>

                                        <span>
                                            ₹{(
                                                Number(item.price) *
                                                quantities[item.id]
                                            ).toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="total">
                            <span>Total Amount</span>
                            <span>₹{total.toFixed(2)}</span>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || submitting}
                        >
                            {submitting ? "Processing..." : "Place Order"}
                        </button>
                    </form>

                    {/* DEMO PAYMENT SCREEN */}
                    {showPayment && (
                        <div className="payment-screen">
                            <h3>Demo Payment</h3>

                            <p>
                                Amount to pay: ₹{total.toFixed(2)}
                            </p>

                            <p>
                                This is a demonstration only.
                                No real money will be transferred.
                            </p>

                            <div className="demo-qr">
                                <span>DEMO</span>
                                <p>QR Code Placeholder</p>
                            </div>

                            <button
                                type="button"
                                disabled={submitting}
                                onClick={() => placeOrder()}
                            >
                                Confirm Demo Payment
                            </button>

                            <button
                                type="button"
                                className="cancel-button"
                                onClick={() => setShowPayment(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    )}

                    {message && (
                        <p className="message">{message}</p>
                    )}

                    {/* ORDER CONFIRMATION */}
                    {receipt && (
                        <div className="receipt">
                            <h3>Order Confirmation</h3>

                            <p>Order Number: {receipt.order_id}</p>
                            <p>Customer: {receipt.customer_name}</p>

                            <p>
                                Total Amount: ₹
                                {Number(receipt.total_amount).toFixed(2)}
                            </p>

                            <p>
                                Payment Method: {receipt.payment_method}
                            </p>

                            <p>
                                Payment Status: {receipt.payment_status}
                            </p>

                            {receipt.payment_method === "Pay Now" && (
                                <p>
                                    Demo payment recorded. No real money
                                    was transferred.
                                </p>
                            )}

                            <button
                                type="button"
                                onClick={startNewOrder}
                            >
                                Start New Order
                            </button>
                        </div>
                    )}
                </section>
            </main>

            <footer>
                <p>© Canteen Management System</p>
            </footer>
        </div>
    );
}

export default App;
