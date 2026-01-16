# System Infrastructure Overview 🖥️

*Last Updated: 2026-01-12 18:30 UTC*

## 🏗️ Server Specifications

- **Provider**: Hetzner Cloud
- **Hostname**: htz-legistrator
- **Public IP**: 138.201.190.221
- **IPv6**: 2a01:4f8:c013:2263::1/64
- **OS**: Ubuntu 24.04.3 LTS (Noble Numbat)
- **Kernel**: 6.8.0-90-generic
- **Architecture**: ARM64 (aarch64)
- **CPU**: 2x Neoverse-N1 @ 2.0GHz
- **RAM**: 3.7GB (22% used)
- **Storage**: 38GB SSD (12% used)
- **Uptime**: 2+ days stable

## 🌐 Network Configuration

### Domain & DNS
- **Primary Domain**: legis.uti.cx
- **DNS Resolution**: Points to 138.201.190.221
- **SSL Certificate**: Let's Encrypt (valid until Apr 6, 2026)

### Web Services
- **Reverse Proxy**: Caddy
- **Main App**: legis.uti.cx/app (port 3002)
- **API**: legis.uti.cx/api (port 3001)  
- **Health Check**: legis.uti.cx/health ✅

### Active Ports
- **SSH**: 22 (rate limited)
- **HTTP**: 80 → redirects to HTTPS
- **HTTPS**: 443 (Caddy)
- **Telegram Gateway**: 8443
- **MongoDB**: 27017 (localhost)
- **RabbitMQ**: 5672, 15672 (localhost)

## 🚀 UI-Agent Services

### Service Status (All ✅ Healthy)
- **ui-agent-telegram**: Active, 28MB RAM
- **ui-agent-claude**: Active, 74MB RAM  
- **ui-agent-tools**: Active, 48MB RAM
- **ui-agent-webapp**: Active
- **ui-agent-reference-api**: Active

### Supporting Services
- **MongoDB**: 164MB RAM (4.2%)
- **RabbitMQ**: 134MB RAM (3.4%)
- **Caddy**: Web server
- **Fail2ban**: Security monitoring

## 📊 Resource Usage

- **CPU Load**: Low, ARM Neoverse-N1 efficient
- **Memory**: 822MB / 3.7GB used (22%)
- **Disk**: 4.2GB / 38GB used (12%)
- **Network**: Stable, no issues

## 🔐 Security Layer

- **Firewall**: UFW active with smart rules
- **Intrusion Prevention**: Fail2ban
- **SSL/TLS**: Let's Encrypt certificates
- **Access Control**: SSH key-based (needs hardening)

---
*Part of ui-agent knowledge base*