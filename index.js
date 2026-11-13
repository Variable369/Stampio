// index.js
import { db, auth } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const TOTAL_CZ_STAMPS = 3000;

const statTotal = document.getElementById('stat-total');
const statCoverage = document.getElementById('stat-coverage');
const statTopRegion = document.getElementById('stat-top-region');
const recentGrid = document.getElementById('recent-stamps-grid');
const userStatus = document.getElementById('user-status');

onAuthStateChanged(auth, (user) => {
    if (user) {
        const displayName = user.email === 'admin@stampio.cz' ? 'Admin' : user.email.split('@')[0];
        userStatus.innerHTML = `<i data-lucide="user" class="icon"></i> ${displayName} | <a href="#" id="logout-btn" style="color: #fef08a;">Odhlásit</a>`;
        document.getElementById('logout-btn').addEventListener('click', (e) => {
            e.preventDefault();
            signOut(auth);
        });
        loadUserStats(user.uid);
    } else {
        userStatus.innerHTML = `<a href="login.html" style="color: white; font-weight: 600;"><i data-lucide="log-in" class="icon"></i> Přihlásit se</a>`;
        resetHomeStats();
    }
    if (window.lucide) window.lucide.createIcons();
});

function resetHomeStats() {
    statTotal.textContent = '0';
    statCoverage.textContent = '0,00 %';
    statTopRegion.textContent = '-';
    recentGrid.innerHTML = `
        <p style="text-align: center; color: var(--color-text-muted); width: 100%; grid-column: 1/-1;">
            Pro zobrazení vaší osobní sbírky a statistik se prosím <a href="login.html" style="color: var(--color-primary); font-weight: 600;">přihlaste</a>.
        </p>`;
}

async function loadUserStats(uid) {
    try {
        const querySnapshot = await getDocs(collection(db, "users", uid, "stamps"));
        const stamps = [];
        const regionCounts = {};

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            stamps.push(data);

            if (data.kraj) {
                regionCounts[data.kraj] = (regionCounts[data.kraj] || 0) + 1;
            }
        });

        const totalCount = stamps.length;
        statTotal.textContent = totalCount;

        const coverage = ((totalCount / TOTAL_CZ_STAMPS) * 100).toFixed(2).replace('.', ',');
        statCoverage.textContent = `${coverage} %`;

        let topRegion = '-';
        let maxCount = 0;
        for (const [kraj, count] of Object.entries(regionCounts)) {
            if (count > maxCount) {
                maxCount = count;
                topRegion = kraj;
            }
        }
        statTopRegion.textContent = topRegion !== '-' ? topRegion : 'Zatím neznámý';

        displayRecentStamps(stamps.slice(-3).reverse());

    } catch (error) {
        console.error("Chyba při načítání statistik: ", error);
        recentGrid.innerHTML = `<p style="color: #ef4444; text-align: center;">Chyba při načítání dat.</p>`;
    }
}

function displayRecentStamps(recentList) {
    recentGrid.innerHTML = '';

    if (recentList.length === 0) {
        recentGrid.innerHTML = `<p style="text-align: center; color: var(--color-text-muted); width: 100%; grid-column: 1/-1;">Zatím nemáte ve své sbírce žádné známky.</p>`;
        return;
    }

    recentList.forEach(stamp => {
        const card = document.createElement('div');
        card.className = 'recent-card';
        card.innerHTML = `
            <div class="stamp-number-badge">TZ č. ${stamp.number}</div>
            <h3>${stamp.name}</h3>
            <p><i data-lucide="map-pin" style="width: 14px; height: 14px;"></i> ${stamp.okres ? stamp.okres : 'ČR'} (${stamp.kraj || ''})</p>
        `;
        recentGrid.appendChild(card);
    });

    if (window.lucide) window.lucide.createIcons();
}