document.addEventListener('DOMContentLoaded', function() {
    // 要素の取得
    const fileInput = document.getElementById('file-input');
    const fileNameDisplay = document.getElementById('file-name');
    const loadButton = document.getElementById('load-button');
    const reverseOrderCheckbox = document.getElementById('reverse-order');
    const dateFormatSelect = document.getElementById('date-format');
    const myUsernameInput = document.getElementById('my-username');
    const chunkSizeSelect = document.getElementById('chunk-size');
    const lowMemoryModeCheckbox = document.getElementById('low-memory-mode');
    const loadingDiv = document.getElementById('loading');
    const loadingStatus = document.getElementById('loading-status');
    const chatContainer = document.getElementById('chat-container');
    const chatMessages = document.getElementById('chat-messages');
    const backButton = document.getElementById('back-button');
    const chatTitle = document.getElementById('chat-title');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const searchPrevButton = document.getElementById('search-prev');
    const searchNextButton = document.getElementById('search-next');
    const searchStats = document.getElementById('search-stats');
    const dropArea = document.getElementById('drop-area');
    const loadMoreButton = document.getElementById('load-more-button');
    const scrollLoading = document.getElementById('scroll-loading');
    const avatarSettingsToggle = document.getElementById('avatar-settings-toggle');
    const avatarSettingsPanel = document.getElementById('avatar-settings-panel');
    const avatarList = document.getElementById('avatar-list');
    const closeAvatarSettings = document.getElementById('close-avatar-settings');
    const clearAvatars = document.getElementById('clear-avatars');
    const storageUsed = document.getElementById('storage-used');
    const storageText = document.getElementById('storage-text');

    // 状態変数
    let rawMessages = []; // パース済みの全メッセージ
    let visibleMessages = []; // 現在表示中のメッセージ
    let currentStartIndex = 0; // 現在表示中のメッセージの開始インデックス
    let searchResults = []; // 検索結果
    let currentSearchIndex = -1; // 現在の検索結果インデックス
    let isLoading = false; // 読み込み中フラグ
    let hasReachedEnd = false; // 全てのメッセージを表示したかどうか
    let userSettings = {
        colors: {}, // ユーザー名と色のマッピング
        avatarUrls: {} // ユーザー名とアバター画像URLのマッピング
    };
    const colorPool = [
        '#FF6B6B', '#4ECDC4', '#FFD166', '#87BCDE', '#C38D9E',
        '#E27D60', '#85CDCA', '#E8A87C', '#C1C8E4', '#8860D0'
    ];
    let colorIndex = 0;

    // 初期化処理
    initializeApp();

    // アプリの初期化
    function initializeApp() {
        // localStorage からユーザー設定を読み込む
        loadUserSettings();
        
        // イベントリスナーの設定
        setupEventListeners();
        
        // ストレージ使用量の表示
        updateStorageUsage();
    }

    // ユーザー設定を読み込む
    function loadUserSettings() {
        try {
            const savedSettings = localStorage.getItem('lineViewerSettings');
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
                userSettings = {
                    ...userSettings,
                    ...parsed
                };
            }
        } catch (err) {
            console.error('設定の読み込みに失敗しました:', err);
            // エラー時は初期設定を使用
            userSettings = {
                colors: {},
                avatarUrls: {}
            };
        }
    }

    // ユーザー設定を保存する
    function saveUserSettings() {
        try {
            localStorage.setItem('lineViewerSettings', JSON.stringify(userSettings));
            // ストレージ使用量を更新
            updateStorageUsage();
        } catch (err) {
            console.error('設定の保存に失敗しました:', err);
            alert('設定の保存に失敗しました。ブラウザのストレージ容量が不足している可能性があります。');
        }
    }

    // ストレージ使用量を更新
    function updateStorageUsage() {
        try {
            // ローカルストレージの最大容量（ブラウザによって異なる、約5MB）
            const maxStorage = 5 * 1024 * 1024;
            
            // 現在の使用量を計算
            let currentUsage = 0;
            for (const key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    currentUsage += localStorage[key].length * 2; // UTF-16なので2倍
                }
            }
            
            // 使用率を計算
            const usagePercentage = Math.min(100, Math.round((currentUsage / maxStorage) * 100));
            
            // UIを更新
            storageUsed.style.width = `${usagePercentage}%`;
            storageText.textContent = `ストレージ使用量: ${usagePercentage}%`;
            
            // 警告表示
            if (usagePercentage > 80) {
                storageUsed.classList.add('storage-warning');
            } else {
                storageUsed.classList.remove('storage-warning');
            }
        } catch (err) {
            console.error('ストレージ使用量の計算に失敗しました:', err);
        }
    }

    // イベントリスナーの設定
    function setupEventListeners() {
        // ファイル選択
        fileInput.addEventListener('change', handleFileSelect);
        
        // ドラッグ＆ドロップ関連
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, preventDefaults, false);
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, highlight, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, unhighlight, false);
        });
        
        dropArea.addEventListener('drop', handleDrop, false);
        
        // 読み込みボタン
        loadButton.addEventListener('click', loadFile);
        
        // 戻るボタン
        backButton.addEventListener('click', goBack);
        
        // 検索関連
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                performSearch(this.value);
            }
        });
        
        searchButton.addEventListener('click', function() {
            performSearch(searchInput.value);
        });
        
        searchPrevButton.addEventListener('click', function() {
            navigateSearch(-1);
        });
        
        searchNextButton.addEventListener('click', function() {
            navigateSearch(1);
        });
        
        // ページング関連
        loadMoreButton.addEventListener('click', loadMoreMessages);
        
        // スクロールイベント（無限スクロール）
        chatMessages.addEventListener('scroll', handleScroll);
        
        // アバター設定関連
        avatarSettingsToggle.addEventListener('click', toggleAvatarSettings);
        closeAvatarSettings.addEventListener('click', closeAvatarSettingsPanel);
        clearAvatars.addEventListener('click', clearAllAvatars);
        
        // 設定変更時
        myUsernameInput.addEventListener('change', function() {
            // 表示中のメッセージを再レンダリング
            if (visibleMessages.length > 0) {
                renderVisibleMessages();
            }
        });
    }

    // ドロップエリアハイライト
    function highlight() {
        dropArea.classList.add('highlight');
    }

    function unhighlight() {
        dropArea.classList.remove('highlight');
    }

    // ファイルドロップ処理
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0 && (files[0].type === 'text/plain' || files[0].name.endsWith('.txt'))) {
            fileInput.files = files;
            handleFileSelect();
        } else {
            alert('テキストファイル(.txt)を選択してください');
        }
    }

    // デフォルト動作防止
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // ファイル選択時の処理
    function handleFileSelect() {
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            fileNameDisplay.textContent = file.name;
            loadButton.disabled = false;
        } else {
            fileNameDisplay.textContent = 'ファイルが選択されていません';
            loadButton.disabled = true;
        }
    }

    // ファイルを読み込む
    function loadFile() {
        if (fileInput.files.length === 0) return;
        
        const file = fileInput.files[0];
        const reader = new FileReader();
        
        // 読み込み開始
        loadingDiv.classList.remove('hidden');
        loadButton.disabled = true;
        loadingStatus.textContent = 'ファイルを読み込んでいます...';
        
        reader.onload = function(e) {
            try {
                const text = e.target.result;
                
                // ローメモリーモードの場合は、Worker でパースする
                if (lowMemoryModeCheckbox.checked) {
                    parseInChunks(text);
                } else {
                    // 通常モードの場合は、メインスレッドでパース
                    rawMessages = parseLINEChat(text);
                    finishLoading();
                }
            } catch (error) {
                console.error('エラーが発生しました:', error);
                alert('ファイルの処理中にエラーが発生しました: ' + error.message);
                loadingDiv.classList.add('hidden');
                loadButton.disabled = false;
            }
        };
        
        reader.onerror = function() {
            alert('ファイルの読み込み中にエラーが発生しました。');
            loadingDiv.classList.add('hidden');
            loadButton.disabled = false;
        };
        
        reader.readAsText(file, 'utf-8');
    }

    // テキストを分割して処理（メモリ使用量削減のため）
    function parseInChunks(text) {
        // テキストを行ごとに分割
        const lines = text.split(/\r?\n/);
        const totalLines = lines.length;
        
        // 読み込み状況の更新
        loadingStatus.textContent = `パース中... (0/${totalLines} 行)`;
        
        // 1チャンクあたりの行数
        const chunkSize = 1000;
        let processedLines = 0;
        rawMessages = [];
        
        // Web Worker を使用せず、setTimeout で非同期処理
        processNextChunk();
        
        function processNextChunk() {
            // 処理するチャンクの範囲を決定
            const endIndex = Math.min(processedLines + chunkSize, totalLines);
            const chunk = lines.slice(processedLines, endIndex);
            
            // このチャンクを処理
            const parsedChunk = parseChunk(chunk, processedLines > 0);
            rawMessages = rawMessages.concat(parsedChunk);
            
            // 進捗状況の更新
            processedLines = endIndex;
            const percentage = Math.round((processedLines / totalLines) * 100);
            loadingStatus.textContent = `パース中... (${processedLines}/${totalLines} 行, ${percentage}%)`;
            
            // 次のチャンクがあればそれを処理、なければ完了
            if (processedLines < totalLines) {
                setTimeout(processNextChunk, 0); // 次のチャンクを非同期で処理
            } else {
                // 全チャンクの処理が完了
                finishLoading();
            }
        }
    }

    // 一連のテキスト行をパースする
    function parseChunk(lines, isContinuation) {
        // メッセージの格納用配列
        const messages = [];
        let currentDate = null;
        let currentMessage = null;
        
        // 行を解析してメッセージを抽出
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line === '') continue;
            
            // 日付行の判定（「2023年4月1日（土）」や「2023/4/1」などの形式）
            const dateMatch = line.match(/^\[?(\d{4}[年\/\-]\s*\d{1,2}[月\/\-]\s*\d{1,2}[日]?)(\s*\(\S+\))?\]?$/);
            if (dateMatch) {
                currentDate = formatDate(dateMatch[1]);
                messages.push({
                    type: 'date',
                    date: currentDate
                });
                continue;
            }
            
            // メッセージ行の判定（「12:34 ユーザー名 メッセージ」の形式）
            const messageMatch = line.match(/^\[?(\d{1,2}:\d{2})\]?\s+(.+?)\s+(.+)$/);
            if (messageMatch) {
                const time = messageMatch[1];
                const name = messageMatch[2].replace(':', '').trim();
                
                // メッセージ内容を取得
                let content = messageMatch[3].trim();
                
                currentMessage = {
                    type: 'message',
                    time: time,
                    name: name,
                    content: content,
                    isMultiLine: false
                };
                messages.push(currentMessage);
                continue;
            }
            
            // システムメッセージの判定
            const systemMessageMatch = line.match(/^\[?(\d{1,2}:\d{2})\]?\s+(.+)$/);
            if (systemMessageMatch && !line.includes('招待しました') && !line.includes('参加しました') && (line.includes('ノート') || line.includes('アルバム'))) {
                messages.push({
                    type: 'system',
                    time: systemMessageMatch[1],
                    content: systemMessageMatch[2]
                });
                continue;
            }
            
            // 前のメッセージの続きと判断（インデントや改行後のテキストなど）
            if (currentMessage) {
                currentMessage.content += '\n' + line;
                currentMessage.isMultiLine = true;
            }
        }
        
        // 文頭と文末の引用符を処理
        messages.forEach(msg => {
            if (msg.type === 'message') {
                let content = msg.content;
                
                // 先頭と末尾の引用符を削除
                if (content.startsWith('"') && content.endsWith('"')) {
                    content = content.substring(1, content.length - 1);
                    msg.content = content;
                } else if (msg.isMultiLine) {
                    // 複数行の場合、最初の行の先頭と最後の行の末尾のみチェック
                    const lines = content.split('\n');
                    let modified = false;
                    
                    if (lines[0].startsWith('"')) {
                        lines[0] = lines[0].substring(1);
                        modified = true;
                    }
                    
                    const lastIdx = lines.length - 1;
                    if (lines[lastIdx].endsWith('"')) {
                        lines[lastIdx] = lines[lastIdx].substring(0, lines[lastIdx].length - 1);
                        modified = true;
                    }
                    
                    if (modified) {
                        msg.content = lines.join('\n');
                    }
                }
            }
        });
        
        return messages;
    }