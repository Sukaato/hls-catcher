declare module 'shaka-player/dist/shaka-player.compiled.js' {
  // The compiled UMD build ships no usable types; the player uses it via `any`.
  const shaka: any;
  export default shaka;
}
