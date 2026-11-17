declare module '@diffusionstudio/piper-wasm/build/piper_phonemize.js' {
  const create: (options: {
    noInitialRun: boolean;
    noExitRuntime: boolean;
    locateFile: (path: string) => string;
    print: (text: string) => void;
    printErr: (text: string) => void;
  }) => Promise<{ callMain: (args: string[]) => void }>;
  export default create;
}
