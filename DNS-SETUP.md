# DNS setup for gaydonnesellshomes.com

Snapshot taken 2026-10-28, before any changes.

- Registrar: GoDaddy. Nameservers currently point to **Cloudflare** (dawn/kip.ns.cloudflare.com),
  so DNS records live in a Cloudflare account, not in GoDaddy.
- Current website: an expired IDX vendor page ("Unlock Your IDX Account").
- Email: Google Workspace (MX records below). Keep these or email stops.

## Records that must be recreated if nameservers move to GoDaddy

| Type | Name | Value | Priority |
|---|---|---|---|
| MX | @ | aspmx.l.google.com | 1 |
| MX | @ | alt1.aspmx.l.google.com | 5 |
| MX | @ | alt2.aspmx.l.google.com | 5 |
| MX | @ | alt3.aspmx.l.google.com | 10 |
| MX | @ | alt4.aspmx.l.google.com | 10 |
| TXT | @ | `v=spf1 include:_spf.google.com include:mailgun.org ~all` | |
| TXT | _dmarc | `v=DMARC1; p=none; pct=100; rua=mailto:re+mwpd5u1zidi@dmarc.postmarkapp.com; sp=none; aspf=r;` | |

Notes: the existing SPF record was `v=spf1 include:mailgun.org ~all` (Mailgun was the old vendor's
mailer). Adding `include:_spf.google.com` lets mail sent from the Google Workspace mailbox pass SPF.
The `mx-verification.google.com` MX record and the `email.gaydonnesellshomes.com` CNAME belonged to
the old vendor and can be dropped. Google DKIM: if Workspace shows a DKIM record under
Apps → Google Workspace → Gmail → Authenticate email, add that TXT record too (I could not read it publicly).

## Records for the new website (GitHub Pages)

| Type | Name | Value |
|---|---|---|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | bond240.github.io |

Remove any other A / AAAA / CNAME records for `@` and `www` (the old Cloudflare/IDX ones).
If editing inside Cloudflare instead, set these records to **DNS only** (grey cloud), not proxied,
so GitHub can issue the HTTPS certificate.

## After DNS is changed

1. Wait for propagation (GoDaddy: minutes to an hour; nameserver changes: up to 24–48 h).
2. GitHub repo → Settings → Pages: the domain shows a green check once DNS is verified.
   Then tick **Enforce HTTPS** (or run `gh api -X PUT repos/bond240/gaydonnesellshomes/pages -F https_enforced=true`).
3. Paste https://gaydonnesellshomes.com into https://developers.facebook.com/tools/debug/ and
   click "Scrape Again" so Facebook refreshes the share preview.
