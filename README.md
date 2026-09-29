# graphene-site

The page at https://alex-lop.github.io/graphene-site/: [Graphene](https://github.com/Alex-lop/Graphene),
told by a murmuration of 400 starlings in one HTML file. The flock settles into the Graphene mark: the plan,
with one branch pruned.

- `index.html` is the whole site: markup, style and script inline. Its only outside request is Google Fonts.
- `favicon.svg`, `favicon.ico` and `apple-touch-icon.png` come from the Graphene logo kit.
- `og.png` is the link preview (1200×630), a frame of the page with the flock drawn as the mark.
- `404.html` is what Pages serves for a path that does not exist.

Preview: `python3 -m http.server` here, then open http://localhost:8000.

Publish: Pages builds `main` at `/`, so merging to `main` publishes.
