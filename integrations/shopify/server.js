const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const EASYPOINT_API = "http://localhost:8090/api";
const API_KEY = process.env.EASYPOINT_API_KEY;

// 1. Shopify Carrier Service Callback
// Shopify calls this to get shipping rates
app.post('/shipping/rates', async (req, res) => {
    const { origin, destination, items } = req.body.rate;
    
    // Logic: Only offer Easypoint if destination is in Mexico
    if (destination.country !== 'MX') {
        return res.json({ rates: [] });
    }

    res.json({
        rates: [
            {
                service_name: "Recoger en Punto Easypoint",
                service_code: "easypoint_ooh",
                total_price: "5900", // In cents ($59.00 MXN)
                currency: "MXN",
                description: "Envía a un local seguro cerca de ti."
            }
        ]
    });
});

// 2. Order Fulfillment Webhook
// Shopify calls this when an order is created/paid
app.post('/webhooks/order_paid', async (req, res) => {
    const order = req.body;
    
    // Check if customer chose Easypoint
    const shippingLine = order.shipping_lines.find(l => l.code === 'easypoint_ooh');
    if (shippingLine) {
        try {
            // Create shipment in Easypoint System
            await axios.post(`${EASYPOINT_API}/collections/shipments/records`, {
                tracking_id: `MXL${order.order_number}`,
                status: 'pending',
                point_id: order.note_attributes.find(a => a.name === 'easypoint_id')?.value,
                external_id: order.id.toString()
            }, {
                headers: { 'Authorization': `Bearer ${API_KEY}` }
            });
            console.log(`Shipment created for Order #${order.order_number}`);
        } catch (err) {
            console.error("Error creating shipment:", err.message);
        }
    }
    
    res.sendStatus(200);
});

app.listen(process.env.PORT || 3000, () => {
    console.log("Easypoint Shopify Bridge running...");
});
