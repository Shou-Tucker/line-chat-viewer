// UI管理関連のモジュール
window.addEventListener('DOMContentLoaded', function() {
    // 要素の取得
    const chatMessages = document.getElementById('chat-messages');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const searchPrevButton = document.getElementById('search-prev');
    const searchNextButton = document.getElementById('search-next');
    const searchStats = document.getElementById('search-stats');
    const loadMoreButton = document.getElementById('load-more-button');
    const scrollLoading = document.getElementById('scroll-loading');
    const backButton = document.getElementById('back-button');
    const chatContainer = document.getElementById('chat-container');
    const loadButton = document.getElementById('load-button');
    const myUsernameInput = document.getElementById('my-username');
    const chunkSizeSelect = document.getElementById('chunk-size');

    // イベントリスナーの設定
    function setupEventListeners() {
        // 戻るボタン
        backButton.addEventListener('click', goBack);
        
        // ページング関連
        loadMoreButton.addEventListener('click', loadMoreMessages);
        
        // スクロールイベント（無限スクロール）
        chatMessages.addEventListener('scroll', handleScroll);
        
        // 設定変更時
        myUsernameInput.addEventListener('change', function() {
            // 表示中のメッセージを再レンダリング
            if (window.lineViewer.visibleMessages.length > 0) {
                window.messageRenderer.renderVisibleMessages();
            }
        });
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
        // ローメモリーモードで無限スクロールを無効化
        if (document.getElementById('low-memory-mode').checked) return;
        
        if (window.lineViewer.isLoading || window.lineViewer.hasReachedEnd) return;
        
        const scrollPosition = chatMessages.scrollTop + chatMessages.clientHeight;
        const scrollHeight = chatMessages.scrollHeight;
        
        // スクロール位置が下部に近づいたら追加読み込み
        if (scrollHeight - scrollPosition < 200) {
            loadMoreMessages();
        }
    }

    // グローバルに公開する関数
    window.uiManager = {
        setupEventListeners,
        goBack,
        loadMoreMessages,
        updateLoadMoreButton,
        handleScroll
    };
});