// map.js
import { db, auth } from './firebase-config.js';
import { STAMPS_CATALOG } from './stamps-catalog.js';
import { collection, addDoc, getDocs, deleteDoc, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// 1. DEKLARACE PRVKŮ Z DOM
const numberInput = document.getElementById('stamp-number');
const nameInput = document.getElementById('stamp-name');
const addBtn = document.getElementById('add-btn');
const form = document.getElementById('add-stamp-form');
const adminPanel = document.getElementById('admin-panel');
const userStatus = document.getElementById('user-status');

// 2. INICIALIZACE MAPY (Výřez na ČR)
const map = L.map('map').setView([49.8175, 15.4730], 7);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { 
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
}).addTo(map);

let selectedStamp = null;
let isAdmin = false;
const activeMarkers = {};

// 3. SLEDOVÁNÍ STAVU PŘIHLÁŠENÍ UŽIVATELE
onAuthStateChanged(auth, (user) => {
    if (user) {
        if (user.email === 'admin@stampio.cz') {
            isAdmin = true;
            if (adminPanel) adminPanel.style.display = 'block';
            if (userStatus) userStatus.innerHTML = `<i data-lucide="shield" class="icon"></i> Admin | <a href="#" id="logout-btn" style="color: #fef08a;">Odhlásit</a>`;
        } else {
            isAdmin = false;
            if (adminPanel) adminPanel.style.display = 'none';
            if (userStatus) userStatus.innerHTML = `<i data-lucide="user" class="icon"></i> Uživatel1 | <a href="#" id="logout-btn" style="color: #fef08a;">Odhlásit</a>`;
        }

        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                signOut(auth);
            });
        }
    } else {
        isAdmin = false;
        if (adminPanel) adminPanel.style.display = 'none';
        if (userStatus) userStatus.innerHTML = `<a href="login.html" style="color: white; font-weight: 600;"><i data-lucide="log-in" class="icon"></i> Přihlásit se</a>`;
    }
    if (window.lucide) window.lucide.createIcons();
    loadSavedStamps();
});

// 4. BEZPEČNÉ ZPŘESŇOVÁNÍ POLOHY (ZÁLOHA Z OPENSTREETMAP)
async function refineLocationWithGoogleMaps(stampName, defaultLat, defaultLng) {
    const searchQuery = `${stampName}, Česká republika`;
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
        const data = await response.json();

        if (data && data.length > 0 && data[0].lat && data[0].lon) {
            const foundLat = parseFloat(data[0].lat);
            const foundLng = parseFloat(data[0].lon);

            // Kontrola, zda nalezený bod spadá do hranic ČR
            if (foundLat >= 48.5 && foundLat <= 51.1 && foundLng >= 12.0 && foundLng <= 18.9) {
                return { lat: foundLat, lng: foundLng };
            }
        }
    } catch (e) {
        console.warn("Zpřesnění polohy z rozhraní selhalo, použijí se katalogové souřadnice.", e);
    }
    
    // Fallback na bezpečné souřadnice z katalogu
    return { lat: defaultLat, lng: defaultLng };
}

// 5. NAŠEPTÁVAČ PODLE ČÍSLA Z KATALOGU
if (numberInput) {
    numberInput.addEventListener('input', async () => {
        const num = Number(numberInput.value);
        const catalogItem = STAMPS_CATALOG.find(item => item.number === num);

        if (catalogItem) {
            selectedStamp = { ...catalogItem };
            nameInput.value = `${selectedStamp.name} (${selectedStamp.okres || ''})`;
            addBtn.disabled = false;

            // Pokus o zpřesnění na pozadí s bezpečným návratem na původní souřadnice
            const accurateCoords = await refineLocationWithGoogleMaps(
                selectedStamp.name, 
                selectedStamp.lat, 
                selectedStamp.lng
            );

            selectedStamp.lat = accurateCoords.lat;
            selectedStamp.lng = accurateCoords.lng;
        } else {
            nameInput.value = "Známka nenalezena v katalogu";
            addBtn.disabled = true;
        }
    });
}

// 6. NAČTENÍ ULOŽENÝCH ZNÁMEK Z FIREBASE
async function loadSavedStamps() {
    Object.keys(activeMarkers).forEach(id => {
        map.removeLayer(activeMarkers[id]);
        delete activeMarkers[id];
    });

    try {
        const querySnapshot = await getDocs(collection(db, "stamps"));
        querySnapshot.forEach((docSnap) => {
            const stamp = docSnap.data();
            const docId = docSnap.id;
            addMarkerToMap(stamp, docId);
        });
    } catch (e) {
        console.error("Chyba při načítání známek z databáze: ", e);
    }
}

// 7. PŘIDÁNÍ MARKERU A VYTVOŘENÍ POPUPU
function addMarkerToMap(stamp, docId) {
    const marker = L.marker([stamp.lat, stamp.lng]).addTo(map);
    marker.stampNumber = stamp.number;
    activeMarkers[docId] = marker;

    renderPopup(marker, stamp, docId);
}

function renderPopup(marker, stamp, docId) {
    let popupContentHtml = `
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; padding: 4px; min-width: 180px;">
            <div style="font-size: 11px; font-weight: 700; color: #1b4332; margin-bottom: 2px;">TZ č. ${stamp.number}</div>
            <b style="font-size: 15px; color: #1e293b; font-family: 'Playfair Display', serif;">${stamp.name}</b><br>
            <span style="color: #64748b; font-size: 13px;">${stamp.okres ? stamp.okres + ' (' + stamp.kraj + ')' : ''}</span>
    `;

    if (isAdmin) {
        popupContentHtml += `<br><br>
            <div style="display: flex; flex-direction: column; gap: 6px;">
                <button id="move-btn-${docId}" style="background-color: #b5832a; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 12px; width: 100%; display: flex; align-items: center; justify-content: center; gap: 4px;">
                    📌 Posunout polohu
                </button>
                <button id="delete-btn-${docId}" style="background-color: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 12px; width: 100%;">
                    Odebrat ze sbírky
                </button>
            </div>`;
    }
    popupContentHtml += `</div>`;

    const popupDiv = document.createElement('div');
    popupDiv.innerHTML = popupContentHtml;

    if (isAdmin) {
        const deleteBtn = popupDiv.querySelector(`#delete-btn-${docId}`);
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                removeStampFromDb(docId, stamp.name, stamp.number);
            });
        }

        const moveBtn = popupDiv.querySelector(`#move-btn-${docId}`);
        if (moveBtn) {
            moveBtn.addEventListener('click', () => {
                enableMarkerDragging(marker, docId, stamp);
            });
        }
    }

    marker.bindPopup(popupDiv);
}

// 8. MANUÁLNÍ PŘETAHOVÁNÍ BODU (REŽIM ÚPRAVY POLOHY)
function enableMarkerDragging(marker, docId, stamp) {
    marker.closePopup();
    marker.dragging.enable();

    alert(`Režim úpravy poloh pro TZ č. ${stamp.number} (${stamp.name}) je aktivní.\n\nNyní chytněte bod na mapě myší a přetáhněte ho na přesné místo.`);

    marker.once('dragend', async (event) => {
        const newLatLng = event.target.getLatLng();
        const newLat = Number(newLatLng.lat.toFixed(6));
        const newLng = Number(newLatLng.lng.toFixed(6));

        if (confirm(`Chcete uložit novou polohu pro známku č. ${stamp.number}?\n\nZeměpisná šířka: ${newLat}\nZeměpisná délka: ${newLng}`)) {
            try {
                await updateDoc(doc(db, "stamps", docId), {
                    lat: newLat,
                    lng: newLng
                });

                stamp.lat = newLat;
                stamp.lng = newLng;
                renderPopup(marker, stamp, docId);

                alert(`✅ Nová poloha známky č. ${stamp.number} byla úspěšně uložena!`);
            } catch (error) {
                console.error("Chyba při aktualizaci polohy v databázi: ", error);
                alert("❌ Chyba při ukládání nové polohy do databáze.");
            }
        } else {
            marker.setLatLng([stamp.lat, stamp.lng]);
        }

        marker.dragging.disable();
    });
}

// 9. ODEBRÁNÍ ZNÁMKY Z FIREBASE
async function removeStampFromDb(docId, stampName, stampNumber) {
    if (!isAdmin) return;
    if (confirm(`Opravdu chcete odebrat TZ č. ${stampNumber} (${stampName}) ze sbírky?`)) {
        try {
            await deleteDoc(doc(db, "stamps", docId));
            if (activeMarkers[docId]) {
                map.removeLayer(activeMarkers[docId]);
                delete activeMarkers[docId];
            }
        } catch (error) {
            console.error("Chyba při mazání: ", error);
        }
    }
}

// 10. ODESLÁNÍ FORMULÁŘE PŘIDÁNÍ ZNÁMKY
if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!selectedStamp || !isAdmin) return;

        const isDuplicate = Object.values(activeMarkers).some(
            marker => marker.stampNumber === selectedStamp.number
        );

        if (isDuplicate) {
            alert(`Známku č. ${selectedStamp.number} (${selectedStamp.name}) již ve své sbírce máte.`);
            return;
        }

        const newStampData = {
            number: selectedStamp.number,
            name: selectedStamp.name,
            okres: selectedStamp.okres || '',
            kraj: selectedStamp.kraj || '',
            lat: selectedStamp.lat,
            lng: selectedStamp.lng
        };

        try {
            const docRef = await addDoc(collection(db, "stamps"), newStampData);
            addMarkerToMap(newStampData, docRef.id);
            
            map.flyTo([selectedStamp.lat, selectedStamp.lng], 12);

            form.reset();
            nameInput.value = '';
            addBtn.disabled = true;
        } catch (error) {
            console.error("Chyba při ukládání: ", error);
        }
    });
}