# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e5]: AgriMart Admin
      - generic [ref=e6]: Enter your credentials to access the dashboard
    - generic [ref=e8]:
      - generic [ref=e9]:
        - generic [ref=e10]: Email
        - textbox "Email" [ref=e11]:
          - /placeholder: admin@agrimart.com
          - text: admin@agrimart.com
      - generic [ref=e12]:
        - generic [ref=e13]: Password
        - textbox "Password" [ref=e14]:
          - /placeholder: ••••••
          - text: admin123
      - button "Sign In" [ref=e15]
  - region "Notifications alt+T"
  - generic [ref=e20] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e21]:
      - img [ref=e22]
    - generic [ref=e25]:
      - button "Open issues overlay" [ref=e26]:
        - generic [ref=e27]:
          - generic [ref=e28]: "0"
          - generic [ref=e29]: "1"
        - generic [ref=e30]: Issue
      - button "Collapse issues badge" [ref=e31]:
        - img [ref=e32]
  - alert [ref=e34]
```