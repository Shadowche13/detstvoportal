document.addEventListener("DOMContentLoaded", () => {
  initBogifyApp();
});

function initBogifyApp() {
  setupPinLockMechanism();
  loadCatalogData();
}

/* 1. ПИН ЗАЩИТА */
function setupPinLockMechanism() {
  const lockScreen = document.getElementById("lock-screen");
  const siteContainer = document.getElementById("site");

  if (localStorage.getItem("bogify_unlocked") === "true") {
    if (lockScreen) lockScreen.style.display = "none";
    if (siteContainer) siteContainer.style.display = "block";
    return;
  }

  if (!lockScreen) return;

  lockScreen.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; height: 100vh; background: #101010;">
      <div style="text-align: center; background: #181818; padding: 40px; border-radius: 12px; border: 1px solid #333; width: 100%; max-width: 400px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
        <h2 style="color: #e50914; margin-bottom: 10px; font-size: 2rem;">Детство</h2>
        <p style="color: #aaa; margin-bottom: 25px; font-size: 0.9rem;">Въведете 6-цифрен код за достъп:</p>
        <input type="password" id="desktop-pin-input" maxlength="6" placeholder="••••••" style="width: 100%; padding: 12px; font-size: 1.5rem; text-align: center; background: #111; color: #fff; border: 1px solid #444; border-radius: 6px; letter-spacing: 5px; outline: none; margin-bottom: 15px; box-sizing: border-box;" />
        <button id="desktop-pin-btn" style="width: 100%; padding: 12px; background: #e50914; color: #fff; border: none; border-radius: 6px; font-size: 1rem; font-weight: bold; cursor: pointer;">Вход</button>
        <div id="desktop-lock-error" style="color: #e50914; margin-top: 15px; font-size: 0.9rem; min-height: 20px;"></div>
      </div>
    </div>
  `;

  const pinInput = document.getElementById("desktop-pin-input");
  const pinBtn = document.getElementById("desktop-pin-btn");
  const errorEl = document.getElementById("desktop-lock-error");

  if (pinInput) pinInput.focus();

  const handleLogin = () => {
    const enteredValue = pinInput.value.trim();
    const validPins = typeof BOGIFY_VALID_PINS !== "undefined" ? BOGIFY_VALID_PINS : ["0879"];

    if (validPins.includes(enteredValue)) {
      localStorage.setItem("bogify_unlocked", "true");
      lockScreen.style.transition = "opacity 0.4s ease";
      lockScreen.style.opacity = "0";
      setTimeout(() => {
        lockScreen.style.display = "none";
        siteContainer.style.display = "block";
      }, 400);
    } else {
      errorEl.textContent = "Невалиден код за достъп!";
      pinInput.value = "";
      pinInput.focus();
    }
  };

  if (pinBtn) pinBtn.addEventListener("click", handleLogin);
  if (pinInput) {
    pinInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") handleLogin();
    });
  }
}

/* 2. УНИВЕРСАЛЕН КОНВЕРТОР (YouTube + Google Drive) */
function convertToEmbedUrl(rawUrl) {
  if (!rawUrl) return "";
  let cleanUrl = String(rawUrl).trim();
  
  // Проверка за Google Drive линк
  if (cleanUrl.includes("drive.google.com")) {
    let fileId = "";
    if (cleanUrl.includes("/file/d/")) {
      let parts = cleanUrl.split("/file/d/")[1];
      if (parts) fileId = parts.split("/")[0].split("?")[0];
    } else if (cleanUrl.includes("id=")) {
      try {
        const urlParams = new URLSearchParams(cleanUrl.split("?")[1]);
        fileId = urlParams.get("id");
      } catch (err) {}
    }
    
    if (fileId) {
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }
  }

  // Проверка за YouTube линк
  let videoId = "";
  if (cleanUrl.includes("youtu.be/")) {
    let parts = cleanUrl.split("youtu.be/")[1];
    if (parts) videoId = parts.split("?")[0].split("&")[0];
  } else if (cleanUrl.includes("youtube.com/watch")) {
    try {
      const urlParams = new URLSearchParams(cleanUrl.split("?")[1]);
      videoId = urlParams.get("v");
    } catch (err) {}
  } else if (cleanUrl.includes("youtube.com/embed/")) {
    let parts = cleanUrl.split("youtube.com/embed/")[1];
    if (parts) videoId = parts.split("?")[0].split("&")[0];
  } else if (cleanUrl.length === 11 && !cleanUrl.includes("/")) {
    videoId = cleanUrl;
  }

  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`;
  }
  
  return cleanUrl;
}

/* 3. ЗАРЕЖДАНЕ И ПАРРСВАНЕ НА ДАННИТЕ */
let globalCatalogData = [];
let currentCategoryFilter = "Всички";
let currentSearchQuery = "";
let currentCarouselIndex = 0;
let carouselInterval = null;

async function loadCatalogData() {
  const gridContainer = document.getElementById("media-grid");
  if (!gridContainer) return;

  const MOVIES_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxbTu3x7iCYVf2HyrznMY5ULSq5DhdgyHs_Mtkd8Lokbi3W6ySixFulK6kCxiq2LO4/exec";

  try {
    const response = await fetch(MOVIES_SCRIPT_URL);
    const textData = await response.text();
    const parsedData = JSON.parse(textData);

    let rawData = Array.isArray(parsedData) ? parsedData : (parsedData.data || parsedData.rows || Object.values(parsedData));
    gridContainer.innerHTML = "";

    if (!Array.isArray(rawData) || rawData.length === 0) {
      gridContainer.innerHTML = `<div style="color:#fff; padding:20px;">Таблицата е празна.</div>`;
      return;
    }

    function cleanVal(val) {
      if (val === null || val === undefined) return "";
      if (typeof val === "object") {
        const subVals = Object.values(val);
        return subVals.length > 0 ? String(subVals[0] || "").trim() : "";
      }
      return String(val).trim();
    }

    globalCatalogData = [];

    rawData.forEach((item, index) => {
      if (index === 0) return;

      let r = Array.isArray(item) ? item : Object.values(item);

      let title = cleanVal(r[0]);
      let kind = cleanVal(r[1]);
      let episodeName = cleanVal(r[2]);
      let season = cleanVal(r[3]);
      let episodeNum = cleanVal(r[4]);
      let videoUrl = cleanVal(r[5]);
      let posterUrl = cleanVal(r[6]);

      if (!title || title.toLowerCase().includes("име") || title.toLowerCase().includes("наименование")) {
        return;
      }

      globalCatalogData.push({
        title: title,
        kind: kind || "Сериал",
        episodeName: episodeName || `Епизод ${episodeNum}`,
        season: season || "1",
        episode: episodeNum || "1",
        videoUrl: videoUrl,
        posterUrl: posterUrl ? posterUrl : `https://via.placeholder.com/300x450/181818/ffffff?text=${encodeURIComponent(title)}`
      });
    });

    renderHomeCatalog();

  } catch (error) {
    console.error("Грешка:", error);
    gridContainer.html = `<div style="color:#fff; padding:20px;">Грешка при връзка с таблицата.</div>`;
  }
}

/* 4. РЕНДИРАНЕ НА НАЧАЛНИЯ КАТАЛОГ */
function renderHomeCatalog() {
  hideAllViews();
  document.getElementById("home-view").style.display = "block";

  const showsMap = {};
  globalCatalogData.forEach(item => {
    if (!showsMap[item.title]) {
      showsMap[item.title] = item;
    }
  });

  const uniqueShows = Object.values(showsMap);

  setupCarousel(uniqueShows.slice(0, 5));

  let filteredShows = uniqueShows.filter(show => {
    const matchesCategory = currentCategoryFilter === "Всички" || show.kind.toLowerCase() === currentCategoryFilter.toLowerCase();
    const matchesSearch = show.title.toLowerCase().includes(currentSearchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const gridContainer = document.getElementById("media-grid");
  gridContainer.innerHTML = "";

  if (filteredShows.length === 0) {
    gridContainer.innerHTML = `<div style="color: #888; padding: 40px; text-align: center; font-size: 1.1rem;">Няма намерени заглавия.</div>`;
    return;
  }

  const gridWrapper = document.createElement("div");
  gridWrapper.className = "media-grid-container";

  filteredShows.forEach(show => {
    const card = document.createElement("div");
    card.className = "media-card";
    card.onclick = () => openSeasonsView(show.title);

    card.innerHTML = `
      <div class="poster-wrapper">
        <img src="${show.posterUrl}" alt="${show.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x450/181818/ffffff?text='+encodeURIComponent('${show.title}')">
      </div>
      <div class="card-info">
        <div class="card-title">${show.title}</div>
        <div class="card-subtitle">${show.kind}</div>
      </div>
    `;
    gridWrapper.appendChild(card);
  });

  gridContainer.appendChild(gridWrapper);
}

/* КАРОСЕЛ ФУНКЦИИ */
function setupCarousel(slidesData) {
  const carouselInner = document.getElementById("carousel-inner");
  if (!carouselInner) return;

  carouselInner.innerHTML = "";
  if (slidesData.length === 0) return;

  slidesData.forEach(show => {
    const slide = document.createElement("div");
    slide.className = "carousel-slide";
    slide.onclick = () => openSeasonsView(show.title);

    slide.innerHTML = `
      <img src="${show.posterUrl}" alt="${show.title}" onerror="this.src='https://via.placeholder.com/1200x500/181818/ffffff?text='+encodeURIComponent('${show.title}')">
      <div class="carousel-gradient"></div>
      <div class="carousel-caption">
        <h2>${show.title}</h2>
        <p>Натисни за преглед на сезоните и епизодите (${show.kind})</p>
      </div>
    `;
    carouselInner.appendChild(slide);
  });

  currentCarouselIndex = 0;
  updateCarouselPosition();

  if (carouselInterval) clearInterval(carouselInterval);
  carouselInterval = setInterval(() => {
    moveCarousel(1);
  }, 5000);
}

function moveCarousel(direction) {
  const carouselInner = document.getElementById("carousel-inner");
  if (!carouselInner) return;
  const totalSlides = carouselInner.children.length;
  if (totalSlides === 0) return;

  currentCarouselIndex = (currentCarouselIndex + direction + totalSlides) % totalSlides;
  updateCarouselPosition();
}

function updateCarouselPosition() {
  const carouselInner = document.getElementById("carousel-inner");
  if (!carouselInner) return;
  carouselInner.style.transform = `translateX(-${currentCarouselIndex * 100}%)`;
}

function filterByCategory(category, btnElement) {
  currentCategoryFilter = category;
  document.querySelectorAll(".filter-chip").forEach(btn => btn.classList.remove("active"));
  if (btnElement) btnElement.classList.add("active");
  renderHomeCatalog();
}

function handleSearch(query) {
  currentSearchQuery = query;
  renderHomeCatalog();
}

/* 5. СЕЗОНИ (С правилно сортиране: Пролог/0 идва преди Сезон 1) */
function openSeasonsView(showTitle) {
  if (carouselInterval) clearInterval(carouselInterval);
  hideAllViews();
  const seasonsView = document.getElementById("seasons-view");
  seasonsView.style.display = "block";

  const showItems = globalCatalogData.filter(i => i.title === showTitle);
  const seasonsMap = {};
  
  showItems.forEach(item => {
    if (!seasonsMap[item.season]) {
      seasonsMap[item.season] = item.posterUrl;
    }
  });

  // Персонализирано сортиране: Пролог, Сезон 0 или текст отиват най-отпред, после числата 1, 2, 3...
  const seasonsSet = Object.keys(seasonsMap).sort((a, b) => {
    let strA = String(a).toLowerCase().trim();
    let strB = String(b).toLowerCase().trim();

    if (strA.includes("пролог") || strA === "0") return -1;
    if (strB.includes("пролог") || strB === "0") return 1;

    let numA = parseFloat(a);
    let numB = parseFloat(b);

    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    return strA.localeCompare(strB);
  });

  seasonsView.innerHTML = `
    <div style="max-width: 1000px; margin: 0 auto;">
      <button onclick="showHomeView()" class="home-btn" style="margin-bottom: 20px;">← Назад към каталога</button>
      <h1 style="color: #fff; margin-bottom: 20px;">${showTitle} - Избери Сезон</h1>
      <div style="display: flex; gap: 20px; flex-wrap: wrap;" id="seasons-grid"></div>
    </div>
  `;

  const seasonsGrid = document.getElementById("seasons-grid");
  seasonsSet.forEach(seasonNum => {
    const poster = seasonsMap[seasonNum];
    const card = document.createElement("div");
    card.style.cssText = "background: #181818; border-radius: 8px; cursor: pointer; width: 180px; text-align: center; border: 1px solid #333; overflow: hidden; transition: transform 0.2s, border-color 0.2s;";
    card.onmouseover = () => { card.style.transform = "scale(1.03)"; card.style.borderColor = "#e50914"; };
    card.onmouseout = () => { card.style.transform = "scale(1)"; card.style.borderColor = "#333"; };
    card.onclick = () => openEpisodesView(showTitle, seasonNum);

    card.innerHTML = `
      <div style="width: 100%; aspect-ratio: 2/3; overflow: hidden; background: #000;">
        <img src="${poster}" alt="${seasonNum}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://via.placeholder.com/300x450/181818/ffffff?text='+encodeURIComponent('${seasonNum}')">
      </div>
      <div style="padding: 12px; color: #fff; font-size: 1.1rem; font-weight: bold;">${isNaN(seasonNum) ? seasonNum : 'Сезон ' + seasonNum}</div>
    `;
    seasonsGrid.appendChild(card);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* 6. ЕПИЗОДИ */
function openEpisodesView(showTitle, seasonNum) {
  hideAllViews();
  const episodesView = document.getElementById("episodes-view");
  episodesView.style.display = "block";

  const episodesList = globalCatalogData.filter(i => i.title === showTitle && String(i.season) === String(seasonNum))
    .sort((a, b) => Number(a.episode) - Number(b.episode));

  episodesView.innerHTML = `
    <div style="max-width: 1000px; margin: 0 auto;">
      <button onclick="openSeasonsView('${showTitle}')" class="home-btn" style="margin-bottom: 20px;">← Назад към сезоните</button>
      <h1 style="color: #fff; margin-bottom: 20px;">${showTitle} — ${isNaN(seasonNum) ? seasonNum : 'Сезон ' + seasonNum}</h1>
      <div style="display: flex; flex-direction: column; gap: 10px;" id="episodes-container"></div>
    </div>
  `;

  const container = document.getElementById("episodes-container");
  episodesList.forEach(ep => {
    const item = document.createElement("div");
    item.style.cssText = "background: #181818; padding: 15px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #333;";

    item.innerHTML = `
      <div>
        <div style="color: #fff; font-weight: font-weight: bold; font-size: 1.1rem;">${ep.episodeName}</div>
        <div style="color: #aaa; font-size: 0.85rem; margin-top: 4px;">Епизод ${ep.episode}</div>
      </div>
      <button class="home-btn" style="background: #e50914; border: none;">Гледай</button>
    `;

    item.querySelector("button").onclick = () => openMediaViewer(`${ep.title} - ${seasonNum} (${ep.episodeName})`, ep.videoUrl);
    container.appendChild(item);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* 7. ПЛЕЙЪР (Специално проектиран да заобикаля блокирането от YouTube) */
function openMediaViewer(titleText, mediaSourceUrl) {
  hideAllViews();
  const watchView = document.getElementById("watch-view");
  watchView.style.display = "block";

  const finalEmbedUrl = convertToEmbedUrl(mediaSourceUrl);
  const isYouTube = mediaSourceUrl.includes("youtube.com") || mediaSourceUrl.includes("youtu.be");

  watchView.innerHTML = `
    <div style="max-width: 1000px; margin: 0 auto; padding-bottom: 40px;">
      <button onclick="showHomeView()" class="home-btn" style="margin-bottom: 15px;">← На начало</button>
      <h2 style="color: #fff; margin-bottom: 15px;">${titleText}</h2>
      
      <div style="position: relative; width: 100%; aspect-ratio: 16/9; background: #000; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 1px solid #333;">
        ${isYouTube ? `
          <div style="text-align: center; padding: 20px;">
            <p style="color: #fff; font-size: 1.1rem; margin-bottom: 20px;">Това видео е от YouTube и изисква директно гледане:</p>
            <a href="${mediaSourceUrl}" target="_blank" class="home-btn" style="display: inline-block; text-decoration: none; background: #e50914; color: #fff; padding: 15px 30px; border-radius: 6px; font-weight: bold; font-size: 1.1rem;">Гледай в YouTube</a>
          </div>
        ` : `
          <iframe src="${finalEmbedUrl}" style="width:100%; height:100%; border:none;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
        `}
      </div>

      ${!isYouTube ? `
        <div style="margin-top: 20px; background: #181818; padding: 20px; border-radius: 8px; border: 1px solid #333; text-align: center;">
          <p style="color: #fff; font-size: 1rem; margin-bottom: 15px; font-weight: 500;">Ако видеото от Google Drive не тръгва:</p>
          <a href="${mediaSourceUrl}" target="_blank" class="home-btn" style="display: inline-block; text-decoration: none; background: #e50914; color: #fff; padding: 12px 25px; border-radius: 6px; font-weight: bold; font-size: 1rem;">Отвори линка директно в нов прозорец</a>
        </div>
      ` : ''}
    </div>
  `;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ПОМОЩНИ ФУНКЦИИ */
function hideAllViews() {
  ["home-view", "seasons-view", "episodes-view", "watch-view"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
}

function showHomeView() {
  renderHomeCatalog();
}