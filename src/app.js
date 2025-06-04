const categoryButtons = document.querySelectorAll(".category-btn");
const restaurantList = document.getElementById("restaurant-list");
const bottomModal = document.getElementById("bottom_modal");
const handle = document.getElementById("handle");

let currentCategory = "all";
let restaurantData = [];
let markers = [];
let customOverlays = [];
let map;

const centerLat = 37.54817;
const centerLng = 127.073403;

const handleHeight = 40; // 핸들 높이
let hiddenY = 0;
let visibleY = 0;

const categoryNames = [
  "한식",
  "중식",
  "일식",
  "양식",
  "분식",
  "치킨",
  "술집",
  "간식",
];

categoryButtons.forEach((button) => {
  button.addEventListener("click", function () {
    categoryButtons.forEach((btn) => btn.classList.remove("active"));
    this.classList.add("active");
    currentCategory = this.dataset.category;
    restaurantList.scrollTop = 0;
    updateRestaurantList();
    updateMarkers();
  });
});

// 바텀 모달 드래그 관련 코드 (터치 및 마우스 이벤트)
function updateModalPositions() {
  const modalHeight = bottomModal.offsetHeight;
  hiddenY = modalHeight - handleHeight;
  visibleY = 0;

  if (!bottomModal.classList.contains("expanded")) {
    bottomModal.style.transform = `translateY(${hiddenY}px)`;
  } else {
    bottomModal.style.transform = `translateY(${visibleY}px)`;
  }
}
window.addEventListener("resize", () => {
  requestAnimationFrame(() => {
    updateModalPositions();
    bottomModal.style.transform = `translateY(${hiddenY}px)`;
  });
});
window.addEventListener("load", updateModalPositions);

let startY = 0;
let isDragging = false;

function onDragStart(y) {
  updateModalPositions();
  isDragging = true;
  startY = y;
}

function onDragMove(y) {
  if (!isDragging) return;
  const deltaY = y - startY;

  // 아래로 충분히 드래그하면 닫힘 상태로
  if (deltaY > 30) {
    bottomModal.style.transform = `translateY(${hiddenY}px)`;
    bottomModal.classList.remove("expanded");
  }

  // 위로 충분히 드래그하면 열림 상태로
  if (deltaY < -30) {
    bottomModal.style.transform = `translateY(${visibleY}px)`;
    bottomModal.classList.add("expanded");
  }
}

function onDragEnd() {
  isDragging = false;
}

handle.addEventListener("touchstart", (e) => {
  e.preventDefault();
  onDragStart(e.touches[0].clientY);
});
document.addEventListener("touchmove", (e) => {
  onDragMove(e.touches[0].clientY);
});
document.addEventListener("touchend", onDragEnd);

handle.addEventListener("mousedown", (e) => onDragStart(e.clientY));
document.addEventListener("mousemove", (e) => onDragMove(e.clientY));
document.addEventListener("mouseup", onDragEnd);

// 마커
function createMarker(place) {
  const marker = new kakao.maps.Marker({
    map,
    position: new kakao.maps.LatLng(Number(place.y), Number(place.x)),
    title: place.place_name,
    image: new kakao.maps.MarkerImage(
      "./public/images/star.png",
      new kakao.maps.Size(20, 20)
    ),
  });

  const content = `
    <div class="customoverlay-box">
      <strong>${place.place_name}</strong><br />
      <span>${place.road_address_name || place.address_name}</span><br />
      <span>📞 ${place.phone || "전화번호 없음"}</span><br />
      <small>📍 거리: ${place.distance}m</small>
    </div>
  `;

  const customOverlay = new kakao.maps.CustomOverlay({
    content,
    position: marker.getPosition(),
    xAnchor: 0.5,
    yAnchor: 1.2,
  });

  kakao.maps.event.addListener(marker, "mouseover", () => {
    hideAllOverlays();
    customOverlay.setMap(map);
  });

  kakao.maps.event.addListener(marker, "mouseout", () => {
    hideAllOverlays();
  });

  return { marker, customOverlay };
}

function hideAllOverlays() {
  customOverlays.forEach((overlay) => overlay.setMap(null));
}

function filterRestaurants(category) {
  return restaurantData.filter((item) => {
    const parts = item.category_name.split(" > ");
    const secondCategory = parts.length > 1 ? parts[1] : "";
    const categoryLabel = categoryNames.includes(secondCategory)
      ? secondCategory
      : "기타";

    if (category === "all") return true;
    if (category === "기타") return categoryLabel === "기타";

    return categoryLabel === category;
  });
}

function clearMarkers() {
  markers.forEach(({ marker }) => marker.setMap(null));
}

function addMarkers(filteredRestaurants) {
  clearMarkers();

  markers = filteredRestaurants.map((place) => {
    const { marker, customOverlay } = createMarker(place);
    return { marker, category: getCategory(place), customOverlay };
  });

  customOverlays = markers.map((m) => m.customOverlay);
}

function getCategory(place) {
  const parts = place.category_name.split(" > ");
  return parts.length > 1 ? parts[1] : "기타";
}

function updateRestaurantList() {
  restaurantList.innerHTML = "";
  const filtered = filterRestaurants(currentCategory).sort(
    (a, b) => a.distance - b.distance
  );

  filtered.forEach((item) => {
    const div = document.createElement("div");
    div.className = "restaurant-item";
    div.dataset.category = item.category_group_code;

    const distanceText =
      item.distance !== undefined ? `${item.distance}m` : "거리정보 없음";

    div.innerHTML = `
      <strong>${item.place_name}</strong><br />
      <span>${item.road_address_name || item.address_name}</span><br />
      <span>📞 ${item.phone || "전화번호 없음"}</span><br />
      <small>📍 거리: ${distanceText}</small>
    `;

    div.addEventListener("click", () => focusOnRestaurant(item));

    restaurantList.appendChild(div);
  });
}

function focusOnRestaurant(item) {
  const markerData = markers.find(
    (m) => m.marker.getTitle() === item.place_name
  );
  if (!markerData) return;

  const { marker, customOverlay } = markerData;

  map.setCenter(marker.getPosition());
  map.setLevel(3);
  hideAllOverlays();
  customOverlay.setMap(map);

  bottomModal.style.transform = `translateY(${hiddenY})`;
  bottomModal.classList.remove("expanded");
}

function updateMarkers() {
  const filtered = filterRestaurants(currentCategory);
  addMarkers(filtered);
}

categoryButtons.forEach((button) => {
  button.addEventListener("click", function () {
    categoryButtons.forEach((btn) => btn.classList.remove("active"));
    this.classList.add("active");
    currentCategory = this.dataset.category;
    restaurantList.scrollTop = 0;

    updateRestaurantList();
    updateMarkers();
  });
});

document.addEventListener("DOMContentLoaded", async () => {
  kakao.maps.load(async () => {
    const mapContainer = document.getElementById("map");
    map = new kakao.maps.Map(mapContainer, {
      center: new kakao.maps.LatLng(centerLat, centerLng),
      level: 2,
    });

    try {
      const res = await fetch("./public/data/restaurants.json");
      restaurantData = await res.json();

      // 최초 마커 생성
      restaurantData.forEach((place) => {
        const { marker, customOverlay } = createMarker(place);
        markers.push({ marker, category: getCategory(place), customOverlay });
        customOverlays.push(customOverlay);
      });
      updateRestaurantList();
    } catch (err) {
      console.error("📛 JSON 데이터 로딩 실패:", err);
    }
  });
});
