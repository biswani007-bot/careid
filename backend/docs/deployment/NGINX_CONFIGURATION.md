# Nginx Production Reverse Proxy Configuration (`https://360api.vnvision.in`)

- **Domain**: `360api.vnvision.in`
- **Backend Upstream**: `127.0.0.1:3000`
- **SSL Certificate**: Let's Encrypt TLS 1.3 / 1.2

---

```nginx
# /www/server/panel/vhost/nginx/360api.vnvision.in.conf

upstream hvapi_backend {
    server 127.0.0.1:3073 max_fails=3 fail_timeout=10s;
    keepalive 32;
}

server {
    listen 80;
    server_name 360api.vnvision.in;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name 360api.vnvision.in;

    ssl_certificate /www/server/panel/vhost/cert/360api.vnvision.in/fullchain.pem;
    ssl_certificate_key /www/server/panel/vhost/cert/360api.vnvision.in/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Max File Upload Limit (50MB for Medical Scans & Attachments)
    client_max_body_size 50M;

    location / {
        proxy_pass http://hvapi_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90s;
    }

    # Static Uploads Direct Serve
    location /uploads/ {
        alias /www/wwwroot/360api.vnvision.in/uploads/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    access_log /www/wwwlogs/360api.vnvision.in.log;
    error_log /www/wwwlogs/360api.vnvision.in.error.log warn;
}
```

---

## Reverse Proxy Header Forwarding & Trust Architecture (DEP-01)

### 1. Client IP Forwarding Mechanics
- **`X-Real-IP`**: Sets `$remote_addr`, representing the immediate TCP peer connected to Nginx.
- **`X-Forwarded-For`**:
  - `$proxy_add_x_forwarded_for`: Appends `$remote_addr` to any existing incoming `X-Forwarded-For` header. Express configured with `trust proxy: 'loopback'` traverses from right to left starting from `127.0.0.1`, extracting the real client IP and discarding prepended spoofed entries.
  - **Hardening Recommendation (Direct Edge)**: Because Nginx directly terminates public client traffic without an intermediary CDN, the recommended directive is:
    ```nginx
    proxy_set_header X-Forwarded-For $remote_addr;
    ```
    This completely overwrites any client-supplied `X-Forwarded-For` header at the edge rather than appending to it.
- **`X-Forwarded-Proto`**: Passes `$scheme` (`https`) so downstream services recognize TLS termination.

### 2. Network Interface Binding & Firewall Isolation
- **Loopback Binding**: In production, the NestJS application binds strictly to `HOST=127.0.0.1` (`PORT=3073`), preventing direct external access to the Node.js process.
- **Firewall Rule (Defense in Depth)**: Even with loopback binding, the host firewall (`ufw`, `iptables`, or cloud security group) must ensure inbound port `3073` is blocked from external networks and only accessible via local loopback (`127.0.0.1`).

### 3. Verification Boundary & Disclaimer
> **CRITICAL NOTICE**: The live production server configuration at `/www/server/panel/vhost/nginx/360api.vnvision.in.conf` and the live server firewall rules have **NOT** been directly inspected on the production host, as production access is strictly prohibited. The directives above represent the repository configuration template. The system administrator must verify that the live Nginx virtual host applies these directives and that port 3073 is isolated from public ingress.


