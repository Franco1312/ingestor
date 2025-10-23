# Certificates Directory

This directory is used to store additional CA certificates for external APIs.

## BCRA Certificate Chain

If you need to add the BCRA certificate chain:

1. Extract the certificate chain:
```bash
openssl s_client -showcerts -connect api.bcra.gob.ar:443 -servername api.bcra.gob.ar < /dev/null 2>/dev/null | openssl x509 -outform PEM > bcra-chain.pem
```

2. Set the environment variable:
```bash
export BCRA_CA_BUNDLE_PATH=/app/certs/bcra-chain.pem
```

## Docker Usage

Mount this directory in your Docker container:
```bash
docker run -v ./infrastructure/certs:/app/certs:ro your-image
```

## Production Deployment

In production, mount the certificates directory as a volume or copy the certificates into the container during build.
