<script>
  let count = 0;
</script>

<main>
  <h1>Lightweight Svelte Sample</h1>
  <button on:click={() => (count += 1)}>
    Clicked {count} {count === 1 ? 'time' : 'times'}
  </button>
</main>

<style>
  :global(body) {
    margin: 0;
    min-height: 100vh;
    display: grid;
    place-items: center;
    font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    background: #f7f7f8;
  }

  main {
    padding: 2rem;
    border-radius: 0.75rem;
    background: white;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
    text-align: center;
  }

  h1 {
    margin: 0 0 1rem;
    font-size: 1.25rem;
  }

  button {
    font: inherit;
    border: 1px solid #d0d0d7;
    border-radius: 0.5rem;
    padding: 0.65rem 1rem;
    background: #fff;
    cursor: pointer;
  }

  button:hover {
    background: #f2f2f7;
  }
</style>