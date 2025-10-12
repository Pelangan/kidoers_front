# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e5]:
    - generic [ref=e6]:
      - img "Kidoers" [ref=e7]
      - heading "Welcome back!" [level=1] [ref=e8]
      - paragraph [ref=e9]: Sign in to your family account
    - generic [ref=e10]:
      - generic [ref=e11]:
        - img [ref=e12]
        - textbox "Email address" [ref=e15]
      - generic [ref=e16]:
        - img [ref=e17]
        - textbox "Password" [ref=e20]
        - button [ref=e21] [cursor=pointer]:
          - img [ref=e22] [cursor=pointer]
      - button "Forgot password?" [ref=e26] [cursor=pointer]
      - button "Sign In" [ref=e27] [cursor=pointer]
    - generic [ref=e28]:
      - generic [ref=e33]: Or continue with
      - button "Continue with Google" [ref=e34] [cursor=pointer]:
        - img [ref=e35] [cursor=pointer]
        - text: Continue with Google
    - paragraph [ref=e41]:
      - text: Don't have an account?
      - link "Sign up" [ref=e42] [cursor=pointer]:
        - /url: /signup
  - region "Notifications (F8)":
    - list
  - button "Open Next.js Dev Tools" [ref=e48] [cursor=pointer]:
    - img [ref=e49] [cursor=pointer]
  - alert [ref=e52]
```