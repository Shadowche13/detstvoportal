/* ==========================================
   МОДУЛ ЗА ПЛЕЙЪР (player.js)
   ========================================== */

function convertToEmbedUrl(rawUrl) {
  if (!rawUrl) return "";
  let cleanUrl = String(rawUrl).trim();
  
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

function openMediaViewer(titleText, mediaSourceUrl) {
  if (typeof hideAllViews === "function") {
    hideAllViews();
  }

  const watchView = document.getElementById("watch-view");
  if (!watchView) return;

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