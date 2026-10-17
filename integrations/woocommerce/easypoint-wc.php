<?php
/**
 * Plugin Name: Easypoint para WooCommerce
 * Plugin URI: https://easypoint.mx/website/#/afiliate?t=ecommerce
 * Description: Tus clientes eligen un punto Easypoint en el checkout y el pedido se registra solo como envío hacia ese punto (API v1).
 * Version: 2.0.0
 * Author: Easypoint
 * Requires PHP: 8.0
 */

if ( ! defined( 'ABSPATH' ) ) exit;

const EASYPOINT_DEFAULT_API = 'https://easypoint.mx/api';

/** Llamada a la API v1 de Easypoint con la llave del socio. */
function easypoint_api( $method, $path, $body = null ) {
    $opts = get_option( 'woocommerce_easypoint_shipping_settings', array() );
    $base = rtrim( $opts['api_url'] ?? EASYPOINT_DEFAULT_API, '/' );
    $args = array( 'method' => $method, 'timeout' => 12, 'headers' => array( 'X-API-Key' => $opts['api_key'] ?? '', 'Content-Type' => 'application/json' ) );
    if ( $body !== null ) $args['body'] = wp_json_encode( $body );
    $res = wp_remote_request( $base . $path, $args );
    if ( is_wp_error( $res ) ) return array( 'error' => $res->get_error_message(), 'status' => 0 );
    return array( 'status' => wp_remote_retrieve_response_code( $res ), 'data' => json_decode( wp_remote_retrieve_body( $res ), true ) );
}

/** Lista de puntos (caché de 10 minutos). */
function easypoint_points() {
    $cached = get_transient( 'easypoint_points' );
    if ( is_array( $cached ) ) return $cached;
    $r = easypoint_api( 'GET', '/v1/points' );
    $pts = ( $r['status'] === 200 && is_array( $r['data'] ) ) ? $r['data'] : array();
    if ( $pts ) set_transient( 'easypoint_points', $pts, 10 * MINUTE_IN_SECONDS );
    return $pts;
}

// 1. Método de envío
add_action( 'woocommerce_shipping_init', 'easypoint_shipping_method_init' );
function easypoint_shipping_method_init() {
    if ( class_exists( 'WC_Easypoint_Shipping_Method' ) ) return;
    class WC_Easypoint_Shipping_Method extends WC_Shipping_Method {
        public function __construct( $instance_id = 0 ) {
            $this->id                 = 'easypoint_shipping';
            $this->instance_id        = absint( $instance_id );
            $this->method_title       = 'Easypoint';
            $this->method_description = 'Entrega en un punto Easypoint';
            $this->supports           = array( 'shipping-zones', 'instance-settings', 'instance-settings-modal' );
            $this->init();
        }
        function init() {
            $this->init_form_fields();
            $this->init_settings();
            $this->title = $this->get_option( 'title', 'Recoger en un punto Easypoint' );
            add_action( 'woocommerce_update_options_shipping_' . $this->id, array( $this, 'process_admin_options' ) );
        }
        public function calculate_shipping( $package = array() ) {
            $this->add_rate( array( 'id' => $this->get_rate_id(), 'label' => $this->title, 'cost' => $this->get_option( 'cost', '59' ), 'package' => $package ) );
        }
        public function init_form_fields() {
            $this->form_fields = array(
                'title'   => array( 'title' => 'Título', 'type' => 'text', 'default' => 'Recoger en un punto Easypoint' ),
                'cost'    => array( 'title' => 'Costo fijo', 'type' => 'number', 'default' => '59' ),
                'api_url' => array( 'title' => 'URL de la API', 'type' => 'text', 'default' => EASYPOINT_DEFAULT_API ),
                'api_key' => array( 'title' => 'API Key (epk_…)', 'type' => 'password', 'description' => 'La genera Easypoint en Administración → Socios API.' ),
            );
        }
    }
}
add_filter( 'woocommerce_shipping_methods', function ( $m ) { $m['easypoint_shipping'] = 'WC_Easypoint_Shipping_Method'; return $m; } );

// 2. Selector de punto en el checkout (lista real de la API)
add_action( 'woocommerce_after_shipping_rate', 'easypoint_checkout_point_picker', 10, 2 );
function easypoint_checkout_point_picker( $method, $index ) {
    if ( $method->method_id !== 'easypoint_shipping' ) return;
    $pts = easypoint_points();
    echo '<div style="margin:10px 0;padding:14px;background:#f7fee7;border-radius:12px;border:1px solid #84cc16">';
    echo '<label for="easypoint_point_id"><strong>Elige tu punto Easypoint</strong></label>';
    echo '<select name="easypoint_point_id" id="easypoint_point_id" style="width:100%;margin-top:6px"><option value="">Selecciona…</option>';
    foreach ( $pts as $p ) printf( '<option value="%d">%s — %s</option>', (int) $p['id'], esc_html( $p['name'] ), esc_html( $p['address'] ) );
    echo '</select></div>';
}
add_action( 'woocommerce_checkout_process', function () {
    $chosen = WC()->session ? (array) WC()->session->get( 'chosen_shipping_methods' ) : array();
    foreach ( $chosen as $c ) if ( strpos( $c, 'easypoint_shipping' ) === 0 && empty( $_POST['easypoint_point_id'] ) ) wc_add_notice( 'Elige el punto Easypoint donde recogerás tu pedido.', 'error' );
} );
add_action( 'woocommerce_checkout_update_order_meta', function ( $order_id ) {
    if ( ! empty( $_POST['easypoint_point_id'] ) ) update_post_meta( $order_id, '_easypoint_point_id', absint( $_POST['easypoint_point_id'] ) );
} );

// 3. Al pagar el pedido, registrar el envío en Easypoint (idempotente por tracking_id)
add_action( 'woocommerce_order_status_processing', 'easypoint_sync_order' );
function easypoint_sync_order( $order_id ) {
    $order = wc_get_order( $order_id );
    if ( ! $order || $order->get_meta( '_easypoint_shipment_id' ) ) return;
    $point = (int) get_post_meta( $order_id, '_easypoint_point_id', true );
    $uses  = false;
    foreach ( $order->get_shipping_methods() as $m ) if ( $m->get_method_id() === 'easypoint_shipping' ) $uses = true;
    if ( ! $uses || ! $point ) return;
    $tracking = 'WC' . $order->get_order_number();
    $r = easypoint_api( 'POST', '/v1/shipments', array(
        'tracking_id'     => $tracking,
        'point_id'        => $point,
        'recipient_name'  => trim( $order->get_shipping_first_name() . ' ' . $order->get_shipping_last_name() ) ?: $order->get_formatted_billing_full_name(),
        'recipient_phone' => $order->get_billing_phone(),
        'recipient_email' => $order->get_billing_email(),
        'carrier'         => 'woocommerce',
    ) );
    if ( in_array( $r['status'], array( 201, 409 ), true ) ) {
        $order->update_meta_data( '_easypoint_shipment_id', $tracking );
        $order->add_order_note( 'Easypoint: envío registrado (' . ( $r['status'] === 201 ? 'nuevo' : 'ya existía' ) . '). Rastreo: ' . $tracking );
        $order->save();
    } else {
        $order->add_order_note( 'Easypoint: no se pudo registrar el envío (' . ( $r['status'] ?: 'sin conexión' ) . '). Se reintentará al reprocesar el pedido.' );
    }
}
