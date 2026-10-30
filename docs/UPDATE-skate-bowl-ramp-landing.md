# Skatepark cleanup and bowl exit landing (main only)

- The physical bowl lip still provides natural upward momentum. No trick animation is automatically created by crossing the rim; previously kickflip/barspin was implicitly assigned, so early contact triggered an incomplete-trick dismount. Both skate and scooter exit naturally.
- A manual Space-initiated trick retains its explicit manual marker; only a failed deliberately executed trick can produce a trick-related crash. Ordinary airborne riding and AI motion never cause that forced dismount. Collision crashes against genuine obstacles remain unchanged.
- Simplified halfpipe decoration: removed redundant coping bar, loose side posts, corner footings, and dotted metal deck strips from the scene. The proper quarterPipe generator already contains closed curved surfaces and a single coping. Kept separate grind rails and rear closures.
- Regression tests cover moderate-speed takeoffs for skate and scooter, manual-trick preservation, missing decorative artifact geometry, and explicit trick-origin gating.
- No release branch changes or Cloudflare Worker deployments. GitHub Pages build and tests will run from main. A visual playthrough should still verify actual feel at the lip and all art settings.
