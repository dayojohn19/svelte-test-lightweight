<script>
  import { onMount } from 'svelte';
  import markdownConfig from '../JAVASCRIPT_FUNCTIONS_AND_APIS.md?raw';

  function getMarkdownValue(key, fallbackValue) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = markdownConfig.match(new RegExp(`^${escapedKey}:\\s*(.+)$`, 'm'));
    return match?.[1]?.trim() || fallbackValue;
  }

  const POSTCARD_DETAILS_API = getMarkdownValue(
    'API_BASE_URL',
    'http://127.0.0.1:8000/garden/look/ZN6RF9/'
  );
  const UPLOAD_API_URL = getMarkdownValue(
    'UPLOAD_API_URL',
    'http://127.0.0.1:8000/apis/upload_to_imbb/'
  );
  const UPLOAD_IMAGE_FIELD = getMarkdownValue('UPLOAD_IMAGE_FIELD', '');
  const API_USERNAME = getMarkdownValue('API_USERNAME', '');
  const API_USER_ID = getMarkdownValue('API_USER_ID', '');
  const LOCAL_STORAGE_USERNAME_KEY = getMarkdownValue(
    'LOCAL_STORAGE_USERNAME_KEY',
    'postcard_username'
  );
  const LOCAL_STORAGE_USER_ID_KEY = getMarkdownValue('LOCAL_STORAGE_USER_ID_KEY', 'postcard_user_id');
  const LOCAL_STORAGE_THEME_KEY = getMarkdownValue('LOCAL_STORAGE_THEME_KEY', 'postcard_theme');
  const API_COLLECTION_STR = POSTCARD_DETAILS_API.split('/').filter(Boolean).pop() || 'ZN6RF9';
  const LOADING_DELAY_MS = Number(getMarkdownValue('LOADING_DELAY_MS', '1500')) || 1500;
  const MAIN_IMAGE_URL = getMarkdownValue('MAIN_IMAGE_URL', 'https://placehold.co/960x540/png');
  const POSTCARD_MEMORY_IMAGE_URLS = [
    getMarkdownValue('COLLECTION_1_URL', 'https://placehold.co/640x400/png?text=Postcard+1'),
    getMarkdownValue('COLLECTION_2_URL', 'https://placehold.co/640x400/png?text=Postcard+2'),
    getMarkdownValue('COLLECTION_3_URL', 'https://placehold.co/640x400/png?text=Postcard+3'),
    getMarkdownValue('COLLECTION_4_URL', 'https://placehold.co/640x400/png?text=Postcard+4')
  ];
  const MEMORY_PROMPT_STORAGE_KEY = 'postcard_memory_prompt_index';
  const MEMORY_PROMPTS = [
    "The memory I'll always keep from here is _____.",
    "I'll never forget this place because _____.",
    'This place will always remind me of _____.',
    'When I think of this place, I remember _____.',
    'What made this place unforgettable was _____.',
    'The moment that stayed with me here was _____.',
    'This place meant so much to me because _____.',
    "One thing I'll never forget about this place is _____."
  ];

  let postcardMemories = [];

  let isLoadingPostcard = true;
  let showCredentialsForm = false;
  let credentialsError = '';
  let isUploadingImages = false;
  let uploadStatus = '';
  let uploadInput;
  let uploadImageField = UPLOAD_IMAGE_FIELD;
  let showUploadPictureButton = false;
  let imageFieldPlaceholder = MEMORY_PROMPTS[0];
  let inputUsername = '';
  let inputUserId = '';
  let lightboxImageSrc = '';
  let lightboxImageAlt = 'Image preview';
  let activeUsername = API_USERNAME;
  let activeUserId = API_USER_ID;
  let activeTheme = 'dark';
  let scannedPostcardSrc = MAIN_IMAGE_URL;
  let scannedPostcardDetails = {
    title: 'Garden Home Postcard',
    subtitle: 'Front Gate in Spring',
    location: 'Portland, Oregon',
    collected: '2026-02-28',
    collector: 'Garden Home Archive',
    collectorUsername: '',
    collectorUserId: ''
  };

  function normalizeCredential(value) {
    return String(value ?? '')
      .trim()
      .toLowerCase();
  }

  function getCollectorName(collectorValue) {
    if (typeof collectorValue === 'string') {
      return collectorValue;
    }

    return collectorValue?.visitorName || collectorValue?.name || collectorValue?.username || '';
  }

  function getCollectorUsername(collectorValue) {
    if (typeof collectorValue === 'string') {
      return collectorValue;
    }

    return collectorValue?.username || collectorValue?.visitorName || collectorValue?.name || '';
  }

  function getCollectorUserId(collectorValue) {
    if (typeof collectorValue === 'string') {
      return '';
    }

    return collectorValue?.userID || collectorValue?.userId || collectorValue?.id || '';
  }

  function isCollectorAccountMatch() {
    const currentUsername = normalizeCredential(activeUsername);
    const currentUserId = normalizeCredential(activeUserId);
    const collectorUsername = normalizeCredential(scannedPostcardDetails.collectorUsername);
    const collectorUserId = normalizeCredential(scannedPostcardDetails.collectorUserId);

    return Boolean(
      currentUsername &&
        currentUserId &&
        collectorUsername &&
        collectorUserId &&
        currentUsername === collectorUsername &&
        currentUserId === collectorUserId
    );
  }

  function applyTheme(themeName, shouldPersist = true) {
    activeTheme = themeName === 'light' ? 'light' : 'dark';

    if (typeof document !== 'undefined') {
      document.body.dataset.theme = activeTheme;
    }

    if (shouldPersist) {
      safeSetLocalStorageValue(LOCAL_STORAGE_THEME_KEY, activeTheme);
    }
  }

  function toggleTheme() {
    applyTheme(activeTheme === 'dark' ? 'light' : 'dark');
  }

  function toPostcardMemory(collection, index = 0) {
    const title =
      collection?.collectionName ||
      collection?.collectionTitle ||
      collection?.title ||
      collection?.name ||
      `Postcard Memory ${index + 1}`;

    const body =
      collection?.collectionDescription ||
      collection?.description ||
      collection?.body ||
      'No memory description available.';

    const uniqueId = collection?.collectionUniqueID || collection?.id || `memory-${index + 1}`;
    const pictureUrl = collection?.collectionPicture;
    const videoUrl = collection?.collectionVideo;
    const collectedDate = collection?.collectionCollected || collection?.collectionTimstamp;
    const placeName = collection?.collectionPlace || collection?.location;
    const provinceName = collection?.collectionProvince;
    const collectorValue = collection?.collectionCollector || collection?.collector;
    const collectorName =
      getCollectorName(collectorValue) ||
      collection?.collectionCollectorName ||
      collection?.collectorName ||
      scannedPostcardDetails.collector;
    const collectorUsername =
      collection?.collectionCollector ||
      collection?.collectionCollectorUsername ||
      getCollectorUsername(collectorValue) ||
      scannedPostcardDetails.collectorUsername;
    const collectorUserId =
      collection?.collectionCollectorID ||
      collection?.collectionCollectorId ||
      getCollectorUserId(collectorValue) ||
      scannedPostcardDetails.collectorUserId;
    const placeWithProvince =
      placeName && provinceName ? `${placeName}, ${provinceName}` : placeName || scannedPostcardDetails.location;

    return {
      ...collection,
      id: uniqueId,
      title,
      body,
      src:
        pictureUrl ||
        POSTCARD_MEMORY_IMAGE_URLS[index] ||
        `https://placehold.co/640x400/png?text=${uniqueId}`,
      video: videoUrl || null,
      placeVisitorLists: collection?.placeVisitorLists || [],
      placeId: collection?.collectionPlaceID || null,
      isCollected: Boolean(collection?.collectionIsCollected),
      collector: collectorName,
      collectorUsername,
      collectorUserId,
      collected: collectedDate || new Date().toISOString().slice(0, 10),
      timestamp: collection?.collectionTimstamp || null,
      location: placeWithProvince
    };
  }

  function toPostcardDetails(memory) {
    const subtitleParts = [];

    if (memory.id) subtitleParts.push(`Collection ${memory.id}`);
    if (memory.placeId) subtitleParts.push(`Place ID ${memory.placeId}`);

    return {
      title: memory.title,
      subtitle: subtitleParts.length ? subtitleParts.join(' · ') : scannedPostcardDetails.subtitle,
      location: memory.location,
      collected: memory.collected,
      collector: memory.collector,
      collectorUsername: memory.collectorUsername,
      collectorUserId: memory.collectorUserId
    };
  }

  function getCollectionMemoryItems() {
    return postcardMemories.flatMap((collection) => {
      const memoryList = Array.isArray(collection?.collectionMemory) ? collection.collectionMemory : [];

      return memoryList.map((memory, memoryIndex) => ({
        id: memory?.id || `${collection.id}-memory-${memoryIndex + 1}`,
        about: memory?.memoryAbout || `Memory ${memoryIndex + 1}`,
        image: memory?.memoryPicture || '',
        isPrivate: Boolean(memory?.memoryisPrivate),
        timestamp: memory?.memoryTimestamp || ''
      }));
    });
  }

  async function fetchLookPlaceData() {
    const response = await fetch(POSTCARD_DETAILS_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: activeUsername,
        userID: activeUserId,
        collectionStr: API_COLLECTION_STR
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch postcard details: ${response.status}`);
    }

    const data = await response.json();

    if (data?.error) {
      throw new Error(data.error);
    }

    return data;
  }

  async function getPostcardMemories() {
    const data = await fetchLookPlaceData();

    if (Array.isArray(data)) {
      return data.map((collection, index) => toPostcardMemory(collection, index));
    }

    return [toPostcardMemory(data, 0)];
  }

  async function getPostcardDetails() {
    const memories = await getPostcardMemories();
    return memories[0] ? toPostcardDetails(memories[0]) : scannedPostcardDetails;
  }

  function formatCollectedDate(value) {
    if (!value) return '';

    const [year, month, day] = value.split('-').map(Number);

    if (year && month && day) {
      return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC'
      });
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return parsed.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  async function loadPostcardData() {
    isLoadingPostcard = true;
    credentialsError = '';

    await new Promise((resolve) => {
      setTimeout(resolve, LOADING_DELAY_MS);
    });

    try {
      postcardMemories = await getPostcardMemories();
      if (postcardMemories[0]) {
        scannedPostcardDetails = toPostcardDetails(postcardMemories[0]);
        scannedPostcardSrc = postcardMemories[0].src || MAIN_IMAGE_URL;
      } else {
        credentialsError = 'No postcard data found for this account.';
        showCredentialsForm = true;
      }
    } catch (error) {
      console.error(error);
      credentialsError = 'Could not fetch data. Check username and userID.';
      showCredentialsForm = true;
    } finally {
      isLoadingPostcard = false;
    }
  }

  function safeGetLocalStorageValue(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('Unable to read localStorage key:', key, error);
      return null;
    }
  }

  function safeSetLocalStorageValue(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error('Unable to write localStorage key:', key, error);
      return false;
    }
  }

  function getRotatingMemoryPrompt() {
    if (!MEMORY_PROMPTS.length) {
      return "What's your memory about this place?";
    }

    const previousPromptIndex = Number.parseInt(
      safeGetLocalStorageValue(MEMORY_PROMPT_STORAGE_KEY) ?? '',
      10
    );

    let nextPromptIndex = Math.floor(Math.random() * MEMORY_PROMPTS.length);

    if (
      MEMORY_PROMPTS.length > 1 &&
      Number.isInteger(previousPromptIndex) &&
      previousPromptIndex >= 0 &&
      previousPromptIndex < MEMORY_PROMPTS.length &&
      nextPromptIndex === previousPromptIndex
    ) {
      nextPromptIndex = (nextPromptIndex + 1) % MEMORY_PROMPTS.length;
    }

    safeSetLocalStorageValue(MEMORY_PROMPT_STORAGE_KEY, String(nextPromptIndex));
    return MEMORY_PROMPTS[nextPromptIndex];
  }

  async function uploadImages(files) {
    const formData = new FormData();

    for (const file of files) {
      formData.append('images', file);
    }

    formData.append('imageField', uploadImageField.trim());
    formData.append('username', activeUsername);
    formData.append('userID', activeUserId);
    formData.append('collectionUniqueID', API_COLLECTION_STR);

    const response = await fetch(UPLOAD_API_URL, {
      method: 'POST',
      body: formData
    });

    let responseBody = null;

    try {
      responseBody = await response.json();
    } catch {
      responseBody = null;
    }

    if (!response.ok) {
      const errorMessage =
        responseBody?.error || responseBody?.message || `Upload failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    if (!Array.isArray(responseBody?.saved)) {
      throw new Error('Upload response missing saved files list.');
    }

    return responseBody.saved;
  }

  function openUploadPicker() {
    uploadInput?.click();
  }

  function handleImageFieldInput(event) {
    uploadImageField = event.currentTarget?.value || '';
    showUploadPictureButton = uploadImageField.trim().length > 0;
  }

  async function handleUploadSelection(event) {
    const files = Array.from(event.currentTarget?.files || []);

    if (!files.length) {
      return;
    }

    if (!activeUsername || !activeUserId) {
      uploadStatus = 'Please set username and userID before uploading.';
      event.currentTarget.value = '';
      return;
    }

    isUploadingImages = true;
    uploadStatus = `Uploading ${files.length} file${files.length > 1 ? 's' : ''}...`;

    try {
      const saved = await uploadImages(files);
      uploadStatus = `Uploaded ${saved.length} file${saved.length > 1 ? 's' : ''} successfully.`;
    } catch (error) {
      console.error('Upload failed:', error);
      uploadStatus = error?.message || 'Upload failed.';
    }

    isUploadingImages = false;
    event.currentTarget.value = '';
  }

  async function submitCredentials() {
    const normalizedUsername = inputUsername.trim();
    const normalizedUserId = inputUserId.trim();

    if (!normalizedUsername || !normalizedUserId) {
      credentialsError = 'Please enter both username and userID.';
      return;
    }

    activeUsername = normalizedUsername;
    activeUserId = normalizedUserId;
    safeSetLocalStorageValue(LOCAL_STORAGE_USERNAME_KEY, normalizedUsername);
    safeSetLocalStorageValue(LOCAL_STORAGE_USER_ID_KEY, normalizedUserId);
    showCredentialsForm = false;

    await loadPostcardData();
  }

  function openImagePreview(src, alt = 'Image preview') {
    if (!src) {
      return;
    }

    lightboxImageSrc = src;
    lightboxImageAlt = alt;
  }

  function closeImagePreview() {
    lightboxImageSrc = '';
    lightboxImageAlt = 'Image preview';
  }

  onMount(async () => {
    const savedTheme = safeGetLocalStorageValue(LOCAL_STORAGE_THEME_KEY);
    applyTheme(savedTheme === 'light' ? 'light' : 'dark', false);

    imageFieldPlaceholder = getRotatingMemoryPrompt();

    const savedUsername = safeGetLocalStorageValue(LOCAL_STORAGE_USERNAME_KEY)?.trim();
    const savedUserId = safeGetLocalStorageValue(LOCAL_STORAGE_USER_ID_KEY)?.trim();

    if (savedUsername && savedUserId) {
      activeUsername = savedUsername;
      activeUserId = savedUserId;
      await loadPostcardData();
      return;
    }

    isLoadingPostcard = false;
    showCredentialsForm = true;
  });
</script>

<div class="page">
  <header class="topbar">
    <div class="brand">Garden Home Postcard</div>
    <div class="account-chip" aria-live="polite">
      <span>Welcome, {activeUsername || 'Guest'}</span>
      <button class="theme-toggle" type="button" on:click={toggleTheme}>
        {activeTheme === 'dark' ? 'Light theme' : 'Dark theme'}
      </button>
    </div>
  </header>

  <section class="hero">
    <p class="eyebrow">MEMORIES, COLLECTED AND SHARED</p>
    <p class="subtext">
      Collect moments, travel with ease, and share memories.
    </p>

    {#if showCredentialsForm}
      <div class="credentials-box" aria-live="polite">
        <h3>Enter your account</h3>
        <form class="credentials-form" on:submit|preventDefault={submitCredentials}>
          <label>
            Username
            <input bind:value={inputUsername} type="text" placeholder="Enter username" />
          </label>
          <label>
            UserID
            <input bind:value={inputUserId} type="text" placeholder="Enter userID" />
          </label>
          {#if credentialsError}
            <p class="credentials-error">{credentialsError}</p>
          {/if}
          <button class="cta" type="submit">Save and Continue</button>
        </form>
      </div>
    {:else}
      <div class="postcard-frame" aria-live="polite">
        {#if isLoadingPostcard}
          <div class="loading-state">
            <span class="spinner" aria-hidden="true"></span>
            <span>Loading image...</span>
          </div>
        {:else}
          <img id="scanned-postcard" src={scannedPostcardSrc} alt="Scanned postcard" />
          <div class="postcard-meta" id="scanned-postcard-meta">
            <h3>{scannedPostcardDetails.title}</h3>
            <p class="subtitle">{scannedPostcardDetails.subtitle}</p>
            <div class="meta-grid">
              <p><span>Location</span>{scannedPostcardDetails.location}</p>
              <p><span>Collected</span>{formatCollectedDate(scannedPostcardDetails.collected)}</p>
              <p><span>Collector</span>{scannedPostcardDetails.collector}</p>
            </div>
            {#if isCollectorAccountMatch()}
              <div class="hero-actions">
                <button class="ghost">Join WhatsApp Group</button>
                {#if showUploadPictureButton}
                  <button class="cta" type="button" on:click={openUploadPicker} disabled={isUploadingImages}>
                    {isUploadingImages ? 'Uploading...' : 'Upload picture'}
                  </button>
                {/if}
                <input
                  id="modalMultiImageUpload"
                  bind:this={uploadInput}
                  class="upload-input"
                  type="file"
                  name="images"
                  accept="image/*"
                  multiple
                  required
                  on:change={handleUploadSelection}
                />
                <input
                  id="modalImageField"
                  class="image-field-input"
                  type="text"
                  name="imageField"
                  on:input={handleImageFieldInput}
                  placeholder={imageFieldPlaceholder}
                />
              </div>
            {/if}
            {#if isCollectorAccountMatch() && uploadStatus}
              <p class="upload-status">{uploadStatus}</p>
            {/if}
          </div>
        {/if}
      </div>
    {/if}
  </section>

  <section class="collection-memory">
    <h2>Collection Memory</h2>
    {#if getCollectionMemoryItems().length}
      <div class="memory-grid">
        {#each getCollectionMemoryItems() as memory}
          <article class="memory-card">
            {#if memory.image}
              <button
                class="image-trigger"
                type="button"
                on:click={() => openImagePreview(memory.image, memory.about)}
              >
                <img class="memory-image" src={memory.image} alt={memory.about} />
              </button>
            {/if}
            <h3>{memory.about}</h3>
            <p class="memory-meta">
              <span>{memory.isPrivate ? 'Private' : 'Public'}</span>
              {#if memory.timestamp}
                <span>{formatCollectedDate(memory.timestamp)}</span>
              {/if}
            </p>
          </article>
        {/each}
      </div>
    {:else}
      <p class="memory-empty">No collection memory found yet.</p>
    {/if}
  </section>

  <h2 class="grid-title">Once There, Now a Memory.</h2>
  <section class="grid">
    {#each postcardMemories as postcard}
      <article class="card">
        <button class="image-trigger" type="button" on:click={() => openImagePreview(postcard.src, postcard.title)}>
          <img class="collection-image" src={postcard.src} alt={postcard.title} />
        </button>
        <h2>{postcard.title}</h2>
        <p>{postcard.body}</p>
      </article>
    {/each}
  </section>

  {#if lightboxImageSrc}
    <button class="image-lightbox" type="button" on:click={closeImagePreview}>
      <img class="lightbox-image" src={lightboxImageSrc} alt={lightboxImageAlt} />
    </button>
  {/if}
</div>

<style>
  :global(body) {
    margin: 0;
    font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    background: #0e1117;
    color: #f4f6fb;
  }

  .page {
    max-width: 1080px;
    margin: 0 auto;
    padding: 1.25rem 1rem 3rem;
  }

  .topbar {
    display: flex;
    align-items: center;
    gap: 1rem;
    justify-content: space-between;
    padding: 0.5rem 0;
  }

  .brand {
    font-weight: 800;
    font-size: 1.5rem;
    color: #00a8ff;
    letter-spacing: -0.02em;
  }

  .account-chip {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.82rem;
    color: #b3c1d8;
    background: #121825;
    border: 1px solid #252f44;
    border-radius: 999px;
    padding: 0.4rem 0.7rem;
    white-space: nowrap;
  }

  .account-chip span {
    color: #dbe5f7;
  }

  .theme-toggle {
    font: inherit;
    border-radius: 999px;
    border: 1px solid #37445f;
    background: #0b1222;
    color: #f4f6fb;
    padding: 0.25rem 0.6rem;
    cursor: pointer;
    font-size: 0.78rem;
    font-weight: 600;
  }

  :global(body[data-theme='light']) {
    background: #eef3fb;
    color: #0f172a;
  }

  :global(body[data-theme='light'] .brand) {
    color: #0077c8;
  }

  :global(body[data-theme='light'] .account-chip) {
    color: #465a7b;
    background: #e1e9f7;
    border-color: #c8d5eb;
  }

  :global(body[data-theme='light'] .account-chip span) {
    color: #1f2f46;
  }

  :global(body[data-theme='light'] .theme-toggle) {
    background: #0f172a;
    border-color: #0f172a;
    color: #f8fafc;
  }

  :global(body[data-theme='light'] .eyebrow) {
    color: #5b6f93;
  }

  :global(body[data-theme='light'] .subtext) {
    color: #334155;
  }

  :global(body[data-theme='light'] .postcard-frame),
  :global(body[data-theme='light'] .credentials-box),
  :global(body[data-theme='light'] .card),
  :global(body[data-theme='light'] .memory-card) {
    background: #ffffff;
    border-color: #d3deef;
  }

  :global(body[data-theme='light'] .postcard-meta) {
    background: #f5f8ff;
    border-top-color: #d3deef;
  }

  :global(body[data-theme='light'] .meta-grid p),
  :global(body[data-theme='light'] .memory-card h3),
  :global(body[data-theme='light'] h2),
  :global(body[data-theme='light'] .postcard-meta h3) {
    color: #1f2937;
  }

  :global(body[data-theme='light'] .meta-grid span),
  :global(body[data-theme='light'] .subtitle),
  :global(body[data-theme='light'] .memory-card p),
  :global(body[data-theme='light'] .memory-empty),
  :global(body[data-theme='light'] .upload-status),
  :global(body[data-theme='light'] .credentials-form label) {
    color: #5b6b88;
  }

  :global(body[data-theme='light'] .ghost) {
    color: #1f2f46;
    border-color: #b8c7df;
  }

  :global(body[data-theme='light'] .image-field-input),
  :global(body[data-theme='light'] .credentials-form input) {
    color: #1f2937;
    background: #ffffff;
    border-color: #bfd0e8;
  }

  .cta,
  .ghost {
    font: inherit;
    border: none;
    border-radius: 999px;
    padding: 0.6rem 1rem;
    cursor: pointer;
  }

  .cta {
    background: #00a8ff;
    color: #00121d;
    font-weight: 700;
  }

  .ghost {
    background: transparent;
    color: #dbe5f7;
    border: 1px solid #37445f;
  }

  .hero {
    padding: 3.5rem 0 2rem;
    max-width: 700px;
  }

  .eyebrow {
    margin: 0;
    color: #8ea0bf;
    letter-spacing: 0.08em;
    font-size: 0.75rem;
    font-weight: 700;
  }

  .subtext {
    margin: 0;
    max-width: 60ch;
    color: #dbe5f7;
    font-size: 1.05rem;
    line-height: 1.55;
    font-weight: 500;
  }

  .hero-actions {
    margin-top: 1.25rem;
    display: flex;
    gap: 0.65rem;
    flex-wrap: wrap;
  }

  .upload-input {
    display: none;
  }

  .upload-status {
    margin: 0.65rem 0 0;
    color: #b3c1d8;
    font-size: 0.9rem;
  }

  .image-field-input {
    font: inherit;
    color: #f4f6fb;
    background: #121825;
    border: 1px solid #37445f;
    border-radius: 999px;
    padding: 0.55rem 0.8rem;
    width: min(100%, 640px);
    flex: 1 1 100%;
    box-sizing: border-box;
  }

  .credentials-box {
    margin-top: 1rem;
    width: min(100%, 640px);
    border-radius: 0.9rem;
    border: 1px solid #252f44;
    background: #171d29;
    padding: 1rem;
  }

  .credentials-box h3 {
    margin: 0;
    font-size: 1.05rem;
  }

  .credentials-form {
    margin-top: 0.9rem;
    display: grid;
    gap: 0.7rem;
  }

  .credentials-form label {
    display: grid;
    gap: 0.35rem;
    font-size: 0.86rem;
    color: #b3c1d8;
  }

  .credentials-form input {
    font: inherit;
    color: #f4f6fb;
    background: #121825;
    border: 1px solid #37445f;
    border-radius: 0.55rem;
    padding: 0.55rem 0.65rem;
  }

  .credentials-error {
    margin: 0;
    color: #ff9f9f;
  }

  .postcard-frame {
    margin-top: 1rem;
    width: min(100%, 640px);
    min-height: 180px;
    border-radius: 0.9rem;
    border: 1px solid #252f44;
    background: #171d29;
    overflow: hidden;
  }

  .loading-state {
    min-height: 180px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    color: #b3c1d8;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border-radius: 999px;
    border: 2px solid #3e4c68;
    border-top-color: #00a8ff;
    animation: spin 0.8s linear infinite;
  }

  #scanned-postcard {
    display: block;
    width: 100%;
    height: auto;
    object-fit: cover;
  }

  .postcard-meta {
    padding: 0.85rem 0.9rem 1rem;
    border-top: 1px solid #252f44;
    background: #121825;
  }

  .postcard-meta h3 {
    margin: 0;
    font-size: 1.05rem;
  }

  .subtitle {
    margin: 0.2rem 0 0.75rem;
    color: #a9bbd8;
    font-size: 0.92rem;
  }

  .meta-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 0.55rem;
  }

  .meta-grid p {
    margin: 0;
    font-size: 0.88rem;
    color: #dbe5f7;
  }

  .meta-grid span {
    display: block;
    margin-bottom: 0.15rem;
    color: #8ea0bf;
    font-size: 0.74rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
  }

  .grid-title {
    margin: 0 0 0.75rem;
    font-size: 1.2rem;
  }

  .collection-memory {
    margin: 0.5rem 0 1.2rem;
  }

  .collection-memory h2 {
    margin: 0 0 0.75rem;
    font-size: 1.2rem;
  }

  .memory-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
  }

  .memory-card {
    background: #171d29;
    border: 1px solid #252f44;
    border-radius: 0.9rem;
    padding: 0.75rem;
  }

  .memory-image {
    display: block;
    width: 100%;
    height: 128px;
    border-radius: 0.65rem;
    object-fit: cover;
    border: 1px solid #294362;
  }

  .memory-card h3 {
    margin: 0.7rem 0 0.2rem;
    font-size: 1rem;
  }

  .memory-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .memory-card p,
  .memory-empty {
    margin: 0;
    color: #b3c1d8;
    font-size: 0.92rem;
  }

  .card {
    background: #171d29;
    border: 1px solid #252f44;
    border-radius: 0.9rem;
    padding: 0.75rem;
  }

  .collection-image {
    display: block;
    width: 100%;
    height: 128px;
    border-radius: 0.65rem;
    object-fit: cover;
    border: 1px solid #294362;
  }

  .image-trigger {
    border: none;
    background: transparent;
    padding: 0;
    margin: 0;
    width: 100%;
    cursor: zoom-in;
  }

  .image-lightbox {
    position: fixed;
    inset: 0;
    z-index: 999;
    background: rgba(7, 10, 15, 0.92);
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    margin: 0;
    cursor: zoom-out;
  }

  .lightbox-image {
    max-width: min(96vw, 1400px);
    max-height: 96vh;
    width: auto;
    height: auto;
    object-fit: contain;
    border-radius: 0.65rem;
  }

  h2 {
    margin: 0.7rem 0 0.2rem;
    font-size: 1rem;
  }

  @media (max-width: 680px) {
    .page {
      padding: 0.9rem 0.8rem 2rem;
    }

    .brand {
      font-size: 1.22rem;
    }

    .hero {
      padding: 2rem 0 1.3rem;
    }

    .subtext {
      font-size: 0.98rem;
      line-height: 1.5;
    }

    .account-chip {
      width: 100%;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.5rem;
      white-space: normal;
      order: 2;
      border-radius: 0.8rem;
      padding: 0.5rem 0.65rem;
    }

    .theme-toggle {
      width: 100%;
      min-height: 40px;
    }

    .postcard-frame,
    .credentials-box {
      width: 100%;
      border-radius: 0.8rem;
    }

    .postcard-meta {
      padding: 0.8rem;
    }

    .meta-grid {
      grid-template-columns: 1fr;
      gap: 0.6rem;
    }

    .hero-actions {
      margin-top: 1rem;
      gap: 0.55rem;
    }

    .hero-actions .cta,
    .hero-actions .ghost,
    .image-field-input {
      width: 100%;
      min-height: 42px;
    }

    .credentials-form input,
    .cta,
    .ghost {
      min-height: 42px;
    }

    .grid,
    .memory-grid {
      grid-template-columns: 1fr;
      gap: 0.8rem;
    }

    .collection-image,
    .memory-image {
      height: 156px;
    }

    .topbar {
      flex-wrap: wrap;
      gap: 0.65rem;
    }

  }

  @media (max-width: 420px) {
    .brand {
      font-size: 1.12rem;
    }

    .eyebrow {
      font-size: 0.68rem;
      letter-spacing: 0.06em;
    }

    .subtext {
      font-size: 0.94rem;
    }

    .postcard-meta h3,
    .collection-memory h2,
    .grid-title {
      font-size: 1rem;
    }

    .meta-grid p,
    .memory-card p {
      font-size: 0.86rem;
    }
  }
</style>