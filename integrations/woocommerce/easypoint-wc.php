<?php
/**
 * Plugin Name: Easypoint for WooCommerce
 * Plugin URI: https://easypoint.mx/integrations
 * Description: La red de entrega OOH líder en México. Permite a tus clientes escoger un Punto Easypoint en el checkout.
 * Version: 1.0.0
 * Author: Easypoint Tech Team
 * Author URI: https://easypoint.mx
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// 1. Initialize Shipping Method
add_action( 'woocommerce_shipping_init', 'easypoint_shipping_method_init' );
function easypoint_shipping_method_init() {
    if ( ! class_exists( 'WC_Easypoint_Shipping_Method' ) ) {
        class WC_Easypoint_Shipping_Method extends WC_Shipping_Method {
            public function __construct( $instance_id = 0 ) {
                $this->id                 = 'easypoint_shipping';
                $this->instance_id        = absint( $instance_id );
                $this->method_title       = 'Easypoint';
                $this->method_description = 'Envío a Punto de Recolección Easypoint';
                $this->supports           = array( 'shipping-zones', 'instance-settings', 'instance-settings-modal' );
                $this->init();
            }

            function init() {
                $this->init_form_fields();
                $this->init_settings();
                $this->title = $this->get_option( 'title', 'Recoger en Punto Easypoint' );
                add_action( 'woocommerce_update_options_shipping_' . $this->id, array( $this, 'process_admin_options' ) );
            }

            public function calculate_shipping( $package = array() ) {
                $rate = array(
                    'id'       => $this->get_rate_id(),
                    'label'    => $this->title,
                    'cost'     => $this->get_option( 'cost', '59' ),
                    'package'  => $package,
                );
                $this->add_rate( $rate );
            }

            public function init_form_fields() {
                $this->form_fields = array(
                    'title' => array( 'title' => 'Título', 'type' => 'text', 'default' => 'Recoger en Punto Easypoint' ),
                    'cost'  => array( 'title' => 'Costo Fijo', 'type' => 'number', 'default' => '59' ),
                    'api_key' => array( 'title' => 'API Key', 'type' => 'password' ),
                );
            }
        }
    }
}

add_filter( 'woocommerce_shipping_methods', 'add_easypoint_shipping_method' );
function add_easypoint_shipping_method( $methods ) {
    $methods['easypoint_shipping'] = 'WC_Easypoint_Shipping_Method';
    return $methods;
}

// 2. Map Selector at Checkout
add_action( 'woocommerce_after_shipping_rate', 'easypoint_checkout_map_trigger', 10, 2 );
function easypoint_checkout_map_trigger( $method, $index ) {
    if ( $method->method_id !== 'easypoint_shipping' ) return;
    
    echo '<div id="easypoint-map-trigger" style="margin-top:10px; padding:15px; background:#f0fdf4; border-radius:12px; border:1px solid #84cc16; cursor:pointer;">';
    echo '<strong style="color:#166534;"><i class="bi bi-geo-alt"></i> Seleccionar Punto Easypoint</strong>';
    echo '<p style="font-size:12px; margin:5px 0 0 0; color:#4a5568;">Haz clic para elegir donde recoger tu paquete.</p>';
    echo '</div>';
    
    // Inject logic via script or enqueue
    ?>
    <script>
    document.getElementById('easypoint-map-trigger')?.addEventListener('click', () => {
        // Here we would trigger the Easypoint Map SDK
        alert('Cargando SDK de Mapa Easypoint...');
    });
    </script>
    <?php
}

// 3. Sync to Easypoint API on Order Creation
add_action( 'woocommerce_checkout_order_processed', 'easypoint_sync_order', 10, 3 );
function easypoint_sync_order( $order_id, $posted_data, $order ) {
    $shipping_methods = $order->get_shipping_methods();
    foreach ( $shipping_methods as $method ) {
        if ( $method->get_method_id() === 'easypoint_shipping' ) {
            // Send to API
            // wp_remote_post('https://api.easypoint.mx/v1/shipments', [...]);
            return;
        }
    }
}
