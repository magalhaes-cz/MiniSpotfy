// ============================================
// SPOTFY - Aplicação Web Client-Side
// Sistema de gerenciamento de músicas local
// ============================================

// Estado Global da Aplicação
const AppState = {
    // Armazenamento de músicas (IndexedDB)
    db: null,
    musicLibrary: [],
    currentTrack: null,
    currentPlaylist: null,
    playQueue: [],
    currentQueueIndex: -1,
    
    // Estado do player
    audio: new Audio(),
    isPlaying: false,
    isShuffled: false,
    repeatMode: 'off', // 'off', 'all', 'one'
    volume: 0.7,
    
    // Histórico e estatísticas
    playHistory: [],
    favoriteTracks: new Set(),
    
    // Playlists (localStorage)
    playlists: []
};

// ============================================
// INICIALIZAÇÃO DO INDEXEDDB
// ============================================

/**
 * Inicializa o banco de dados IndexedDB para armazenar arquivos de áudio
 * Complexidade: O(1) - Operação de inicialização única
 */
function initIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('SpotfyDB', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            AppState.db = request.result;
            resolve();
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Object Store para músicas
            if (!db.objectStoreNames.contains('musics')) {
                const musicStore = db.createObjectStore('musics', { keyPath: 'id', autoIncrement: true });
                musicStore.createIndex('name', 'name', { unique: false });
                musicStore.createIndex('artist', 'artist', { unique: false });
            }
        };
    });
}

/**
 * Salva um arquivo de áudio no IndexedDB
 * Complexidade: O(1) - Operação de escrita no banco
 */
async function saveMusicToDB(file, metadata) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const musicData = {
                id: Date.now() + Math.random(),
                name: metadata.name || file.name,
                artist: metadata.artist || 'Artista Desconhecido',
                album: metadata.album || 'Álbum Desconhecido',
                genre: metadata.genre || 'Geral',
                audioData: e.target.result,
                fileType: file.type,
                duration: metadata.duration || 0,
                dateAdded: new Date().toISOString(),
                playCount: 0,
                lastPlayed: null
            };
            
            const transaction = AppState.db.transaction(['musics'], 'readwrite');
            const store = transaction.objectStore('musics');
            const request = store.add(musicData);
            
            request.onsuccess = () => {
                AppState.musicLibrary.push(musicData);
                resolve(musicData);
            };
            
            request.onerror = () => reject(request.error);
        };
        
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Carrega todas as músicas do IndexedDB
 * Complexidade: O(n) - onde n é o número de músicas no banco
 */
function loadMusicsFromDB() {
    return new Promise((resolve, reject) => {
        if (!AppState.db) {
            resolve([]);
            return;
        }
        
        const transaction = AppState.db.transaction(['musics'], 'readonly');
        const store = transaction.objectStore('musics');
        const request = store.getAll();
        
        request.onsuccess = () => {
            AppState.musicLibrary = request.result;
            resolve(request.result);
        };
        
        request.onerror = () => reject(request.error);
    });
}

// ============================================
// GERENCIAMENTO DE PLAYLISTS (localStorage)
// ============================================

/**
 * Carrega playlists do localStorage
 * Complexidade: O(1) - Leitura simples do localStorage
 */
function loadPlaylists() {
    try {
        const stored = localStorage.getItem('spotfy_playlists');
        AppState.playlists = stored ? JSON.parse(stored) : [];
        renderPlaylists();
    } catch (error) {
        console.error('Erro ao carregar playlists:', error);
        AppState.playlists = [];
    }
}

/**
 * Salva playlists no localStorage
 * Complexidade: O(1) - Escrita simples no localStorage
 */
function savePlaylists() {
    try {
        localStorage.setItem('spotfy_playlists', JSON.stringify(AppState.playlists));
    } catch (error) {
        console.error('Erro ao salvar playlists:', error);
    }
}

/**
 * Cria uma nova playlist
 * Complexidade: O(1) - Adição simples ao array
 */
function createPlaylist(name) {
    const playlist = {
        id: Date.now(),
        name: name,
        tracks: [],
        createdAt: new Date().toISOString()
    };
    
    AppState.playlists.push(playlist);
    savePlaylists();
    renderPlaylists();
    return playlist;
}

/**
 * Adiciona música a uma playlist
 * Complexidade: O(n) - Busca linear pela playlist
 */
function addTrackToPlaylist(playlistId, trackId) {
    const playlist = AppState.playlists.find(p => p.id === playlistId);
    if (playlist && !playlist.tracks.includes(trackId)) {
        playlist.tracks.push(trackId);
        savePlaylists();
        renderPlaylists();
    }
}

/**
 * Remove música de uma playlist
 * Complexidade: O(n) - Busca e remoção linear
 */
function removeTrackFromPlaylist(playlistId, trackId) {
    const playlist = AppState.playlists.find(p => p.id === playlistId);
    if (playlist) {
        playlist.tracks = playlist.tracks.filter(id => id !== trackId);
        savePlaylists();
        renderPlaylists();
    }
}

/**
 * Remove uma playlist
 * Complexidade: O(n) - Busca e remoção linear
 */
function deletePlaylist(playlistId) {
    AppState.playlists = AppState.playlists.filter(p => p.id !== playlistId);
    savePlaylists();
    renderPlaylists();
}

// ============================================
// SISTEMA DE REPRODUÇÃO DE ÁUDIO
// ============================================

/**
 * Carrega e reproduz uma música
 * Complexidade: O(1) - Operação de carregamento
 */
function loadTrack(track) {
    if (!track || !track.audioData) return;
    
    const blob = new Blob([track.audioData], { type: track.fileType });
    const url = URL.createObjectURL(blob);
    
    AppState.audio.src = url;
    AppState.currentTrack = track;
    
    // Atualiza UI
    updatePlayerInfo(track);
    updateMusicListHighlight();
    
    // Carrega duração quando disponível
    AppState.audio.addEventListener('loadedmetadata', () => {
        updateTimeDisplay();
    });
    
    // Atualiza histórico
    if (!AppState.playHistory.find(h => h.id === track.id)) {
        AppState.playHistory.unshift(track);
        if (AppState.playHistory.length > 50) {
            AppState.playHistory.pop();
        }
    }
    
    // Incrementa contador de reproduções
    track.playCount = (track.playCount || 0) + 1;
    track.lastPlayed = new Date().toISOString();
}

/**
 * Reproduz a música atual
 */
function play() {
    if (!AppState.currentTrack) return;
    
    AppState.audio.play()
        .then(() => {
            AppState.isPlaying = true;
            updatePlayButton();
        })
        .catch(error => {
            console.error('Erro ao reproduzir:', error);
        });
}

/**
 * Pausa a reprodução
 */
function pause() {
    AppState.audio.pause();
    AppState.isPlaying = false;
    updatePlayButton();
}

/**
 * Alterna entre play e pause
 */
function togglePlayPause() {
    if (AppState.isPlaying) {
        pause();
    } else {
        play();
    }
}

/**
 * Reproduz a próxima música da fila
 * Complexidade: O(1) - Acesso direto ao índice
 */
function playNext() {
    if (AppState.playQueue.length === 0) return;
    
    if (AppState.isShuffled) {
        AppState.currentQueueIndex = Math.floor(Math.random() * AppState.playQueue.length);
    } else {
        AppState.currentQueueIndex = (AppState.currentQueueIndex + 1) % AppState.playQueue.length;
    }
    
    const nextTrackId = AppState.playQueue[AppState.currentQueueIndex];
    const nextTrack = AppState.musicLibrary.find(t => t.id === nextTrackId);
    
    if (nextTrack) {
        loadTrack(nextTrack);
        play();
    }
}

/**
 * Reproduz a música anterior da fila
 * Complexidade: O(1) - Acesso direto ao índice
 */
function playPrevious() {
    if (AppState.playQueue.length === 0) return;
    
    if (AppState.isShuffled) {
        AppState.currentQueueIndex = Math.floor(Math.random() * AppState.playQueue.length);
    } else {
        AppState.currentQueueIndex = AppState.currentQueueIndex <= 0 
            ? AppState.playQueue.length - 1 
            : AppState.currentQueueIndex - 1;
    }
    
    const prevTrackId = AppState.playQueue[AppState.currentQueueIndex];
    const prevTrack = AppState.musicLibrary.find(t => t.id === prevTrackId);
    
    if (prevTrack) {
        loadTrack(prevTrack);
        play();
    }
}

/**
 * Define o volume
 */
function setVolume(value) {
    AppState.volume = value / 100;
    AppState.audio.volume = AppState.volume;
    updateVolumeIcon();
}

/**
 * Alterna o modo de repetição
 */
function toggleRepeat() {
    const modes = ['off', 'all', 'one'];
    const currentIndex = modes.indexOf(AppState.repeatMode);
    AppState.repeatMode = modes[(currentIndex + 1) % modes.length];
    updateRepeatButton();
}

/**
 * Alterna o modo shuffle
 */
function toggleShuffle() {
    AppState.isShuffled = !AppState.isShuffled;
    updateShuffleButton();
}

// ============================================
// SISTEMA DE BUSCA
// ============================================

/**
 * Busca músicas por termo (nome, artista ou álbum)
 * Complexidade: O(n) - Busca linear sobre todas as músicas
 * onde n é o número de músicas na biblioteca
 */
function searchMusics(query) {
    if (!query || query.trim() === '') {
        return AppState.musicLibrary;
    }
    
    const lowerQuery = query.toLowerCase().trim();
    
    return AppState.musicLibrary.filter(track => {
        const name = (track.name || '').toLowerCase();
        const artist = (track.artist || '').toLowerCase();
        const album = (track.album || '').toLowerCase();
        
        return name.includes(lowerQuery) || 
               artist.includes(lowerQuery) || 
               album.includes(lowerQuery);
    });
}

// ============================================
// SISTEMA DE RECOMENDAÇÕES
// ============================================

/**
 * Gera recomendações baseadas em histórico e gêneros
 * Complexidade: O(n) - Análise linear do histórico e biblioteca
 */
function getRecommendations(limit = 10) {
    if (AppState.playHistory.length === 0) {
        // Se não há histórico, retorna músicas mais recentes
        return AppState.musicLibrary
            .slice()
            .sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded))
            .slice(0, limit);
    }
    
    // Analisa gêneros mais ouvidos
    const genreCount = {};
    AppState.playHistory.slice(0, 20).forEach(track => {
        const genre = track.genre || 'Geral';
        genreCount[genre] = (genreCount[genre] || 0) + 1;
    });
    
    // Encontra gênero mais popular
    const topGenre = Object.keys(genreCount).reduce((a, b) => 
        genreCount[a] > genreCount[b] ? a : b, 'Geral'
    );
    
    // Retorna músicas do mesmo gênero que não estão no histórico recente
    const recentIds = new Set(AppState.playHistory.slice(0, 10).map(t => t.id));
    const recommendations = AppState.musicLibrary
        .filter(track => 
            (track.genre === topGenre || !track.genre) && 
            !recentIds.has(track.id)
        )
        .slice(0, limit);
    
    // Se não há suficientes, completa com outras músicas
    if (recommendations.length < limit) {
        const additional = AppState.musicLibrary
            .filter(track => !recentIds.has(track.id))
            .slice(0, limit - recommendations.length);
        recommendations.push(...additional);
    }
    
    return recommendations;
}

// ============================================
// RENDERIZAÇÃO DA UI
// ============================================

/**
 * Renderiza a lista de playlists na sidebar
 * Complexidade: O(n) - Renderiza cada playlist
 */
function renderPlaylists() {
    const list = document.getElementById('playlistsList');
    list.innerHTML = '';
    
    AppState.playlists.forEach(playlist => {
        const li = document.createElement('li');
        li.className = 'playlist-item';
        if (AppState.currentPlaylist && AppState.currentPlaylist.id === playlist.id) {
            li.classList.add('active');
        }
        
        const span = document.createElement('span');
        span.textContent = playlist.name;
        span.style.cursor = 'pointer';
        span.addEventListener('click', () => selectPlaylist(playlist.id));
        
        const actions = document.createElement('div');
        actions.className = 'playlist-actions';
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'playlist-action-btn';
        deleteBtn.title = 'Excluir';
        deleteBtn.textContent = '🗑️';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`Tem certeza que deseja excluir a playlist "${playlist.name}"?`)) {
                deletePlaylist(playlist.id);
            }
        });
        
        actions.appendChild(deleteBtn);
        li.appendChild(span);
        li.appendChild(actions);
        list.appendChild(li);
    });
}

/**
 * Renderiza músicas em formato de grid
 * Complexidade: O(n) - Renderiza cada música
 */
function renderMusicGrid(musics, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    musics.forEach(track => {
        const card = document.createElement('div');
        card.className = 'music-card';
        
        const artwork = document.createElement('div');
        artwork.className = 'music-card-artwork';
        
        const overlay = document.createElement('div');
        overlay.className = 'play-overlay';
        overlay.textContent = '▶';
        overlay.addEventListener('click', (e) => {
            e.stopPropagation();
            playTrack(track.id);
        });
        
        artwork.appendChild(overlay);
        card.appendChild(artwork);
        
        const title = document.createElement('div');
        title.className = 'music-card-title';
        title.textContent = track.name;
        title.title = track.name;
        card.appendChild(title);
        
        const artist = document.createElement('div');
        artist.className = 'music-card-artist';
        artist.textContent = track.artist;
        artist.title = track.artist;
        card.appendChild(artist);
        
        container.appendChild(card);
    });
}

/**
 * Renderiza músicas em formato de lista
 * Complexidade: O(n) - Renderiza cada música
 */
function renderMusicList(musics, containerId, showNumber = true) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    musics.forEach((track, index) => {
        const item = document.createElement('div');
        item.className = 'music-item';
        if (AppState.currentTrack && AppState.currentTrack.id === track.id && AppState.isPlaying) {
            item.classList.add('playing');
        }
        
        if (showNumber) {
            const number = document.createElement('div');
            number.className = 'music-item-number';
            number.textContent = index + 1;
            item.appendChild(number);
        }
        
        const artwork = document.createElement('div');
        artwork.className = 'music-item-artwork';
        artwork.textContent = '🎵';
        item.appendChild(artwork);
        
        const info = document.createElement('div');
        info.className = 'music-item-info';
        
        const title = document.createElement('div');
        title.className = 'music-item-title';
        title.textContent = track.name;
        title.title = track.name;
        
        const artist = document.createElement('div');
        artist.className = 'music-item-artist';
        artist.textContent = track.artist;
        artist.title = track.artist;
        
        info.appendChild(title);
        info.appendChild(artist);
        item.appendChild(info);
        
        const actions = document.createElement('div');
        actions.className = 'music-item-actions';
        
        const favoriteBtn = document.createElement('button');
        favoriteBtn.className = `music-action-btn ${AppState.favoriteTracks.has(track.id) ? 'favorite' : ''}`;
        favoriteBtn.title = 'Favoritar';
        favoriteBtn.textContent = AppState.favoriteTracks.has(track.id) ? '❤️' : '🤍';
        favoriteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(track.id);
        });
        
        const playBtn = document.createElement('button');
        playBtn.className = 'music-action-btn';
        playBtn.title = 'Reproduzir';
        playBtn.textContent = '▶';
        playBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            playTrack(track.id);
        });
        
        const addToPlaylistBtn = document.createElement('button');
        addToPlaylistBtn.className = 'music-action-btn';
        addToPlaylistBtn.title = 'Adicionar à playlist';
        addToPlaylistBtn.textContent = '➕';
        addToPlaylistBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showAddToPlaylistMenu(track.id);
        });
        
        actions.appendChild(favoriteBtn);
        actions.appendChild(playBtn);
        actions.appendChild(addToPlaylistBtn);
        item.appendChild(actions);
        
        // Clique na linha para reproduzir
        item.addEventListener('click', () => playTrack(track.id));
        
        container.appendChild(item);
    });
}

/**
 * Renderiza resultados de busca
 */
function renderSearchResults(results) {
    const container = document.getElementById('searchResults');
    
    if (results.length === 0) {
        container.innerHTML = '<p style="color: var(--spotify-text-secondary); text-align: center; padding: 40px;">Nenhuma música encontrada.</p>';
        return;
    }
    
    renderMusicList(results, 'searchResults', false);
}

/**
 * Atualiza informações do player
 */
function updatePlayerInfo(track) {
    document.getElementById('trackName').textContent = track.name || 'Música desconhecida';
    document.getElementById('trackArtist').textContent = track.artist || 'Artista desconhecido';
}

/**
 * Atualiza botão de play/pause
 */
function updatePlayButton() {
    const btn = document.getElementById('playPauseBtn');
    btn.textContent = AppState.isPlaying ? '⏸' : '▶';
}

/**
 * Atualiza botão de shuffle
 */
function updateShuffleButton() {
    const btn = document.getElementById('shuffleBtn');
    btn.style.opacity = AppState.isShuffled ? '1' : '0.5';
}

/**
 * Atualiza botão de repeat
 */
function updateRepeatButton() {
    const btn = document.getElementById('repeatBtn');
    const modes = {
        'off': { text: '🔁', opacity: 0.5 },
        'all': { text: '🔁', opacity: 1 },
        'one': { text: '🔁', opacity: 1 }
    };
    const mode = modes[AppState.repeatMode];
    btn.textContent = mode.text;
    btn.style.opacity = mode.opacity;
}

/**
 * Atualiza ícone de volume
 */
function updateVolumeIcon() {
    const btn = document.getElementById('volumeBtn');
    if (AppState.volume === 0) {
        btn.textContent = '🔇';
    } else if (AppState.volume < 0.5) {
        btn.textContent = '🔉';
    } else {
        btn.textContent = '🔊';
    }
}

/**
 * Atualiza exibição de tempo
 */
function updateTimeDisplay() {
    const current = formatTime(AppState.audio.currentTime);
    const total = formatTime(AppState.audio.duration || 0);
    
    document.getElementById('timeCurrent').textContent = current;
    document.getElementById('timeTotal').textContent = total;
    
    const progress = AppState.audio.duration 
        ? (AppState.audio.currentTime / AppState.audio.duration) * 100 
        : 0;
    document.getElementById('progressSlider').value = progress;
}

/**
 * Formata tempo em mm:ss
 */
function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Atualiza destaque da música atual na lista
 */
function updateMusicListHighlight() {
    document.querySelectorAll('.music-item').forEach(item => {
        item.classList.remove('playing');
    });
    
    if (AppState.currentTrack) {
        document.querySelectorAll('.music-item').forEach(item => {
            const title = item.querySelector('.music-item-title');
            if (title && title.textContent === AppState.currentTrack.name) {
                item.classList.add('playing');
            }
        });
    }
}

/**
 * Mostra menu para adicionar música à playlist
 */
function showAddToPlaylistMenu(trackId) {
    if (AppState.playlists.length === 0) {
        alert('Crie uma playlist primeiro!');
        return;
    }
    
    const playlistNames = AppState.playlists.map(p => p.name);
    const selected = prompt(`Adicionar à playlist:\n${playlistNames.map((name, i) => `${i + 1}. ${name}`).join('\n')}\n\nDigite o número da playlist:`);
    
    const index = parseInt(selected) - 1;
    if (index >= 0 && index < AppState.playlists.length) {
        addTrackToPlaylist(AppState.playlists[index].id, trackId);
        alert(`Música adicionada à playlist "${AppState.playlists[index].name}"!`);
    }
}

// ============================================
// FUNÇÕES DE INTERAÇÃO DO USUÁRIO
// ============================================

/**
 * Reproduz uma música específica
 */
function playTrack(trackId) {
    const track = AppState.musicLibrary.find(t => t.id === trackId);
    if (track) {
        // Se há uma playlist ativa, usa a fila da playlist
        // Caso contrário, cria fila com todas as músicas da biblioteca
        if (AppState.currentPlaylist && AppState.currentPlaylist.tracks.length > 0) {
            AppState.playQueue = AppState.currentPlaylist.tracks;
        } else {
            AppState.playQueue = AppState.musicLibrary.map(t => t.id);
        }
        
        AppState.currentQueueIndex = AppState.playQueue.indexOf(trackId);
        if (AppState.currentQueueIndex === -1) {
            AppState.currentQueueIndex = 0;
        }
        
        loadTrack(track);
        play();
        updateMusicListHighlight();
    }
}

/**
 * Alterna favorito de uma música
 */
function toggleFavorite(trackId) {
    if (AppState.favoriteTracks.has(trackId)) {
        AppState.favoriteTracks.delete(trackId);
    } else {
        AppState.favoriteTracks.add(trackId);
    }
    
    // Salva favoritos no localStorage
    localStorage.setItem('spotfy_favorites', JSON.stringify(Array.from(AppState.favoriteTracks)));
    
    // Atualiza UI
    const filter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
    if (document.getElementById('library-section').classList.contains('active')) {
        renderLibrary(filter);
    } else {
        // Atualiza botões de favorito em todas as listas
        document.querySelectorAll('.music-item').forEach(item => {
            const favoriteBtn = item.querySelector('.music-action-btn');
            if (favoriteBtn) {
                const track = AppState.musicLibrary.find(t => {
                    const title = item.querySelector('.music-item-title');
                    return title && title.textContent === t.name;
                });
                if (track && track.id === trackId) {
                    favoriteBtn.textContent = AppState.favoriteTracks.has(trackId) ? '❤️' : '🤍';
                    favoriteBtn.classList.toggle('favorite', AppState.favoriteTracks.has(trackId));
                }
            }
        });
    }
}

/**
 * Seleciona uma playlist
 */
function selectPlaylist(playlistId) {
    const playlist = AppState.playlists.find(p => p.id === playlistId);
    if (playlist) {
        AppState.currentPlaylist = playlist;
        const tracks = AppState.musicLibrary.filter(t => playlist.tracks.includes(t.id));
        
        // Muda para seção de biblioteca se não estiver
        document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
        document.getElementById('library-section').classList.add('active');
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        document.querySelector('[data-section="library"]').classList.add('active');
        
        renderMusicList(tracks, 'musicLibrary', true);
        
        // Atualiza fila de reprodução
        AppState.playQueue = playlist.tracks;
        AppState.currentQueueIndex = -1;
        
        renderPlaylists();
    }
}

/**
 * Renderiza biblioteca com filtro
 */
function renderLibrary(filter = 'all') {
    let tracks = AppState.musicLibrary;
    
    if (filter === 'favorites') {
        tracks = tracks.filter(t => AppState.favoriteTracks.has(t.id));
    }
    
    renderMusicList(tracks, 'musicLibrary', true);
}

// ============================================
// UPLOAD DE ARQUIVOS
// ============================================

/**
 * Processa upload de arquivos de áudio
 * Complexidade: O(n) - Processa cada arquivo
 */
async function handleFileUpload(files) {
    for (const file of files) {
        if (!file.type.startsWith('audio/')) {
            alert(`${file.name} não é um arquivo de áudio válido.`);
            continue;
        }
        
        try {
            // Extrai metadados básicos do nome do arquivo
            const nameParts = file.name.replace(/\.[^/.]+$/, '').split(' - ');
            const metadata = {
                name: nameParts.length > 1 ? nameParts[1] : nameParts[0],
                artist: nameParts.length > 1 ? nameParts[0] : 'Artista Desconhecido',
                album: 'Álbum Desconhecido',
                genre: 'Geral'
            };
            
            await saveMusicToDB(file, metadata);
        } catch (error) {
            console.error(`Erro ao processar ${file.name}:`, error);
            alert(`Erro ao processar ${file.name}. Tente novamente.`);
        }
    }
    
    // Atualiza UI
    renderMusicGrid(AppState.musicLibrary.slice(-10), 'recommendationsGrid');
    renderMusicList(AppState.playHistory.slice(0, 10), 'recentPlaysList', false);
    renderLibrary();
}

// ============================================
// INICIALIZAÇÃO E EVENT LISTENERS
// ============================================

/**
 * Inicializa a aplicação
 */
async function init() {
    try {
        // Inicializa IndexedDB
        await initIndexedDB();
        
        // Carrega músicas
        await loadMusicsFromDB();
        
        // Carrega playlists
        loadPlaylists();
        
        // Carrega favoritos
        const favorites = localStorage.getItem('spotfy_favorites');
        if (favorites) {
            AppState.favoriteTracks = new Set(JSON.parse(favorites));
        }
        
        // Configura player de áudio
        AppState.audio.volume = AppState.volume;
        
        // Event listeners do player
        AppState.audio.addEventListener('timeupdate', updateTimeDisplay);
        AppState.audio.addEventListener('ended', () => {
            if (AppState.repeatMode === 'one') {
                AppState.audio.currentTime = 0;
                play();
            } else if (AppState.repeatMode === 'all' || AppState.playQueue.length > 0) {
                playNext();
            } else {
                pause();
            }
        });
        
        // Event listeners da UI
        setupEventListeners();
        
        // Renderiza conteúdo inicial
        const recommendations = getRecommendations(10);
        renderMusicGrid(recommendations, 'recommendationsGrid');
        renderMusicList(AppState.playHistory.slice(0, 10), 'recentPlaysList', false);
        renderLibrary();
        
        console.log('Spotfy inicializado com sucesso!');
    } catch (error) {
        console.error('Erro ao inicializar aplicação:', error);
        alert('Erro ao inicializar aplicação. Recarregue a página.');
    }
}

/**
 * Configura todos os event listeners
 */
function setupEventListeners() {
    // Navegação
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            
            // Atualiza navegação ativa
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Mostra seção correspondente
            document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
            document.getElementById(`${section}-section`).classList.add('active');
        });
    });
    
    // Upload de arquivos
    document.getElementById('uploadBtn').addEventListener('click', () => {
        document.getElementById('fileInput').click();
    });
    
    document.getElementById('fileInput').addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileUpload(Array.from(e.target.files));
        }
    });
    
    // Controles do player
    document.getElementById('playPauseBtn').addEventListener('click', togglePlayPause);
    document.getElementById('nextBtn').addEventListener('click', playNext);
    document.getElementById('prevBtn').addEventListener('click', playPrevious);
    document.getElementById('shuffleBtn').addEventListener('click', toggleShuffle);
    document.getElementById('repeatBtn').addEventListener('click', toggleRepeat);
    
    // Controle de volume
    const volumeSlider = document.getElementById('volumeSlider');
    volumeSlider.value = AppState.volume * 100;
    volumeSlider.addEventListener('input', (e) => {
        setVolume(e.target.value);
    });
    
    // Controle de progresso
    const progressSlider = document.getElementById('progressSlider');
    progressSlider.addEventListener('input', (e) => {
        if (AppState.audio.duration) {
            AppState.audio.currentTime = (e.target.value / 100) * AppState.audio.duration;
        }
    });
    
    // Busca
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    
    const performSearch = () => {
        const query = searchInput.value;
        const results = searchMusics(query);
        renderSearchResults(results);
    };
    
    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    
    // Filtros da biblioteca
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderLibrary(btn.dataset.filter);
        });
    });
    
    // Modal de playlist
    document.getElementById('createPlaylistBtn').addEventListener('click', () => {
        document.getElementById('playlistModal').classList.add('active');
        document.getElementById('playlistNameInput').value = '';
    });
    
    document.getElementById('modalClose').addEventListener('click', () => {
        document.getElementById('playlistModal').classList.remove('active');
    });
    
    document.getElementById('cancelPlaylistBtn').addEventListener('click', () => {
        document.getElementById('playlistModal').classList.remove('active');
    });
    
    document.getElementById('confirmPlaylistBtn').addEventListener('click', () => {
        const name = document.getElementById('playlistNameInput').value.trim();
        if (name) {
            createPlaylist(name);
            document.getElementById('playlistModal').classList.remove('active');
        }
    });
    
    // Modal de fila
    document.getElementById('queueBtn').addEventListener('click', () => {
        renderQueue();
        document.getElementById('queueModal').classList.add('active');
    });
    
    document.getElementById('queueModalClose').addEventListener('click', () => {
        document.getElementById('queueModal').classList.remove('active');
    });
    
    // Fecha modais ao clicar fora
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
}

/**
 * Renderiza a fila de reprodução
 */
function renderQueue() {
    const container = document.getElementById('queueList');
    container.innerHTML = '';
    
    if (AppState.playQueue.length === 0) {
        container.innerHTML = '<li style="padding: 20px; text-align: center; color: var(--spotify-text-secondary);">Fila vazia</li>';
        return;
    }
    
    AppState.playQueue.forEach((trackId, index) => {
        const track = AppState.musicLibrary.find(t => t.id === trackId);
        if (track) {
            const li = document.createElement('li');
            li.className = 'queue-item';
            if (index === AppState.currentQueueIndex) {
                li.classList.add('playing');
            }
            li.innerHTML = `
                <span>${index + 1}</span>
                <div style="flex: 1;">
                    <div style="font-weight: 500;">${track.name}</div>
                    <div style="font-size: 14px; color: var(--spotify-text-secondary);">${track.artist}</div>
                </div>
            `;
            li.addEventListener('click', () => {
                AppState.currentQueueIndex = index;
                loadTrack(track);
                play();
            });
            container.appendChild(li);
        }
    });
}

// Inicializa a aplicação quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

