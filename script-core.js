// メインのアプリケーションロジック
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
    const dropArea = document.getElementById('drop-area');
    const loadMoreButton = document.getElementById('load-more-button');
    const scrollLoading = document.getElementById('scroll-loading');

    // 共有変数の定義（グローバルアクセス用）
    window.lineViewer = {
        // 状態変数
        rawMessages: [], // パース済みの全メッセージ
        visibleMessages: [], // 現在表示中のメッセージ
        currentStartIndex: 0, // 現在表示中のメッセージの開始インデックス
        searchResults: [], // 検索結果
        searchResultIndices: [], // 検索結果のインデックス（全メッセージ内の位置）
        currentSearchIndex: -1, // 現在の検索結果インデックス
        isLoading: false, // 読み込み中フラグ
        hasReachedEnd: false, // 全てのメッセージを表示したかどうか
        userSettings: {
            colors: {}, // ユーザー名と色のマッピング
            avatarUrls: {} // ユーザー名とアバター画像URLのマッピング
        },
        colorPool: [
            '#FF6B6B', '#4ECDC4', '#FFD166', '#87BCDE', '#C38D9E',
            '#E27D60', '#85CDCA', '#E8A87C', '#C1C8E4', '#8860D0'
        ],
        colorIndex: 0,
        virtualScrollEnabled: true, // 仮想スクロールの有効/無効
        messageIndexMap: new Map(), // メッセージID→DOMノードのマッピング
        lastSearchQuery: '' // 最後の検索クエリ
    };

    // 初期化処理
    initializeApp();

    // アプリの初期化
    function initializeApp() {
        // localStorage からユーザー設定を読み込む
        loadUserSettings();
        
        // イベントリスナーの設定
        setupEventListeners();
        
        // ストレージ使用量の表示
        window.avatarManager.updateStorageUsage();
    }

    // ユーザー設定を読み込む
    function loadUserSettings() {
        try {
            const savedSettings = localStorage.getItem('lineViewerSettings');
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
                window.lineViewer.userSettings = {
                    ...window.lineViewer.userSettings,
                    ...parsed
                };
            }
        } catch (err) {
            console.error('設定の読み込みに失敗しました:', err);
            // エラー時は初期設定を使用
            window.lineViewer.userSettings = {
                colors: {},
                avatarUrls: {}
            };
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
        
        // 検索関連の処理はscript-search.jsで設定
        
        // さらに読み込むボタン
        loadMoreButton.addEventListener('click', function() {
            loadMoreMessages();
        });
        
        // スクロールイベント（無限スクロール用）
        chatMessages.addEventListener('scroll', handleScroll);
        
        // 設定変更時
        myUsernameInput.addEventListener('change', function() {
            // 表示中のメッセージを再レンダリング
            if (window.lineViewer.visibleMessages.length > 0) {
                window.messageRenderer.renderVisibleMessages();
            }
        });

        // 仮想スクロールとメモリモードの連動
        lowMemoryModeCheckbox.addEventListener('change', function() {
            window.lineViewer.virtualScrollEnabled = this.checked;
            if (window.lineViewer.rawMessages.length > 0) {
                // すべての検索結果をクリア
                window.searchManager.clearSearch();
                // 現在の表示をリセット
                resetDisplay();
                // 最初から表示し直す
                loadInitialMessages();
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
                
                // ローメモリーモードの場合は、分割して処理
                if (lowMemoryModeCheckbox.checked) {
                    window.parserManager.parseInChunks(text, finishLoading);
                } else {
                    // 通常モードの場合は、メインスレッドでパース
                    window.lineViewer.rawMessages = window.parserManager.parseLINEChat(text);
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

    // 読み込み完了後の処理
    function finishLoading() {
        loadingStatus.textContent = 'メッセージを表示しています...';
        
        // メッセージの表示順を設定
        if (reverseOrderCheckbox.checked) {
            window.lineViewer.rawMessages.reverse();
        }
        
        // メッセージにIDを付与
        window.lineViewer.rawMessages.forEach((msg, idx) => {
            msg.globalIndex = idx;
            if (!msg.id) {
                msg.id = `msg-${idx}`;
            }
        });
        
        // ユーザー別のアバター設定を更新
        window.avatarManager.updateAvatarSettings();
        
        // 最初のチャンクを表示
        resetDisplay();
        loadInitialMessages();
        
        // UI表示の更新
        chatContainer.classList.remove('hidden');
        loadingDiv.classList.add('hidden');
        chatTitle.textContent = fileInput.files[0].name.replace('.txt', '');
        
        // 検索情報を更新
        window.searchManager.updateSearchInfo();
    }

    // メッセージ表示をリセット
    function resetDisplay() {
        chatMessages.innerHTML = '';
        window.lineViewer.currentStartIndex = 0;
        window.lineViewer.visibleMessages = [];
        window.lineViewer.hasReachedEnd = false;
        window.lineViewer.messageIndexMap = new Map();
        window.searchManager.clearSearch();
    }

    // 初期メッセージを読み込む
    function loadInitialMessages() {
        if (window.lineViewer.rawMessages.length === 0) {
            chatMessages.innerHTML = '<div class="no-messages">メッセージが見つかりませんでした</div>';
            return;
        }
        
        // 仮想スクロールが有効なら一部だけ、そうでなければすべて表示
        if (window.lineViewer.virtualScrollEnabled) {
            loadMoreMessages(true);
            // さらに読み込むボタンの表示状態を更新
            updateLoadMoreButton();
        } else {
            // 通常モードでは全メッセージを一度に表示
            window.messageRenderer.renderMessages(window.lineViewer.rawMessages, true);
            window.lineViewer.currentStartIndex = window.lineViewer.rawMessages.length;
            window.lineViewer.hasReachedEnd = true;
            loadMoreButton.classList.add('hidden');
        }
    }

    // さらにメッセージを読み込む
    function loadMoreMessages(isInitial = false) {
        if (window.lineViewer.isLoading || window.lineViewer.hasReachedEnd) return;
        
        window.lineViewer.isLoading = true;
        const chunkSize = parseInt(chunkSizeSelect.value, 10);
        
        // 初回表示でなければローディング表示
        if (!isInitial) {
            scrollLoading.classList.remove('hidden');
        }
        
        // 次のチャンクのメッセージを取得
        const endIndex = Math.min(window.lineViewer.currentStartIndex + chunkSize, window.lineViewer.rawMessages.length);
        const newMessages = window.lineViewer.rawMessages.slice(window.lineViewer.currentStartIndex, endIndex);
        
        // メッセージをレンダリング（setTimeout で処理を分散）
        setTimeout(() => {
            // メッセージを追加
            window.messageRenderer.renderMessages(newMessages, isInitial);
            
            // 状態を更新
            window.lineViewer.currentStartIndex = endIndex;
            window.lineViewer.hasReachedEnd = window.lineViewer.currentStartIndex >= window.lineViewer.rawMessages.length;
            
            // UI更新
            updateLoadMoreButton();
            scrollLoading.classList.add('hidden');
            window.lineViewer.isLoading = false;
            
            // 検索情報を更新
            window.searchManager.updateSearchInfo();
            
            // 検索がある場合は再検索
            if (window.lineViewer.lastSearchQuery) {
                window.searchManager.performSearch(window.lineViewer.lastSearchQuery, true);
            }
        }, 10);
    }

    // さらに読み込むボタンの表示状態を更新
    function updateLoadMoreButton() {
        if (window.lineViewer.hasReachedEnd) {
            loadMoreButton.classList.add('hidden');
        } else {
            loadMoreButton.classList.remove('hidden');
        }
    }

    // スクロールイベントハンドラ（無限スクロール用）
    function handleScroll() {
        // 仮想スクロールが無効なら何もしない
        if (!window.lineViewer.virtualScrollEnabled) return;
        
        if (window.lineViewer.isLoading || window.lineViewer.hasReachedEnd) return;
        
        const scrollPosition = chatMessages.scrollTop + chatMessages.clientHeight;
        const scrollHeight = chatMessages.scrollHeight;
        
        // スクロール位置が下部に近づいたら追加読み込み
        if (scrollHeight - scrollPosition < 200) {
            loadMoreButton.click();
        }
    }

    // 戻るボタンの処理
    function goBack() {
        chatContainer.classList.add('hidden');
        loadButton.disabled = false;
        chatMessages.innerHTML = '';
        // 検索状態をリセット
        window.searchManager.clearSearch();
        // 状態変数をリセット
        window.lineViewer.rawMessages = [];
        window.lineViewer.visibleMessages = [];
        window.lineViewer.currentStartIndex = 0;
        window.lineViewer.hasReachedEnd = false;
        window.lineViewer.messageIndexMap = new Map();
    }

    // グローバルアクセス用の関数を公開
    window.coreManager = {
        loadMoreMessages,
        resetDisplay,
        updateLoadMoreButton,
        finishLoading
    };
});