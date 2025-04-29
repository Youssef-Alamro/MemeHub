document.addEventListener('DOMContentLoaded', () => {
    // Dark mode toggle
    const darkModeToggle = document.getElementById('darkModeToggle');
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Check local storage for dark mode preference
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'dark') {
        document.body.setAttribute('data-dark-mode', 'true');
        darkModeToggle.setAttribute('aria-pressed', 'true');
    } else if (currentTheme === 'light') {
        document.body.setAttribute('data-dark-mode', 'false');
        darkModeToggle.setAttribute('aria-pressed', 'false');
    } else if (prefersDarkScheme.matches) {
        document.body.setAttribute('data-dark-mode', 'true');
        darkModeToggle.setAttribute('aria-pressed', 'true');
    }
    
    darkModeToggle.addEventListener('click', () => {
        const isDark = document.body.getAttribute('data-dark-mode') === 'true';
        document.body.setAttribute('data-dark-mode', !isDark);
        darkModeToggle.setAttribute('aria-pressed', !isDark);
        localStorage.setItem('theme', isDark ? 'light' : 'dark');
    });

    const memeContainer = document.getElementById('memeContainer');
    const postMemeBtn = document.getElementById('postMemeBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const profileBtn = document.getElementById('profileBtn');
    const searchBar = document.getElementById('searchBar');
    const searchBtn = document.getElementById('searchBtn');
    
    let currentUser = null;
    let viewingUserMemes = false;
    let currentUserViewingId = null;

    async function fetchMemes(userIdToFilter = null) {
        memeContainer.innerHTML = '<div class="loading-message">Memes laden...</div>';
        let query = memeCollection.orderBy('timestamp', 'desc');

        if (userIdToFilter) {
            query = query.where('userId', '==', userIdToFilter);
            viewingUserMemes = true;
            currentUserViewingId = userIdToFilter;
        } else {
            viewingUserMemes = false;
            currentUserViewingId = null;
        }

        try {
            const querySnapshot = await query.get();
            
            if (querySnapshot.empty) {
                memeContainer.innerHTML = `<div class="empty-message">${viewingUserMemes ? 'Deze gebruiker heeft nog geen memes geplaatst.' : 'Er zijn nog geen memes geplaatst.'}</div>`;
                return;
            }

            memeContainer.innerHTML = '';
            const likedMemeIds = currentUser ? await getLikedMemeIds(currentUser.uid) : [];

            for (const doc of querySnapshot.docs) {
                const memeData = doc.data();
                const memeId = doc.id;
                const isLiked = currentUser ? likedMemeIds.includes(memeId) : false;
                
                // Haal gebruikersgegevens op
                const userDoc = await usersCollection.doc(memeData.userId).get();
                const username = userDoc.exists ? userDoc.data().username : 'Anoniem';
                const userInitial = username.charAt(0).toUpperCase();

                // Maak meme card
                const memeCard = document.createElement('div');
                memeCard.classList.add('meme-card');
                memeCard.dataset.memeId = memeId;
                
                memeCard.innerHTML = `
                    <div class="meme-content">
                        <div class="meme-user">
                            <div class="user-avatar">${userInitial}</div>
                            <a href="#" class="user-name user-link" data-user-id="${memeData.userId}">${username}</a>
                        </div>
                        <p class="meme-text">${memeData.text}</p>
                        <div class="like-section">
                            <button class="like-btn ${isLiked ? 'liked' : ''}" data-meme-id="${memeId}">
                                <i class="fas fa-thumbs-up"></i>
                                ${isLiked ? 'Unlike' : 'Like'}
                            </button>
                            <span class="like-count" data-like-count="${memeId}">0 likes</span>
                        </div>
                    </div>
                `;
                
                memeContainer.appendChild(memeCard);
                await fetchLikeCount(memeId);
            }
        } catch (error) {
            console.error("Fout bij het ophalen van memes:", error);
            memeContainer.innerHTML = `
                <div class="error-message">
                    Fout bij het laden: ${error.message}<br>
                    Probeer de pagina te verversen.
                </div>
            `;
        }
    }

    // Functie om gelikete memes op te halen
    async function getLikedMemeIds(userId) {
        try {
            const likedMemeQuery = await likesCollection.where('userId', '==', userId).get();
            return likedMemeQuery.docs.map(doc => doc.data().memeId);
        } catch (error) {
            console.error("Fout bij ophalen likes:", error);
            return [];
        }
    }

    // Functie om like count op te halen
    async function fetchLikeCount(memeId) {
        try {
            const querySnapshot = await likesCollection.where('memeId', '==', memeId).get();
            const likeCountSpan = document.querySelector(`[data-like-count="${memeId}"]`);
            if (likeCountSpan) {
                likeCountSpan.textContent = `${querySnapshot.size} ${querySnapshot.size === 1 ? 'like' : 'likes'}`;
            }
        } catch (error) {
            console.error("Fout bij ophalen like count:", error);
        }
    }

    // Functie om te liken/unliken
    async function toggleLike(memeId, userId) {
        try {
            // Check of de gebruiker deze meme al heeft geliket
            const likeQuery = await likesCollection
                .where('memeId', '==', memeId)
                .where('userId', '==', userId)
                .get();

            if (!likeQuery.empty) {
                // Unlike - verwijder het like document
                for (const doc of likeQuery.docs) {
                    await doc.ref.delete();
                }
                return false; // Return false voor unlike
            } else {
                // Like - voeg een nieuw like document toe
                await likesCollection.add({
                    memeId: memeId,
                    userId: userId,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
                return true; // Return true voor like
            }
        } catch (error) {
            console.error("Fout bij liken:", error);
            throw error;
        }
    }

    // Event listeners voor de knoppen
    postMemeBtn.addEventListener('click', async function() {
        if (!currentUser) {
            alert('Je moet ingelogd zijn om een meme te posten.');
            return;
        }

        const memeText = prompt('Voer hier je tekst-meme in:');
        if (memeText && memeText.trim() !== '') {
            try {
                // Haal gebruikersnaam op
                const userDoc = await usersCollection.doc(currentUser.uid).get();
                const username = userDoc.exists ? userDoc.data().username : 'Anoniem';

                // Post de meme
                await memeCollection.add({
                    text: memeText.trim(),
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    userId: currentUser.uid,
                    username: username,
                });

                fetchMemes(currentUserViewingId);
            } catch (error) {
                console.error("Fout bij posten meme:", error);
                alert('Er is een fout opgetreden bij het posten van de meme.');
            }
        }
    });

    profileBtn.addEventListener('click', function() {
        if (currentUser) {
            fetchMemes(currentUser.uid);
        }
    });

    logoutBtn.addEventListener('click', function() {
        auth.signOut().then(() => {
            window.location.href = '/login.html';
        }).catch((error) => {
            console.error('Fout bij uitloggen:', error);
            alert('Er is een fout opgetreden bij het uitloggen.');
        });
    });

    searchBtn.addEventListener('click', function() {
        const searchTerm = searchBar.value.trim().toLowerCase();
        if (searchTerm) {
            searchMemes(searchTerm);
        } else {
            fetchMemes(currentUserViewingId);
        }
    });

    searchBar.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            searchBtn.click();
        }
    });

    // Like/unlike handler
    document.addEventListener('click', async (event) => {
        if (event.target.classList.contains('like-btn') || event.target.closest('.like-btn')) {
            const likeBtn = event.target.classList.contains('like-btn') ? 
                event.target : event.target.closest('.like-btn');
            const memeId = likeBtn.dataset.memeId;

            if (!currentUser) {
                alert('Je moet ingelogd zijn om memes te liken.');
                return;
            }

            try {
                const wasLiked = await toggleLike(memeId, currentUser.uid);
                
                // Update UI
                likeBtn.classList.toggle('liked', wasLiked);
                likeBtn.innerHTML = `
                    <i class="fas fa-thumbs-up"></i>
                    ${wasLiked ? 'Unlike' : 'Like'}
                `;
                
                // Update like count
                await fetchLikeCount(memeId);
            } catch (error) {
                console.error("Fout bij liken:", error);
                alert('Er is een fout opgetreden bij het liken van de meme.');
            }
        } else if (event.target.classList.contains('user-link') || event.target.closest('.user-link')) {
            event.preventDefault();
            const userLink = event.target.classList.contains('user-link') ? 
                event.target : event.target.closest('.user-link');
            const userId = userLink.dataset.userId;
            fetchMemes(userId);
        }
    });

    // Zoekfunctie
    async function searchMemes(searchTerm) {
        memeContainer.innerHTML = '<div class="loading-message">Zoeken naar memes...</div>';
        try {
            const querySnapshot = await memeCollection
                .orderBy('text')
                .startAt(searchTerm)
                .endAt(searchTerm + '\uf8ff')
                .get();

            memeContainer.innerHTML = '';
            if (querySnapshot.empty) {
                memeContainer.innerHTML = '<div class="empty-message">Geen memes gevonden die overeenkomen met je zoekterm.</div>';
                return;
            }

            const likedMemeIds = currentUser ? await getLikedMemeIds(currentUser.uid) : [];
            
            for (const doc of querySnapshot.docs) {
                const memeData = doc.data();
                const memeId = doc.id;
                const isLiked = currentUser ? likedMemeIds.includes(memeId) : false;
                
                const userDoc = await usersCollection.doc(memeData.userId).get();
                const username = userDoc.exists ? userDoc.data().username : 'Anoniem';
                const userInitial = username.charAt(0).toUpperCase();

                const memeCard = document.createElement('div');
                memeCard.classList.add('meme-card');
                memeCard.dataset.memeId = memeId;
                
                memeCard.innerHTML = `
                    <div class="meme-content">
                        <div class="meme-user">
                            <div class="user-avatar">${userInitial}</div>
                            <a href="#" class="user-name user-link" data-user-id="${memeData.userId}">${username}</a>
                        </div>
                        <p class="meme-text">${memeData.text}</p>
                        <div class="like-section">
                            <button class="like-btn ${isLiked ? 'liked' : ''}" data-meme-id="${memeId}">
                                <i class="fas fa-thumbs-up"></i>
                                ${isLiked ? 'Unlike' : 'Like'}
                            </button>
                            <span class="like-count" data-like-count="${memeId}">0 likes</span>
                        </div>
                    </div>
                `;
                
                memeContainer.appendChild(memeCard);
                await fetchLikeCount(memeId);
            }
        } catch (error) {
            console.error("Fout bij zoeken:", error);
            memeContainer.innerHTML = `
                <div class="error-message">
                    Fout bij zoeken: ${error.message}
                </div>
            `;
        }
    }

    // Auth state observer
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            console.log("Gebruiker ingelogd:", user.uid);
            fetchMemes();
        } else {
            currentUser = null;
            window.location.href = '/login.html';
        }
    });
});
