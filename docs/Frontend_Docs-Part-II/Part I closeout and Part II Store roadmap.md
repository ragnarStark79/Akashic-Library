# **Akashic Library — Part I closeout and Part II Store roadmap**

My recommendation is to follow the original product strategy:

Part I — Book Discovery

**Akashic Library: Discovery, Reading & Community**

Discover books, maintain personal shelves, read, review, annotate and discuss.

Core implementation complete through Phase 5B.4.1.

Phase 6 — Finalization

**Product Completion & Platform Hardening**

Close functional gaps, establish account and moderation completeness, and prepare Part I for release.

Part II — Akashic Store

**A separate, immersive bookstore experience**

A distinct visual identity, navigation, product catalogue, cart, checkout, orders and cinematic entry experience.

I have reviewed the two Phase 5B.4 reports, the Phase 5B.4.1 closeout report, the current homepage screenshot and `Akashic_Library_Final_Project_Report_Updated.docx`.

There is an important distinction in the status:

**Part I's core feature implementation is complete, but I would not yet declare Part I formally finished.** Phase 6 is the remaining product-completion and release-readiness stage.

The 5B.4.1 report confirms that the branch remains `ragnar/frontend`, with 20 modified tracked files and 10 untracked directory entries. The work is intentionally uncommitted. We must preserve it; a dirty working tree is not a reason to clean or reset anything.

# **Part I — Phase 6: Product Completion & Platform Hardening**

I recommend seven phases. Some are feature-completion phases; others are audits that determine whether additional implementation is necessary.

## **Phase 6A — Complete Product Audit & Gap Assessment**

Start here

This is the most important first step.

Before adding anything new, Antigravity should inspect the entire existing application and produce a feature inventory.

**Scope:**

- Home and Book Discovery.
- Search, filters and genre exploration.
- Book Details.
- Reviews, ratings and review replies.
- Authentication and account state.
- Personal Library and reading shelves.
- Reading Room and private/shared annotations.
- Community Hub and discussion threads.
- Shared Navbar, search and routing.
- Existing Django applications and APIs.
- PostgreSQL and MongoDB boundaries.
- Automated tests and test-data isolation.

The inventory should classify every feature as:

| Status    | Meaning                                 |
| --------- | --------------------------------------- |
| Complete  | Implemented and verified                |
| Partial   | Works, but has an identified limitation |
| Missing   | Required but not implemented            |
| Defective | Exists but does not work correctly      |
| Deferred  | Intentionally outside current scope     |

**Deliverables:** complete route inventory, feature-gap matrix, backend API map, known-issue list and prioritized implementation plan.

No broad redesign. No feature recreation. Only critical defects discovered in this audit should be fixed immediately.

## **Phase 6B — Patron Profile, Account Settings & Permissions**

The project report defines identity as PostgreSQL-backed and establishes separate user roles.

We should complete the account experience rather than stopping at a username and Sign Out dropdown.

| Feature          | Scope                                                                |
| ---------------- | -------------------------------------------------------------------- |
| Patron profile   | Display name, username and supported avatar information              |
| Account settings | Editable account information supported by backend                    |
| Profile identity | Consistent identity across Reviews, Reading Room and Community       |
| Account security | Password and session management using existing Django authentication |
| Role permissions | Verified roles and permission boundaries                             |
| Account states   | Loading, errors, unavailable profile and session expiry              |

The project report identifies these roles:

- User.
- Moderator.
- Store Manager.
- Admin.

We should implement or verify the roles that belong to Part I now. Store Manager inventory permissions can be completed with Part II.

## **Phase 6C — Community Governance & Moderation**

The project report explicitly includes content moderation and reporting, as well as `reports` and `moderation_audits` in the Community architecture.

This deserves a proper completion milestone.

**Scope:**

- Report a review.
- Report a discussion or reply.
- Review moderation capabilities.
- Discussion moderation capabilities.
- Moderator access and permission checks.
- Report review queue.
- Resolve, dismiss or escalate reports.
- Moderation audit history.
- Accurate public content-visibility states.
- Protection against unauthorized moderation actions.

We should inspect existing backend support before building another moderation system. Reuse what's already present.

## **Phase 6D — Notifications & Activity Center**

This is a proposed extension to the original project specification, rather than a feature the final project report explicitly defines.

I still recommend including it in Phase 6 because the product now has several interaction types.

Potential notifications:

- Someone replies to your discussion.
- Someone responds to your reply.
- Someone responds to your review, if that is an implemented event.
- A moderation action changes the status of your content.
- A relevant account or order event, when Store is later integrated.

Design an in-app notification center with unread/read state, timestamps, relevant destinations and notification preferences.

Email and push notifications should be separate decisions, not automatic requirements.

## **Phase 6E — Discovery & Reading Experience Completion**

This phase strengthens the original product's main purpose.

The final project report already identifies recommendations, shelves, external links, legitimate access options and discovery filtering.

**Scope:**

- Recommendations: verify candidate selection and recommendation API behaviour.
- Search and genre consistency.
- Reading shelf interactions and state consistency.
- Book-detail metadata and bibliographic fallbacks.
- Review and annotation integration.
- Legitimate preview and borrow links.
- Public-domain access links.
- External purchase links where appropriate.
- Improved reading-related discovery and relevant empty states.
- Reading analytics only where actual progress data supports them.

This is not a reason to add fabricated reading statistics.

A crucial boundary: **Book Discovery and Akashic Store must remain separate commerce experiences.** Discovery can identify a book as available in the Store, but it should not inherit the Store's cart and checkout interface.

The project report defines these availability types:

| Availability type   | Intended behavior                                |
| ------------------- | ------------------------------------------------ |
| `OUR_STORE`         | Product purchasable through Akashic Store        |
| `EXTERNAL_PURCHASE` | Legitimate external retailer or publisher        |
| `PREVIEW`           | Publisher/provider preview                       |
| `BORROW`            | Legitimate library or borrowing access           |
| `PUBLIC_DOMAIN`     | Legitimate public-domain reading/download        |
| `INFORMATION`       | Supplementary metadata or background information |

These must not be conflated.

## **Phase 6F — Platform-Wide Security, Performance & Quality**

A complete quality pass across every accepted feature.

| Area           | Work                                                                            |
| -------------- | ------------------------------------------------------------------------------- |
| Security       | Authentication, permissions, CSRF, input validation, safe content rendering     |
| Performance    | Search latency, image loading, database queries and API efficiency              |
| Accessibility  | Keyboard, focus, labels, readable contrast and reduced-motion support           |
| Responsive     | 1440px, 768px, 390px and 360px                                                  |
| Reliability    | API error handling, session expiry, retry and stale-data behavior               |
| Data integrity | User ownership, inventory-independent discovery data and document relationships |
| Testing        | Frontend, Django, integration and end-to-end regression                         |

This also includes verifying the two-database architecture and isolated test configuration.

## **Phase 6G — Deployment, Documentation & Part I Acceptance**

Final release preparation:

- Environment and installation documentation.
- Backend and frontend startup instructions.
- API documentation.
- Database setup and backup/restore approach.
- Production configuration.
- HTTPS, origin and CSRF settings.
- Build and deployment validation.
- Final screenshots and release notes.
- Known limitations and deferred scope.
- Full system smoke test.

Part I exit gate

Part I is formally complete when Phase 6G is accepted and the core Discovery, Reading, Personal Library and Community workflows pass the final release checklist.

# **Part II — Akashic Store**

My recommendation is to treat this as a **separate digital environment within the same product**, rather than another section of the existing Discovery UI.

The Store should share the account identity and underlying Django backend, but have its own visual identity, page shell, navigation, design tokens, interaction patterns and motion system.

Your uploaded homepage screenshot already gives us the entry point: the account dropdown currently contains `My Library` and `Sign Out`. We will introduce **Store** as another item in that menu.

[BookstoreStudio: Responsive Ecommerce Website Template by Noel Dario Andres — Framer Marketplace](https://images.openai.com/static-rsc-4/xrrVdtuFlNPSW-kieWh1rJGP1kRDLG4E263-udzGAAKjvSxNJ7PvJXXMldtniw-HGFaO9fIk5cVI0meEmw4_GOwB4PFJ2XynkFvZvtkA3om4l7tu4NEV92yTFqH2Wyd9AQWOUX9b9j7vE2SZMV_yHv3A_LPEB0A1ccQpw0KTyoQ?purpose=inline)

[Hero section Landing page 3D animation by ALEX BENDER for FANCY on Dribbble](https://images.openai.com/static-rsc-4/B1DeqIB0XzO0YmvRV8PrTWWlHNGkc-fxNRbE78VPlblfoYG-l7e-RyRfT9ywiuZ-82sBnr9N2ILO-5dNVz1wMv9DRCGILyG4dw2fKGpWCTGX70B0r2Yot1bi_KDcqWKUXG8o5gqKcWtLOMWTPFVFTPK59afkF2zDB-OLSb7nK74?purpose=inline)

[Bookstore Website: animation by Ronas IT | UI/UX Team on Dribbble](https://images.openai.com/static-rsc-4/SZYfjwi6ct0RGRTpKoGvEogLjQiPLI_-e1SqUryOe3RoO8fjlRWTq5GlUI-mJhsOfZZ6YF2QS8KEHLmlPOm8Hyhy9jop3D0ZHxUXbo5-zcr4TtMJ9GJTbsRGCVlWdvtVPUeADMLzptyb1i9J_mza-bDKLyj1uN1-tTWeTHi4YjY?purpose=inline)

12

## **1. Store architecture from the final project report**

Your `Akashic_Library_Final_Project_Report_Updated.docx` gives us a useful starting architecture.

It separates the two databases:

| Database   | Responsibility                                                                   |
| ---------- | -------------------------------------------------------------------------------- |
| PostgreSQL | User identity, store products, inventory, carts, orders and payment/order states |
| MongoDB    | Discovery book documents, metadata and external-source information               |

It also defines the commerce entities:

| Entity       | Responsibility                                         |
| ------------ | ------------------------------------------------------ |
| StoreProduct | Sellable product, edition, price, condition and status |
| Inventory    | Quantity and reserved quantity                         |
| Cart         | User's active shopping cart                            |
| CartItem     | Product and requested quantity                         |
| Order        | Purchase record, totals and status                     |
| OrderItem    | Immutable purchased product and price snapshot         |
| Payment      | Provider, payment status and reference                 |
| Shipment     | Optional fulfillment and tracking                      |

This distinction is essential:

**A book in Discovery is not automatically a store product.**

One bibliographic book can have multiple physical or digital editions, and each sellable edition can have its own price, condition, inventory and product identifier.

The report's product and route design will be our specification, but we will verify the current repository before making assumptions. The document refers to a `bookstore` app, while the existing project context identifies a `store` application. We must establish the real implementation and not accidentally create duplicate commerce applications.

# **2. Part II Store roadmap**

I recommend dividing the Store into nine implementation and design stages.

Store 0

**Backend readiness and commerce audit**

Read existing Django Store, Cart and Orders applications, PostgreSQL models, product inventory, APIs, permissions and transaction behavior.

Read-only audit first. No backend changes unless a specific defect or missing capability is proven.

Store 1

**Visual research and independent design system**

Review your references from Awwwards, FWA, Godly.design, UI8 and any additional examples you provide. Establish a distinctive Akashic Store identity.

Design-only stage. No application implementation.

Store 2

**Stitch page-design package**

Create one screen at a time, review it and approve it before moving to the next screen.

Portal, Home, Catalog, Product Detail, Cart, Checkout, Orders and Store Management.

Store 3

**Store frontend foundation and portal transition**

Create the isolated Store shell, routing, design tokens, component system, animation infrastructure, portal entrance and exit.

Store 4

**Store Home, Catalog and Product Details**

Implement real catalog data, browsing, filters, editions, product information, prices and stock states.

Store 5

**Cart and Shopping Experience**

Implement cart persistence, quantity management, removal, price summaries and inventory validation.

Store 6

**Checkout and Payment**

Implement address management, order summary, checkout validation and the verified payment or sandbox flow.

Store 7

**Orders, Account and Fulfillment**

Implement order confirmation, order history, individual order details, payment state and available shipment information.

Store 8

**Store Management and Inventory**

Build the appropriate Store Manager/Admin interface for product listing, edition management, stock and order operations, if not already covered by an existing admin experience.

Store 9

**Integration, Security and Release**

Test the complete customer journey, backend transactions, multi-device behavior, responsiveness, performance and production deployment.

## **3. Store's separate design system**

This is where I want us to be particularly careful.

I do not recommend deciding the final color palette before seeing your references.

Instead, we should establish the visual design system through a dedicated design phase.

### **Initial creative direction**

Recommended starting direction

**Light-first immersive futuristic editorial commerce.**

It should feel like entering a premium digital bookstore or an architectural showroom, not an ordinary shopping template.

We can explore:

| Design area           | Proposed direction                                                                        |
| --------------------- | ----------------------------------------------------------------------------------------- |
| Overall canvas        | Light-first, spacious, sculptural surfaces                                                |
| Surface system        | Layered porcelain, translucent glass and tactile product surfaces                         |
| Shadows               | Soft ambient shadows, controlled depth and selective directional lighting                 |
| Morphism              | Restrained neumorphism and glassmorphism, with experimentation after reviewing references |
| Typography            | Distinctive premium display type paired with a clear, readable functional family          |
| Product cards         | Strong book imagery, edition information and refined motion                               |
| Navbar                | Entirely new Store-specific navigation                                                    |
| Buttons               | Tactile, responsive, animated interactions                                                |
| Product presentations | Selective 3D book and packaging models                                                    |
| Loading               | Elegant asset-aware loading and portal transition                                         |
| Mobile                | Simplified 3D, light effects and touch-first navigation                                   |

The exact color tokens, gradients, glass materials, shadows, radii, typography and iconography will be designed after you send the references.

### **Separate design-token architecture**

The Store should not overwrite the existing Discovery tokens.

It should have its own namespace, for example:

- Store background and surface tokens.
- Store typography and spacing tokens.
- Store shadow and elevation tokens.
- Store glass/transparency tokens.
- Store interaction and motion tokens.
- Store-specific buttons, cards, navigation and form components.

The existing Discovery UI should remain visually unchanged when entering or leaving the Store.

# **4. Advanced animation and 3D architecture**

You specifically asked to use Motion, GSAP and Three.js as essential technologies. I agree, with one important architectural rule: each library needs a defined role. We should not make three different animation engines compete to control the same element.

[Glassmorphism Emerges As Leading UI Design Trend](https://images.openai.com/static-rsc-4/q0jChCv-csK41kB1o71kLrEYvoV8x_hLMp0jn5XUb_Ld78RdKdCZP3-rUZ2EHWMcA-yG-ExGrMmK51uWL8-NeJuWU1SbmG03Y0Rr13S7joFIzLQlYELDzwdo-XnqaMdoJUVNjs172HsEnBaJ3H5KsR3H5akCEP4PFMCfKqkmy1o?purpose=inline)

**Motion for React — UI interaction engine**

Page transitions, product-card interactions, cart feedback, layout changes, menus, gestures and component enter/exit animations.

React-native declarative animations and gestures.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://motion.dev\&sz=32)

Motion for React+1



[Motion for React documentation](https://motion.dev/docs/react?utm_source=chatgpt.com)

[The Symphony of Vines by Unseen Studio on Muzli](https://images.openai.com/static-rsc-4/TOJAg0CZtDDFoJJs7k7tZB6LDkS9IUGbwEHmAdHwYQ1k6OAsnjeXHYz_GcpEGkbmNoPKnyi-2cKkbw8-zV8-A2EpwjK6ThXCsTDOQFn9E-FKmQCoBzAXUfgTznpYTlBPOeGWESPhbJ5a_jLKkIqPBzHANCw3YuFc2tYSULPyx-4?purpose=inline)

**GSAP — cinematic sequence engine**

Portal entrance, choreographed page reveals, hero storytelling, scroll-triggered sequences and carefully orchestrated timelines.

ScrollTrigger supports scroll-linked animations, pinned sections and timeline scrubbing.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://gsap.com\&sz=32)

Docs & Learning+1



[GSAP documentation](https://gsap.com/docs/v3/?utm_source=chatgpt.com)

[What our community of 200+ ML engineers and data scientists is reading now | Tribe AI](https://images.openai.com/static-rsc-4/ynpXYirvpj-8aMVi9uK0N4VbHxaWhKqNOpqd6xu-rhMJBAorFIidUtL05ZJm043m8IIKE7YPHyMR40fhieI0qP422ad_DhthhfiwzfilaS9xtB30hi18zfS5C10kA_QxfckXk-k3PM3oGCaAIn_0SlZiluAbdTG3w7_gBH_wjf8?purpose=inline)

**Three.js — 3D visual engine**

Main Store hero, portal environment, selected interactive book models, sculptural product displays and 3D visual scenes.

Provides scene, camera, renderer, lighting, geometry, materials and textures.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://threejs.org\&sz=32)

threejs.org+1



[Three.js manual](https://threejs.org/manual/?utm_source=chatgpt.com)

[30 Free CSS Loading Animation for your website in 2023 - DEV Community](https://images.openai.com/static-rsc-4/__lxwcKxQnzBZB3OFypKIRCBAU8wkXRdLFVvArbhv_fkW_aYiaUOx3r-2WJMhAFWWxXyf7rHeo542Cl6efOwUZweGrLflPPV5SoUqI6ETw661ULfKsMXHlBPRkCA7fPdEB70Y9kLeP-PkjIejTNrIcdcQ4e1YUIYE56rIGjBFvU?purpose=inline)

**Lottie / dotLottie — vector animation layer**

Lightweight loading animations, empty states, confirmation illustrations and small animated interface assets.

The current dotLottie web player supports browser-based animation playback and interactive animation controls.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://docs.lottiefiles.com\&sz=32)

docs.lottiefiles.com+1



[dotLottie player documentation](https://docs.lottiefiles.com/en/runtimes/distributions/js?utm_source=chatgpt.com)

[Blue Elephant on Metalabel](https://images.openai.com/static-rsc-4/-DImWhk90NpzTHI7gK2w3y3ypcuqu4OiUBOPDNi26QDW_USF_-U6ymf5Zlbzly8NGPsCDwrk3i7q0MW75Cadn37Qjk58L3ZdRzzlmOZRCJI9DshnuwNx07w9AJJB4JMmHRXsEm2CwW9eN1ByVdeGvOPqAm7KlZuVO7229B1ltuc?purpose=inline)

**CSS, Web Animations API and optional Anime.js**

Simple hover states, focus states, transitions, SVG details and lightweight effects.

Use Anime.js only when a specific animation needs it. It should not duplicate work already handled by Motion or GSAP.

### **Where 3D is most important**

[CYBERDOM- a multifunctional event space dedicated to the IT industry and digital security](https://images.openai.com/static-rsc-4/BWCRL-4IB5PJTcfI41eOXWNLCX4eEe7x2CGmAl7cZrhMFFcYhTo0Xh6Iyanb8K9Ol9K2nrD-xUOL91LCxeGJBgo2pG0W1MQAb-zi_Lctth_zXxMjKD3dvtkb-bpKQVD0VoKWcm2qDmEfRgg7fD6E2_g-emUgBRjE6hf4jw3hu1Y?purpose=inline)

**Store portal and entrance**

Three.js scene + GSAP entrance choreography.

[MotionSites — Premium AI Hero Prompts & Design Library](https://images.openai.com/static-rsc-4/f8uCIUaybYpGIQPORsqipOI_O6_a45XUByk8zG8Z44iKRyU8htqGF8sRIHc9HoxiLqbAkR78tNsdNDgFStmeatyEWlJCyv1s0TIuUpkRGuZoGsRYzgUFwV95RPVo46Ykt1q26B8q-4Y6fVdTgl3QeVAg4wWTIwdAbRdSbXLpBEo?purpose=inline)

**Store Home hero**

Immersive 3D composition and scroll interaction.

[Open book in a leather cover A blank white book floats in the air 3d render on blue](https://images.openai.com/static-rsc-4/68FskG_DzbYGsE36O-IGyEI_PN2koj0lI_xH3aLCf6YdantI4E_wNnufpceCE2RZ_Mr3X8wnoIdt3BuLjcpxsXxxWHjtP0UWj5VcVbH-_2QgRdqdNh7kUX1EDF1ROfPsedP7J2FCPv9tNDZuEM9FCnAumE-rNmPw9UaHi3wsBJ-F0r7WmePmrcvznBbWwzQL?purpose=inline)

**Selected product models**

Interactive 3D book display where suitable assets exist.

[Optimizing the E-Commerce Shopping Cart: A UI/UX Design Plan for seamless shopping | by Hotragn Pettugani | Medium](https://images.openai.com/static-rsc-4/aWO59xWadC2hU5TIeLRDJ5_FbF8llRWs6yXn0MrDSjyuELA3K6rXmjenn-Ya5hIFC88-kQGkDYMf5XxBnHWNfhDegqnsVGPhB0ZPhRRe4Q93RF6FsITb5o1zrCCKWAp5DfXGipcg7tZ6AWD_Yy31HCYMnhgRErkFY1e2ucxX6CQ?purpose=inline)

**Cart and checkout**

Motion-driven feedback and transitions, not heavy 3D scenes.

One point I want to make clear: I would not make every avatar, button and book card a Three.js object. That would add unnecessary rendering cost and hurt usability. Those elements should use Motion and CSS. Three.js should be reserved for scenes and objects where 3D genuinely adds value.

We will also implement:

- Lazy loading of 3D scenes and animation assets.
- Lightweight mobile alternatives.
- Static fallbacks when WebGL is unavailable.
- Reduced-motion support.
- Cleanup of WebGL resources and event listeners.
- Pausing animations when appropriate.
- No scroll-jacking.

The goal is an impressive Store, not a slow one.

# **5. The Store portal and entrance experience**

This is a defining part of your requested design.

The intended journey:

**1. Discovery homepage**

User opens the existing profile dropdown and selects **Store**.

The existing Discovery navbar remains intact.

**2. Portal transition**

A cinematic sequence begins. The current page transitions into the new Store environment.

GSAP timeline + Three.js portal visuals.

**3. Asset loading**

Store visual assets, 3D hero resources and fonts load as required.

A real loading state, not a fabricated progress percentage.

**4. Akashic Store**

An entirely different website environment appears with its own navbar, hero, content, components and design language.

Directly opening a Store URL should still work without forcing someone to visit Discovery first. The portal sequence is for the cross-environment transition, not a barrier to normal navigation.

The exit path should also be designed, so returning to Book Discovery feels intentional.

# **6. Store page and screen design plan**

We should follow the same design-first process we used in Part I.

Each Stitch prompt will target one clear screen, rather than asking Stitch to create the whole Store at once.

| Order | Design screen     | Main content                                                                |
| ----- | ----------------- | --------------------------------------------------------------------------- |
| 1     | Store Portal      | Entry sequence, loading and exit                                            |
| 2     | Store Home        | 3D hero, premium collections, featured products                             |
| 3     | Store Catalog     | Search, categories, filters and sorting                                     |
| 4     | Product Details   | Edition, format, condition, price, stock and selected 3D models             |
| 5     | Shopping Cart     | Items, quantities, price summary and removal                                |
| 6     | Checkout          | Address, order summary and available payment method                         |
| 7     | Confirmation      | Order confirmation and status                                               |
| 8     | Orders            | Order history and detail                                                    |
| 9     | Store Operations  | Inventory and product management for authorized staff                       |
| 10    | Supporting states | Empty, loading, error, out-of-stock, payment failure and mobile adaptations |

Each design will be reviewed and approved before we build it.

# **7. Backend strategy: preserve what exists**

This is consistent with your instructions and the Final Project Report.

**We will not rebuild the Store backend just because we are making a new frontend.**

Phase II Store 0 will be a read-only audit.

The report gives us the intended API families, for example:

- `/api/store/products/`
- `/api/store/products/<id>/`
- `/api/cart/`
- `/api/orders/`
- `/api/orders/<id>/`

These are specification examples from the document, not yet confirmed live endpoints.

Antigravity will verify the actual endpoints, serializers, models, permissions, and responses.

The backend changes policy will be:

| Situation                                   | Decision                                                   |
| ------------------------------------------- | ---------------------------------------------------------- |
| Existing API works as intended              | Reuse it                                                   |
| API exists but frontend contract is unclear | Document and adapt frontend                                |
| API has a defect                            | Fix narrowly and add tests                                 |
| Required operation does not exist           | Add the missing backend capability                         |
| Database design is already correct          | Do not migrate or duplicate it                             |
| Checkout or inventory safety is inadequate  | Correct backend transaction logic before exposing checkout |

The most important commerce rules will be:

**Inventory:** PostgreSQL must be authoritative for stock and reserved quantity. Checkout must prevent overselling through safe transactional updates.

**Cart:** prices and stock must be confirmed by Django, not trusted from React.

**Orders:** `OrderItem` should preserve the purchased title/edition and unit-price snapshot so a later catalog change does not rewrite an old order.

**Payment:** follow the project report's mock/sandbox payment direction initially. Never store raw card details in our application database.

**Shipment:** implement tracking only to the extent that the actual fulfillment model supports it.

**Product availability:** only actual `OUR_STORE` products should be eligible for the Store's cart and checkout. External purchase links, previews and borrow options must remain separate.

# **8. How the two parts will connect**

**Part I — Akashic Library**

Discovery and reading environment

Existing authenticated account

My Library and reading shelves

Store entry in the profile dropdown

Cinematic portal transition

# **Akashic Store**

Independent storefront shell and design system

**Store Home**

**Catalog**

**Cart**

**Checkout**

**Orders**

**Management**

The authentication identity is shared. The storefront layout is not.

When the user enters the Store, its navigation should be Store-specific. When they return to Discovery, they see the original Akashic Library navigation and visual identity again.

# **9. My recommended execution sequence**

| Priority | Task        | What happens                                                                      |
| -------- | ----------- | --------------------------------------------------------------------------------- |
| 1        | Phase 6A    | Audit Part I and identify remaining gaps                                          |
| 2        | Phase 6B–6G | Complete and sign off Part I                                                      |
| 3        | Store 0     | Read-only audit of existing Store backend                                         |
| 4        | Store 1     | Review the design references you provide and establish the separate design system |
| 5        | Store 2     | Create Stitch screens individually and approve them                               |
| 6        | Store 3–9   | Build the frontend, integrate backend contracts and test the commerce lifecycle   |

I would not start the Store implementation before its separate visual identity has been approved. Equally, I would not ask Antigravity to redesign an already working commerce backend before the audit identifies a specific problem.

## **Final decision**

**Part I:** Core implementation complete. Phase 6 remains before formal Part I completion.

**Part II:** Akashic Store is the next major product environment, and it will receive its own design system, navigation, component library and cinematic interaction language.

**The immediate next milestone should be Phase 6A — Complete Product Audit & Gap Assessment.** Once that report is ready, we'll know exactly what remains to close Part I. After that, we'll audit the Store backend and begin the separate visual research and design-system phase using the references you provide.

That gives us a clean progression: finish the Discovery product properly, then build the Store as a genuinely distinct second experience.