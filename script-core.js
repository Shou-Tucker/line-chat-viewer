// アプリケーションのコアモジュール - 初期化と共通機能
document.addEventListener('DOMContentLoaded', function() {
    console.log('Core: 初期化を開始します');
    
    // 要素の取得
    const chatMessages = document.getElementById('chat-messages');
    const chatContainer = document.getElementById('chat-container');

    // 依存関係の確認
    if (!window.parserManager) {
        console.error('Core: parserManager が読み込まれていません');
    }
    if (!window.avatarManager) {
        console.error('Core: avatarManager が読み込まれていません');
    }
    if (!window.messageRenderer) {
        console.error('Core: messageRenderer が読み込まれていません');
    }
    if (!window.searchManager) {
        console.error('Core: searchManager が読み込まれていません');
    }
    if (!window.fileHandler) {
        console.error('Core: fileHandler が読み込まれていません');
    }
    if (!window.uiManager) {
        console.error('Core: uiManager が読み込まれていません');
    }

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

    console.log('Core: グローバル状態を初期化しました');
    
    // 初期化処理
    initializeApp();

    // アプリの初期化
    function initializeApp() {
        console.log('Core: アプリの初期化を開始します');
        
        // localStorage からユーザー設定を読み込む
        loadUserSettings();
        
        // ストレージ使用量の表示
        if (window.avatarManager) {
            window.avatarManager.updateStorageUsage();
        }
        
        console.log('Core: アプリの初期化が完了しました');
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
                console.log('Core: ユーザー設定を読み込みました');
            }
        } catch (err) {
            console.error('Core: 設定の読み込みに失敗しました:', err);
            // エラー時は初期設定を使用
            window.lineViewer.userSettings = {
                colors: {},
                avatarUrls: {}
            };
        }
    }

    // メッセージ表示をリセット
    function resetDisplay() {
        console.log('Core: 表示をリセットします');
        chatMessages.innerHTML = '';
        window.lineViewer.currentStartIndex = 0;
        window.lineViewer.visibleMessages = [];
        window.lineViewer.hasReachedEnd = false;
        
        if (window.searchManager) {
            window.searchManager.clearSearch();
        }
    }

    // 初期メッセージを読み込む
    function loadInitialMessages() {
        console.log('Core: 初期メッセージを読み込みます');
        if (window.lineViewer.rawMessages.length === 0) {
            console.log('Core: メッセージがありません');
            chatMessages.innerHTML = '<div class="no-messages">メッセージが見つかりませんでした</div>';
            return;
        }
        
        if (window.uiManager) {
            window.uiManager.loadMoreMessages(true);
            window.uiManager.updateLoadMoreButton();
            console.log('Core: メッセージを読み込みました');
        } else {
            console.error('Core: uiManager が見つかりません');
        }
    }

    // グローバルに公開する関数
    window.coreManager = {
        initializeApp,
        loadUserSettings,
        resetDisplay,
        loadInitialMessages
    };
    
    console.log('Core: モジュールの初期化が完了しました');
});