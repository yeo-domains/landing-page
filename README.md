# Domain-for-sale landing page

Static landing page that shows **whatever domain the visitor opened** (title, heading, Formspree hidden field, mailto subject).

**Domain-agnostic:** one Netlify site + this repo serves **any** for-sale domain you attach. The HTML does not hard-code a product domain; the browser hostname (or optional `?d=`) drives the copy.

---

## How the page knows the domain name

Client script (`src/html/scripts.pug` → built into `docs/index.html`):

1. Prefer query `?d=SomeDomain.com` (legacy / redirect fallback)
2. Else use `location.hostname` with leading `www.` stripped

So when someone visits `https://www.example.com`, the heading becomes `example.com` automatically. **No repo copy per domain.**

Offer form posts to Formspree and includes the domain in a hidden field.

---

## Why not GitHub Pages for every domain?

| Approach | Result |
|----------|--------|
| Point many registrar domains with **CNAME → `owner.github.io`** | **Does not work.** GitHub Pages allows **one custom domain per repo**. Extra hostnames fail Host / HTTPS checks. |
| **Masked URL Redirect** to a hub (iframe) | Often shows a **blank page** (mixed content HTTP-in-HTTPS frame, fragile framing). |
| **Unmasked URL Redirect** to `https://www.hub-domain.com/?d=Other.com` | Works technically, but the **address bar shows the hub**, not the domain for sale — bad for serious buyers. |
| One GitHub repo / Pages site **per domain** | Works, but painful duplication. |

**Chosen approach:** host this static site on **Netlify**, attach **every for-sale domain** to the **same** Netlify site. Buyer URL stays on the domain they typed.

---

## Architecture (decisions locked in)

| Topic | Choice |
|-------|--------|
| Host | **Netlify** (not GitHub Pages for custom domains) |
| Sites | **One** Netlify site → this GitHub repo |
| Publish | Folder **`docs`**, **no build command** (HTML/CSS already committed) |
| Rollout | Attach **one domain first** (apex + `www`), prove HTTPS, then add more domains the same way |
| Apex vs www | Serve both; pick a primary in Netlify (redirect the other). Prefer consistency per domain. |
| Old GitHub Pages | **Remove** any Pages custom domain once Netlify works for that name |
| Form | Keep **Formspree** as-is |
| Not doing | Generic hub domain as the buyer URL, github.io as the public sales URL, Masked redirects |

Below, replace placeholders:

- `<your-domain.com>` — a domain you are selling / parking on this landing
- `<site-name>.netlify.app` — the Netlify subdomain created for this site

---

## Local development

```bash
pnpm install   # or npm install
pnpm build     # pug → docs/
pnpm css       # or use start for watch
pnpm serve     # http-server on ./docs
```

Useful scripts from `package.json`:

- `build` — compile Pug into `docs`
- `css` — PostCSS / Tailwind into `docs/styles.css`
- `start` — watch build + css
- `serve` — preview `docs`

After content changes, commit updated `docs/` so Netlify can deploy without a build step.

---

## Part 1 — Create the Netlify site

1. Log in at [https://app.netlify.com](https://app.netlify.com).
2. **Add new site → Import an existing project** → connect GitHub → select this repo.
3. **Build settings:**

   | Field | Value |
   |-------|--------|
   | Branch to deploy | `master` (or your default branch) |
   | Base directory | *(empty)* |
   | Build command | *(empty)* |
   | Publish directory | `docs` |
   | Functions directory | default (`netlify/functions`) is fine |

4. Deploy. Confirm `https://<site-name>.netlify.app` loads the landing page.

---

## Part 2 — Attach the first domain on Netlify

1. Site → **Domain management** → **Add a domain** / **Add domain you already own**.
2. Enter `<your-domain.com>`.
3. Add **`www.<your-domain.com>`** as well (Netlify often offers this automatically).
4. Choose a **primary** domain (apex or www). The other should **redirect** to primary.
5. Netlify will offer either:
   - **Netlify DNS** (change nameservers at the registrar), or
   - **External DNS** (keep Namecheap nameservers; set A/CNAME yourself).

**Important:** Do **not** mix these. If the UI shows a **“Netlify DNS”** badge, nameservers at the registrar **must** be Netlify’s. If you keep Namecheap BasicDNS / `registrar-servers.com`, use **external DNS** only.

---

## Part 3 — Namecheap DNS

### Option A — Netlify DNS (nameserver change)

Use this if Netlify Domain management shows **Netlify DNS** and asks you to update nameservers (e.g. `dns1.p01.nsone.net` …).

1. Namecheap → **Domain List** → `<your-domain.com>` → **Domain** tab (not Advanced DNS).
2. **Nameservers** → **Custom DNS**.
3. Set all four (use the exact list Netlify shows; typical Netlify/NS1 set):

   ```text
   dns1.p01.nsone.net
   dns2.p01.nsone.net
   dns3.p01.nsone.net
   dns4.p01.nsone.net
   ```

4. Save. Propagation: often 15–60 minutes, sometimes up to 24–48 hours.
5. Check NS worldwide: [dnschecker.org](https://dnschecker.org/#NS/) (query type **NS**, name = `<your-domain.com>`).
   You want `nsone.net` (or whatever Netlify listed) — **not** `dns1.registrar-servers.com`.
6. In Netlify → **Domain management → DNS**, confirm records for apex + `www` exist.
7. HTTPS → **Retry DNS verification** after NS have propagated.

**Side effect:** Namecheap **Email Forwarding** / records managed only on Namecheap Advanced DNS may stop working until recreated in Netlify DNS. Plan for that if you use forwarding on `@`.

---

### Option B — External DNS (keep Namecheap nameservers)

Use this if you **do not** change nameservers (stay on Namecheap BasicDNS / `registrar-servers.com`).

Docs: [Netlify — configure external DNS](https://docs.netlify.com/manage/domains/configure-domains/configure-external-dns)

1. Namecheap → `<your-domain.com>` → **Advanced DNS**.
2. **Delete** old GitHub Pages (or other host) records, for example:
   - A `@` → GitHub IPs such as `185.199.x.x`
   - CNAME `www` → `something.github.io.`
3. **Add:**

   | Type | Host | Value |
   |------|------|--------|
   | **A Record** | `@` | `75.2.60.5` |
   | **CNAME Record** | `www` | `<site-name>.netlify.app` |

4. Leave mail / SPF alone if you still use Namecheap email forwarding.
5. In Netlify, ensure the domain is set up as **external DNS** (no “Netlify DNS” badge expecting unused NS1 nameservers).
6. Wait for DNS + HTTPS provisioning; then **Retry DNS verification** if needed.

#### Why `75.2.60.5`?

That IP is **Netlify’s documented load-balancer address** for apex domains when using external DNS (A record). It is **not** a random IP and **not** tied to one site.
`www` uses a **CNAME** to your `*.netlify.app` hostname instead.

If Namecheap offers ALIAS / ANAME / flattened CNAME for `@`, Netlify’s preferred target is `apex-loadbalancer.netlify.com` (see their docs). Otherwise use the A record above.

---

## Part 4 — HTTPS / “Your connection is not private”

### What you want to see

- Netlify **HTTPS** section: certificate **issued / provisioned** for `<your-domain.com>` and `www` (not only “DNS verification was successful”).
- Browser: padlock, **no** “Your connection is not private”.

### What “connection is not private” usually means here

Netlify is still presenting the default cert for **`*.netlify.app`**, not a cert that includes `<your-domain.com>`. Browsers correctly warn (name mismatch).

### Common Netlify errors

| Message | Meaning | Fix |
|---------|---------|-----|
| **DNS verification failed** — domain “doesn't appear to be served by Netlify” | DNS / product mode mismatch, or DNS not propagated | Align Option A or B; wait; Retry |
| **DNS verification successful** but warning remains | Cert still provisioning, or still serving `*.netlify.app` | Wait; Retry; fix NS mismatch |
| Site HTML loads on **http://** but HTTPS warns | Site is mapped; only TLS missing | Finish DNS mode + wait for LE cert |
| Blank page with **Masked** URL Redirect (old setup) | Registrar iframe/mask | Delete Masked redirects; use real DNS → Netlify |

### Checklist when SSL is stuck

1. Are registrar **nameservers** consistent with Netlify’s mode?
   - Badge **Netlify DNS** → NS must be Netlify’s `nsone.net` (or current list).
   - External DNS → NS stay `registrar-servers.com`, A/CNAME as in Option B.
2. Both **apex** and **www** added on the **same** Netlify site.
3. No leftover GitHub A/CNAME records fighting Netlify.
4. Click **Retry DNS verification** only after DNS is actually correct (check [dnschecker.org](https://dnschecker.org)).
5. Allow time (minutes to a few hours; Netlify mentions up to 24h in their UI).
6. Test in a private/incognito window after the cert shows as provisioned.

---

## Part 5 — Disconnect GitHub Pages (if you used it before)

Once `https://www.<your-domain.com>` (or your primary) works with a valid padlock:

1. GitHub repo → **Settings → Pages**.
2. Remove the custom domain for that name.
3. Optional cleanup: delete `docs/CNAME` from this repo (GitHub Pages–only file). Netlify does not need it; domains are configured in the Netlify UI.

The repo can stay on GitHub; Netlify keeps deploying from Git. Only the Pages **custom domain binding** should go away so two hosts don’t fight over the same name.

---

## Part 6 — Add another for-sale domain (repeatable)

1. **Netlify** → **same site** → **Domain management** → **Add domain** → `<another-domain.com>`.
2. Also add `www.<another-domain.com>`; set primary + redirect like the first domain.
3. **Namecheap** (or other registrar) for that domain:
   - **Delete** URL Redirect / Masked records (and any GitHub CNAMEs).
   - Apply the **same DNS mode** as the first domain (Netlify DNS nameservers **or** external A + CNAME).
4. Wait for DNS + SSL.
5. Visit `https://www.<another-domain.com>` — URL stays on that host; page title/heading show `<another-domain.com>`.

**Do not** use Masked redirect or “all domains CNAME to github.io” for this project.

---

## What failed historically (so you don’t repeat it)

1. **Multiple domains → one GitHub Pages CNAME** — Pages only honors one custom domain per repo.
2. **Registrar Masked redirect** to `http://hub-domain.com/?d=...` — served a frameset; browsers often show **nothing** (especially HTTPS → HTTP iframe).
3. **Netlify DNS badge without changing registrar nameservers** — HTTP may work; **SSL verification fails** (“doesn't appear to be served by Netlify”) or browser keeps warning because cert stays `*.netlify.app`.
4. Relying on a **hub URL** (one brand domain or `*.github.io`) for all sales — works with `?d=`, but buyers don’t see the domain they want in the address bar.

---

## Quick reference — Netlify build

```text
Branch:            master
Base directory:    (empty)
Build command:     (empty)
Publish directory: docs
```

## Quick reference — external DNS records

```text
A     @     75.2.60.5
CNAME www   <site-name>.netlify.app
```

## Quick reference — verify from a terminal

```bash
# Nameservers (Option A should show nsone / Netlify NS)
nslookup -type=NS <your-domain.com>

# Apex should be Netlify LB if using external A record
nslookup <your-domain.com>

# www should alias to your netlify.app host
nslookup www.<your-domain.com>
```

After SSL is good, `openssl` should show a certificate whose SAN includes `<your-domain.com>` / `www.<your-domain.com>`, **not** only `*.netlify.app`:

```bash
echo | openssl s_client -servername www.<your-domain.com> -connect www.<your-domain.com>:443 2>/dev/null | openssl x509 -noout -subject -ext subjectAltName
```

---

## Related links

- [Netlify — external DNS](https://docs.netlify.com/manage/domains/configure-domains/configure-external-dns)
- [Netlify — HTTPS / SSL troubleshooting](https://docs.netlify.com/manage/domains/troubleshooting/troubleshoot-ssl-and-https)
- [DNS propagation checker](https://dnschecker.org/)

