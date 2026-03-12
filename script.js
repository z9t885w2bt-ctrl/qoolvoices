const page = document.body.dataset.page;

/* =========================
   Supabase client
========================= */
async function getSupabase() {
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");

  const supabaseUrl = "https://cfkbxrskhwxxeufkxpnd.supabase.co";
  const supabaseAnonKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNma2J4cnNraHd4eGV1Zmt4cG5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMzUxMzIsImV4cCI6MjA4ODgxMTEzMn0.vDQNQYGv4DeHW-pOJKBuWUjAH8LugMBWjUcCw1HHJ0w";

  return createClient(supabaseUrl, supabaseAnonKey);
}

/* =========================
   Home news slider
========================= */
function initNewsSlider() {
  const newsSlider = document.getElementById("newsSlider");
  const slideLeft = document.getElementById("slideLeft");
  const slideRight = document.getElementById("slideRight");

  if (!newsSlider || !slideLeft || !slideRight) return;

  slideLeft.addEventListener("click", () => {
    newsSlider.scrollBy({
      left: -newsSlider.clientWidth,
      behavior: "smooth"
    });
  });

  slideRight.addEventListener("click", () => {
    newsSlider.scrollBy({
      left: newsSlider.clientWidth,
      behavior: "smooth"
    });
  });
}

/* =========================
   Helpers
========================= */
function parseMultiValue(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatRegion(region) {
  const map = {
    north: "北部",
    middle: "中部",
    south: "南部",
    east: "東部",
    outer_islands: "離島"
  };

  return map[region] || region;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* =========================
   Directory page
========================= */
async function initDirectory() {
  if (page !== "directory") return;

  const regionFilter = document.getElementById("regionFilter");
  const roleFilter = document.getElementById("roleFilter");
  const sceneFilter = document.getElementById("sceneFilter");
  const resetButton = document.getElementById("resetFilters");
  const resultCount = document.getElementById("resultCount");
  const directoryGrid = document.getElementById("directoryGrid");
  const directoryEmpty = document.getElementById("directoryEmpty");

  if (!directoryGrid) return;

  let approvedProfiles = [];

  function renderDirectoryCards(items) {
    if (!items.length) {
      directoryGrid.innerHTML = "";
      if (resultCount) resultCount.textContent = "0";
      if (directoryEmpty) directoryEmpty.hidden = false;
      return;
    }

    directoryGrid.innerHTML = items
      .map((profile) => {
        const regions = parseMultiValue(profile.city);
        const roles = parseMultiValue(profile.role);
        const sceneAffiliations = parseMultiValue(profile.sceneAffiliation);

        const regionText = regions.length
          ? regions.map(formatRegion).join("、")
          : "未填寫地區";

        const roleText = roles.length ? roles.join("、") : "未填寫";
        const sceneAffiliationText = sceneAffiliations.length
          ? sceneAffiliations.join("、")
          : "未填寫";

        const nameText = escapeHtml(profile.name || "未命名");
        const bioText = escapeHtml(profile.bio || "");
        const contactText = escapeHtml(profile.contact || "未提供");

        return `
          <article class="profile-card">
            <h3>${nameText}</h3>
            <p class="profile-meta">${escapeHtml(regionText)}</p>
            <p><strong>職能：</strong>${escapeHtml(roleText)}</p>
            <p><strong>活躍場景：</strong>${escapeHtml(sceneAffiliationText)}</p>
            ${bioText ? `<p>${bioText}</p>` : ""}
            <p><strong>聯絡方式：</strong>${contactText}</p>
          </article>
        `;
      })
      .join("");

    if (resultCount) resultCount.textContent = String(items.length);
    if (directoryEmpty) directoryEmpty.hidden = true;
  }

  function filterProfiles() {
    const selectedRegion = regionFilter?.value || "all";
    const selectedRole = roleFilter?.value || "all";
    const selectedScene = sceneFilter?.value || "all";

    const filtered = approvedProfiles.filter((profile) => {
      const regions = parseMultiValue(profile.city);
      const roles = parseMultiValue(profile.role);
      const sceneAffiliations = parseMultiValue(profile.sceneAffiliation);

      const regionMatch =
        selectedRegion === "all" || regions.includes(selectedRegion);

      const roleMatch =
        selectedRole === "all" || roles.includes(selectedRole);

      const sceneMatch =
        selectedScene === "all" || sceneAffiliations.includes(selectedScene);

      return regionMatch && roleMatch && sceneMatch;
    });

    renderDirectoryCards(filtered);
  }

  try {
    const supabase = await getSupabase();

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("review_status", "approved")
      .eq("consent_public", true)
      .order("created_at", { ascending: false });

    if (error) throw error;

    approvedProfiles = data || [];
    filterProfiles();

    regionFilter?.addEventListener("change", filterProfiles);
    roleFilter?.addEventListener("change", filterProfiles);
    sceneFilter?.addEventListener("change", filterProfiles);

    resetButton?.addEventListener("click", () => {
      if (regionFilter) regionFilter.value = "all";
      if (roleFilter) roleFilter.value = "all";
      if (sceneFilter) sceneFilter.value = "all";
      filterProfiles();
    });
  } catch (error) {
    directoryGrid.innerHTML = `
      <p class="error-text">${escapeHtml(error.message || "讀取資料失敗")}</p>
    `;
  }
}

/* =========================
   Submit page
========================= */
async function initSubmit() {
  if (page !== "submit") return;

  const form = document.getElementById("submitForm");
  const message = document.getElementById("formMessage");

  if (!form || !message) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(form);

    const regions = Array.from(
      document.querySelectorAll('input[name="regions"]:checked')
    ).map((cb) => cb.value);

    const roles = Array.from(
      document.querySelectorAll('input[name="roles"]:checked')
    ).map((cb) => cb.value);

    const sceneAffiliations = Array.from(
      document.querySelectorAll('input[name="sceneAffiliation"]:checked')
    ).map((cb) => cb.value);

    const payload = {
      name: formData.get("name")?.toString().trim() || "",
      city: regions.join(", "),
      role: roles.join(", "),
      sceneAffiliation: sceneAffiliations,
      bio: formData.get("bio")?.toString().trim() || "",
      contact: formData.get("contact")?.toString().trim() || "",
      collab: "",
      consent_public: formData.get("consent_public") === "on",
      review_status: "pending"
    };

    message.textContent = "送出中...";

    try {
      const supabase = await getSupabase();

      const { error } = await supabase
        .from("profiles")
        .insert([payload]);

      if (error) throw error;

      message.textContent = "送出成功，等待審核";
      form.reset();
    } catch (error) {
      message.textContent = error.message || "送出失敗，請稍後再試";
    }
  });
}

/* =========================
   Init
========================= */
initNewsSlider();
initDirectory();
initSubmit();