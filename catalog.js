// catalog.js
import { STAMPS_CATALOG } from './stamps-catalog.js';
import { db, auth } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const catalogList = document.getElementById('catalog-list');
const searchInput = document.getElementById('catalog-search');
const krajFilter = document.getElementById('kraj-filter');
const catalogCount = document.getElementById('catalog-count');
const userStatus = document.getElementById('user-status');

const ownedStampNumbers = new Set();

onAuthStateChanged(auth, (user) => {
    if (user) {
        const displayName = user.email === 'admin@stampio.cz' ? 'Admin' : user.email.split('@')[0];
        userStatus.innerHTML = `<i data-lucide="user" class="icon"></i> ${displayName} | <a href="#" id="logout-btn" style="color: #fef08a;">Odhlásit</a>`;
        document.getElementById('logout-btn').addEventListener('click', (e) => {
            e.preventDefault();
            signOut(auth);
        });
        loadUserOwnedStamps(user.uid);
    } else {
        userStatus.innerHTML = `<a href="login.html" style="color: white; font-weight: 600;"><i data-lucide="log-in" class="icon"></i> Přihlásit se</a>`;
        ownedStampNumbers.clear();
        filterStamps();
    }
    if (window.lucide) window.lucide.createIcons();
});

async function loadUserOwnedStamps(uid) {
    ownedStampNumbers.clear();
    try {
        const querySnapshot = await getDocs(collection(db, "users", uid, "stamps"));
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.number) {
                ownedStampNumbers.add(data.number);
            }
        });
    } catch (error) {
        console.error("Chyba při načítání známek uživatele: ", error);
    }
    filterStamps();
}

function initKrajFilter() {
    const kraje = new Set();
    STAMPS_CATALOG.forEach(stamp => {
        if (stamp.kraj) kraje.add(stamp.kraj);
    });

    Array.from(kraje).sort().forEach(kraj => {
        const option = document.createElement('option');
        option.value = kraj;
        option.textContent = kraj;
        krajFilter.appendChild(option);
    });
}

function renderCatalog(stamps) {
    catalogList.innerHTML = '';
    catalogCount.textContent = `Zobrazeno ${stamps.length} z ${STAMPS_CATALOG.length} známek`;

    if (stamps.length === 0) {
        catalogList.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--color-text-muted);">Zadaným kritériím neodpovídá žádná známka.</p>`;
        return;
    }

    stamps.forEach(stamp => {
        const isOwned = ownedStampNumbers.has(stamp.number);
        const card = document.createElement('div');
        card.className = `catalog-card ${isOwned ? 'owned' : ''}`;

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div class="stamp-number-badge">TZ č. ${stamp.number}</div>
                ${isOwned ? '<span class="owned-badge"><i data-lucide="check-circle-2" style="width: 14px; height: 14px;"></i> Vlastněno</span>' : ''}
            </div>
            <h3 style="margin: 4px 0 6px 0; color: var(--color-text); font-size: 16px; font-family: var(--font-body);">${stamp.name}</h3>
            <p style="margin: 0; color: var(--color-text-muted); font-size: 13px;"><i data-lucide="map-pin" style="width: 12px; height: 12px;"></i> ${stamp.okres ? stamp.okres + ', ' : ''}${stamp.kraj || 'ČR'}</p>
        `;
        catalogList.appendChild(card);
    });

    if (window.lucide) window.lucide.createIcons();
}

function filterStamps() {
    const query = searchInput.value.toLowerCase().trim();
    const selectedKraj = krajFilter.value;

    const filtered = STAMPS_CATALOG.filter(stamp => {
        const matchesQuery = stamp.number.toString().includes(query) ||
                             stamp.name.toLowerCase().includes(query) ||
                             (stamp.okres && stamp.okres.toLowerCase().includes(query));
        
        const matchesKraj = !selectedKraj || stamp.kraj === selectedKraj;

        return matchesQuery && matchesKraj;
    });

    renderCatalog(filtered);
}

searchInput.addEventListener('input', filterStamps);
krajFilter.addEventListener('change', filterStamps);

initKrajFilter();
renderCatalog(STAMPS_CATALOG);