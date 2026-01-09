---
description: Security audit for API vulnerabilities
---

Check All APIs for security vulnerabilities.

## Security Review Checklist:

### Authentication & Authorization
- [ ] Proper authentication on all endpoints
- [ ] Role-based access control implemented
- [ ] Token validation and expiration
- [ ] Session management security

### Input Validation
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] Command injection prevention
- [ ] Path traversal prevention
- [ ] Input sanitization

### Data Security
- [ ] Sensitive data encryption
- [ ] Secure data transmission (HTTPS)
- [ ] Proper error handling (no stack traces exposed)
- [ ] Rate limiting implemented

### API Security
- [ ] CORS configuration
- [ ] API versioning
- [ ] Request size limits
- [ ] Timeout configuration

Report all findings with severity levels (Critical, High, Medium, Low).
