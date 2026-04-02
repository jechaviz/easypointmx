# Shopify Integration Reference Implementation

This directory contains a reference implementation for integrating Easypoint with Shopify.

## Structure
- `/extension`: (Sample) Checkout UI Extension for the Map Picker.
- `server.js`: Node/Express backend for handling OAuth and Webhooks.

## Key Features
- **Carrier Service API:** Register Easypoint as a custom shipping rate provider.
- **Webhook Listeners:** Automatically create shipments in the Easypoint API when an order is paid.
- **Checkout UI Extensions:** Custom map trigger in the Shopify checkout page.

## Getting Started
1. Install Shopify CLI.
2. Create a new app: `shopify app init`.
3. Use the code in `server.js` as your backend template.
