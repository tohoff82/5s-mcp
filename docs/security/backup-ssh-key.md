# SSH Backup Key 🔑

*Created: 2026-01-12 18:45 UTC*

## 🚨 EMERGENCY SSH ACCESS

**If primary SSH keys are lost, use this backup key:**

### Private Key Location
```
Server: /root/.ssh/backup_key
```

### Public Key
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMfpSyMqm5xEjYw0U/uf+dJD0ZN8oKHPRAWgaJJCVn/C ui-agent-backup-key-20260112
```

### Key Fingerprint
```
SHA256:ATPPCXSS9A1GUXtm4w08e/f73aYUfp0L4PQ6gWMRvi8
```

### Usage
1. **Copy private key from server** (if accessible)
2. **Use Hetzner console** to access `/root/.ssh/backup_key`
3. **Emergency connection**:
   ```bash
   ssh -i backup_key root@138.201.190.221
   ```

## 🛡️ SECURITY NOTES

- **Ed25519** encryption (most secure)
- **No passphrase** for emergency use
- **Added to authorized_keys** automatically
- **Backup location**: Multiple secure locations recommended

## 🚨 IF COMPROMISED

1. Remove from `/root/.ssh/authorized_keys`
2. Delete `/root/.ssh/backup_key*`
3. Generate new backup key
4. Update this documentation

---
*Keep this information secure and accessible!*