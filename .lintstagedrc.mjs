export default {
  "*.{ts,tsx,js,jsx,json}": ["biome check --write --no-errors-on-unmatched"],
  // typecheck operates on the whole project, not individual files — a
  // function config runs a fixed command instead of getting staged paths
  // appended (`tsc --noEmit <file>` is not equivalent to running it project-wide).
  "*.{ts,tsx,js,jsx}": () => ["pnpm run typecheck"],
};
