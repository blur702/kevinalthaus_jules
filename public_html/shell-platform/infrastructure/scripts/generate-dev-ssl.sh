#!/bin/bash

# Generate self-signed SSL certificate for development
# DO NOT USE IN PRODUCTION - Use Let's Encrypt or proper certificates

SSL_DIR="../nginx/ssl"
mkdir -p "$SSL_DIR"

# Generate private key
openssl genrsa -out "$SSL_DIR/key.pem" 2048

# Generate certificate signing request
openssl req -new -key "$SSL_DIR/key.pem" -out "$SSL_DIR/csr.pem" -subj "/C=US/ST=State/L=City/O=ShellPlatform/OU=Development/CN=localhost"

# Generate self-signed certificate (valid for 365 days)
openssl x509 -req -days 365 -in "$SSL_DIR/csr.pem" -signkey "$SSL_DIR/key.pem" -out "$SSL_DIR/cert.pem"

# Clean up CSR
rm "$SSL_DIR/csr.pem"

# Set appropriate permissions
chmod 600 "$SSL_DIR/key.pem"
chmod 644 "$SSL_DIR/cert.pem"

echo "Development SSL certificates generated successfully in $SSL_DIR"
echo "WARNING: These are self-signed certificates for development only!"