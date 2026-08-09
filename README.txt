NITA STYLE — INSTANT PAGE TRANSITION

This replaces app/template.tsx.

Behavior:

1. The black transition begins on pointer-down, before the internal page
   navigation begins.
2. React flushes the transition into the DOM immediately.
3. Navigation waits briefly so the black curtain is already visible.
4. The next page loads behind the animation.
5. The curtain leaves only after the next route is ready.
6. The separate first-entry welcome animation is not replayed.

All ordinary internal Next.js Link components and link-style buttons are
handled automatically.

A real button that must navigate can also use:

data-transition-href="/destination"

Example:

<button
  type="button"
  data-transition-href="/checkout/review"
>
  Continue
</button>

INSTALL:

cd ~/Developer/nita-style-v2
unzip -o ~/Downloads/nita-style-instant-page-transition-fix.zip
rm -rf .next
npm run dev -- --webpack --hostname 0.0.0.0
