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
const newsSlider = document.getElementById("newsSlider");
const slideLeft = document.getElementById("slideLeft");
const slideRight = document.getElementById("slideRight");

if (newsSlider && slideLeft && slideRight) {
  slideLeft.addEventListener("click", () => {
    newsSlider.scrollBy({ left: -newsSlider.clientWidth, behavior: "smooth" });
  });

  slideRight.addEventListener("click", () => {
    newsSlider.scrollBy({ left: newsSlider.clientWidth, behavior: "smooth" });
  });
}

/* =========================
   Helpers
========================= */
function parseMultiValue(value) {
  if (!value) return [];
  return value
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

/* =========================
   Directory page
========================= */
const regionFilter = document.getElementById("regionFilter");
const roleFilter = document.getElementById("roleFilter");
const styleFilter = document.getElementById("styleFilter");
const resetButton = document.getElementById("resetFilters");
const resultCount = document.getElementById("resultCount");
const directoryGrid = document.getElementById("directoryGrid");
const directoryEmpty = document.getElementById("directoryEmpty");

let approvedProfiles = [];

function renderDirectoryCards(items) {
  if (!directoryGrid) return;

  directoryGrid.innerHTML = items
    .map((profile) => {
      const regions = parseMultiValue(profile.city);
      const roles = parseMultiValue(profile.role);
      const styles = parseMultiValue(profile.style);

      const regionText = regions.length
        ? regions.map(formatRegion).join("、")
        : "未填寫地區";

      const roleText = roles.length ? roles.join("、") : "未填寫";
      const styleText = styles.length ? styles.join("、") : "未填寫";

      return `
      <article class="profile-card">
        <h3>${profile.name || ""}</h3>
        <p class="profile-meta">${regionText}</p>
        <p><strong>職能：</strong>${roleText}</p>
        <p><strong>風格：</strong>${styleText}</p>
        <p>${profile.bio || ""}</p>
        <p><strong>聯絡方式：</strong>${profile.contact || "未提供"}</p>
      </article>
    `;
    })
    .join("");
}

function filterProfiles() {
  const selectedRegion = regionFilter?.value || "all";
  const selectedRole = roleFilter?.value || "all";
  const selectedStyle = styleFilter?.value || "all";

  const filtered = approvedProfiles.filter((profile) => {
    const regions = parseMultiValue(profile.city);
    const roles = parseMultiValue(profile.role);
    const styles = parseMultiValue(profile.style);

    const regionMatch =
      selectedRegion === "all" || regions.includes(selectedRegion);

    const roleMatch =
      selectedRole === "all" || roles.includes(selectedRole);

    const styleMatch =
      selectedStyle === "all" ||
      styles.length === 0 ||
      styles.includes(selectedStyle);

    return regionMatch && roleMatch && styleMatch;
  });

  renderDirectoryCards(filtered);

  if (resultCount) resultCount.textContent = filtered.length;
  if (directoryEmpty) directoryEmpty.hidden = filtered.length !== 0;
}

async function initDirectory() {
  if (page !== "directory") return;

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
    styleFilter?.addEventListener("change", filterProfiles);

    resetButton?.addEventListener("click", () => {
      if (regionFilter) regionFilter.value = "all";
      if (roleFilter) roleFilter.value = "all";
      if (styleFilter) styleFilter.value = "all";
      filterProfiles();
    });
  } catch (error) {
    if (directoryGrid) {
      directoryGrid.innerHTML = `<p class="error-text">${error.message || "讀取資料失敗"}</p>`;
    }
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

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const formData = new FormData(form);

    const regions = Array.from(
      document.querySelectorAll('input[name="regions"]:checked')
    ).map((cb) => cb.value);

    const roles = Array.from(
      document.querySelectorAll('input[name="roles"]:checked')
    ).map((cb) => cb.value);

    const styles = Array.from(
      document.querySelectorAll('input[name="styles"]:checked')
    ).map((cb) => cb.value);

    const payload = {
      name: formData.get("name"),
      city: regions.join(", "),
      role: roles.join(", "),
      style: styles.join(", "),
      bio: formData.get("bio") || "",
      contact: formData.get("contact") || "",
      collab: "",
      consent_public: formData.get("consent_public") === "on",
      review_status: "pending"
    };

    message.textContent = "送出中...";

    try {
      const supabase = await getSupabase();

      const { error } = await supabase.from("profiles").insert([payload]);

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
initDirectory();
initSubmit();