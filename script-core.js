// アプリケーションのコアモジュール - 初期化と共通機能
document.addEventListener('DOMContentLoaded', function() {
    // 要素の取得
    const chatMessages = document.getElementById('chat-messages');
    const chatContainer = document.getElementById('chat-container');

    // 共有変数の定義（グローバルアクセス用）
    window.lineViewer = {
        // 状態変数
        rawMessages: [], // パース済みの全メッセージ
        visibleMessages: [], // 現在表示中のメッセージ
        currentStartIndex: 0, // 現在表示中のメッセージの開始インデックス
        searchResults: [], // 検索結果
        searchResultIndices: [], // 全体検索結果インデックス
        currentSearchIndex: -1, // 現在の検索結果インデックス
        lastSearchQuery: '', // 最後の検索クエリ
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
        colorIndex: 0
    };

    // 初期化処理
    initializeApp();

    // アプリの初期化
    function initializeApp() {
        // localStorage からユーザー設定を読み込む
        loadUserSettings();
        
        // ストレージ使用量の表示
        window.avatarManager.updateStorageUsage();
        
        // 各モジュールのイベントリスナーをセットアップ
        window.fileHandler.setupEventListeners();
        window.uiManager.setupEventListeners();
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

    // メッセージ表示をリセット
    function resetDisplay() {
        chatMessages.innerHTML = '';
        window.lineViewer.currentStartIndex = 0;
        window.lineViewer.visibleMessages = [];
        window.lineViewer.hasReachedEnd = false;
        window.searchManager.clearSearch();
    }

    // 初期メッセージを読み込む
    function loadInitialMessages() {
        if (window.lineViewer.rawMessages.length === 0) {
            chatMessages.innerHTML = '<div class="no-messages">メッセージが見つかりませんでした</div>';
            return;
        }
        
        window.uiManager.loadMoreMessages(true);
        
        // さらに読み込むボタンの表示状態を更新
        window.uiManager.updateLoadMoreButton();
    }

    // グローバルに公開する関数
    window.coreManager = {
        initializeApp,
        loadUserSettings,
        resetDisplay,
        loadInitialMessages
    };
});